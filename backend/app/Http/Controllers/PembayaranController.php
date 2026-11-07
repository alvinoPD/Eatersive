<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Services\MidtransService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

/*
 * Tahap 4 — Pembayaran Midtrans (charge, polling status, webhook).
 * Jalur utama di local adalah polling `GET /pembayaran/{pesananId}/status`;
 * webhook tetap aktif untuk produksi/URL publik.
 */
class PembayaranController extends Controller
{
    /** Status pembayaran yang masih boleh dibayar. */
    private const PAYABLE_STATUSES = ['pending'];

    /** Batas varian order_id (GRUP-.., GRUP-..-2, -3) saat charge ulang. */
    private const MAX_ORDER_ID_RETRIES = 3;

    /**
     * Buat transaksi Snap untuk semua pesanan dalam satu grup checkout
     * (kode_grup). Total dihitung ulang dari baris pembayaran internal.
     */
    public function charge(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'kode_grup' => ['required', 'string', 'max:50'],
            'metode_pembayaran' => ['sometimes', Rule::in(['qris', 'va', 'ewallet'])],
        ]);

        if (! config('midtrans.configured')) {
            return response()->json([
                'success' => false,
                'message' => 'Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di backend/.env',
                'data' => null,
            ], 503);
        }

        $user = $request->user();

        $pesananList = Pesanan::with(['layanan', 'pembayaran', 'timeline'])
            ->where('user_id', $user->id)
            ->where('kode_grup', $attributes['kode_grup'])
            ->orderBy('id')
            ->get();

        if ($pesananList->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $payable = $pesananList->filter(
            fn (Pesanan $pesanan): bool => $pesanan->pembayaran !== null
                && in_array($pesanan->pembayaran->status_pembayaran, self::PAYABLE_STATUSES, true)
                && $pesanan->status !== OrderStatus::Cancelled,
        );

        if ($payable->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada pesanan yang bisa dibayar (mungkin sudah dibayar)',
                'data' => null,
            ], 400);
        }

        $gross = (int) $payable->sum(fn (Pesanan $pesanan): float => (float) $pesanan->pembayaran->jumlah);
        $baseOrderId = (string) $attributes['kode_grup'];
        $first = $payable->first();
        $origin = $this->frontendOrigin();

        $params = [
            'transaction_details' => [
                // kode_grup unik di database sehingga aman sebagai order_id.
                'order_id' => $baseOrderId,
                'gross_amount' => max(1, $gross),
            ],
            'item_details' => $payable
                ->map(fn (Pesanan $pesanan): array => [
                    'id' => (string) $pesanan->layanan->id,
                    'price' => (int) round((float) $pesanan->layanan->harga),
                    'quantity' => (int) $pesanan->jumlah,
                    'name' => $pesanan->layanan->nama,
                ])
                ->values()
                ->all(),
            'customer_details' => [
                'first_name' => $first->nama,
                'phone' => $first->nomor_telp,
            ],
            'callbacks' => [
                'finish' => $origin.'/konfirmasi-pesanan?order='.$first->id,
                'unfinish' => $origin.'/konfirmasi-pesanan?order='.$first->id,
                'error' => $origin.'/pembayaran?items',
            ],
        ];

        /*
         * Charge dengan penanganan charge-ulang:
         * bila popup ditutup sebelum pembayaran selesai, transaksi lama masih
         * terbuka di Midtrans sehingga order_id yang sama ditolak ("already
         * been taken"). Karena itu order_id diberi sufis urut (GRUP-...-2,
         * -3, dst) — pola bawaan Midtrans untuk transaksi ulang. Setiap
         * charge yang sukses menimpa transaction_id pembayaran sehingga
         * polling dan webhook otomatis mengikuti transaksi terbaru.
         */
        $orderId = $baseOrderId;
        $retry = 0;
        $snap = null;

        try {
            while ($orderId !== null) {
                $params['transaction_details']['order_id'] = $orderId;

                try {
                    $snap = MidtransService::createSnapTransaction($params);
                    break;
                } catch (Throwable $exception) {
                    if (
                        ! str_contains($exception->getMessage(), 'already been taken')
                        || $retry >= self::MAX_ORDER_ID_RETRIES
                    ) {
                        throw $exception;
                    }

                    $retry++;
                    $orderId = $baseOrderId.'-'.($retry + 1);
                }
            }
        } catch (Throwable $exception) {
            report($exception);

            $message = str_contains($exception->getMessage(), 'already been taken')
                ? 'Masih ada transaksi pembayaran yang belum selesai untuk pesanan ini. Coba lagi beberapa menit atau buat pesanan baru.'
                : 'Gagal membuat transaksi Midtrans. Periksa konfigurasi kunci dan koneksi.';
            $status = str_contains($exception->getMessage(), 'already been taken') ? 409 : 502;

            return response()->json([
                'success' => false,
                'message' => $message,
                'data' => null,
            ], $status);
        }

        if ($snap === null) {
            // Tidak pernah terjadi pada alur normal, pertahanan ekstra.
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat transaksi Midtrans.',
                'data' => null,
            ], 502);
        }

        DB::transaction(function () use ($payable, $orderId, $attributes): void {
            $payable->each(function (Pesanan $pesanan) use ($orderId, $attributes): void {
                $pembayaran = $pesanan->pembayaran;
                $pembayaran->transaction_id = $orderId;

                if (! $pembayaran->metode_pembayaran) {
                    $pembayaran->metode_pembayaran = $attributes['metode_pembayaran'] ?? 'qris';
                }

                $pembayaran->save();
            });
        });

        return response()->json([
            'success' => true,
            'message' => 'Transaksi pembayaran berhasil dibuat',
            'data' => [
                'order_id' => $orderId,
                'gross_amount' => $gross,
                'snap_token' => $snap->token,
                'redirect_url' => $snap->redirect_url,
                'client_key' => (string) config('midtrans.client_key'),
                'is_production' => (bool) config('midtrans.is_production'),
            ],
        ]);
    }

    /**
     * Polling status pembayaran: ambil status terkini dari Midtrans
     * (Status API), sinkronkan tabel pembayarans/pesanan, lalu kembalikan
     * pesanan terbaru. Aman untuk transaksi yang belum dibayar — status
     * tetap pending bila Midtrans tidak mengembalikan perubahan.
     */
    public function status(Request $request, $pesananId): JsonResponse
    {
        $pesanan = Pesanan::with(['layanan', 'pembayaran', 'timeline'])->find($pesananId);

        if (! $pesanan) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $user = $request->user();

        if ($pesanan->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Tidak memiliki akses ke pesanan ini',
                'data' => null,
            ], 403);
        }

        $pembayaran = $pesanan->pembayaran;

        if (
            $pembayaran
            && $pembayaran->transaction_id
            && $pembayaran->status_pembayaran === 'pending'
            && config('midtrans.configured')
        ) {
            try {
                $response = MidtransService::getTransactionStatus($pembayaran->transaction_id);
                $newStatus = MidtransService::mapTransactionStatus(
                    (string) $response->transaction_status,
                    $response->fraud_status ?? null,
                );

                if ($newStatus) {
                    MidtransService::applyStatus(
                        $pembayaran,
                        $newStatus,
                        $response->payment_type ?? null,
                        $response->transaction_time ?? null,
                    );
                    $pesanan = Pesanan::with(['layanan', 'pembayaran', 'timeline'])->find($pesanan->id);
                }
            } catch (Throwable $exception) {
                // Belum dibayar atau Midtrans bermasalah — status tetap pending.
                report($exception);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Status pembayaran berhasil diperiksa',
            'data' => $pesanan,
        ]);
    }

    /**
     * Notifikasi otomatis dari server Midtrans (tanpa auth).
     * Validasi signature, petakan status, lalu sinkronkan pembayarans +
     * pesanan. Selalu HTTP 200 setelah validasi agar Midtrans tidak
     * mengulang notifikasi tanpa batas.
     */
    public function webhook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => ['required', 'string', 'max:255'],
            'status_code' => ['required', 'string', 'max:20'],
            'gross_amount' => ['required', 'string', 'max:30'],
            'signature_key' => ['required', 'string', 'max:512'],
            'transaction_status' => ['required', 'string', 'max:32'],
            'fraud_status' => ['sometimes', 'nullable', 'string', 'max:32'],
            'payment_type' => ['sometimes', 'nullable', 'string', 'max:32'],
            'transaction_time' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        $signatureValid = MidtransService::verifySignature(
            $data['order_id'],
            $data['status_code'],
            $data['gross_amount'],
            $data['signature_key'],
        );

        if (! $signatureValid) {
            return response()->json([
                'success' => false,
                'message' => 'Signature tidak valid',
                'data' => null,
            ], 401);
        }

        $newStatus = MidtransService::mapTransactionStatus(
            $data['transaction_status'],
            $data['fraud_status'] ?? null,
        );

        if ($newStatus) {
            Pembayaran::with('pesanan')
                ->where('transaction_id', $data['order_id'])
                ->get()
                ->each(
                    fn (Pembayaran $pembayaran) => MidtransService::applyStatus(
                        $pembayaran,
                        $newStatus,
                        $data['payment_type'] ?? null,
                        $data['transaction_time'] ?? null,
                    ),
                );
        }

        return response()->json([
            'success' => true,
            'message' => 'Webhook diterima',
            'data' => null,
        ]);
    }

    /** Origin pertama dari FRONTEND_URL (dipisah koma) untuk redirect Snap. */
    private function frontendOrigin(): string
    {
        $raw = (string) env('FRONTEND_URL', 'http://localhost:5173');

        return (string) Str::of($raw)->before(',')->rtrim('/');
    }
}

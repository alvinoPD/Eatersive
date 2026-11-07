<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Pembayaran;
use App\Models\PesananStatusLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Transaction;

/*
 * Tahap 4 — Integrasi Midtrans (Snap) dengan jalur ganda:
 * - Charge  : POST /api/v1/pembayaran/charge  → snap_token (dipakai popup)
 * - Sync    : POST /api/v1/pembayaran/webhook (dari server Midtrans)
 *             + GET /api/v1/pembayaran/{pesananId}/status (polling frontend,
 *               jalur utama di environment lokal yang wajib)
 *
 * Semua kunci dibaca dari config/midtrans.php (diset dari .env backend).
 */
class MidtransService
{
    /** Konfigurasi kredensial Midtrans sebelum setiap pemanggilan API. */
    public static function boot(): void
    {
        Config::$serverKey = (string) config('midtrans.server_key');
        Config::$isProduction = (bool) config('midtrans.is_production');
        Config::$isSanitized = (bool) config('midtrans.is_production');
        Config::$is3ds = (bool) config('midtrans.is_3ds');
    }

    /**
     * Membuat transaksi Snap dan mengembalikan objek berisi `token` dan
     * `redirect_url`.
     *
     * @return object{token: string, redirect_url: string}
     */
    public static function createSnapTransaction(array $params): object
    {
        self::boot();

        return Snap::createTransaction($params);
    }

    /** Mengambil status transaksi langsung dari Midtrans (untuk polling). */
    public static function getTransactionStatus(string $orderId): object
    {
        self::boot();

        return Transaction::status(trim($orderId));
    }

    /**
     * Verifikasi signature_key webhook:
     * sha512(order_id + status_code + gross_amount + server_key).
     */
    public static function verifySignature(
        string $orderId,
        string $statusCode,
        string $grossAmount,
        string $signature,
    ): bool {
        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.(string) config('midtrans.server_key'));

        return hash_equals($expected, $signature);
    }

    /**
     * Pemetaan transaction_status Midtrans → status pembayaran internal
     * (PRD backend: pending / paid / expired / failed).
     */
    public static function mapTransactionStatus(string $status, ?string $fraudStatus): ?PaymentStatus
    {
        return match ($status) {
            'capture' => $fraudStatus === 'challenge'
                ? PaymentStatus::Pending
                : PaymentStatus::Paid,
            'settlement' => PaymentStatus::Paid,
            'pending' => PaymentStatus::Pending,
            'deny', 'cancel' => PaymentStatus::Failed,
            'expire' => PaymentStatus::Expired,
            'refund', 'partial_refund' => PaymentStatus::Refunded,
            default => null,
        };
    }

    /**
     * Terapkan status transaksi ke tabel pembayarans + sinkronisasi status
     * pesanan. Idempotent: dipanggil ulang (webhook dobel atau polling
     * berulang) tidak akan menggandakan update maupun baris timeline.
     */
    public static function applyStatus(
        Pembayaran $pembayaran,
        PaymentStatus $status,
        ?string $paymentType = null,
        ?string $transactionTime = null,
    ): void {
        DB::transaction(function () use ($pembayaran, $status, $paymentType, $transactionTime): void {
            $pembayaran->refresh();

            if ($pembayaran->status_pembayaran !== $status->value) {
                $pembayaran->status_pembayaran = $status->value;

                if ($paymentType && ! $pembayaran->metode_pembayaran) {
                    $pembayaran->metode_pembayaran = $paymentType;
                }

                if ($status === PaymentStatus::Paid) {
                    $pembayaran->tanggal_bayar = $transactionTime
                        ? Carbon::parse($transactionTime)
                        : now();
                }

                $pembayaran->save();
            }

            $pesanan = $pembayaran->pesanan()->first();

            if (! $pesanan) {
                return;
            }

            // Pembayaran lunas → pesanan otomatis dikonfirmasi.
            if ($status === PaymentStatus::Paid && $pesanan->status === OrderStatus::Pending) {
                $pesanan->status = OrderStatus::Confirmed;
                $pesanan->save();
                PesananStatusLog::record($pesanan, OrderStatus::Confirmed->value, 'Pembayaran diterima (Midtrans)', 'midtrans');
            }

            // Pembayaran gagal/dibatalkan → pesanan dibatalkan (bila belum dikerjakan).
            if (
                $status === PaymentStatus::Failed
                && in_array($pesanan->status, [OrderStatus::Pending, OrderStatus::Confirmed], true)
            ) {
                $pesanan->status = OrderStatus::Cancelled;
                $pesanan->save();
                PesananStatusLog::record($pesanan, OrderStatus::Cancelled->value, 'Pembayaran gagal/dibatalkan (Midtrans)', 'midtrans');
            }
        });
    }
}

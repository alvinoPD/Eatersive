<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\daftar_layanan;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Models\PesananStatusLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/*
 * Tahap 4 — Pesanan + Payment Midtrans (Opsi A).
 * Kontrak respons mengikuti frontend `src/api/orders.ts`:
 * envelope { success, message, data }, relasi layanan/pembayaran/timeline,
 * status pesanan: pending|confirmed|processing|quality_check|completed|cancelled,
 * plus `status_label` dan kode kode_pesanan/kode_grup.
 */
class PesananController extends Controller
{
    /** Relasi yang selalu disertakan dalam payload pesanan. */
    private const RELATIONS = ['layanan', 'pembayaran', 'timeline'];

    /** Catatan bawaan timeline per status bila admin tidak mengirim catatan. */
    private const STATUS_NOTES = [
        'confirmed' => 'Pesanan dikonfirmasi',
        'processing' => 'Pengerjaan dimulai',
        'quality_check' => 'Pengecekan kualitas',
        'completed' => 'Pesanan selesai',
        'cancelled' => 'Pesanan dibatalkan',
    ];

    /**
     * Daftar pesanan milik customer yang sedang login.
     */
    public function index(Request $request): JsonResponse
    {
        $pesananList = Pesanan::with(self::RELATIONS)
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar pesanan berhasil diambil',
            'data' => $pesananList,
        ]);
    }

    /**
     * Buat pesanan baru (customer) + data pembayaran pending + baris
     * timeline pertama. Total dihitung ulang dari harga layanan pada
     * database — nominal dari client tidak dipercaya.
     */
    public function store(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'layanan_id' => ['required', 'integer', Rule::exists('daftar_layanans', 'id')],
            'jumlah' => ['required', 'integer', 'min:1', 'max:99'],
            'nama' => ['required', 'string', 'max:255'],
            'nomor_telp' => ['nullable', 'string', 'max:25'],
            'alamat' => ['required', 'string', 'max:2000'],
            'catatan' => ['nullable', 'string', 'max:2000'],
            'metode_pembayaran' => ['sometimes', Rule::in(['qris', 'va', 'ewallet'])],
            'kode_grup' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $layanan = daftar_layanan::find($attributes['layanan_id']);

        if (! $layanan || ! (bool) $layanan->aktif) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan atau tidak aktif',
                'data' => null,
            ], 422);
        }

        $user = $request->user();
        $jumlah = (int) $attributes['jumlah'];
        $total = round((float) $layanan->harga * $jumlah, 2);

        $pesanan = DB::transaction(function () use ($attributes, $layanan, $user, $jumlah, $total): Pesanan {
            $pesanan = Pesanan::create([
                'kode_pesanan' => $this->uniqueCode('kode_pesanan', 'ORD-'),
                // Checkout multi-item memakai kode grup yang sama.
                'kode_grup' => $attributes['kode_grup'] ?? $this->uniqueCode('kode_grup', 'GRUP-'),
                'nama' => $attributes['nama'],
                'nomor_telp' => $attributes['nomor_telp'] ?? null,
                'alamat' => $attributes['alamat'],
                'catatan' => $attributes['catatan'] ?? null,
                'status' => OrderStatus::INITIAL,
                'user_id' => $user->id,
                'layanan_id' => $layanan->id,
                'jumlah' => $jumlah,
                'total_harga' => $total,
            ]);

            Pembayaran::create([
                'pesanan_id' => $pesanan->id,
                'metode_pembayaran' => $attributes['metode_pembayaran'] ?? null,
                'status_pembayaran' => 'pending',
                'jumlah' => $total,
            ]);

            PesananStatusLog::record($pesanan, OrderStatus::INITIAL->value, 'Pesanan dibuat', 'sistem');

            return $pesanan;
        });

        return response()->json([
            'success' => true,
            'message' => 'Pesanan berhasil dibuat',
            'data' => $pesanan->loadMissing(self::RELATIONS),
        ], 201);
    }

    /**
     * Detail satu pesanan. Customer hanya boleh melihat miliknya sendiri;
     * admin boleh melihat semua.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $pesanan = Pesanan::with(self::RELATIONS)->find($id);

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

        return response()->json([
            'success' => true,
            'message' => 'Detail pesanan berhasil diambil',
            'data' => $pesanan,
        ]);
    }

    /**
     * Ubah status pengerjaan (admin/owner) + tulis baris timeline.
     * Idempotent: status sama tanpa catatan tidak menghasilkan log baru.
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $allowed = array_map(
            fn (OrderStatus $status): string => $status->value,
            OrderStatus::ADMIN_SETTABLE,
        );

        $attributes = $request->validate([
            'status' => ['required', Rule::in($allowed)],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ]);

        $pesanan = Pesanan::with(self::RELATIONS)->find($id);

        if (! $pesanan) {
            return response()->json([
                'success' => false,
                'message' => 'Pesanan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $newStatus = OrderStatus::from($attributes['status']);
        $catatan = trim((string) ($attributes['catatan'] ?? ''));
        $statusChanged = $pesanan->status !== $newStatus;

        if (! $statusChanged && $catatan === '') {
            return response()->json([
                'success' => true,
                'message' => 'Status tidak berubah',
                'data' => $pesanan,
            ]);
        }

        DB::transaction(function () use ($pesanan, $newStatus, $catatan, $statusChanged, $request): void {
            if ($statusChanged) {
                $pesanan->status = $newStatus;
                $pesanan->save();
            }

            PesananStatusLog::record(
                $pesanan,
                $newStatus->value,
                $catatan !== '' ? $catatan : self::STATUS_NOTES[$newStatus->value],
                $request->user()->name,
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Status diperbarui',
            'data' => $pesanan->refresh()->loadMissing(self::RELATIONS),
        ]);
    }

    /**
     * Daftar semua pesanan untuk dashboard owner (admin).
     */
    public function ownerOrders(): JsonResponse
    {
        $pesananList = Pesanan::with(self::RELATIONS)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar pesanan owner berhasil diambil',
            'data' => $pesananList,
        ]);
    }

    /** Kode acak unik pada kolom yang diberikan, mis. ORD-9FK2L8MX. */
    private function uniqueCode(string $column, string $prefix): string
    {
        $attempts = 0;

        do {
            $code = $prefix.strtoupper(Str::random(8));
            $attempts++;
        } while (Pesanan::where($column, $code)->exists() && $attempts < 10);

        return $code;
    }
}

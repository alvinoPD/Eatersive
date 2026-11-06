<?php

namespace App\Http\Controllers;

use App\Models\daftar_layanan;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Models\PesananStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PesananController extends Controller
{
    /**
     * Label status yang dipakai UI. Nilai kolom tetap snake_case.
     */
    public const STATUS_LABELS = [
        'pending' => 'Menunggu',
        'confirmed' => 'Dikonfirmasi',
        'processing' => 'Sedang Dikerjakan',
        'quality_check' => 'Pengecekan',
        'completed' => 'Selesai',
        'cancelled' => 'Dibatalkan',
    ];

    /**
     * Transisi status yang diizinkan. Tidak ada transisi mundur.
     */
    private const TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['processing', 'cancelled'],
        'processing' => ['quality_check', 'cancelled'],
        'quality_check' => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ];

    /**
     * Riwayat pesanan milik pengguna yang sedang login.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(array_keys(self::STATUS_LABELS))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $orders = Pesanan::query()
            ->with(['layanan', 'pembayaran'])
            ->where('user_id', $request->user()->id)
            ->when(
                isset($validated['status']),
                fn ($query) => $query->where('status', $validated['status']),
            )
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($validated['per_page'] ?? 50)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar pesanan berhasil diambil',
            'data' => $orders->map(fn (Pesanan $pesanan) => $this->format($pesanan))->all(),
        ]);
    }

    /**
     * Seluruh pesanan untuk dashboard owner.
     */
    public function ownerIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(array_keys(self::STATUS_LABELS))],
            'q' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $orders = Pesanan::query()
            ->with(['layanan', 'pembayaran'])
            ->when(
                isset($validated['status']),
                fn ($query) => $query->where('status', $validated['status']),
            )
            ->when(
                isset($validated['q']),
                function ($query) use ($validated) {
                    $term = '%'.$validated['q'].'%';
                    $query->where(function ($nested) use ($term) {
                        $nested->where('kode_pesanan', 'like', $term)
                            ->orWhere('nama', 'like', $term)
                            ->orWhere('nomor_telp', 'like', $term);
                    });
                },
            )
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($validated['per_page'] ?? 50)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar pesanan berhasil diambil',
            'data' => $orders->map(fn (Pesanan $pesanan) => $this->format($pesanan))->all(),
        ]);
    }

    /**
     * Membuat pesanan baru. Total harga selalu dihitung server.
     */
    public function store(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'layanan_id' => ['required', 'integer', 'exists:daftar_layanans,id'],
            'jumlah' => ['required', 'integer', 'min:1', 'max:99'],
            'nama' => ['required', 'string', 'max:255'],
            'nomor_telp' => ['required', 'string', 'max:20', 'regex:/^[0-9+() -]{8,20}$/'],
            'alamat' => ['required', 'string', 'max:1000'],
            'catatan' => ['nullable', 'string', 'max:1000'],
            'metode_pembayaran' => ['nullable', Rule::in(['qris', 'va', 'ewallet'])],
            'kode_grup' => ['nullable', 'string', 'max:24'],
        ]);

        $layanan = daftar_layanan::find($attributes['layanan_id']);

        if (! $layanan || $layanan->aktif === false) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak tersedia',
                'data' => null,
            ], 422);
        }

        $jumlah = (int) $attributes['jumlah'];
        $totalHarga = (int) round(((float) $layanan->harga) * $jumlah);
        $kodeGrup = $attributes['kode_grup'] ?? $this->generateGroupCode();
        $estimasiSelesai = $this->estimateDate($layanan->estimasi);

        $pesanan = DB::transaction(function () use (
            $attributes,
            $request,
            $layanan,
            $jumlah,
            $totalHarga,
            $kodeGrup,
            $estimasiSelesai,
        ) {
            $pesanan = Pesanan::create([
                'kode_pesanan' => $this->generateOrderCode(),
                'kode_grup' => $kodeGrup,
                'nama' => $attributes['nama'],
                'nomor_telp' => $attributes['nomor_telp'],
                'alamat' => $attributes['alamat'],
                'catatan' => $attributes['catatan'] ?? null,
                'status' => 'pending',
                'jumlah' => $jumlah,
                'total_harga' => $totalHarga,
                'estimasi_selesai' => $estimasiSelesai,
                'user_id' => $request->user()->id,
                'layanan_id' => $layanan->id,
            ]);

            PesananStatusHistory::create([
                'pesanan_id' => $pesanan->id,
                'status' => 'pending',
                'catatan' => 'Pesanan dibuat.',
                'changed_by' => null,
            ]);

            Pembayaran::create([
                'pesanan_id' => $pesanan->id,
                'metode_pembayaran' => $attributes['metode_pembayaran'] ?? 'qris',
                'status_pembayaran' => 'pending',
                'jumlah' => $totalHarga,
                'transaction_id' => null,
                'tanggal_bayar' => null,
            ]);

            return $pesanan;
        });

        $pesanan->load(['layanan', 'pembayaran', 'statusHistories.changedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Pesanan berhasil dibuat',
            'data' => $this->format($pesanan, true),
        ], 201);
    }

    /**
     * Detail pesanan beserta timeline. Hanya pemilik atau admin.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $pesanan = Pesanan::with(['layanan', 'pembayaran', 'statusHistories.changedBy'])->find($id);

        if (! $pesanan) {
            return $this->notFound();
        }

        if ($request->user()->role !== 'admin' && $pesanan->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak berhak melihat pesanan ini',
                'data' => null,
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail pesanan berhasil diambil',
            'data' => $this->format($pesanan, true),
        ]);
    }

    /**
     * Mengubah status pesanan (admin) dan mencatat riwayatnya.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $attributes = $request->validate([
            'status' => ['required', Rule::in(array_keys(self::STATUS_LABELS))],
            'catatan' => ['nullable', 'string', 'max:1000', 'required_if:status,cancelled'],
        ]);

        $pesanan = Pesanan::with(['layanan', 'pembayaran', 'statusHistories.changedBy'])->find($id);

        if (! $pesanan) {
            return $this->notFound();
        }

        $allowed = self::TRANSITIONS[$pesanan->status] ?? [];

        if (! in_array($attributes['status'], $allowed, true)) {
            return response()->json([
                'success' => false,
                'message' => "Status tidak dapat diubah dari {$pesanan->status} ke {$attributes['status']}",
                'data' => null,
            ], 422);
        }

        DB::transaction(function () use ($pesanan, $attributes, $request) {
            $pesanan->update(['status' => $attributes['status']]);

            PesananStatusHistory::create([
                'pesanan_id' => $pesanan->id,
                'status' => $attributes['status'],
                'catatan' => $attributes['catatan'] ?? null,
                'changed_by' => $request->user()->id,
            ]);
        });

        $pesanan->refresh()->load(['layanan', 'pembayaran', 'statusHistories.changedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Status pesanan berhasil diperbarui',
            'data' => $this->format($pesanan, true),
        ]);
    }

    /**
     * Bentuk data pesanan yang dipakai semua endpoint pesanan.
     */
    public function format(Pesanan $pesanan, bool $withTimeline = false): array
    {
        $pembayaran = $pesanan->pembayaran;

        $data = [
            'id' => $pesanan->id,
            'kode_pesanan' => $pesanan->kode_pesanan,
            'kode_grup' => $pesanan->kode_grup,
            'nama' => $pesanan->nama,
            'nomor_telp' => $pesanan->nomor_telp,
            'alamat' => $pesanan->alamat,
            'catatan' => $pesanan->catatan,
            'status' => $pesanan->status,
            'status_label' => self::STATUS_LABELS[$pesanan->status] ?? $pesanan->status,
            'jumlah' => (int) $pesanan->jumlah,
            'total_harga' => (int) round((float) $pesanan->total_harga),
            'estimasi_selesai' => $pesanan->estimasi_selesai?->toDateString(),
            'created_at' => $pesanan->created_at?->toIso8601String(),
            'updated_at' => $pesanan->updated_at?->toIso8601String(),
            'layanan' => $pesanan->layanan ? [
                'id' => $pesanan->layanan->id,
                'nama' => $pesanan->layanan->nama,
                'foto' => $pesanan->layanan->foto,
                'kategori' => $pesanan->layanan->kategori,
                'estimasi' => $pesanan->layanan->estimasi,
                'harga' => (float) $pesanan->layanan->harga,
            ] : null,
            'pembayaran' => $pembayaran ? [
                'id' => $pembayaran->id,
                'metode_pembayaran' => $pembayaran->metode_pembayaran,
                'status_pembayaran' => $pembayaran->status_pembayaran,
                'jumlah' => (int) round((float) $pembayaran->jumlah),
                'tanggal_bayar' => $pembayaran->tanggal_bayar?->toIso8601String(),
            ] : null,
        ];

        if ($withTimeline) {
            $data['timeline'] = $pesanan->statusHistories
                ->map(fn (PesananStatusHistory $history) => [
                    'status' => $history->status,
                    'status_label' => self::STATUS_LABELS[$history->status] ?? $history->status,
                    'catatan' => $history->catatan,
                    'changed_by' => $history->changedBy?->name,
                    'created_at' => $history->created_at?->toIso8601String(),
                ])
                ->all();
        }

        return $data;
    }

    private function notFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Pesanan tidak ditemukan',
            'data' => null,
        ], 404);
    }

    private function generateOrderCode(): string
    {
        do {
            $code = sprintf('ETS-%s-%04d', now()->format('ymd'), random_int(0, 9999));
        } while (Pesanan::where('kode_pesanan', $code)->exists());

        return $code;
    }

    private function generateGroupCode(): string
    {
        return sprintf('GRP-%s-%s', now()->format('ymd'), Str::upper(Str::random(4)));
    }

    private function estimateDate(?string $estimasi): ?Carbon
    {
        if (! $estimasi || ! preg_match('/(\d+)/', $estimasi, $matches)) {
            return null;
        }

        return Carbon::now()->addDays((int) $matches[1]);
    }
}

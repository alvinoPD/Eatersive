<?php

namespace App\Http\Controllers;

use App\Models\daftar_layanan;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Models\PesananFoto;
use App\Models\PesananStatusHistory;
use App\Services\ImageStorageService;
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

    public const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'expired'];

    public const PHOTO_SIDES = ['depan', 'kanan', 'kiri', 'atas'];

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
            ->with(['layanan', 'pembayaran', 'user'])
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
            ->limit($validated['per_page'] ?? 100)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar pesanan berhasil diambil',
            'data' => $orders->map(fn (Pesanan $pesanan) => $this->format($pesanan))->all(),
        ]);
    }

    /**
     * Membuat pesanan baru. Subtotal, diskon, dan total selalu dihitung server.
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
            'metode_pembayaran' => ['nullable', Rule::in(['qris', 'va', 'ewallet', 'cash'])],
            'kode_grup' => ['nullable', 'string', 'max:24'],
        ]);

        $layanan = daftar_layanan::find($attributes['layanan_id']);

        if (! $layanan || ! $layanan->aktif) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak tersedia',
                'data' => null,
            ], 422);
        }

        $jumlah = (int) $attributes['jumlah'];
        $subtotal = (int) round(((float) $layanan->harga) * $jumlah);

        $membership = $request->user()->currentMembership();
        $diskonPersen = $membership ? $membership->effectiveDiscount() : 0;
        $diskon = (int) round($subtotal * $diskonPersen / 100);
        $totalHarga = max(0, $subtotal - $diskon);

        $kodeGrup = $attributes['kode_grup'] ?? $this->generateGroupCode();
        $estimasiSelesai = $this->estimateDate($layanan->estimasi);

        $pesanan = DB::transaction(function () use (
            $attributes,
            $request,
            $layanan,
            $jumlah,
            $subtotal,
            $diskonPersen,
            $diskon,
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
                'subtotal' => $subtotal,
                'diskon_persen' => $diskonPersen,
                'diskon' => $diskon,
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

        $pesanan->load(['layanan', 'pembayaran', 'statusHistories.changedBy', 'fotos']);

        return response()->json([
            'success' => true,
            'message' => 'Pesanan berhasil dibuat',
            'data' => $this->format($pesanan, true),
        ], 201);
    }

    /**
     * Detail pesanan beserta timeline dan foto. Hanya pemilik atau admin.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $pesanan = Pesanan::with(['layanan', 'pembayaran', 'statusHistories.changedBy', 'fotos'])->find($id);

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

        $pesanan = Pesanan::with(['layanan', 'pembayaran', 'statusHistories.changedBy', 'fotos'])->find($id);

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

        $pesanan->refresh()->load(['layanan', 'pembayaran', 'statusHistories.changedBy', 'fotos']);

        return response()->json([
            'success' => true,
            'message' => 'Status pesanan berhasil diperbarui',
            'data' => $this->format($pesanan, true),
        ]);
    }

    /**
     * Menandai pembayaran (terutama cash) lunas/belum lunas.
     */
    public function updatePayment(Request $request, int $id): JsonResponse
    {
        $attributes = $request->validate([
            'status_pembayaran' => ['required', Rule::in(self::PAYMENT_STATUSES)],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ]);

        $pesanan = Pesanan::with(['layanan', 'pembayaran', 'statusHistories.changedBy', 'fotos'])->find($id);

        if (! $pesanan) {
            return $this->notFound();
        }

        DB::transaction(function () use ($pesanan, $attributes) {
            $pembayaran = $pesanan->pembayaran ?? new Pembayaran([
                'pesanan_id' => $pesanan->id,
                'metode_pembayaran' => 'cash',
                'jumlah' => $pesanan->total_harga,
            ]);

            $pembayaran->status_pembayaran = $attributes['status_pembayaran'];
            $pembayaran->tanggal_bayar = $attributes['status_pembayaran'] === 'paid'
                ? ($pembayaran->tanggal_bayar ?? now())
                : null;
            $pembayaran->save();

            PesananStatusHistory::create([
                'pesanan_id' => $pesanan->id,
                'status' => $pesanan->status,
                'catatan' => $attributes['catatan'] ?? ($attributes['status_pembayaran'] === 'paid'
                    ? 'Pembayaran ditandai lunas.'
                    : 'Status pembayaran diperbarui.'),
                'changed_by' => request()->user()?->id,
            ]);
        });

        $pesanan->refresh()->load(['layanan', 'pembayaran', 'statusHistories.changedBy', 'fotos']);

        return response()->json([
            'success' => true,
            'message' => 'Status pembayaran berhasil diperbarui',
            'data' => $this->format($pesanan, true),
        ]);
    }

    /**
     * Upload foto barang pelanggan per sisi sepatu (depan/kanan/kiri/atas).
     */
    public function uploadPhotos(Request $request, ImageStorageService $images): JsonResponse
    {
        $attributes = $request->validate([
            'kode_grup' => ['required', 'string', 'max:24'],
            'sisi' => ['nullable', Rule::in(self::PHOTO_SIDES)],
            'sisi.*' => ['nullable', Rule::in(self::PHOTO_SIDES)],
            'photo' => ['required_without:photos', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'photos' => ['required_without:photo', 'array', 'max:4'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $group = Pesanan::query()
            ->where('kode_grup', $attributes['kode_grup'])
            ->when(
                $request->user()->role !== 'admin',
                fn ($query) => $query->where('user_id', $request->user()->id),
            )
            ->exists();

        if (! $group) {
            return response()->json([
                'success' => false,
                'message' => 'Kelompok pesanan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $files = $request->file('photos') ?? [$request->file('photo')];
        $sides = $request->input('sisi', []);
        if (! is_array($sides)) {
            $sides = [$sides];
        }

        $usedSides = PesananFoto::where('kode_grup', $attributes['kode_grup'])->pluck('sisi')->all();
        $availableSides = array_values(array_diff(self::PHOTO_SIDES, $usedSides));

        $saved = [];

        foreach ($files as $index => $file) {
            if (! $file) {
                continue;
            }

            $side = $sides[$index] ?? array_shift($availableSides) ?? null;

            if (! $side || ! in_array($side, self::PHOTO_SIDES, true)) {
                continue;
            }

            $existing = PesananFoto::where('kode_grup', $attributes['kode_grup'])
                ->where('sisi', $side)
                ->first();

            if ($existing) {
                $images->delete($existing->path);
                $existing->delete();
            }

            $path = $images->store($file, 'pesanan-fotos/'.$attributes['kode_grup']);

            $saved[] = PesananFoto::create([
                'kode_grup' => $attributes['kode_grup'],
                'path' => $path,
                'sisi' => $side,
                'urutan' => array_search($side, self::PHOTO_SIDES, true) ?: 0,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Foto barang berhasil diunggah',
            'data' => $this->photosForGroup($attributes['kode_grup']),
        ], 201);
    }

    public function deletePhoto(Request $request, int $id, ImageStorageService $images): JsonResponse
    {
        $photo = PesananFoto::find($id);

        if (! $photo) {
            return response()->json([
                'success' => false,
                'message' => 'Foto tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $allowed = $request->user()->role === 'admin'
            || Pesanan::where('kode_grup', $photo->kode_grup)
                ->where('user_id', $request->user()->id)
                ->exists();

        if (! $allowed) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak berhak menghapus foto ini',
                'data' => null,
            ], 403);
        }

        $images->delete($photo->path);
        $photo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Foto berhasil dihapus',
            'data' => null,
        ]);
    }

    /**
     * Bentuk data pesanan yang dipakai semua endpoint pesanan.
     */
    public function format(Pesanan $pesanan, bool $withTimeline = false): array
    {
        $pembayaran = $pesanan->pembayaran;
        $total = (int) round((float) $pesanan->total_harga);
        $diskon = (int) round((float) $pesanan->diskon);
        $subtotal = $pesanan->subtotal !== null
            ? (int) round((float) $pesanan->subtotal)
            : $total + $diskon;

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
            'subtotal' => $subtotal,
            'diskon_persen' => (int) $pesanan->diskon_persen,
            'diskon' => $diskon,
            'total_harga' => $total,
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
            'photos' => $withTimeline && $pesanan->kode_grup
                ? $this->photosForGroup($pesanan->kode_grup)
                : [],
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
                ->values()
                ->all();
        }

        return $data;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function photosForGroup(string $kodeGrup): array
    {
        return PesananFoto::where('kode_grup', $kodeGrup)
            ->orderBy('urutan')
            ->get()
            ->map(fn (PesananFoto $photo) => [
                'id' => $photo->id,
                'sisi' => $photo->sisi,
                'url' => $photo->url,
            ])
            ->all();
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

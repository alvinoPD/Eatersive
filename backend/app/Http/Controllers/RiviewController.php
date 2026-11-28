<?php

namespace App\Http\Controllers;

use App\Models\Riview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RiviewController extends Controller
{
    public const STATUSES = ['Dipublikasikan', 'Menunggu', 'Dilaporkan', 'Disembunyikan'];

    /**
     * Store a new review for a layanan (customer, after order completed).
     */
    public function store(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'layanan_id' => ['required', 'exists:daftar_layanans,id'],
            'isi_review' => ['required', 'string', 'max:255'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'kode_pesanan' => ['nullable', 'string', 'max:24'],
        ]);

        $review = Riview::create([
            'user_id' => $request->user()->id,
            'layanan_id' => $attributes['layanan_id'],
            'isi_review' => $attributes['isi_review'],
            'rating' => $attributes['rating'],
            'kode_pesanan' => $attributes['kode_pesanan'] ?? null,
            'status' => 'Menunggu',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Review berhasil disimpan',
            'data' => $this->format($review->load(['user:id,name', 'layanan:id,nama'])),
        ], 201);
    }

    /**
     * Ulasan yang sudah dipublikasikan, dipakai testimoni di landing page.
     */
    public function index(): JsonResponse
    {
        $reviews = Riview::query()
            ->with(['user:id,name', 'layanan:id,nama'])
            ->where('status', 'Dipublikasikan')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(6)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Testimoni pelanggan berhasil diambil',
            'data' => $reviews->map(fn (Riview $review) => $this->format($review))->all(),
        ]);
    }

    /**
     * Seluruh ulasan untuk halaman moderasi owner.
     */
    public function ownerIndex(): JsonResponse
    {
        $reviews = Riview::query()
            ->with(['user:id,name', 'layanan:id,nama'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar ulasan berhasil diambil',
            'data' => $reviews->map(fn (Riview $review) => $this->format($review))->all(),
        ]);
    }

    /**
     * Ubah status moderasi dan/atau balasan owner.
     */
    public function ownerUpdate(Request $request, int $id): JsonResponse
    {
        $attributes = $request->validate([
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'owner_reply' => ['nullable', 'string', 'max:500'],
        ]);

        $review = Riview::with(['user:id,name', 'layanan:id,nama'])->find($id);

        if (! $review) {
            return response()->json([
                'success' => false,
                'message' => 'Ulasan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        if (array_key_exists('status', $attributes)) {
            $review->status = $attributes['status'];
        }

        if (array_key_exists('owner_reply', $attributes)) {
            $review->owner_reply = $attributes['owner_reply'];
        }

        $review->save();

        return response()->json([
            'success' => true,
            'message' => 'Ulasan berhasil diperbarui',
            'data' => $this->format($review),
        ]);
    }

    /**
     * Bentuk data ulasan yang dipakai halaman owner.
     *
     * @return array<string, mixed>
     */
    private function format(Riview $review): array
    {
        return [
            'id' => $review->id,
            'isi_review' => $review->isi_review,
            'rating' => (int) $review->rating,
            'status' => $review->status,
            'owner_reply' => $review->owner_reply,
            'kode_pesanan' => $review->kode_pesanan,
            'created_at' => $review->created_at?->toIso8601String(),
            'user' => $review->user ? [
                'id' => $review->user->id,
                'name' => $review->user->name,
            ] : null,
            'layanan' => $review->layanan ? [
                'id' => $review->layanan->id,
                'nama' => $review->layanan->nama,
            ] : null,
        ];
    }
}

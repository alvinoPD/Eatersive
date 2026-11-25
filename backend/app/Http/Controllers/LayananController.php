<?php

namespace App\Http\Controllers;

use App\Models\daftar_layanan;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LayananController extends Controller
{
    /**
     * Display a listing of the resource (public).
     */
    public function index(Request $request): JsonResponse
    {
        $includeInactive = $request->boolean('include_inactive')
            && $request->user()?->role === 'admin';

        $layanan = daftar_layanan::query()
            ->when(! $includeInactive, fn ($query) => $query->where('aktif', true))
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar layanan berhasil diambil',
            'data' => $layanan,
        ]);
    }

    /**
     * Store a newly created resource in storage (admin).
     */
    public function store(Request $request, ImageStorageService $images): JsonResponse
    {
        $attributes = $request->validate([
            'foto' => ['nullable'],
            'nama' => ['required', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string', 'max:65535'],
            'harga' => ['required', 'numeric', 'min:0'],
            'kategori' => ['nullable', 'string', 'max:32'],
            'estimasi' => ['nullable', 'string', 'max:64'],
            'aktif' => ['nullable', 'boolean'],
        ]);

        if ($request->hasFile('foto')) {
            $request->validate([
                'foto' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            ]);
            $attributes['foto'] = $images->store($request->file('foto'), 'layanan-fotos');
        } elseif (is_string($attributes['foto'] ?? null)) {
            $attributes['foto'] = $attributes['foto'] ?: null;
        } else {
            unset($attributes['foto']);
        }

        $layanan = daftar_layanan::create($attributes);

        return response()->json([
            'success' => true,
            'message' => 'Layanan berhasil ditambahkan',
            'data' => $layanan,
        ], 201);
    }

    /**
     * Display the specified resource (public).
     */
    public function show(Request $request, $id): JsonResponse
    {
        $layanan = daftar_layanan::find($id);

        if (! $layanan) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Layanan berhasil diambil',
            'data' => $layanan,
        ]);
    }

    /**
     * Update the specified resource in storage (admin).
     */
    public function update(Request $request, $id, ImageStorageService $images): JsonResponse
    {
        $layanan = daftar_layanan::find($id);

        if (! $layanan) {
            return $this->notFound();
        }

        $attributes = $request->validate([
            'foto' => ['sometimes', 'nullable'],
            'nama' => ['sometimes', 'required', 'string', 'max:255'],
            'deskripsi' => ['sometimes', 'nullable', 'string', 'max:65535'],
            'harga' => ['sometimes', 'required', 'numeric', 'min:0'],
            'kategori' => ['sometimes', 'nullable', 'string', 'max:32'],
            'estimasi' => ['sometimes', 'nullable', 'string', 'max:64'],
            'aktif' => ['sometimes', 'boolean'],
        ]);

        if ($request->hasFile('foto')) {
            $request->validate([
                'foto' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            ]);
            $images->delete($layanan->getRawOriginal('foto'));
            $attributes['foto'] = $images->store($request->file('foto'), 'layanan-fotos');
        } elseif (array_key_exists('foto', $attributes) && is_string($attributes['foto'])) {
            $attributes['foto'] = $attributes['foto'] ?: null;
        }

        $layanan->update($attributes);

        return response()->json([
            'success' => true,
            'message' => 'Layanan berhasil diperbarui',
            'data' => $layanan->fresh(),
        ]);
    }

    /**
     * Upload/ganti foto layanan (admin).
     */
    public function uploadPhoto(Request $request, $id, ImageStorageService $images): JsonResponse
    {
        $layanan = daftar_layanan::find($id);

        if (! $layanan) {
            return $this->notFound();
        }

        $request->validate([
            'foto' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $images->delete($layanan->getRawOriginal('foto'));
        $layanan->update(['foto' => $images->store($request->file('foto'), 'layanan-fotos')]);

        return response()->json([
            'success' => true,
            'message' => 'Foto layanan berhasil diperbarui',
            'data' => $layanan->fresh(),
        ]);
    }

    /**
     * Remove the specified resource from storage (admin).
     */
    public function destroy($id, ImageStorageService $images): JsonResponse
    {
        $layanan = daftar_layanan::find($id);

        if (! $layanan) {
            return $this->notFound();
        }

        $images->delete($layanan->getRawOriginal('foto'));
        $layanan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Layanan berhasil dihapus',
            'data' => null,
        ]);
    }

    private function notFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Layanan tidak ditemukan',
            'data' => null,
        ], 404);
    }
}

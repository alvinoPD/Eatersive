<?php

namespace App\Http\Controllers;

use App\Models\daftar_layanan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LayananController extends Controller
{
    /**
     * Display a listing of the resource (public).
     */
    public function index(): JsonResponse
    {
        $layanan = daftar_layanan::query()->orderBy('id')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar layanan berhasil diambil',
            'data' => $layanan,
        ]);
    }

    /**
     * Store a newly created resource in storage (admin).
     */
    public function store(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'foto' => ['nullable', 'string', 'max:255'],
            'nama' => ['required', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string', 'max:65535'],
            'harga' => ['required', 'numeric', 'min:0'],
        ]);

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
    public function update(Request $request, $id): JsonResponse
    {
        $layanan = daftar_layanan::find($id);

        if (! $layanan) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $layanan->update($request->validate([
            'foto' => ['sometimes', 'nullable', 'string', 'max:255'],
            'nama' => ['sometimes', 'required', 'string', 'max:255'],
            'deskripsi' => ['sometimes', 'nullable', 'string', 'max:65535'],
            'harga' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Layanan berhasil diperbarui',
            'data' => $layanan->fresh(),
        ]);
    }

    /**
     * Remove the specified resource from storage (admin).
     */
    public function destroy($id): JsonResponse
    {
        $layanan = daftar_layanan::find($id);

        if (! $layanan) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $layanan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Layanan berhasil dihapus',
            'data' => null,
        ]);
    }
}

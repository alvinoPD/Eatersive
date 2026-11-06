<?php

namespace App\Http\Controllers;

use App\Models\Riview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RiviewController extends Controller
{
    /**
     * Store a new review for a layanan (customer, after order completed).
     */
    public function store(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'layanan_id' => ['required', 'exists:daftar_layanans,id'],
            'isi_review' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();

        $review = Riview::create([
            'user_id' => $user->id,
            'layanan_id' => $attributes['layanan_id'],
            'isi_review' => $attributes['isi_review'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Review berhasil disimpan',
            'data' => $review,
        ], 201);
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Riview $riview)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Riview $riview)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Riview $riview)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Riview $riview)
    {
        //
    }
}

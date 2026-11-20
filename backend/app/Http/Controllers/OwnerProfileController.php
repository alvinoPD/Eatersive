<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;

class OwnerProfileController extends Controller
{
    /**
     * Profil owner yang sedang login.
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Profil owner berhasil diambil',
            'data' => $this->format($request->user()),
        ]);
    }

    /**
     * Memperbarui profil milik sendiri. Tidak menerima id dari klien.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $attributes = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'nomor_telp' => ['sometimes', 'nullable', 'string', 'max:20'],
        ]);

        $user->update($attributes);

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui',
            'data' => $this->format($user->fresh()),
        ]);
    }

    /**
     * Mengubah password setelah memverifikasi password saat ini.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($attributes['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini salah',
                'errors' => [
                    'current_password' => ['Password saat ini salah.'],
                ],
                'data' => null,
            ], 422);
        }

        $user->update(['password' => $attributes['password']]);

        /* Cabut token lain, tetapi biarkan sesi yang sedang dipakai tetap aktif. */
        $currentToken = $user->currentAccessToken();

        if ($currentToken instanceof PersonalAccessToken) {
            $user->tokens()->whereKeyNot($currentToken->getKey())->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diperbarui',
            'data' => null,
        ]);
    }

    private function format($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'nomor_telp' => $user->nomor_telp,
            'role' => $user->role,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}

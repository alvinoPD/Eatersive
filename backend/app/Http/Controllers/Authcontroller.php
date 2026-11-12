<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;


class Authcontroller extends Controller
{
    /**
     * Register a new user (Customer).
     */
    public function register(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name' => $attributes['name'],
            'email' => $attributes['email'],
            'password' => $attributes['password'],
            'role' => 'user',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Register berhasil',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
            ],
        ]);
    }

        /**
     * Login user. CAPTCHA diverifikasi SEBELUM kredensial diperiksa.
     */
    public function login(Request $request, CaptchaService $captcha): JsonResponse
    {
        $attributes = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'captcha_id' => ['required', 'integer', 'min:1'],
            'captcha_answer' => ['required', 'string', 'max:10'],
        ]);

        if (! $captcha->verify(
            $request,
            (int) $attributes['captcha_id'],
            (string) $attributes['captcha_answer'],
            'login',
        )) {
            return response()->json([
                'success' => false,
                'message' => 'Verifikasi CAPTCHA gagal atau sudah kedaluwarsa. Muat soal baru lalu coba lagi.',
                'data' => ['captcha_required' => true],
            ], 422);
        }

        $user = User::where('email', $attributes['email'])->first();

        if (! $user || ! Hash::check($attributes['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah',
                'data' => null,
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
            ],
        ]);
    }

    /**
     * Logout user (revoke current access token).
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil',
            'data' => null,
        ]);
    }

    /**
     * Get authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'message' => 'User berhasil diambil',
            'data' => [
                'user' => $user,
            ],
        ]);
    }
}

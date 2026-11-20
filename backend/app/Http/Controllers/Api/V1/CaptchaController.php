<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaptchaController extends Controller
{
    public function __construct(private readonly CaptchaService $captcha)
    {
    }

    /**
     * GET /api/v1/captcha?context=login
     *
     * Hanya mengembalikan soal — jawaban tidak pernah ikut.
     */
    public function show(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'context' => ['nullable', 'string', 'in:login,checkout'],
        ]);

        $issued = $this->captcha->issue($request, $attributes['context'] ?? 'login');

        return response()->json([
            'success' => true,
            'message' => 'CAPTCHA berhasil dibuat',
            'data' => [
                'id' => $issued['challenge']->id,
                'question' => $issued['challenge']->question,
                'expires_at' => $issued['challenge']->expires_at->toIso8601String(),
                'ttl' => (int) config('captcha.ttl', 120),
            ],
        ]);
    }
}
<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;

/**
 * Contoh endpoint sederhana untuk menunjukkan cara menambah fitur API baru.
 *
 * Pola yang dipakai sama dengan endpoint lain:
 * - controller di app/Http/Controllers/Api/V1
 * - route didaftarkan di routes/api.php pada grup prefix('v1')
 * - response memakai format { success, message, data }
 */
class PingController
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Pong',
            'data' => [
                'pong' => true,
            ],
        ]);
    }
}

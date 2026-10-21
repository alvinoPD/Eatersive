<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\JsonResponse;

class HealthController
{
    /**
     * Endpoint ringan untuk memastikan API Laravel dapat diakses.
     *
     * Sengaja tidak menyentuh database, cache, atau service eksternal
     * agar health check tetap berhasil tanpa konfigurasi database.
     */
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Laravel API is running',
            'data' => [
                'status' => 'ok',
            ],
        ]);
    }
}

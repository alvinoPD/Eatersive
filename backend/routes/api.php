<?php

use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PingController;
use App\Http\Controllers\Authcontroller;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (prefix: /api)
|--------------------------------------------------------------------------
|
| Semua route di file ini otomatis mendapat prefix /api.
| Versi API didefinisikan lewat prefix /v1 di bawah ini sehingga
| endpoint akhirnya menjadi /api/v1/....
|
*/

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class)->name('api.v1.health');

    // Contoh endpoint untuk pola penambahan fitur API baru.
    Route::get('/ping', PingController::class)->name('api.v1.ping');

    Route::prefix('auth')->group(function (): void {
        Route::post('/register', [Authcontroller::class, 'register'])->name('api.v1.auth.register');
        Route::post('/login', [Authcontroller::class, 'login'])->name('api.v1.auth.login');
        Route::post('/logout', [Authcontroller::class, 'logout'])->middleware('auth:sanctum')->name('api.v1.auth.logout');
        Route::get('/me', [Authcontroller::class, 'me'])->middleware('auth:sanctum')->name('api.v1.auth.me');
    });
});

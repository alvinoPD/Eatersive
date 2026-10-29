<?php

use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PingController;
use App\Http\Controllers\Authcontroller;
use App\Http\Controllers\LayananController;
use App\Http\Controllers\RiviewController;
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

    Route::prefix('layanan')->group(function (): void {
        Route::get('/', [LayananController::class, 'index'])->name('api.v1.layanan.index');
        Route::get('/{id}', [LayananController::class, 'show'])->name('api.v1.layanan.show');
        Route::post('/', [LayananController::class, 'store'])->middleware(['auth:sanctum', 'admin'])->name('api.v1.layanan.store');
        Route::put('/{id}', [LayananController::class, 'update'])->middleware(['auth:sanctum', 'admin'])->name('api.v1.layanan.update');
        Route::delete('/{id}', [LayananController::class, 'destroy'])->middleware(['auth:sanctum', 'admin'])->name('api.v1.layanan.destroy');
    });

    Route::prefix('reviews')->group(function (): void {
        Route::post('/', [RiviewController::class, 'store'])->middleware('auth:sanctum')->name('api.v1.reviews.store');
    });
});

<?php

use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PingController;
use App\Http\Controllers\Authcontroller;
use App\Http\Controllers\LayananController;
use App\Http\Controllers\OwnerController;
use App\Http\Controllers\PembayaranController;
use App\Http\Controllers\PesananController;
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

    // Tahap 4 — Pesanan (Opsi A): kontrak mengikuti frontend src/api/orders.ts.
    Route::prefix('orders')->group(function (): void {
        Route::get('/', [PesananController::class, 'index'])
            ->middleware('auth:sanctum')
            ->name('api.v1.orders.index');
        Route::post('/', [PesananController::class, 'store'])
            ->middleware('auth:sanctum')
            ->name('api.v1.orders.store');
        Route::get('/{id}', [PesananController::class, 'show'])
            ->middleware('auth:sanctum')
            ->name('api.v1.orders.show');
        // Pembaharuan status pengerjaan hanya untuk admin/owner.
        Route::patch('/{id}/status', [PesananController::class, 'updateStatus'])
            ->middleware(['auth:sanctum', 'admin'])
            ->name('api.v1.orders.updateStatus');
    });

    // Tahap 4 — Pembayaran Midtrans (charge + polling status + webhook).
    Route::prefix('pembayaran')->group(function (): void {
        Route::post('/charge', [PembayaranController::class, 'charge'])
            ->middleware('auth:sanctum')
            ->name('api.v1.pembayaran.charge');
        Route::get('/{pesananId}/status', [PembayaranController::class, 'status'])
            ->middleware('auth:sanctum')
            ->name('api.v1.pembayaran.status');
        // Public: dipanggil server Midtrans, dilindungi verifikasi signature.
        Route::post('/webhook', [PembayaranController::class, 'webhook'])
            ->name('api.v1.pembayaran.webhook');
    });

    // Tahap 4 — Opsi A: endpoint owner (dashboard, orders, profil, password).
    Route::prefix('owner')->middleware(['auth:sanctum', 'admin'])->group(function (): void {
        Route::get('/dashboard', [OwnerController::class, 'dashboard'])->name('api.v1.owner.dashboard');
        Route::get('/orders', [PesananController::class, 'ownerOrders'])->name('api.v1.owner.orders.index');
        Route::get('/profile', [OwnerController::class, 'profile'])->name('api.v1.owner.profile.show');
        Route::put('/profile', [OwnerController::class, 'updateProfile'])->name('api.v1.owner.profile.update');
        Route::put('/password', [OwnerController::class, 'updatePassword'])->name('api.v1.owner.password.update');
    });
});

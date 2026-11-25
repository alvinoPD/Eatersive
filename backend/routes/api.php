<?php

use App\Http\Controllers\Api\V1\CaptchaController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PingController;
use App\Http\Controllers\Authcontroller;
use App\Http\Controllers\LayananController;
use App\Http\Controllers\OwnerDashboardController;
use App\Http\Controllers\OwnerMemberController;
use App\Http\Controllers\OwnerProfileController;
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
    Route::get('/captcha', [CaptchaController::class, 'show'])
        ->middleware('throttle:30,1')
        ->name('api.v1.captcha.show');

    Route::prefix('auth')->group(function (): void {
        Route::post('/register', [Authcontroller::class, 'register'])->name('api.v1.auth.register');
        Route::post('/login', [Authcontroller::class, 'login'])
            ->middleware('throttle:10,1')
            ->name('api.v1.auth.login');
        Route::post('/logout', [Authcontroller::class, 'logout'])->middleware('auth:sanctum')->name('api.v1.auth.logout');
        Route::get('/me', [Authcontroller::class, 'me'])->middleware('auth:sanctum')->name('api.v1.auth.me');
    });

    Route::prefix('layanan')->group(function (): void {
        Route::get('/', [LayananController::class, 'index'])->name('api.v1.layanan.index');
        Route::get('/{id}', [LayananController::class, 'show'])->name('api.v1.layanan.show');
        Route::post('/', [LayananController::class, 'store'])->middleware(['auth:sanctum', 'admin'])->name('api.v1.layanan.store');
        Route::put('/{id}', [LayananController::class, 'update'])->middleware(['auth:sanctum', 'admin'])->name('api.v1.layanan.update');
        Route::post('/{id}/foto', [LayananController::class, 'uploadPhoto'])->middleware(['auth:sanctum', 'admin'])->name('api.v1.layanan.photo');
        Route::delete('/{id}', [LayananController::class, 'destroy'])->middleware(['auth:sanctum', 'admin'])->name('api.v1.layanan.destroy');
    });

    Route::prefix('reviews')->group(function (): void {
        Route::post('/', [RiviewController::class, 'store'])->middleware('auth:sanctum')->name('api.v1.reviews.store');
    });

    Route::get('/membership-plans', [OwnerMemberController::class, 'publicIndex'])->name('api.v1.membership-plans.index');

    Route::prefix('orders')->middleware('auth:sanctum')->group(function (): void {
        Route::get('/', [PesananController::class, 'index'])->name('api.v1.orders.index');
        Route::post('/', [PesananController::class, 'store'])->name('api.v1.orders.store');
        Route::post('/photos', [PesananController::class, 'uploadPhotos'])->name('api.v1.orders.photos.store');
        Route::delete('/photos/{id}', [PesananController::class, 'deletePhoto'])->whereNumber('id')->name('api.v1.orders.photos.destroy');
        Route::get('/{id}', [PesananController::class, 'show'])->whereNumber('id')->name('api.v1.orders.show');
        Route::patch('/{id}/status', [PesananController::class, 'updateStatus'])
            ->whereNumber('id')
            ->middleware('admin')
            ->name('api.v1.orders.update-status');
        Route::patch('/{id}/payment', [PesananController::class, 'updatePayment'])
            ->whereNumber('id')
            ->middleware('admin')
            ->name('api.v1.orders.update-payment');
    });

    Route::prefix('owner')->middleware(['auth:sanctum', 'admin'])->group(function (): void {
        Route::get('/orders', [PesananController::class, 'ownerIndex'])->name('api.v1.owner.orders');
        Route::get('/dashboard', [OwnerDashboardController::class, 'index'])->name('api.v1.owner.dashboard');
        Route::get('/members', [OwnerMemberController::class, 'index'])->name('api.v1.owner.members.index');
        Route::put('/members/{user}', [OwnerMemberController::class, 'update'])->name('api.v1.owner.members.update');
        Route::get('/membership-plans', [OwnerMemberController::class, 'publicIndex'])->name('api.v1.owner.membership-plans.index');
        Route::post('/membership-plans', [OwnerMemberController::class, 'storePlan'])->name('api.v1.owner.membership-plans.store');
        Route::put('/membership-plans/{plan}', [OwnerMemberController::class, 'updatePlan'])->name('api.v1.owner.membership-plans.update');
        Route::delete('/membership-plans/{plan}', [OwnerMemberController::class, 'destroyPlan'])->name('api.v1.owner.membership-plans.destroy');
        Route::get('/profile', [OwnerProfileController::class, 'show'])->name('api.v1.owner.profile.show');
        Route::put('/profile', [OwnerProfileController::class, 'update'])->name('api.v1.owner.profile.update');
        Route::put('/password', [OwnerProfileController::class, 'updatePassword'])->name('api.v1.owner.password.update');
    });
});

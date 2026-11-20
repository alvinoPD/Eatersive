# Implementasi Local CAPTCHA — EaterSive

Dokumen ini berisi **seluruh kode** Local CAPTCHA (tanpa layanan eksternal) dan
**lokasi file yang harus diisi persis**, supaya tidak ada kode yang tertaruh di
folder yang salah.

Pola pemakaian: dokumen ini adalah panduan. Anda yang menulis/menyalin kode ke
project. Setiap langkah di bawah berdiri sendiri dan bisa diverifikasi sebelum
lanjut ke langkah berikutnya.

---

## 0. Ringkasan desain

| Aspek | Keputusan |
| --- | --- |
| Jenis CAPTCHA | Math CAPTCHA teks (`Berapa hasil dari 4 + 7?`) — tidak butuh GD/Imagick |
| Pembuatan soal | Backend (`CaptchaService::issue`) |
| Penyimpanan | Tabel `captcha_challenges` (bukan cache) |
| Jawaban | Tidak pernah dikirim ke frontend, disimpan sebagai `HMAC-SHA256(nonce|answer)` |
| Masa berlaku | 120 detik (`CAPTCHA_TTL`) |
| Sekali pakai | Klaim atomik `UPDATE ... WHERE consumed_at IS NULL` |
| Batas percobaan | 5 kali per challenge (`CAPTCHA_MAX_ATTEMPTS`) |
| Titik pakai | Login dan checkout (pre-payment) |
| Verifikasi | Internal di controller login/checkout — **tidak ada** endpoint verify publik |
| Rate limit | `throttle:30,1` untuk pembuatan soal, `throttle:10,1` untuk login |

---

## 1. Peta file (WAJIB dibaca sebelum menulis kode)

Kolom **Status** menentukan apakah Anda membuat file baru atau mengubah file yang sudah ada.

### Backend (`backend/`)

| # | Path (persis) | Status | Isi |
| --- | --- | --- | --- |
| B1 | `database/migrations/2026_11_12_000001_create_captcha_challenges_table.php` | **BARU** | Tabel challenge |
| B2 | `config/captcha.php` | **BARU** | TTL, max attempt, daftar context |
| B3 | `app/Models/CaptchaChallenge.php` | **BARU** | Model Eloquent |
| B4 | `app/Services/CaptchaService.php` | **BARU** (buat folder `app/Services` bila belum ada) | Issue + verify |
| B5 | `app/Http/Controllers/Api/V1/CaptchaController.php` | **BARU** | Endpoint pembuat soal |
| B6 | `routes/api.php` | **UBAH** | Daftarkan `GET /api/v1/captcha` + throttle login |
| B7 | `app/Http/Controllers/Authcontroller.php` | **UBAH** | Verifikasi CAPTCHA di `login()` |
| B8 | `tests/Feature/Api/CaptchaTest.php` | **BARU** | Test CAPTCHA |
| B9 | `tests/Feature/Api/AuthTest.php` | **UBAH** | Login test wajib mengirim CAPTCHA |

### Frontend (`frontend/`)

| # | Path (persis) | Status | Isi |
| --- | --- | --- | --- |
| F1 | `src/api/captcha.ts` | **BARU** | `fetchCaptcha` + tipe |
| F2 | `src/components/shared/CaptchaField.tsx` | **BARU** | Widget CAPTCHA |
| F3 | `src/styles/captcha.css` | **BARU** | Style widget + halaman pratinjau |
| F4 | `src/pages/CaptchaPreviewPage.tsx` | **BARU** (halaman baru) | Pratinjau `/captcha-preview` |
| F5 | `src/api/auth.ts` | **UBAH** | `apiLogin` kirim `captcha_id` + `captcha_answer` |
| F6 | `src/auth/auth-context.ts` | **UBAH** | Signature `login()` |
| F7 | `src/auth/AuthProvider.tsx` | **UBAH** | Teruskan CAPTCHA ke `apiLogin` |
| F8 | `src/pages/user/LoginPage.tsx` | **UBAH** | Pasang widget + validasi |
| F9 | `src/routes/AppRoutes.tsx` | **UBAH** | Route `/login` dan `/captcha-preview` |

> Catatan kondisi working tree saat dokumen ini dibuat: `AppRoutes.tsx` masih versi
> template (hanya `/`, `/about`, `/api-status`), sehingga `LoginPage` belum
> terdaftar. Karena itu F9 wajib dikerjakan — kalau tidak, CAPTCHA tidak akan
> pernah tampil.

**Jangan** menaruh file backend di `app/Http/Controllers/` kecuali sudah tertulis
demikian. `CaptchaController` berada di `app/Http/Controllers/Api/V1/` (mengikuti
`HealthController`/`PingController`), sedangkan `CaptchaService` di `app/Services/`
(bukan `app/Http/Services`, bukan `app/Support`).

---

## 2. Urutan pengerjaan

```
B1  →  B2  →  B3  →  B4  →  B5  →  B6  →  B7  →  B8/B9   (backend selesai & teruji)
F1  →  F2  →  F3  →  F4  →  F5  →  F6  →  F7  →  F8  →  F9  (frontend)
```

Kerjakan backend dulu sampai test hijau. Frontend yang memanggil endpoint yang
belum ada hanya akan menampilkan pesan error.

---

## B1. Migrasi tabel `captcha_challenges`

**File baru:** `backend/database/migrations/2026_11_12_000001_create_captcha_challenges_table.php`

```php
 
```

Yang perlu diperhatikan:

- `answer_hash` **64 karakter** karena HMAC-SHA256 menghasilkan 64 hex. Jangan
  diganti `string(255)` tanpa alasan — `char(64)` membuat panjangnya eksplisit.
- `nonce` dipakai agar hash jawaban unik per challenge, sehingga dua challenge
  dengan soal sama tidak punya hash yang sama.
- `consumed_at` = penanda single-use. Jangan diganti kolom boolean; timestamp
  memberi jejak audit kapan dipakai.

---

## B2. Konfigurasi

**File baru:** `backend/config/captcha.php`

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Local CAPTCHA
    |--------------------------------------------------------------------------
    |
    | CAPTCHA dibuat dan diverifikasi sepenuhnya di backend. Nilai di bawah bisa
    | dioverride lewat .env tanpa mengubah kode.
    |
    */

    // Umur challenge dalam detik.
    'ttl' => (int) env('CAPTCHA_TTL', 120),

    // Jumlah percobaan jawaban salah sebelum challenge dianggap hangus.
    'max_attempts' => (int) env('CAPTCHA_MAX_ATTEMPTS', 5),

    // Context yang diizinkan. Context mencegah challenge login dipakai di checkout.
    'contexts' => ['login', 'checkout'],

];
```

Opsional, tambahkan di `backend/.env` (boleh dilewati karena ada default):

```env
CAPTCHA_TTL=120
CAPTCHA_MAX_ATTEMPTS=5
```

> Setelah mengubah/menambah file di `config/`, jalankan `php artisan config:clear`
> bila Anda memakai config cache.

---

## B3. Model

**File baru:** `backend/app/Models/CaptchaChallenge.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CaptchaChallenge extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'question',
        'nonce',
        'answer_hash',
        'context',
        'fingerprint',
        'attempts',
        'expires_at',
        'consumed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function isUsable(): bool
    {
        return $this->consumed_at === null && $this->expires_at->isFuture();
    }
}
```

Perhatikan model ini memakai `casts()` (method), sama seperti `User` di project ini —
bukan properti `$casts`.

---

## B4. Service CAPTCHA

**File baru:** `backend/app/Services/CaptchaService.php`
(Buat folder `backend/app/Services/` jika belum ada. Saat ini folder itu belum ada.)

```php
<?php

namespace App\Services;

use App\Models\CaptchaChallenge;
use Illuminate\Http\Request;

class CaptchaService
{
    /**
     * Membuat challenge baru.
     *
     * Mengembalikan juga jawaban asli untuk dipakai controller/test. Field
     * 'answer' TIDAK BOLEH ikut dikirim ke frontend.
     *
     * @return array{challenge: CaptchaChallenge, answer: string}
     */
    public function issue(Request $request, string $context = 'login'): array
    {
        $this->prune();

        $left = random_int(2, 9);
        $right = random_int(2, 9);
        $answer = $left + $right;
        $nonce = bin2hex(random_bytes(16)); // 32 karakter

        $challenge = CaptchaChallenge::create([
            'question' => sprintf('Berapa hasil dari %d + %d?', $left, $right),
            'nonce' => $nonce,
            'answer_hash' => $this->hashAnswer($nonce, (string) $answer),
            'context' => $context,
            'fingerprint' => $this->fingerprint($request),
            'expires_at' => now()->addSeconds($this->ttl()),
        ]);

        return ['challenge' => $challenge, 'answer' => (string) $answer];
    }

    /**
     * Memverifikasi jawaban. Challenge langsung hangus bila benar,
     * dan hangus setelah percobaan salah melewati batas.
     */
    public function verify(Request $request, int $challengeId, string $answer, string $context = 'login'): bool
    {
        $challenge = CaptchaChallenge::find($challengeId);

        if ($challenge === null) {
            return false;
        }

        // Challenge login tidak boleh dipakai di checkout, dan sebaliknya.
        if ($challenge->context !== $context) {
            return false;
        }

        if ($challenge->consumed_at !== null) {
            return false;
        }

        // Challenge terikat pada IP + User-Agent pembuatnya.
        if (! hash_equals($challenge->fingerprint, $this->fingerprint($request))) {
            return false;
        }

        if ($challenge->expires_at->isPast()) {
            return false;
        }

        if ($challenge->attempts >= $this->maxAttempts()) {
            return false;
        }

        $normalized = preg_replace('/\D/', '', trim($answer)) ?? '';

        if ($normalized === '' || ! hash_equals(
            $challenge->answer_hash,
            $this->hashAnswer($challenge->nonce, (string) (int) $normalized),
        )) {
            $challenge->increment('attempts');

            if ($challenge->attempts >= $this->maxAttempts()) {
                $challenge->forceFill(['consumed_at' => now()])->save();
            }

            return false;
        }

        // Single-use: klaim challenge secara atomik. Hanya satu request yang menang.
        $claimed = CaptchaChallenge::query()
            ->whereKey($challenge->getKey())
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->update(['consumed_at' => now()]);

        return $claimed === 1;
    }

    protected function hashAnswer(string $nonce, string $answer): string
    {
        return hash_hmac('sha256', $nonce.'|'.$answer, (string) config('app.key'));
    }

    /**
     * Mengikat challenge ke client tanpa cookie session.
     */
    protected function fingerprint(Request $request): string
    {
        $raw = ($request->ip() ?? 'unknown').'|'.($request->userAgent() ?? 'unknown');

        return hash_hmac('sha256', $raw, (string) config('app.key'));
    }

    protected function ttl(): int
    {
        return max(30, (int) config('captcha.ttl', 120));
    }

    protected function maxAttempts(): int
    {
        return max(1, (int) config('captcha.max_attempts', 5));
    }

    /**
     * Bersihkan challenge lama supaya tabel tidak tumbuh tanpa batas.
     */
    protected function prune(): void
    {
        CaptchaChallenge::query()
            ->where('created_at', '<', now()->subHour())
            ->delete();
    }
}
```

Alasan teknis singkat:

- **HMAC, bukan `Hash::make`**: ruang jawaban kecil (4–18), bcrypt bisa di-brute
  force offline dengan cepat. HMAC dengan `APP_KEY` membuat hash tidak berguna
  tanpa kunci.
- **`hash_equals`**: perbandingan waktu konstan.
- **Normalisasi `preg_replace('/\D/', '', ...)`**: pengguna boleh mengetik spasi;
  hanya digit yang dipakai.
- **Klaim atomik**: mencegah satu challenge dipakai dua request paralel
  (double-submit pada login/checkout).
- **Fingerprint IP+UA**: pengganti cookie session karena CORS project ini
  `supports_credentials => false`.

---

## B5. Controller endpoint pembuat soal

**File baru:** `backend/app/Http/Controllers/Api/V1/CaptchaController.php`

```php
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
```

Response `data` **hanya** `id`, `question`, `expires_at`, `ttl`. Jangan menambahkan
`answer` atau `answer_hash` di sini.

---

## B6. Daftarkan route

**File diubah:** `backend/routes/api.php`

### B6.1 Tambahkan import

Di bagian atas, di antara import yang sudah ada:

```php
use App\Http\Controllers\Api\V1\CaptchaController;
```

Susunannya menjadi:

```php
use App\Http\Controllers\Api\V1\CaptchaController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PingController;
use App\Http\Controllers\Authcontroller;
```

### B6.2 Tambahkan route CAPTCHA

Sisipkan **di dalam** `Route::prefix('v1')->group(function (): void { ... });`,
tepat setelah baris `Route::get('/ping', ...)`:

```php
    // Local CAPTCHA: pembuat soal. Dibatasi 30 permintaan/menit per IP.
    Route::get('/captcha', [CaptchaController::class, 'show'])
        ->middleware('throttle:30,1')
        ->name('api.v1.captcha.show');
```

### B6.3 Batasi percobaan login

Ubah baris route login yang sekarang:

```php
        Route::post('/login', [Authcontroller::class, 'login'])->name('api.v1.auth.login');
```

menjadi:

```php
        Route::post('/login', [Authcontroller::class, 'login'])
            ->middleware('throttle:10,1')
            ->name('api.v1.auth.login');
```

> `throttle` sudah tersedia bawaan Laravel, tidak perlu didaftarkan di
> `bootstrap/app.php`. Alias yang terdaftar di sana hanya `admin`.

Hasil akhir yang benar untuk blok auth + captcha:

```php
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
```

---

## B7. Verifikasi CAPTCHA di login

**File diubah:** `backend/app/Http/Controllers/Authcontroller.php`

### B7.1 Tambahkan import

```php
use App\Services\CaptchaService;
```

Letaknya setelah `use Illuminate\Support\Facades\Hash;`:

```php
use App\Models\User;
use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
```

### B7.2 Ganti seluruh method `login()`

Hapus method `login()` yang lama, ganti dengan:

```php
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
```

Perhatikan urutan: **CAPTCHA dulu, kredensial kemudian**. Jangan dibalik. Kalau
dibalik, penyerang bisa memakai percobaan password untuk mengukur validitas
kredensial tanpa pernah menyentuh CAPTCHA.

**Jangan** membuat endpoint seperti `POST /captcha/verify`. Verifikasi hanya
terjadi di dalam `login()` (dan nanti di checkout). Endpoint verify publik akan
menjadi oracle untuk menebak jawaban.

---

## B8. Test CAPTCHA

**File baru:** `backend/tests/Feature/Api/CaptchaTest.php`

```php
<?php

namespace Tests\Feature\Api;

use App\Models\CaptchaChallenge;
use App\Models\User;
use App\Services\CaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class CaptchaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Membuat challenge dari IP + User-Agent yang sama dengan request login
     * di test ini, karena challenge terikat pada fingerprint tersebut.
     */
    private function issueForTestClient(): array
    {
        $request = Request::create('/api/v1/captcha', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'phpunit',
        ]);

        return app(CaptchaService::class)->issue($request, 'login');
    }

    private function postLogin(array $payload)
    {
        return $this->withHeader('User-Agent', 'phpunit')
            ->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->postJson('/api/v1/auth/login', $payload);
    }

    public function test_it_issues_a_challenge_without_leaking_the_answer(): void
    {
        $response = $this->getJson('/api/v1/captcha?context=login');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['id', 'question', 'expires_at', 'ttl'],
            ])
            ->assertJsonMissingPath('data.answer')
            ->assertJsonMissingPath('data.answer_hash');

        $this->assertDatabaseCount('captcha_challenges', 1);
    }

    public function test_login_requires_captcha_fields(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors(['captcha_id', 'captcha_answer']);
    }

    public function test_login_succeeds_with_correct_captcha_answer(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $issued = $this->issueForTestClient();

        $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $issued['challenge']->id,
            'captcha_answer' => $issued['answer'],
        ])->assertOk()->assertJsonStructure(['data' => ['token', 'token_type', 'user']]);
    }

    public function test_login_fails_with_wrong_captcha_answer(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $issued = $this->issueForTestClient();

        $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $issued['challenge']->id,
            'captcha_answer' => '999',
        ])->assertStatus(422)->assertJsonPath('data.captcha_required', true);

        // Percobaan salah tidak menghanguskan challenge selama masih di bawah batas.
        $this->assertNull(CaptchaChallenge::find($issued['challenge']->id)->consumed_at);
    }

    public function test_challenge_is_single_use(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $issued = $this->issueForTestClient();

        $payload = [
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $issued['challenge']->id,
            'captcha_answer' => $issued['answer'],
        ];

        $this->postLogin($payload)->assertOk();
        $this->postLogin($payload)->assertStatus(422);
    }

    public function test_challenge_is_bound_to_context(): void
    {
        $request = Request::create('/api/v1/captcha', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'phpunit',
        ]);

        $issued = app(CaptchaService::class)->issue($request, 'checkout');

        $this->assertFalse(app(CaptchaService::class)->verify(
            $request,
            $issued['challenge']->id,
            $issued['answer'],
            'login',
        ));
    }

    public function test_challenge_expires(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $issued = $this->issueForTestClient();
        $issued['challenge']->forceFill(['expires_at' => now()->subSecond()])->save();

        $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $issued['challenge']->id,
            'captcha_answer' => $issued['answer'],
        ])->assertStatus(422);
    }
}
```

---

## B9. Perbarui `AuthTest`

**File diubah:** `backend/tests/Feature/Api/AuthTest.php`

Tanpa perubahan ini, tiga test login akan gagal (422) karena CAPTCHA wajib.
Ganti **seluruh isi file** dengan versi berikut (test register/me/logout tidak
berubah):

```php
<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Services\CaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Challenge terikat pada IP + User-Agent, jadi kedua nilai itu disamakan
     * antara pembuatan challenge dan request login.
     */
    private function makeCaptcha(): array
    {
        $request = Request::create('/api/v1/captcha', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'phpunit',
        ]);

        return app(CaptchaService::class)->issue($request, 'login');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function postLogin(array $payload)
    {
        return $this->withHeader('User-Agent', 'phpunit')
            ->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->postJson('/api/v1/auth/login', $payload);
    }

    public function test_register_user_returns_success_with_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Customer Test',
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'token',
                    'token_type',
                    'user',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'customer@example.com',
            'role' => 'user',
        ]);
    }

    public function test_login_with_valid_credentials_returns_token(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $captcha = $this->makeCaptcha();

        $response = $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $captcha['challenge']->id,
            'captcha_answer' => $captcha['answer'],
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'token',
                    'token_type',
                    'user',
                ],
            ]);
    }

    public function test_login_with_invalid_credentials_returns_401(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $captcha = $this->makeCaptcha();

        $response = $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'wrongpassword',
            'captcha_id' => $captcha['challenge']->id,
            'captcha_answer' => $captcha['answer'],
        ]);

        $response->assertStatus(401);
    }

    public function test_login_without_captcha_is_rejected(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password123',
        ])->assertStatus(422);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
        ]);

        $response = $this->withToken($user->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/auth/me');

        $response->assertOk()->assertJsonPath('data.user.email', $user->email);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        // Reset cached auth guard so the next request re-resolves from the (revoked) token.
        $this->app['auth']->forgetGuards();

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }
}
```
0bf3cdd0d9ec
---

## F1. API client CAPTCHA

**File baru:** `frontend/src/api/captcha.ts`

```ts
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export type CaptchaContext = 'login' | 'checkout';

/** Nilai yang dipegang form: id challenge + jawaban pengguna. */
export interface CaptchaValue {
  id: number | null;
  answer: string;
}

export interface CaptchaChallenge {
  id: number;
  question: string;
  expires_at: string;
  ttl: number;
}

/**
 * Meminta soal CAPTCHA baru. Param `_` mencegah cache browser.
 */
export async function fetchCaptcha(context: CaptchaContext = 'login'): Promise<CaptchaChallenge> {
  const { data } = await apiClient.get<ApiResponse<CaptchaChallenge>>('/captcha', {
    params: { context, _: Date.now() },
  });

  return data.data;
}
```

Catatan: `apiClient` sudah punya `baseURL` yang berakhiran `/api/v1`, jadi path-nya
`/captcha` — **bukan** `/api/v1/captcha`. Menulis path lengkap akan menghasilkan
`/api/v1/api/v1/captcha` (404).

---

## F2. Komponen widget

**File baru:** `frontend/src/components/shared/CaptchaField.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  fetchCaptcha,
  type CaptchaChallenge,
  type CaptchaContext,
  type CaptchaValue,
} from '../../api/captcha';
import { getApiErrorMessage } from '../../api/client';
import '../../styles/captcha.css';

interface CaptchaFieldProps {
  context: CaptchaContext;
  value: CaptchaValue;
  /** Kirim setter state langsung (mis. `setCaptcha`), jangan arrow function. */
  onChange: (value: CaptchaValue) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Naikkan angka ini dari parent untuk memaksa soal baru. */
  resetSignal?: number;
}

export default function CaptchaField({
  context,
  value,
  onChange,
  disabled = false,
  invalid = false,
  resetSignal = 0,
}: CaptchaFieldProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const next = await fetchCaptcha(context);
      setChallenge(next);
      onChange({ id: next.id, answer: '' });
    } catch (requestError) {
      setChallenge(null);
      onChange({ id: null, answer: '' });
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [context, onChange]);

  useEffect(() => {
    void load();
  }, [load, resetSignal]);

  return (
    <div className={`captcha-field${invalid ? ' is-invalid' : ''}`}>
      <div className="captcha-row">
        <p className="captcha-question" aria-live="polite">
          {loading ? 'Memuat soal…' : (challenge?.question ?? 'Soal tidak tersedia')}
        </p>
        <button
          className="captcha-refresh"
          type="button"
          onClick={() => void load()}
          disabled={disabled || loading}
        >
          Soal baru
        </button>
      </div>

      <input
        className="captcha-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="Jawaban CAPTCHA"
        placeholder="Tulis jawaban di sini"
        value={value.answer}
        onChange={(event) =>
          onChange({
            ...value,
            answer: event.target.value.replace(/\D/g, '').slice(0, 6),
          })
        }
        disabled={disabled || loading || challenge === null}
        required
      />

      {challenge !== null && error === '' && (
        <p className="captcha-hint">
          Soal berlaku {challenge.ttl} detik dan hanya bisa dipakai sekali.
        </p>
      )}

      {error !== '' && (
        <p className="captcha-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

Kenapa `onChange` harus setter langsung: `load` bergantung pada `onChange`, dan
`load` dipanggil di `useEffect`. Kalau parent mengirim arrow function baru setiap
render, `load` ikut berubah identitas setiap render → request soal berulang tanpa
henti.

---

## F3. Style

**File baru:** `frontend/src/styles/captcha.css`

```css
/* CAPTCHA lokal — dipakai di #page-login, checkout, dan #page-captcha. */

#page-login .captcha-field,
#page-captcha .captcha-field{
  display: grid;
  gap: 9px;
}

#page-login .captcha-row,
#page-captcha .captcha-row{
  display: flex;
  min-height: 49px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 12px;
  border: 1px solid var(--border, #e8e9ec);
  border-radius: 11px;
  background: #f4f6fb;
}

#page-login .captcha-question,
#page-captcha .captcha-question{
  margin: 0;
  color: var(--ink, #151d30);
  font-size: 14px;
  font-weight: 600;
}

#page-login .captcha-refresh,
#page-captcha .captcha-refresh{
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--blue, #2862ed);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

#page-login .captcha-refresh:hover,
#page-captcha .captcha-refresh:hover{
  text-decoration: underline;
}

#page-login .captcha-refresh:disabled,
#page-captcha .captcha-refresh:disabled{
  opacity: 0.5;
  cursor: not-allowed;
}

#page-login .captcha-input,
#page-captcha .captcha-input{
  width: 100%;
  height: 49px;
  padding: 0 12px;
  border: 1px solid var(--border, #e8e9ec);
  border-radius: 11px;
  outline: 0;
  background: rgba(255, 255, 255, 0.38);
  color: var(--ink, #151d30);
  font: inherit;
  font-size: 13px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

#page-login .captcha-input::placeholder,
#page-captcha .captcha-input::placeholder{
  color: #969ba4;
}

#page-login .captcha-input:focus,
#page-captcha .captcha-input:focus{
  border-color: #8aaaf8;
  box-shadow: 0 0 0 3px rgba(40, 98, 237, 0.1);
}

#page-login .captcha-field.is-invalid .captcha-input,
#page-captcha .captcha-field.is-invalid .captcha-input{
  border-color: #e0574d;
}

#page-login .captcha-hint,
#page-captcha .captcha-hint{
  margin: 0;
  color: #858a94;
  font-size: 11px;
  line-height: 1.5;
}

#page-login .captcha-error,
#page-captcha .captcha-error{
  margin: 0;
  color: #c0392b;
  font-size: 11px;
  line-height: 1.5;
}

/* Halaman pratinjau /captcha-preview */

#page-captcha{
  --blue: #2862ed;
  --ink: #151d30;
  --muted: #858a94;
  --border: #e8e9ec;
  min-height: 100vh;
  background: #fafafa;
  color: var(--ink);
  font-family: "DM Sans", sans-serif;
  -webkit-font-smoothing: antialiased;
}

#page-captcha *{
  box-sizing: border-box;
}

#page-captcha .captcha-page{
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 48px 24px;
}

#page-captcha .captcha-card{
  display: grid;
  width: min(100%, 430px);
  gap: 16px;
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
}

#page-captcha h1{
  margin: 0;
  font-family: Manrope, sans-serif;
  font-size: 20px;
  letter-spacing: -0.02em;
}

#page-captcha p{
  margin: 0;
  color: #5b6270;
  font-size: 13px;
  line-height: 1.6;
}

#page-captcha code{
  padding: 1px 5px;
  border-radius: 5px;
  background: #eef2fb;
  font-size: 12px;
}

#page-captcha .captcha-status{
  color: var(--muted);
  font-size: 12px;
}

#page-captcha .captcha-secondary{
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}

#page-captcha .captcha-secondary:hover{
  border-color: #c9d3ea;
}
```

---

## F4. Halaman baru `/captcha-preview`

**File baru:** `frontend/src/pages/CaptchaPreviewPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import CaptchaField from '../components/shared/CaptchaField';
import type { CaptchaValue } from '../api/captcha';

/**
 * Halaman pratinjau CAPTCHA.
 *
 * Halaman ini hanya menguji pembuatan soal. Verifikasi tetap terjadi di backend
 * saat login/checkout, karena tidak ada endpoint verify publik.
 */
export default function CaptchaPreviewPage() {
  const [captcha, setCaptcha] = useState<CaptchaValue>({ id: null, answer: '' });
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    document.title = 'Pratinjau CAPTCHA — EaterSive';
  }, []);

  return (
    <div id="page-captcha">
      <main className="captcha-page">
        <article className="captcha-card">
          <h1>Pratinjau Local CAPTCHA</h1>
          <p>
            Soal di bawah dibuat oleh <code>GET /api/v1/captcha</code>. Jawaban tidak
            pernah dikirim ke browser; verifikasi hanya terjadi di endpoint login.
          </p>

          <CaptchaField
            context="login"
            value={captcha}
            onChange={setCaptcha}
            resetSignal={resetSignal}
          />

          <p className="captcha-status">
            ID challenge aktif: {captcha.id ?? '—'} · jawaban:{' '}
            {captcha.answer === '' ? '(kosong)' : captcha.answer}
          </p>

          <button
            className="captcha-secondary"
            type="button"
            onClick={() => setResetSignal((current) => current + 1)}
          >
            Minta soal baru
          </button>
        </article>
      </main>
    </div>
  );
}
```

---

## F5. `apiLogin` mengirim jawaban CAPTCHA

**File diubah:** `frontend/src/api/auth.ts`

Tambahkan import di baris paling atas:

```ts
import type { CaptchaValue } from './captcha';
```

Ganti fungsi `apiLogin` menjadi:

```ts
export async function apiLogin(
  email: string,
  password: string,
  captcha: CaptchaValue,
): Promise<AuthPayload> {
  const { data } = await apiClient.post<ApiResponse<AuthPayload>>('/auth/login', {
    email,
    password,
    captcha_id: captcha.id,
    captcha_answer: captcha.answer,
  });

  return data.data;
}
```

Nama field harus `captcha_id` dan `captcha_answer` — sama dengan validasi di
`Authcontroller::login()`.

---

## F6. Signature `login()` di context

**File diubah:** `frontend/src/auth/auth-context.ts`

Isi lengkap setelah perubahan:

```ts
import { createContext } from 'react';
import type { CaptchaValue } from '../api/captcha';
import type { AuthSession, LoginResult } from '../types/auth';

export interface AuthContextValue {
  session: AuthSession | null;
  login: (
    email: string,
    password: string,
    remember: boolean,
    captcha: CaptchaValue,
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** Sinkronkan nama/email sesi setelah profil diperbarui di backend. */
  updateSessionUser: (partial: Partial<Pick<AuthSession, 'name' | 'email'>>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
```

---

## F7. `AuthProvider` meneruskan CAPTCHA

**File diubah:** `frontend/src/auth/AuthProvider.tsx`

Tambahkan import:

```ts
import type { CaptchaValue } from '../api/captcha';
```

Ganti fungsi `login` di dalam provider menjadi:

```tsx
  async function login(
    email: string,
    password: string,
    remember: boolean,
    captcha: CaptchaValue,
  ): Promise<LoginResult> {
    try {
      const payload = await apiLogin(email, password, captcha);

      const nextSession: AuthSession = {
        userId: String(payload.user.id),
        name: payload.user.name,
        email: payload.user.email,
        role: payload.user.role === 'admin' ? 'owner' : 'user',
        token: payload.token,
      };

      writeAuthSession(nextSession, remember);
      setSession(nextSession);

      return { ok: true, session: nextSession };
    } catch (error) {
      return { ok: false, message: getApiErrorMessage(error) };
    }
  }
```

Cek juga apakah ada pemanggil `login(` lain:

```bash
cd frontend
grep -rn "login(" src --include=*.tsx --include=*.ts
```

Semua pemanggil harus menambahkan argumen keempat.

---

## F8. Pasang di `LoginPage`

**File diubah:** `frontend/src/pages/user/LoginPage.tsx`

Ada 4 titik perubahan.

### F8.1 Import

Tambahkan setelah `import useAuth from '../../auth/useAuth';`:

```tsx
import CaptchaField from '../../components/shared/CaptchaField';
import type { CaptchaValue } from '../../api/captcha';
```

### F8.2 State

Tambahkan setelah baris `const [pending, setPending] = useState(false);`:

```tsx
  const [captcha, setCaptcha] = useState<CaptchaValue>({ id: null, answer: '' });
  const [captchaReset, setCaptchaReset] = useState(0);
```

### F8.3 Ganti `handleSubmit`

```tsx
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage('');

    if (!captcha.id || captcha.answer.trim() === '') {
      setMessageIsError(true);
      setMessage('Jawab soal CAPTCHA terlebih dahulu.');
      return;
    }

    setPending(true);

    const result = await login(email, password, remember, captcha);

    setPending(false);

    if (!result.ok) {
      setMessageIsError(true);
      setMessage(result.message);

      // Challenge sudah terpakai/kedaluwarsa → wajib soal baru.
      setCaptcha({ id: null, answer: '' });
      setCaptchaReset((current) => current + 1);
      return;
    }

    setMessageIsError(false);
    navigate(resolveRedirect(result.session.role, from), { replace: true });
  }
```

### F8.4 JSX widget

Sisipkan **di antara** blok `remember-option` dan tombol submit:

```tsx
            <div className="field-group">
              <label>Verifikasi Keamanan</label>
              <CaptchaField
                context="login"
                value={captcha}
                onChange={setCaptcha}
                disabled={pending}
                invalid={messageIsError}
                resetSignal={captchaReset}
              />
            </div>

            <button className="submit-button" type="submit" disabled={pending}>
```

Jangan membungkus `<CaptchaField />` di dalam `<div className="input-wrap">`;
komponen itu sudah punya input sendiri.

---

## F9. Daftarkan route frontend

**File diubah:** `frontend/src/routes/AppRoutes.tsx`

Isi lengkap setelah perubahan (route template tetap dipertahankan):

```tsx
import { Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AboutPage from '../pages/AboutPage';
import ApiStatusPage from '../pages/ApiStatusPage';
import CaptchaPreviewPage from '../pages/CaptchaPreviewPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import LoginPage from '../pages/user/LoginPage';

/**
 * Daftar route frontend. Semua route dirender oleh React, bukan Laravel.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Login punya layout sendiri (tanpa MainLayout). */}
      <Route path="login" element={<LoginPage />} />

      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="api-status" element={<ApiStatusPage />} />
        <Route path="captcha-preview" element={<CaptchaPreviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

Kalau project Anda punya `AppRoutes.tsx` versi lengkap (dengan route user/owner),
**jangan** menimpa seluruh file — cukup tambahkan dua baris:

```tsx
<Route path="login" element={<LoginPage />} />
<Route path="captcha-preview" element={<CaptchaPreviewPage />} />
```

---

## 3. Command yang dijalankan sendiri

### Backend

```bash
cd backend

# 1. Buat tabel
php artisan migrate

# 2. Pastikan route terdaftar
php artisan route:list --path=api/v1/captcha
php artisan route:list --path=api/v1/auth/login

# 3. Test CAPTCHA + regresi auth
php artisan test --filter=CaptchaTest
php artisan test --filter=AuthTest
```

### Frontend

```bash
cd frontend
npm run build
```

---

## 4. Checklist testing manual

| # | Langkah | Hasil yang diharapkan |
| --- | --- | --- |
| 1 | `GET http://127.0.0.1:8000/api/v1/captcha?context=login` | JSON `{success:true, data:{id, question, expires_at, ttl}}`, **tanpa** `answer` |
| 2 | Buka `/captcha-preview` | Soal muncul, tombol "Soal baru" mengganti soal, ID challenge berubah |
| 3 | Buka `/login`, isi email+password benar, jawab CAPTCHA benar | Masuk dan diarahkan ke halaman sesuai role |
| 4 | Jawab CAPTCHA salah | Pesan "Verifikasi CAPTCHA gagal…", soal otomatis berganti |
| 5 | Login sukses, lalu submit ulang payload lama (Postman) | HTTP 422 — challenge single-use |
| 6 | Diamkan soal > 120 detik lalu submit | HTTP 422 |
| 7 | Kosongkan jawaban CAPTCHA | Pesan "Jawab soal CAPTCHA terlebih dahulu." tanpa request ke backend |
| 8 | Submit login > 10 kali dalam 1 menit | HTTP 429 (throttle) |
| 9 | Minta soal > 30 kali dalam 1 menit | HTTP 429 |
| 10 | Cek DB: `SELECT id, attempts, consumed_at FROM captcha_challenges;` | Jawaban **tidak** tersimpan sebagai teks biasa, `consumed_at` terisi setelah dipakai |

---

## 5. Kesalahan umum dan cara mengenalinya

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| 404 saat buka `/api/v1/captcha` | Route belum disisipkan di dalam grup `prefix('v1')` | Cek B6.2, pastikan di dalam `Route::prefix('v1')->group()` |
| `SQLSTATE[42S02]: Base table or view not found: captcha_challenges` | Migrasi belum jalan | `php artisan migrate` |
| 404 pada `POST /api/v1/api/v1/captcha` | Path ditulis lengkap padahal `apiClient.baseURL` sudah `/api/v1` | Gunakan `'/captcha'` (F1) |
| Solat tidak pernah muncul di `/login` | `LoginPage` belum terdaftar di `AppRoutes.tsx` | Kerjakan F9 |
| Request soal berulang tanpa henti | `onChange` dikirim sebagai arrow function | Kirim `setCaptcha` langsung (F2, F8.4) |
| Login selalu 422 walau jawaban benar | Client berganti IP/User-Agent (proxy, mobile network) | Fingerprint sengaja ketat; refresh soal setelah jaringan berubah |
| Semua test login gagal 422 | `AuthTest` belum diperbarui | Kerjakan B9 |
| `Target class [App\Services\CaptchaService] does not exist` | File salah folder atau namespace salah | Path `app/Services/CaptchaService.php`, namespace `App\Services` |
| Perubahan config tidak terpakai | Config cache | `php artisan config:clear` |
| CORS error | Origin tidak ada di `FRONTEND_URL` | Samakan dengan origin Vite (`http://localhost:5173`) |

---

## 6. Lampiran — memasang CAPTCHA di checkout (pre-payment)

Bagian ini **hanya** bisa dikerjakan setelah endpoint checkout tersedia. Saat
dokumen ini dibuat, `routes/api.php` belum memuat route `orders`, sehingga belum
ada tempat menempelkan verifikasi.

Rekomendasi endpoint: `POST /api/v1/orders/{id}/checkout` dengan middleware
`auth:sanctum`, header `Idempotency-Key`, dan verifikasi berikut **di awal method,
sebelum menyentuh payment gateway**:

```php
        $attributes = $request->validate([
            'captcha_id' => ['required', 'integer', 'min:1'],
            'captcha_answer' => ['required', 'string', 'max:10'],
            'idempotency_key' => ['required', 'string', 'max:100'],
        ]);

        if (! app(\App\Services\CaptchaService::class)->verify(
            $request,
            (int) $attributes['captcha_id'],
            (string) $attributes['captcha_answer'],
            'checkout',
        )) {
            return response()->json([
                'success' => false,
                'message' => 'Verifikasi CAPTCHA gagal atau sudah kedaluwarsa.',
                'data' => ['captcha_required' => true],
            ], 422);
        }

        // Baru setelah ini: validasi ulang pesanan & total dari database,
        // cek idempotency, lalu buat payment session.
```

Aturan yang tidak boleh dilanggar:

1. Nominal **tidak** diambil dari request; hitung ulang dari `pesanan` + `daftar_layanan` di database.
2. CAPTCHA diverifikasi sebelum payment session dibuat, bukan sesudahnya.
3. `Idempotency-Key` disimpan/diperiksa agar retry tidak membuat dua transaksi.
4. CAPTCHA bukan pengganti validasi pembayaran/webhook.

Di frontend, widget yang sama dipakai dengan `context="checkout"`:

```tsx
<CaptchaField
  context="checkout"
  value={captcha}
  onChange={setCaptcha}
  disabled={pending}
  invalid={messageIsError}
  resetSignal={captchaReset}
/>
```

dan nilai `captcha_id`/`captcha_answer` dikirim bersama `Idempotency-Key`.

---

## 7. Catatan perbaikan — 12 November 2026

Setelah kode di dokumen ini dipasang, `npx tsc -b` memunculkan **4 error**. Semuanya berasal dari
**ketidaksinkronan versi**: sebagian file sudah versi baru (ber-CAPTCHA), sebagian masih versi lama.
Bagian ini mencatat penyebab dan perbaikannya, supaya kalau file ini di-rollback lagi, gejalanya
langsung dikenali.

### 7.1 `apiLogin` hanya menerima 2 argumen

```
src/auth/AuthProvider.tsx:42:55 - error TS2554: Expected 2 arguments, but got 3.
```

`AuthProvider` sudah memanggil `apiLogin(email, password, captcha)`, tetapi `src/api/auth.ts` masih
versi lama. **Ini kesalahan paling berbahaya**: tanpa perbaikan, nomor soal dan jawaban CAPTCHA tidak
pernah terkirim, sehingga backend akan menolak setiap login dengan HTTP 422. Build gagal, jadi tidak
langsung terlihat sebagai bug runtime — tapi kalau dipaksa `// @ts-ignore`, login akan selalu gagal.

Perbaikan di `src/api/auth.ts`:

```ts
import type { CaptchaValue } from './captcha';

export async function apiLogin(
  email: string,
  password: string,
  captcha: CaptchaValue,
): Promise<AuthPayload> {
  /* Backend memverifikasi CAPTCHA sebelum memeriksa kredensial. */
  const { data } = await apiClient.post<ApiResponse<AuthPayload>>('/auth/login', {
    email,
    password,
    captcha_id: captcha.id,
    captcha_answer: captcha.answer,
  });

  return data.data;
}
```

Nama field `captcha_id` dan `captcha_answer` **harus** sama dengan aturan validasi di
`Authcontroller::login()` (B7). Kalau salah nama, hasilnya `422` dengan pesan validasi biasa.

### 7.2 `updateSessionUser` dideklarasikan tapi tidak diimplementasi

```
src/auth/AuthProvider.tsx:73:27 - error TS2741: Property 'updateSessionUser' is missing ...
```

`src/auth/auth-context.ts` sudah punya `updateSessionUser` di interface, dan
`OwnerSettingsPage` memakainya setelah profil disimpan — tapi `AuthProvider` belum menyediakannya,
jadi `AuthContext.Provider` tidak memenuhi tipe. Perbaikan di `src/auth/AuthProvider.tsx`:

```ts
import { SESSION_KEY } from './session-store';

/** Sinkronkan nama/email sesi lokal setelah profil diperbarui di backend. */
function updateSessionUser(partial: Partial<Pick<AuthSession, 'name' | 'email'>>) {
  setSession((current) => {
    if (!current) return current;

    const next: AuthSession = { ...current, ...partial };
    /* Pertahankan pilihan "ingat saya": sesi tetap di storage yang sama. */
    const remembered = window.localStorage.getItem(SESSION_KEY) !== null;
    writeAuthSession(next, remembered);

    return next;
  });
}
```

lalu:

```tsx
<AuthContext.Provider value={{ session, login, logout, updateSessionUser }}>
```

**Kenapa mengecek `localStorage`?** `writeAuthSession(session, remember)` wajib tahu storage mana
yang dipakai. Kalau salah tebak, sesi "ingat saya" pindah ke `sessionStorage` dan pengguna ter-logout
saat tab ditutup. `SESSION_KEY` hanya ada di satu storage pada satu waktu (lihat
`src/auth/session-store.ts`), jadi keberadaannya di `localStorage` adalah penanda yang andal.

### 7.3 Tipe `DemoAccount` hilang

```
src/data/demoAccounts.ts:1:25 - error TS2305: Module '"../types/auth"' has no exported member 'DemoAccount'.
```

`src/data/demoAccounts.ts` masih ada, tetapi `DemoAccount` sudah dihapus dari `src/types/auth.ts`.
Ditambahkan kembali ke `src/types/auth.ts`:

```ts
/** Akun demo lokal (tanpa backend) yang dipakai halaman template lama. */
export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: AuthRole;
}
```

**Catatan penting:** file ini **tidak diimpor di mana pun** (`grep -rn "DEMO_ACCOUNTS" src` kosong).
Artinya autentikasi demo lokal sudah mati dan semua login lewat API. File ini boleh dihapus
bersama tipe di atas; saya tidak menghapusnya supaya tidak ada keputusan destruktif yang tidak diminta.
`tsconfig.app.json` meng-`include` seluruh `src`, jadi file mati pun tetap diperiksa TypeScript dan
tetap bisa menggagalkan build.

### 7.4 `OwnerNavKey` tidak mengenal `settings`

```
src/pages/owner/OwnerSettingsPage.tsx:129:7 - error TS2322: Type '"settings"' is not assignable to type 'OwnerNavKey'.
```

`OwnerSettingsPage` mengirim `activeNav="settings"`, tetapi union type di
`src/components/owner/OwnerShell.tsx` berhenti di `'reviews'`. Perbaikan:

```ts
export type OwnerNavKey = 'dashboard' | 'orders' | 'catalog' | 'reviews' | 'settings';
```

Lalu link sidebar "Pengaturan" — sebelumnya `<a href="#pengaturan">`, anchor mati yang tidak pernah
menandai halaman aktif — diubah menjadi `Link` sungguhan:

```tsx
<Link
  className={`nav-link${activeNav === 'settings' ? ' is-active' : ''}`}
  to="/owner/settings"
  aria-current={activeNav === 'settings' ? 'page' : undefined}
  onClick={() => setSidebarOpen(false)}
>
  {SETTINGS_ICON}
  <span>Pengaturan</span>
  {activeNav === 'settings' && (
    <span className="nav-chevron" aria-hidden="true">
      ›
    </span>
  )}
</Link>
```

### 7.5 Halaman pengaturan belum punya route

`OwnerSettingsPage` sudah ada tapi tidak terdaftar, sehingga `/owner/settings` jatuh ke `NotFoundPage`.
Ditambahkan di dalam blok `RequireRole role="owner"` pada `src/routes/AppRoutes.tsx`:

```tsx
import OwnerSettingsPage from '../pages/owner/OwnerSettingsPage';
```

```tsx
<Route path="/owner/settings" element={<OwnerSettingsPage />} />
```

Route ini **wajib** berada di dalam `<Route element={<RequireRole role="owner" />}>`. Kalau diletakkan
di luar, halaman berisi email dan form ubah password bisa dibuka tanpa login.

### 7.6 Hasil verifikasi

```
cd frontend
npx tsc -b            # exit 0, tanpa error
```

Yang **belum** diverifikasi: halaman `/owner/settings` dan alur login ber-CAPTCHA di browser
(butuh backend + MySQL jalan). Untuk mengujinya:

1. `php artisan migrate` lalu `php artisan serve` di folder `backend`.
2. `npm run dev` di folder `frontend`.
3. Buka `/captcha-preview` → pastikan soal muncul dan tombol "Soal baru" bekerja.
4. Buka `/login` → login dengan jawaban salah (harus 422 "CAPTCHA salah"), lalu dengan jawaban benar.
5. Login sebagai owner → klik "Pengaturan" di sidebar → pastikan URL berubah ke `/owner/settings`
   tanpa reload penuh dan menu itu tersorot aktif.

### 7.7 Pola yang perlu diwaspadai

Gejala "campuran versi" seperti ini muncul kalau sebagian file di-`git restore` sementara file lain
tetap versi baru. Sebelum melapor error, cek dulu:

```bash
git status --short          # file mana yang berubah
git diff --stat             # seberapa banyak
grep -rn "captcha" src      # siapa saja yang sudah versi baru
```

Aturan praktisnya: **satu fitur lintas layer harus di-commit atau di-rollback sebagai satu kesatuan.**
CAPTCHA menyentuh `api/` → `auth/` → `pages/`, jadi memulihkan hanya `api/auth.ts` selalu
menghasilkan build yang gagal.

---

## 8. Dua gejala setelah migrasi belum dijalankan

### 8.1 "Soal tidak tersedia" + HTTP 500 `captcha_challenges doesn't exist`

```
SQLSTATE[42S02]: Base table or view not found: 1146 Table 'eatersive.captcha_challenges' doesn't exist
... delete from `captcha_challenges` where `created_at` < ...
```

Penyebabnya bukan kode: **migrasi belum dijalankan**. Perhatikan query `delete` di pesan error —
itu `CaptchaService::prune()`, yang dipanggil paling awal di `issue()`. Jadi request pertama ke
`GET /api/v1/captcha` langsung gagal sebelum sempat membuat soal.

Di frontend, `CaptchaField` menangkap error itu di blok `catch` dan menampilkan
`challenge === null` → **"Soal tidak tersedia"**. Jadi tulisan itu adalah gejala, bukan bug komponen.
Pesan aslinya hanya terlihat di konsol browser / `localStorage`-log server.

Perbaikan:

```bash
cd backend
php artisan migrate
```

Verifikasi tabel benar-benar ada:

```bash
php artisan tinker --execute="echo App\Models\CaptchaChallenge::count();"
```

**Kenapa tidak ketahuan saat test?** `phpunit.xml` memakai SQLite `:memory:` dan menjalankan
`RefreshDatabase`, jadi test selalu membuat tabel sendiri dari file migrasi. Database MySQL
pengembangan tidak ikut tersentuh. Ini pemisahan yang normal — tapi artinya **test hijau tidak
pernah membuktikan database dev sudah termigrasi.**

### 8.2 Tombol submit login tidak ada teksnya

```
<button className="submit-button" type="submit" disabled={pending}></button>
<button className="submit-button" type="submit" disabled={pending}>
  {pending ? 'Memproses…' : 'Masuk ke Akun'}
</button>
```

Ada **dua** `<button className="submit-button">` bertumpuk di `src/pages/user/LoginPage.tsx`:
satu kosong (sisa tempelan kode F8) tepat di atas tombol yang benar. Yang kosong tetap dirender
sebagai kotak biru selebar form, sehingga terlihat seperti tombol tanpa label — dan karena
`type="submit"`, klik di sana tetap mengirim form.

Perbaikan: hapus baris tombol kosong, sisakan satu tombol berisi teks. Kalau nanti mengedit file ini
lagi, cari pola `submit-button` dan pastikan jumlahnya **satu**:

```bash
grep -n "submit-button" src/pages/user/LoginPage.tsx
```

### 8.3 Hasil verifikasi

```
cd backend
php artisan migrate                                            # DONE: create_captcha_challenges_table
php artisan route:list --path=captcha                          # GET|HEAD api/v1/captcha
curl -i "http://127.0.0.1:8000/api/v1/captcha?context=login"   # 200, question terisi
php artisan test --filter=CaptchaTest                          # 7 passed (27 assertions)
```

Login dengan jawaban salah diuji lewat curl dan menghasilkan:

```
HTTP 422
{"success":false,"message":"Verifikasi CAPTCHA gagal atau sudah kedaluwarsa. Muat soal baru lalu coba lagi.","data":{"captcha_required":true}}
```

`422` (bukan `500`) memastikan tabel terbaca, fingerprint cocok, dan verifikasi berjalan sebelum
pemeriksaan kredensial.

`cd frontend && npx tsc -b` → exit 0 setelah tombol duplikat dihapus.

### 8.4 Kalau error yang sama masih muncul setelah `php artisan migrate`

Jangan langsung mengubah kode. Error 500 yang **sudah diperbaiki** bisa terus terlihat karena
tiga hal yang semuanya di luar PHP:

1. **Tab browser menampilkan respons lama.** `CaptchaField` menyimpan error di state; state itu baru
   berubah setelah ada request baru. Klik "Soal baru" atau hard-refresh (Ctrl+Shift+R).
2. **Log yang dibaca bukan log terbaru.** Cek timestamp-nya:

   ```bash
   cd backend
   grep -E "^\[2026" storage/logs/laravel.log | grep ERROR | sed -E 's/^\[([^]]+)\].*/\1/' | sort -u
   ```

   Bandingkan dengan waktu migrasi. Kalau semua error lebih tua dari migrasi, tidak ada masalah aktif.

3. **Database yang dipakai bukan yang dimigrasi** (mis. ada config cache atau `.env` lain):

   ```bash
   php artisan tinker --execute="echo DB::connection()->getDatabaseName() . ' / ' . config('database.default');"
   ls bootstrap/cache/config.php   # kalau ada, jalankan: php artisan config:clear
   ```

Bukti paling cepat bahwa masalah sudah selesai — endpoint harus `200`, dan login dengan jawaban
salah harus `422`, **bukan `500`**:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "User-Agent: cek" \
  "http://127.0.0.1:8000/api/v1/captcha?context=login"        # 200

curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "http://127.0.0.1:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" -H "Accept: application/json" -H "User-Agent: cek" \
  -d '{"email":"a@b.c","password":"secret123","captcha_id":1,"captcha_answer":"999"}'   # 422
```

`500` pada perintah pertama berarti tabel memang tidak ada di database yang sedang dipakai.
`422` berarti seluruh rantai (route → service → tabel → fingerprint → verifikasi) berjalan normal.

---

## 9. Halaman daftar akun `/register`

Sebelumnya halaman `/login` tidak punya jalan ke registrasi: tombol **Daftar** di landing page
mengarah ke `/login`, dan tidak ada form daftar sama sekali — meskipun backend `POST /api/v1/auth/register`
sudah ada dan `apiRegister()` sudah ditulis di `src/api/auth.ts`. Yang hilang hanya lapisan UI.

### 9.1 Keputusan desain

- **Halaman terpisah `/register`, bukan section di bawah form login.** Dua form besar dalam satu
  kartu membuat halaman login panjang dan mudah tertukar. Halaman daftar punya judul sendiri
  ("Buat Akun Baru") dan tautan balik ke `/login`.
- **Satu stylesheet untuk dua halaman.** `login.css` dan `captcha.css` sebelumnya di-scope ke id
  `#page-login`; scope-nya diubah menjadi kelas `.auth-page` (satu `sed` di kedua file) sehingga
  halaman login dan daftar memakai aturan CSS yang sama persis tanpa duplikasi. Konsekuensinya:
  pembungkus di `LoginPage.tsx` sekarang `<div className="auth-page">`, bukan `id="page-login"`.
- **Form daftar tetap `<form>` sendiri**, tidak berbagi state dengan form login. Nested `<form>`
  tidak valid di HTML dan akan membuat submit login ikut terkirim.
- **Tanpa CAPTCHA.** `Authcontroller::register()` belum memverifikasi CAPTCHA, jadi memasang
  `CaptchaField` di form daftar hanya akan jadi hiasan — nilainya tidak diperiksa siapa pun.
  Kalau nanti pendaftaran jadi sasaran spam, tambahkan verifikasi di backend dulu, baru widget-nya.
- **Tidak auto-login.** Response `/auth/register` memang berisi `token`, tetapi token itu tidak
  disimpan. Setelah akun tersimpan di database, pengguna diarahkan ke `/login` dengan state
  `{ registered: true, email }`; email terisi otomatis dan pengguna cukup memasukkan kata sandi.
  Alasannya: sesi baru dibuat setelah kredensial diverifikasi lewat jalur login yang memang sudah
  punya CAPTCHA, throttle, dan pencatatan. Karena itu checkbox "Ingat saya" tidak ada di halaman
  daftar — halaman itu tidak membuat sesi sama sekali.

### 9.2 File yang disentuh

| File | Perubahan |
|---|---|
| `backend/` | **tidak ada perubahan** — endpoint register sudah siap |
| `frontend/src/auth/AuthProvider.tsx` | `persistSession()` (ekstrak pemetaan payload → sesi), fungsi baru `register()`, `register` masuk ke value context |
| `frontend/src/auth/auth-context.ts` | tanda tangan `register` di `AuthContextValue` |
| `frontend/src/pages/user/RegisterPage.tsx` | **file baru** — halaman daftar lengkap |
| `frontend/src/pages/user/LoginPage.tsx` | tautan "Belum punya akun? Daftar sekarang" ke `/register`; pembungkus jadi `className="auth-page"` |
| `frontend/src/routes/AppRoutes.tsx` | route publik `/register` |
| `frontend/src/pages/user/LandingPage.tsx` | tombol **Daftar** di header mengarah ke `/register` (sebelumnya `/login`) |
| `frontend/src/styles/login.css` | scope `#page-login` → `.auth-page`, tambah `.signup-link` |
| `frontend/src/styles/captcha.css` | scope `#page-login` → `.auth-page` |

Bagian `AuthProvider` yang berubah:

```tsx
/** Ubah payload `token + user` dari backend menjadi sesi browser. */
function persistSession(payload: AuthPayload, remember: boolean): AuthSession {
  const nextSession: AuthSession = {
    userId: String(payload.user.id),
    name: payload.user.name,
    email: payload.user.email,
    role: payload.user.role === 'admin' ? 'owner' : 'user',
    token: payload.token,
  };

  writeAuthSession(nextSession, remember);
  setSession(nextSession);

  return nextSession;
}

/**
 * Daftar akun baru. Backend memang mengembalikan token, tetapi token itu
 * sengaja TIDAK disimpan: akun harus tersimpan dulu di database, lalu
 * pengguna masuk lewat halaman login seperti biasa.
 */
async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<RegisterResult> {
  try {
    await apiRegister(name, email, password, passwordConfirmation);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: getApiErrorMessage(error) };
  }
}
```

Handler di `RegisterPage.tsx`. Validasi kecocokan kata sandi dilakukan di frontend karena
`Authcontroller::register()` hanya memvalidasi `password` (min 8), tidak membandingkan
`password_confirmation`:

```tsx
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setMessage('');

  if (password !== passwordConfirmation) {
    setMessageIsError(true);
    setMessage('Konfirmasi kata sandi tidak cocok.');
    return;
  }

  setPending(true);
  const result = await register(name, email, password, passwordConfirmation);
  setPending(false);

  if (!result.ok) {
    setMessageIsError(true);
    setMessage(result.message);
    return;
  }

  /* Akun sudah tersimpan di database → pengguna masuk lewat halaman login. */
  navigate('/login', {
    replace: true,
    state: { registered: true, email: email.trim() },
  });
}
```

Route-nya publik, sejajar dengan `/login`:

```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
```

### 9.3 Perilaku yang perlu diketahui

- Akun baru selalu berperan `user` (backend mengisi `role` sendiri, tidak bisa ditentukan frontend).
- Token yang tetap dibuat backend dibiarkan apa adanya: `tests/Feature/Api/AuthTest.php` punya
  `test_register_user_returns_success_with_token`, jadi menghapus `token` dari response akan
  merusak kontrak yang sudah diuji. Frontend cuma tidak menyimpannya.
- Notifikasi sukses dikirim lewat `location.state`, bukan query string, supaya email tidak ikut
  tersimpan di riwayat browser. Pesannya memakai `.login-notice` yang sudah ada.
- Halaman daftar **tidak** memakai `from` — pengguna yang mendaftar dari halaman terlindungi
  diarahkan ke beranda user, bukan kembali ke halaman owner.
- Pesan error backend (mis. email sudah dipakai) tampil apa adanya lewat `getApiErrorMessage()`,
  dengan pola `.form-message.is-error` seperti form login.
- Setelah daftar berhasil, form login dan CAPTCHA yang belum terpakai ditinggal begitu saja —
  challenge yang tidak dipakai akan dibersihkan `prune()` setelah 2 jam.

### 9.4 Verifikasi yang sudah dilakukan

| Cek | Hasil |
|---|---|
| `npx tsc -b` | exit 0 |
| `POST /api/v1/auth/register` (akun uji `cta-probe-*`) | `{"success":true,"message":"Register berhasil",...,"role":"user"}` + token |
| Bersih-bersih akun uji | user dihapus (`deleted=1`), token orphan di `personal_access_tokens` juga dihapus |
| Scope CSS | 67 selector di `login.css` + 12 di `captcha.css` sudah memakai `.auth-page`; tidak ada `#page-login` tersisa |
| Alur daftar | daftar → redirect `/login` (state `registered`) → email terisi, sesi **belum** dibuat |

Tampilan kedua halaman belum saya buka di browser; kalau ada yang janggal, itu murni CSS.

Catatan: alur registrasi memakai endpoint yang **tidak** saya ubah, jadi tidak ada test baru di backend.
Yang diverifikasi adalah kontraknya masih cocok dengan pemanggilan frontend.

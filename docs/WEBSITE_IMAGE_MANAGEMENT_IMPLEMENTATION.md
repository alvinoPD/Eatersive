# Website Image Management — Complete Implementation Guide

> **Scope:** Owner/Admin can upload, preview, replace, and delete the images shown on the
> customer-facing EaterSive website, and can upload images for service catalog records.
>
> **Repository analysed:** branch `feature/frontend`, commit snapshot 2026-11-20.
>
> **Document status:** This document is the only deliverable. No application code was changed
> while producing it.

---

## 1. Project Overview

EaterSive is a two-application monorepo:

| Layer | Technology | Location | Notes |
| --- | --- | --- | --- |
| Backend | Laravel `^13.17`, PHP `^8.3`, Sanctum `^4.3` | `backend/` | REST API under `/api/v1` |
| Database | MySQL (default), SQLite in tests | `backend/config/database.php`, `backend/phpunit.xml` | |
| Frontend | React `^19.3.1`, TypeScript `~6.0.3`, Vite `^8.3.5`, Axios `^1.20.0`, React Router `^7.18.4` | `frontend/` | SPA, hosted on Cloudflare Pages |
| Storage | Laravel `public` disk (`storage/app/public`) | `backend/config/filesystems.php` | Requires `php artisan storage:link` |

API response convention (verified in every controller):

```json
{
  "success": true,
  "message": "Pesan bahasa Indonesia",
  "data": { }
}
```

Validation failures use Laravel's default `422` envelope (`message`, `errors`), which the
frontend already normalises in `frontend/src/api/client.ts` → `getApiErrorMessage()`.

Roles: database `users.role` is `admin` (owner dashboard) or `user` (customer). The frontend
maps the API role `admin` to the UI session role `owner` — see `frontend/src/auth/roles.ts`,
`frontend/src/types/auth.ts`, and `frontend/src/api/auth.ts`.

---

## 2. Existing Architecture Analysis

### 2.1 Backend (verified)

| Concern | Existing implementation | File |
| --- | --- | --- |
| Routing | Single API file, `/api/v1` prefix, named routes | `backend/routes/api.php` |
| Middleware alias | `admin` → `AdminMiddleware` | `backend/bootstrap/app.php` |
| Owner auth | `auth:sanctum` + `admin` | `backend/routes/api.php` |
| Profile/settings API | `OwnerProfileController` (`show`, `update`, `updatePassword`) | `backend/app/Http/Controllers/OwnerProfileController.php` |
| Service catalog API | `LayananController` (`index`, `store`, `show`, `update`, `destroy`) | `backend/app/Http/Controllers/LayananController.php` |
| Service model | Class name **`daftar_layanan`** (lowercase), table `daftar_layanans`, fillable `foto, nama, deskripsi, harga` | `backend/app/Models/daftar_layanan.php` |
| Service table | `foto` is `string()->nullable()`, plus `kategori`, `estimasi`, `aktif` added later | `backend/database/migrations/2026_10_26_111059_create_daftar_layanans_table.php`, `..._2026_11_06_000001_add_catalog_attributes_to_daftar_layanans_table.php` |
| Validation style | Inline `$request->validate([...])` inside controllers. **There is no `app/Http/Requests/` directory.** | Controllers |
| Service/helper style | `backend/app/Services/CaptchaService.php` exists | `backend/app/Services/` |
| Filesystem | `public` disk rooted at `storage/app/public`, URL `${APP_URL}/storage` | `backend/config/filesystems.php` |
| Public storage link | **Not created yet** — `backend/public/storage` does not exist | `backend/public/` |
| CORS | `api/*`, origins from `FRONTEND_URL`, credentials disabled | `backend/config/cors.php` |
| Existing upload implementation | **None.** Service photos are currently sent as base64 data URLs from the browser and validated as `string|max:255`, so real photos cannot be stored reliably. | `OwnerCatalogPage.tsx` + `LayananController` |
| Tests | PHPUnit 12 feature tests using `RefreshDatabase`, `withToken()` | `backend/tests/Feature/Api/*` |

### 2.2 Frontend (verified)

| Concern | Existing implementation | File |
| --- | --- | --- |
| Axios instance | `apiClient`, `baseURL = VITE_API_BASE_URL` (already includes `/api/v1`) | `frontend/src/api/client.ts` |
| Auth token | Request interceptor reads Sanctum token from session store | `frontend/src/api/client.ts` |
| API modules | `auth.ts`, `captcha.ts`, `health.ts`, `layanan.ts`, `orders.ts`, `owner.ts` | `frontend/src/api/` |
| Owner layout | `OwnerShell` with sidebar nav keys `dashboard`, `orders`, `catalog`, `reviews`, `settings` | `frontend/src/components/owner/OwnerShell.tsx` |
| Owner settings page | `/owner/settings` → profile + password cards inside `.detail-layout` | `frontend/src/pages/owner/OwnerSettingsPage.tsx` |
| Owner catalog page | `/owner/catalog`, dialog with drag/drop photo, client-side canvas compression to base64 | `frontend/src/pages/owner/OwnerCatalogPage.tsx` |
| Routes | `/owner/*` guarded by `<RequireRole role="owner" />` | `frontend/src/routes/AppRoutes.tsx` |
| CSS convention | Plain global CSS files per feature in `frontend/src/styles/`, imported by the page/component, scoped by `#page-…` or class prefixes | `frontend/src/styles/*.css` |
| Customer landing page | `/` → `LandingPage`, 7 hard-coded Unsplash `<img>` elements | `frontend/src/pages/user/LandingPage.tsx` |
| Customer catalog | `useCatalog()` → `fetchLayanan()` → `toCatalogService()` | `frontend/src/lib/catalog-store.ts`, `frontend/src/api/layanan.ts` |
| Service image fallback | `FALLBACK_IMAGE` constant in `api/layanan.ts` | `frontend/src/api/layanan.ts` |

> **Important naming note:** the backend model is `App\Models\daftar_layanan`, not
> `Layanan`/`Service`. All new backend code that touches services must use that class.

---

## 3. Existing Image Inventory (verified, not assumed)

### 3.1 Homepage / landing page (`frontend/src/pages/user/LandingPage.tsx`)

| # | Section | CSS class / element | Current hard-coded URL | Proposal slot key |
| --- | --- | --- | --- | --- |
| 1 | Hero / banner | `.hero-image` | `photo-1542291026-7eec264c27ff` (w=1100, q=90) | `hero` |
| 2 | Service card “Basic Cleaning” | `.service-card img` | `photo-1600185365483-26d7a4cc7519` (w=700, q=85) | `card_basic_cleaning` |
| 3 | Service card “Hard Cleaning” | `.service-card img` | `photo-1552346154-21d32810aba3` (w=700, q=85) | `card_hard_cleaning` |
| 4 | Service card “Suede Cleaning” | `.service-card img` | `photo-1542291026-7eec264c27ff` (w=700, q=85) | `card_suede_cleaning` |
| 5 | Wide card “Additional care” | `.service-card--wide img` | `photo-1608231387042-66d1773070a5` (w=1200, q=85) | `promo_additional_care` |
| 6 | Promo card “Repaint / Reglue” | `.promo-card--repair img` | `photo-1495555961986-6d4c1ecb7be3` (w=900, q=85) | `promo_repair` |
| 7 | Promo card “Beyond Sneakers” | `.promo-card--gear img` | `photo-1553062407-98eeb64c6a62` (w=700, q=85) | `promo_gear` |

The “Delivery To Your Place” promo card uses an emoji (`.delivery-art`), not an image.

### 3.2 Sections that do **not** exist on the EaterSive homepage

- **No About section** on `LandingPage.tsx`. `frontend/src/pages/AboutPage.tsx` exists but is a
  leftover starter-template page at `/about` and contains no images. Therefore this guide does
  **not** create an `about` image slot.
- **No separate promotional banner component.** The promo cards listed above are the only
  promotional imagery.

### 3.3 Service catalog images

- `daftar_layanans.foto` already exists. It is returned by `GET /api/v1/layanan` and consumed by
  `toCatalogService()` → `CatalogService.image`.
- **Reuse `foto`; do not add a second column.**
- Current owner flow compresses the file to a base64 data URL in the browser and sends it as a
  string. This guide replaces that with a real multipart upload and stores a storage path.

### 3.4 Other images (out of scope)

- Review/customer avatars, before/after order photos, and template starter pages. These are not
  website branding images and are not part of this feature.

---

## 4. Exact File Map

### A. NEW FILES

| ID | Exact file path | Status | Responsibility | Depends on |
| --- | --- | --- | --- | --- |
| N1 | `backend/database/migrations/2026_11_20_000001_create_website_images_table.php` | NEW | Creates `website_images` (slot key → storage path) | Laravel schema builder |
| N2 | `backend/app/Models/WebsiteImage.php` | NEW | Eloquent model + slot registry (`SLOTS`) | N1 |
| N3 | `backend/app/Services/ImageStorageService.php` | NEW | Central public-disk store/delete with safe failure handling | `config/filesystems.php` |
| N4 | `backend/app/Http/Controllers/WebsiteImageController.php` | NEW | Public slot listing + admin upload/delete | N2, N3 |
| N5 | `backend/tests/Feature/Api/WebsiteImageTest.php` | NEW | Upload/replace/delete/authorization tests | N1–N4, N7 |
| N6 | `backend/tests/Feature/Api/LayananFotoTest.php` | NEW | Service photo upload tests | N3, N7, existing `LayananController` |
| N7 | `frontend/src/api/websiteImages.ts` | NEW | Types, fallbacks, fetch/upload/delete API functions | existing `apiClient` |
| N8 | `frontend/src/components/owner/WebsiteImageManager.tsx` | NEW | Owner UI: preview, upload, replace, delete | N7, N9 |
| N9 | `frontend/src/styles/website-images.css` | NEW | Styles for N8 | existing CSS variables |

**Total new files: 9.**

> No new directories are strictly required: `backend/app/Models`, `backend/app/Services`,
> `backend/app/Http/Controllers`, `backend/tests/Feature/Api`, `frontend/src/api`,
> `frontend/src/components/owner`, and `frontend/src/styles` all already exist.

### B. EXISTING FILES TO MODIFY

| ID | Exact file path | Status | Required changes |
| --- | --- | --- | --- |
| E1 | `backend/routes/api.php` | EXISTS | Import N4; add public `GET /website-images`; add admin upload/delete routes and service-photo route |
| E2 | `backend/app/Http/Controllers/LayananController.php` | EXISTS | Import `ImageStorageService`; add `uploadFoto()` method |
| E3 | `backend/app/Models/daftar_layanan.php` | EXISTS | Add `foto` attribute accessor that turns stored paths into public URLs while preserving external URLs |
| E4 | `frontend/src/api/layanan.ts` | EXISTS | Add `uploadLayananPhoto()` |
| E5 | `frontend/src/pages/owner/OwnerCatalogPage.tsx` | EXISTS | Keep preview, upload real file after create/update, support removing a photo, align limits with backend |
| E6 | `frontend/src/pages/owner/OwnerSettingsPage.tsx` | EXISTS | Import and render `<WebsiteImageManager />` as a settings section |
| E7 | `frontend/src/pages/user/LandingPage.tsx` | EXISTS | Fetch website images and use slot URLs with fallbacks for the 7 homepage images |

**Total existing files modified: 7.**

No changes are needed to `frontend/src/routes/AppRoutes.tsx` (no new route),
`frontend/src/components/owner/OwnerShell.tsx` (settings nav already exists),
`backend/config/filesystems.php` (the `public` disk is already correct),
`backend/config/cors.php` (already allows `api/*`), or `frontend/package.json`
(no new dependency).

---

## 5. Database and Storage Design

### 5.1 Table `website_images`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint unsigned, PK | |
| `key` | string(64), unique | One of the fixed slot keys in `WebsiteImage::SLOTS` |
| `path` | string, nullable | Path relative to the `public` disk, e.g. `website-images/abc123.jpg` |
| `created_at`, `updated_at` | timestamps | |

Why a table of slots instead of six columns?

- Adding/removing a website image slot is a one-line change in the model, not a migration.
- Missing rows simply mean “use the built-in fallback image”.
- Uploads are `updateOrCreate` by key, so replacement is atomic at the row level.

**Deliberately no `url` column:** URLs are derived at read time from `APP_URL`, so changing the
domain never requires rewriting the database.

### 5.2 Storage layout

```
storage/app/public/
├── website-images/   # homepage slot images
└── layanan/          # service catalog photos (existing column, new storage)
```

Served publicly through the symlink `backend/public/storage` → `storage/app/public`.

### 5.3 Slot registry (single source of truth)

```
hero                  → Hero / Banner Beranda
card_basic_cleaning   → Kartu Basic Cleaning
card_hard_cleaning    → Kartu Hard Cleaning
card_suede_cleaning   → Kartu Suede Cleaning
promo_additional_care → Promo Additional Care
promo_repair          → Promo Repaint & Reglue
promo_gear            → Promo Beyond Sneakers
```

### 5.4 Replacement safety rule

Upload order for **every** replacement:

1. Validate the upload.
2. Store the **new** file on the public disk.
3. Persist the new path in the database.
4. Only then delete the old file.

If step 2 or 3 fails, the old file remains untouched.

---

## 6. Phase 1 — Database and Storage Implementation

**Goal:** create the table and the shared storage helper. Nothing is exposed through the API yet.

### N1. Create the website images migration

**File:** `backend/database/migrations/2026_11_20_000001_create_website_images_table.php`

**Status:** NEW

**Purpose:** store one row per customised homepage image slot.

**Complete code:**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('website_images', function (Blueprint $table) {
            $table->id();
            $table->string('key', 64)->unique();
            $table->string('path')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('website_images');
    }
};
```

**Explanation:**

- `key` is unique so `updateOrCreate(['key' => ...])` is safe under concurrent uploads.
- `path` stores a disk-relative path, never an absolute URL. This survives domain changes and
  keeps `APP_URL` as the only place the public host is configured.
- No rows are seeded: an absent row is the “use fallback image” state.

**Verification:**

```bash
cd backend
php artisan migrate
php artisan db:table website_images   # optional inspection (Laravel 13)
```

Expected: migration runs without error; `website_images` exists with `id`, `key`, `path`,
created/updated timestamps.

### N3. Create the image storage service

**File:** `backend/app/Services/ImageStorageService.php`

**Status:** NEW

**Purpose:** one place that writes/deletes public-disk images and converts storage failures to
exceptions the controllers can turn into JSON `500` responses.

**Complete code:**

```php
<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ImageStorageService
{
    /**
     * Simpan file gambar ke disk "public" dan kembalikan path relatifnya.
     *
     * @throws RuntimeException bila file gagal disimpan.
     */
    public function store(UploadedFile $file, string $directory): string
    {
        try {
            $path = Storage::disk('public')->putFile($directory, $file);
        } catch (Throwable $exception) {
            throw new RuntimeException('Gagal menyimpan file gambar.', 0, $exception);
        }

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('Gagal menyimpan file gambar.');
        }

        return $path;
    }

    /**
     * Hapus file lama secara best-effort. Hanya path di dalam $directory yang disentuh,
     * sehingga URL eksternal atau data URL lama tidak pernah dihapus.
     */
    public function delete(?string $path, string $directory): void
    {
        if (! is_string($path) || $path === '') {
            return;
        }

        $normalized = ltrim($path, '/');

        if (! str_starts_with($normalized, $directory.'/')) {
            return;
        }

        try {
            Storage::disk('public')->delete($normalized);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
```

**Explanation:**

- `putFile()` generates a random hashed filename (no user-controlled filename reaches the disk)
  and keeps the real extension detected by Laravel.
- `store()` throws `RuntimeException` instead of returning `false`, so callers cannot accidentally
  save an empty path.
- `delete()` refuses to touch anything outside the expected directory. That is what protects
  legacy values: external `https://...` URLs and base64 `data:` URLs are ignored.
- Deletion is best-effort: an orphan file is preferable to a failed database delete.

**Dependencies:** `backend/config/filesystems.php` already defines the `public` disk; no config
change is needed.

**Verification:** this class is exercised by the Phase 2 tests after controllers exist. For now,
verify PHP syntax:

```bash
cd backend
php -l app/Services/ImageStorageService.php
```

Expected: `No syntax errors detected`.

### N2. Create the WebsiteImage model

**File:** `backend/app/Models/WebsiteImage.php`

**Status:** NEW

**Purpose:** Eloquent access plus the slot registry used by controllers, API responses, and tests.

**Complete code:**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebsiteImage extends Model
{
    /**
     * Slot gambar yang dipakai halaman beranda customer.
     * Key harus sama dengan WEBSITE_IMAGE_FALLBACKS di frontend.
     */
    public const SLOTS = [
        'hero' => 'Hero / Banner Beranda',
        'card_basic_cleaning' => 'Kartu Basic Cleaning',
        'card_hard_cleaning' => 'Kartu Hard Cleaning',
        'card_suede_cleaning' => 'Kartu Suede Cleaning',
        'promo_additional_care' => 'Promo Additional Care',
        'promo_repair' => 'Promo Repaint & Reglue',
        'promo_gear' => 'Promo Beyond Sneakers',
    ];

    protected $fillable = ['key', 'path'];

    public static function isSlot(string $key): bool
    {
        return array_key_exists($key, self::SLOTS);
    }
}
```

**Explanation:** the constant is deliberately public and static; tests assert
`count(WebsiteImage::SLOTS)` so adding a slot automatically updates the contract test. The
`fillable` whitelist is minimal.

**Verification:**

```bash
cd backend
php -l app/Models/WebsiteImage.php
php artisan tinker --execute="dump(array_keys(App\\Models\\WebsiteImage::SLOTS));"
```

Expected: an array of the 7 slot keys.

### Phase 1 commands

```bash
cd backend
php artisan migrate
php artisan storage:link
```

Expected: `public/storage` is created (or the command reports the link already exists).

### Phase 1 commit checkpoint

Files created:

- `backend/database/migrations/2026_11_20_000001_create_website_images_table.php`
- `backend/app/Models/WebsiteImage.php`
- `backend/app/Services/ImageStorageService.php`

```bash
git status
git diff -- backend/database/migrations backend/app/Models backend/app/Services
git add backend/database/migrations/2026_11_20_000001_create_website_images_table.php \
        backend/app/Models/WebsiteImage.php \
        backend/app/Services/ImageStorageService.php
git commit -m "feat: add website image table and public storage service"
```

Do **not** stage `backend/.env`, `backend/storage/`, or `backend/public/storage` (the symlink is
environment-specific and already ignored via `.gitignore` rules for storage contents).

---

## 7. Phase 2 — Backend API Implementation

**Goal:** expose a public read endpoint, admin upload/delete endpoints, and a service-photo
upload endpoint.

### E3. Add a URL accessor to the service model

**File:** `backend/app/Models/daftar_layanan.php`

**Status:** EXISTS — modify.

**Locate:** the top of the class (imports + `protected $fillable`).

**What changes:** replace the import block and add a `foto()` attribute accessor. The rest of the
file (relationships) is unchanged.

**Complete replacement for the file header and class body start:**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class daftar_layanan extends Model
{
    protected $table = 'daftar_layanans';

    protected $fillable = ['foto', 'nama', 'deskripsi', 'harga'];

    /**
     * `foto` disimpan sebagai path relatif di disk "public".
     * Nilai lama berupa URL eksternal atau data URL dikembalikan apa adanya.
     */
    protected function foto(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): ?string {
                if ($value === null || $value === '') {
                    return null;
                }

                if (preg_match('#^(https?://|data:)#i', $value) === 1) {
                    return $value;
                }

                return Storage::disk('public')->url($value);
            },
        );
    }

    public function pesanan(): HasMany
    {
        return $this->hasMany(Pesanan::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Riview::class);
    }
}
```

**Explanation:**

- The accessor is why `GET /api/v1/layanan` now returns a usable image URL even though the
  database stores only `layanan/abc.jpg`.
- External URLs and legacy base64 values pass through unchanged, so no data migration is needed.
- **Important for controllers:** when you need the raw stored value (to delete the old file),
  use `$model->getRawOriginal('foto')`. Reading `$model->foto` returns the full URL.
- Existing `LayananController::store/update` still accept a `foto` string. That remains for
  backward compatibility; the new frontend uploads files through the dedicated endpoint instead.

**Verification:**

```bash
cd backend
php -l app/Models/daftar_layanan.php
php artisan test --filter=LayananTest
```

Expected: existing catalog tests still pass (they do not assert the exact `foto` value).

### N4. Create the website image controller

**File:** `backend/app/Http/Controllers/WebsiteImageController.php`

**Status:** NEW

**Purpose:** public listing of the 7 slots and admin upload/delete.

**Complete code:**

```php
<?php

namespace App\Http\Controllers;

use App\Models\WebsiteImage;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class WebsiteImageController extends Controller
{
    /**
     * Daftar seluruh slot gambar website (publik).
     * Slot yang belum diunggah mengembalikan url null; frontend memakai gambar bawaan.
     */
    public function index(): JsonResponse
    {
        $stored = WebsiteImage::query()->get()->keyBy('key');

        $data = collect(WebsiteImage::SLOTS)
            ->map(function (string $label, string $key) use ($stored): array {
                return $this->formatSlot($key, $stored->get($key), $label);
            })
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'Daftar gambar website berhasil diambil',
            'data' => $data,
        ]);
    }

    /**
     * Unggah atau ganti gambar pada satu slot (admin).
     */
    public function upload(Request $request, string $key, ImageStorageService $storage): JsonResponse
    {
        if (! WebsiteImage::isSlot($key)) {
            return response()->json([
                'success' => false,
                'message' => 'Slot gambar tidak dikenal',
                'data' => null,
            ], 404);
        }

        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $request->file('image');
        $existing = WebsiteImage::query()->where('key', $key)->first();

        try {
            $path = $storage->store($file, 'website-images');
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'Gambar gagal disimpan. Silakan coba lagi.',
                'data' => null,
            ], 500);
        }

        try {
            $image = WebsiteImage::query()->updateOrCreate(
                ['key' => $key],
                ['path' => $path],
            );
        } catch (Throwable $exception) {
            /* Jangan tinggalkan file yatim bila penyimpanan metadata gagal. */
            $storage->delete($path, 'website-images');
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'Gambar gagal disimpan. Silakan coba lagi.',
                'data' => null,
            ], 500);
        }

        /* File lama dihapus HANYA setelah path baru tersimpan. */
        if ($existing?->path && $existing->path !== $path) {
            $storage->delete($existing->path, 'website-images');
        }

        return response()->json([
            'success' => true,
            'message' => 'Gambar website berhasil diperbarui',
            'data' => $this->formatSlot($key, $image),
        ]);
    }

    /**
     * Hapus gambar kustom dan kembalikan slot ke gambar bawaan (admin).
     */
    public function destroy(string $key, ImageStorageService $storage): JsonResponse
    {
        if (! WebsiteImage::isSlot($key)) {
            return response()->json([
                'success' => false,
                'message' => 'Slot gambar tidak dikenal',
                'data' => null,
            ], 404);
        }

        $image = WebsiteImage::query()->where('key', $key)->first();

        if ($image) {
            $path = $image->path;
            $image->delete();
            $storage->delete($path, 'website-images');
        }

        return response()->json([
            'success' => true,
            'message' => 'Gambar website dikembalikan ke gambar bawaan',
            'data' => $this->formatSlot($key, null),
        ]);
    }

    /**
     * Bentuk response satu slot, dipakai oleh index/upload/destroy.
     */
    private function formatSlot(string $key, ?WebsiteImage $image, ?string $label = null): array
    {
        return [
            'key' => $key,
            'label' => $label ?? WebsiteImage::SLOTS[$key],
            'url' => $image?->path
                ? Storage::disk('public')->url($image->path)
                : null,
            'updated_at' => $image?->updated_at?->toIso8601String(),
        ];
    }
}
```

**Explanation:**

- `index()` never writes to the database. It maps the constant registry over stored rows, so a
  fresh install immediately returns all 7 slots with `url: null`.
- `upload()` validates by MIME type (`mimes`) and size (4 MB). SVG is intentionally rejected
  because uploads are served from the same origin as the site and SVG can carry script.
- Replacement ordering implements the safety rule from §5.4.
- `destroy()` is idempotent: deleting a slot with no custom image still returns success, so the UI
  can retry safely. It also deletes the row so a future listing shows `url: null`.
- Responses follow the existing `{ success, message, data }` convention exactly.

### E2. Add the service photo upload method

**File:** `backend/app/Http/Controllers/LayananController.php`

**Status:** EXISTS — modify.

**Locate:** the import block at the top and the end of the class (after `destroy()`), just before
the closing `}`.

**Change 1 — imports.** Replace:

```php
use App\Models\daftar_layanan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
```

with:

```php
use App\Models\daftar_layanan;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
```

**Change 2 — new method.** Insert the following method after `destroy()`:

```php
    /**
     * Unggah/ganti foto layanan (admin). Reuse kolom `foto`, tanpa kolom baru.
     */
    public function uploadFoto(Request $request, $id, ImageStorageService $storage): JsonResponse
    {
        $layanan = daftar_layanan::find($id);

        if (! $layanan) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak ditemukan',
                'data' => null,
            ], 404);
        }

        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $oldPath = $layanan->getRawOriginal('foto');

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $request->file('image');

        try {
            $path = $storage->store($file, 'layanan');
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'Foto layanan gagal disimpan. Silakan coba lagi.',
                'data' => null,
            ], 500);
        }

        $layanan->update(['foto' => $path]);

        /* Hapus file lama setelah kolom foto berhasil diperbarui. */
        $storage->delete($oldPath, 'layanan');

        return response()->json([
            'success' => true,
            'message' => 'Foto layanan berhasil diperbarui',
            'data' => $layanan->fresh(),
        ]);
    }
```

**Explanation:**

- Reuses `daftar_layanans.foto`; no duplicate column.
- `getRawOriginal('foto')` is mandatory here: `$layanan->foto` would return the full URL from the
  accessor, and the storage helper would (correctly) refuse to delete it.
- Existing `store`/`update` validation is untouched so other clients keep working.

**Verification:**

```bash
cd backend
php -l app/Http/Controllers/LayananController.php
php -l app/Http/Controllers/WebsiteImageController.php
```

Expected: no syntax errors.

### E1. Register the routes

**File:** `backend/routes/api.php`

**Status:** EXISTS — modify.

**Change 1 — imports.** Add after the existing controller imports:

```php
use App\Http\Controllers\WebsiteImageController;
```

The full import block becomes:

```php
use App\Http\Controllers\Api\V1\CaptchaController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\PingController;
use App\Http\Controllers\Authcontroller;
use App\Http\Controllers\LayananController;
use App\Http\Controllers\OwnerProfileController;
use App\Http\Controllers\RiviewController;
use App\Http\Controllers\WebsiteImageController;
use Illuminate\Support\Facades\Route;
```

**Change 2 — public endpoint.** Inside `Route::prefix('v1')->group(...)`, after the CAPTCHA route
and before `Route::prefix('auth')`, insert:

```php
    Route::get('/website-images', [WebsiteImageController::class, 'index'])
        ->name('api.v1.website-images.index');
```

**Change 3 — admin endpoints.** Inside the existing owner group:

```php
    Route::prefix('owner')->middleware(['auth:sanctum', 'admin'])->group(function (): void {
```

add before the closing `});` of that group:

```php
        Route::post('/website-images/{key}', [WebsiteImageController::class, 'upload'])
            ->name('api.v1.owner.website-images.upload');
        Route::delete('/website-images/{key}', [WebsiteImageController::class, 'destroy'])
            ->name('api.v1.owner.website-images.destroy');
        Route::post('/layanan/{id}/foto', [LayananController::class, 'uploadFoto'])
            ->name('api.v1.owner.layanan.foto');
```

**Explanation:** the owner group already carries `auth:sanctum` + `admin`, which is exactly the
authorization required. No new middleware or policy is necessary. The public endpoint is
deliberately read-only.

**Verification:**

```bash
cd backend
php artisan route:list --path=api/v1
```

Expected routes:

```
GET|HEAD  api/v1/website-images
POST      api/v1/owner/website-images/{key}
DELETE    api/v1/owner/website-images/{key}
POST      api/v1/owner/layanan/{id}/foto
```

### Manual API verification

Start the backend:

```bash
cd backend
php artisan serve
```

Public listing (no token):

```bash
curl -s http://127.0.0.1:8000/api/v1/website-images
```

Expected: `success: true` and 7 entries, all with `"url": null` on a fresh install.

Get a token:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@eatersive.id","password":"owner123","captcha_id":1,"captcha_answer":"1"}'
```

> Login requires a valid CAPTCHA. Use the app’s login flow or `php artisan tinker` to mint a token
> for local testing:
>
> ```bash
> php artisan tinker --execute="echo App\\Models\\User::where('role','admin')->first()->createToken('manual')->plainTextToken;"
> ```

Upload:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/owner/website-images/hero \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Accept: application/json" \
  -F "image=@C:/path/to/hero.jpg"
```

Expected: `success: true`, `data.key = hero`, `data.url` containing `/storage/website-images/...`.

Delete:

```bash
curl -s -X DELETE http://127.0.0.1:8000/api/v1/owner/website-images/hero \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Accept: application/json"
```

Expected: `success: true`, `data.url = null`, database row gone, file removed.

### N5. Add backend tests

**File:** `backend/tests/Feature/Api/WebsiteImageTest.php`

**Status:** NEW

**Complete code:**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\WebsiteImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WebsiteImageTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        $admin = User::factory()->create(['role' => 'admin']);

        return $admin->createToken('auth_token')->plainTextToken;
    }

    public function test_public_index_lists_every_slot_with_null_url(): void
    {
        $response = $this->getJson('/api/v1/website-images');

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonCount(count(WebsiteImage::SLOTS), 'data');
        $this->assertNull($response->json('data.0.url'));
    }

    public function test_admin_can_upload_an_image(): void
    {
        Storage::fake('public');

        $response = $this->withToken($this->adminToken())
            ->post('/api/v1/owner/website-images/hero', [
                'image' => UploadedFile::fake()->image('hero.jpg', 1200, 800),
            ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.key', 'hero');

        $path = WebsiteImage::query()->where('key', 'hero')->value('path');
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_replacing_an_image_keeps_the_new_file_and_removes_the_old_one(): void
    {
        Storage::fake('public');
        $token = $this->adminToken();

        $this->withToken($token)->post('/api/v1/owner/website-images/hero', [
            'image' => UploadedFile::fake()->image('first.jpg', 800, 600),
        ])->assertOk();

        $firstPath = WebsiteImage::query()->where('key', 'hero')->value('path');

        $this->withToken($token)->post('/api/v1/owner/website-images/hero', [
            'image' => UploadedFile::fake()->image('second.png', 800, 600),
        ])->assertOk();

        $secondPath = WebsiteImage::query()->where('key', 'hero')->value('path');

        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
        $this->assertNotSame($firstPath, $secondPath);
    }

    public function test_admin_can_delete_a_custom_image(): void
    {
        Storage::fake('public');
        $token = $this->adminToken();

        $this->withToken($token)->post('/api/v1/owner/website-images/hero', [
            'image' => UploadedFile::fake()->image('hero.jpg'),
        ])->assertOk();

        $path = WebsiteImage::query()->where('key', 'hero')->value('path');

        $this->withToken($token)
            ->deleteJson('/api/v1/owner/website-images/hero')
            ->assertOk()
            ->assertJsonPath('data.url', null);

        $this->assertDatabaseMissing('website_images', ['key' => 'hero']);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_upload_rejects_non_image_files(): void
    {
        Storage::fake('public');

        $this->withToken($this->adminToken())
            ->post('/api/v1/owner/website-images/hero', [
                'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(422);
    }

    public function test_upload_rejects_unknown_slot(): void
    {
        Storage::fake('public');

        $this->withToken($this->adminToken())
            ->post('/api/v1/owner/website-images/not-a-slot', [
                'image' => UploadedFile::fake()->image('hero.jpg'),
            ])
            ->assertStatus(404);
    }

    public function test_guest_cannot_upload(): void
    {
        $this->postJson('/api/v1/owner/website-images/hero', [])
            ->assertStatus(401);
    }

    public function test_customer_cannot_upload_or_delete(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $token = $customer->createToken('auth_token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/owner/website-images/hero', [])
            ->assertStatus(403);

        $this->withToken($token)
            ->deleteJson('/api/v1/owner/website-images/hero')
            ->assertStatus(403);
    }
}
```

**Explanation:** `Storage::fake('public')` prevents tests from writing into the real storage
directory. The replacement test is the one that proves the “never delete before a successful
replacement” rule.

**Verification:**

```bash
cd backend
php artisan test --filter=WebsiteImageTest
```

Expected: all tests pass.

### N6. Add service photo tests

**File:** `backend/tests/Feature/Api/LayananFotoTest.php`

**Status:** NEW

**Complete code:**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\daftar_layanan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LayananFotoTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return User::factory()
            ->create(['role' => 'admin'])
            ->createToken('auth_token')
            ->plainTextToken;
    }

    public function test_admin_can_upload_and_replace_a_service_photo(): void
    {
        Storage::fake('public');
        $token = $this->adminToken();

        $layanan = daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'harga' => 65000,
        ]);

        $this->withToken($token)
            ->post("/api/v1/owner/layanan/{$layanan->id}/foto", [
                'image' => UploadedFile::fake()->image('before.jpg', 900, 600),
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $firstPath = $layanan->fresh()->getRawOriginal('foto');
        Storage::disk('public')->assertExists($firstPath);

        $this->withToken($token)
            ->post("/api/v1/owner/layanan/{$layanan->id}/foto", [
                'image' => UploadedFile::fake()->image('after.jpg', 900, 600),
            ])
            ->assertOk();

        $secondPath = $layanan->fresh()->getRawOriginal('foto');

        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
        $this->assertNotSame($firstPath, $secondPath);
    }

    public function test_photo_url_is_returned_from_the_public_catalog(): void
    {
        Storage::fake('public');
        $token = $this->adminToken();

        $layanan = daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'harga' => 65000,
        ]);

        $this->withToken($token)
            ->post("/api/v1/owner/layanan/{$layanan->id}/foto", [
                'image' => UploadedFile::fake()->image('photo.jpg'),
            ])
            ->assertOk();

        $path = $layanan->fresh()->getRawOriginal('foto');

        $this->getJson('/api/v1/layanan')
            ->assertOk()
            ->assertJsonPath(
                'data.0.foto',
                Storage::disk('public')->url($path),
            );
    }

    public function test_non_admin_cannot_upload_a_service_photo(): void
    {
        Storage::fake('public');

        $layanan = daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'harga' => 65000,
        ]);

        $customer = User::factory()->create(['role' => 'user']);

        $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->postJson("/api/v1/owner/layanan/{$layanan->id}/foto", [])
            ->assertStatus(403);
    }

    public function test_upload_returns_404_for_unknown_service(): void
    {
        Storage::fake('public');

        $this->withToken($this->adminToken())
            ->postJson('/api/v1/owner/layanan/9999/foto', [])
            ->assertStatus(404);
    }
}
```

**Explanation:** the second test is the end-to-end proof that the model accessor and upload
endpoint cooperate: the raw column holds a relative path while the public API returns a full URL.

**Verification:**

```bash
cd backend
php artisan test --filter=LayananFotoTest
php artisan test --filter=LayananTest
```

Expected: all pass.

### Phase 2 commit checkpoint

Files created:

- `backend/app/Http/Controllers/WebsiteImageController.php`
- `backend/tests/Feature/Api/WebsiteImageTest.php`
- `backend/tests/Feature/Api/LayananFotoTest.php`

Files modified:

- `backend/routes/api.php`
- `backend/app/Http/Controllers/LayananController.php`
- `backend/app/Models/daftar_layanan.php`

```bash
git status
git diff -- backend/routes/api.php backend/app backend/tests
git add backend/routes/api.php \
        backend/app/Http/Controllers/WebsiteImageController.php \
        backend/app/Http/Controllers/LayananController.php \
        backend/app/Models/daftar_layanan.php \
        backend/tests/Feature/Api/WebsiteImageTest.php \
        backend/tests/Feature/Api/LayananFotoTest.php
git commit -m "feat: expose website image and service photo API"
```

---

## 8. Phase 3 — Owner Dashboard Implementation

**Goal:** a settings section where the owner can preview, upload, replace, and delete homepage
images, plus a working file upload for service photos.

### N7. Create the frontend API module

**File:** `frontend/src/api/websiteImages.ts`

**Status:** NEW

**Purpose:** single source of truth for slot keys, labels used before the API responds, fallback
images, and all HTTP calls. It uses the existing Axios `apiClient`; no second client is created.

**Complete code:**

```ts
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

/** Harus sama persis dengan App\Models\WebsiteImage::SLOTS di backend. */
export const WEBSITE_IMAGE_SLOTS = [
  'hero',
  'card_basic_cleaning',
  'card_hard_cleaning',
  'card_suede_cleaning',
  'promo_additional_care',
  'promo_repair',
  'promo_gear',
] as const;

export type WebsiteImageKey = (typeof WEBSITE_IMAGE_SLOTS)[number];

export interface WebsiteImage {
  key: string;
  label: string;
  url: string | null;
  updated_at: string | null;
}

/**
 * Gambar bawaan yang selama ini ditulis langsung di LandingPage.
 * Dipakai bila backend belum memiliki gambar kustom untuk slot tersebut.
 */
export const WEBSITE_IMAGE_FALLBACKS: Record<WebsiteImageKey, string> = {
  hero: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1100&q=90',
  card_basic_cleaning:
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=700&q=85',
  card_hard_cleaning:
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=85',
  card_suede_cleaning:
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85',
  promo_additional_care:
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=85',
  promo_repair:
    'https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=900&q=85',
  promo_gear:
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85',
};

export function websiteImageFallback(key: string): string {
  return WEBSITE_IMAGE_FALLBACKS[key as WebsiteImageKey] ?? WEBSITE_IMAGE_FALLBACKS.hero;
}

/** GET /api/v1/website-images — publik, selalu mengembalikan semua slot. */
export async function fetchWebsiteImages(): Promise<WebsiteImage[]> {
  const { data } = await apiClient.get<ApiResponse<WebsiteImage[]>>('/website-images');
  return data.data;
}

/** POST /api/v1/owner/website-images/{key} — multipart, field `image`. */
export async function uploadWebsiteImage(
  key: WebsiteImageKey,
  file: File,
): Promise<WebsiteImage> {
  const form = new FormData();
  form.append('image', file);

  /* Jangan set Content-Type manual: Axios menambahkan boundary multipart sendiri. */
  const { data } = await apiClient.post<ApiResponse<WebsiteImage>>(
    `/owner/website-images/${key}`,
    form,
  );

  return data.data;
}

/** DELETE /api/v1/owner/website-images/{key} — kembali ke gambar bawaan. */
export async function deleteWebsiteImage(key: WebsiteImageKey): Promise<void> {
  await apiClient.delete(`/owner/website-images/${key}`);
}
```

**Explanation:** `websiteImageFallback()` guarantees a string even if the backend adds an unknown
slot, so `<img src>` never becomes `undefined`. The fallback URLs were copied from the current
`LandingPage.tsx`, so removing those hard-coded values does not change the visual result.

### N8. Create the owner image manager component

**File:** `frontend/src/components/owner/WebsiteImageManager.tsx`

**Status:** NEW

**Purpose:** self-contained settings widget. It is dropped into `OwnerSettingsPage` and does not
depend on any new route.

**Complete code:**

```tsx
import { useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '../../api/client';
import {
  deleteWebsiteImage,
  fetchWebsiteImages,
  uploadWebsiteImage,
  websiteImageFallback,
  type WebsiteImage,
  type WebsiteImageKey,
} from '../../api/websiteImages';
import '../../styles/website-images.css';

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface Draft {
  file: File;
  previewUrl: string;
}

export default function WebsiteImageManager() {
  const [images, setImages] = useState<WebsiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<WebsiteImageKey, Draft>>>({});
  const inputRefs = useRef<Partial<Record<WebsiteImageKey, HTMLInputElement | null>>>({});
  const draftsRef = useRef(drafts);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    let alive = true;

    fetchWebsiteImages()
      .then((list) => {
        if (!alive) return;
        setImages(list);
        setMessage('');
      })
      .catch((error) => {
        if (!alive) return;
        setIsError(true);
        setMessage(getApiErrorMessage(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  /* Lepaskan object URL pratinjau saat komponen dilepas. */
  useEffect(
    () => () => {
      Object.values(draftsRef.current).forEach((draft) => {
        if (draft) URL.revokeObjectURL(draft.previewUrl);
      });
    },
    [],
  );

  function feedback(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  function selectFile(key: WebsiteImageKey, file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      feedback('Format gambar harus JPG, PNG, atau WebP.', true);
      return;
    }

    if (file.size > MAX_BYTES) {
      feedback('Ukuran gambar maksimal 4MB.', true);
      return;
    }

    const previous = drafts[key];
    if (previous) URL.revokeObjectURL(previous.previewUrl);

    setDrafts((current) => ({
      ...current,
      [key]: { file, previewUrl: URL.createObjectURL(file) },
    }));
    feedback('');
  }

  function cancelDraft(key: WebsiteImageKey) {
    const draft = drafts[key];
    if (draft) URL.revokeObjectURL(draft.previewUrl);

    setDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function saveDraft(key: WebsiteImageKey) {
    const draft = drafts[key];
    if (!draft || pendingKey) return;

    setPendingKey(key);
    feedback('');

    try {
      const updated = await uploadWebsiteImage(key, draft.file);
      setImages((current) =>
        current.map((image) => (image.key === key ? updated : image)),
      );
      URL.revokeObjectURL(draft.previewUrl);
      setDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      feedback(`${updated.label} berhasil diperbarui.`);
    } catch (error) {
      feedback(getApiErrorMessage(error), true);
    } finally {
      setPendingKey(null);
    }
  }

  async function removeImage(key: WebsiteImageKey) {
    const image = images.find((item) => item.key === key);
    if (!image || !image.url || pendingKey) return;

    const confirmed = window.confirm(
      `Hapus gambar kustom untuk "${image.label}"? Gambar bawaan akan dipakai kembali.`,
    );
    if (!confirmed) return;

    setPendingKey(key);
    feedback('');

    try {
      await deleteWebsiteImage(key);
      setImages((current) =>
        current.map((item) =>
          item.key === key ? { ...item, url: null, updated_at: null } : item,
        ),
      );
      feedback(`${image.label} dikembalikan ke gambar bawaan.`);
    } catch (error) {
      feedback(getApiErrorMessage(error), true);
    } finally {
      setPendingKey(null);
    }
  }

  if (loading) {
    return (
      <p className="empty-state" role="status">
        Memuat foto website…
      </p>
    );
  }

  return (
    <div className="website-images">
      <p
        className={`form-message${isError ? ' is-error' : ''}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>

      <div className="website-images-grid">
        {images.map((image) => {
          const key = image.key as WebsiteImageKey;
          const draft = drafts[key];
          const pending = pendingKey === key;
          const preview = draft?.previewUrl ?? image.url ?? websiteImageFallback(key);

          return (
            <article className="website-image-card" key={image.key}>
              <div className="website-image-preview">
                <img src={preview} alt={`Pratinjau ${image.label}`} loading="lazy" />
                <span
                  className={`website-image-badge${image.url ? ' is-custom' : ''}`}
                >
                  {draft ? 'Belum disimpan' : image.url ? 'Kustom' : 'Bawaan'}
                </span>
              </div>

              <div className="website-image-body">
                <h3>{image.label}</h3>
                <p>
                  {image.url
                    ? 'Gambar kustom aktif di website.'
                    : 'Masih memakai gambar bawaan website.'}
                </p>

                <input
                  ref={(element) => {
                    inputRefs.current[key] = element;
                  }}
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={`Pilih gambar untuk ${image.label}`}
                  onChange={(event) => {
                    const [file] = Array.from(event.target.files ?? []);
                    if (file) selectFile(key, file);
                    event.target.value = '';
                  }}
                />

                {draft ? (
                  <div className="website-image-actions">
                    <button
                      className="save-button"
                      type="button"
                      disabled={pending}
                      onClick={() => void saveDraft(key)}
                    >
                      {pending ? 'Mengunggah…' : 'Simpan Gambar'}
                    </button>
                    <button
                      className="reset-button"
                      type="button"
                      disabled={pending}
                      onClick={() => cancelDraft(key)}
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="website-image-actions">
                    <button
                      className="reset-button"
                      type="button"
                      disabled={pending}
                      onClick={() => inputRefs.current[key]?.click()}
                    >
                      {image.url ? 'Ganti Gambar' : 'Unggah Gambar'}
                    </button>
                    {image.url && (
                      <button
                        className="remove-image-button"
                        type="button"
                        disabled={pending}
                        onClick={() => void removeImage(key)}
                      >
                        {pending ? 'Memproses…' : 'Hapus'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
```

**Explanation of state and flow:**

1. On mount it fetches the slot list. Each slot renders `draft preview → custom URL → fallback`.
2. Selecting a file **does not upload immediately**. It creates a local object URL preview and
   shows “Simpan Gambar” / “Batal”. This satisfies the “preview before uploading” requirement and
   prevents accidental changes.
3. `saveDraft()` uploads only the selected slot and replaces that entry in local state with the
   server response.
4. `removeImage()` asks for confirmation, deletes the custom image, and leaves the row showing the
   built-in image.
5. All HTTP errors go through the existing `getApiErrorMessage()` for consistent Indonesian
   messages.
6. Object URLs are revoked on cancel and on unmount to avoid memory leaks.

### N9. Create the stylesheet

**File:** `frontend/src/styles/website-images.css`

**Status:** NEW

**Purpose:** grid + card styling consistent with the existing owner settings look (small type,
white cards, `--blue` accent). It is imported by the component, matching the project convention.

**Complete code:**

```css
/* Grid gambar website di halaman Pengaturan owner. */
#page-owner-order-detail .website-images-card{
  margin-top: 18px;
}

#page-owner-order-detail .website-images-card > .settings-hint{
  margin-bottom: 14px;
}

#page-owner-order-detail .website-images-grid{
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}

#page-owner-order-detail .website-image-card{
  overflow: hidden;
  border: 1px solid #eceef2;
  border-radius: 12px;
  background: #fff;
}

#page-owner-order-detail .website-image-preview{
  position: relative;
  aspect-ratio: 16 / 10;
  background: #f3f5f9;
}

#page-owner-order-detail .website-image-preview img{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

#page-owner-order-detail .website-image-badge{
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(18, 26, 45, 0.78);
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

#page-owner-order-detail .website-image-badge.is-custom{
  background: var(--blue, #2862ed);
}

#page-owner-order-detail .website-image-body{
  display: grid;
  gap: 6px;
  padding: 10px 12px 12px;
}

#page-owner-order-detail .website-image-body h3{
  margin: 0;
  font-size: 11px;
  font-weight: 700;
}

#page-owner-order-detail .website-image-body p{
  margin: 0;
  color: #858b96;
  font-size: 9px;
  line-height: 1.45;
}

#page-owner-order-detail .website-image-actions{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

#page-owner-order-detail .website-image-actions .save-button,
#page-owner-order-detail .website-image-actions .reset-button{
  min-height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

#page-owner-order-detail .website-image-actions button:disabled{
  cursor: not-allowed;
  opacity: 0.6;
}

#page-owner-order-detail .remove-image-button{
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid #f3c7c7;
  border-radius: 8px;
  background: #fff5f5;
  color: #c0392b;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

#page-owner-order-detail .remove-image-button:disabled{
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 620px){
  #page-owner-order-detail .website-images-grid{
    grid-template-columns: 1fr;
  }
}
```

**Explanation:** everything is scoped under `#page-owner-order-detail` because
`OwnerSettingsPage` uses `pageId="page-owner-order-detail"`. This avoids leaking styles into other
owner pages that reuse `.save-button` / `.reset-button`.

### E6. Integrate the manager into Owner Settings

**File:** `frontend/src/pages/owner/OwnerSettingsPage.tsx`

**Status:** EXISTS — modify.

**Change 1 — import.** Add after the `useAuth` import:

```tsx
import WebsiteImageManager from '../../components/owner/WebsiteImageManager';
```

Resulting top-of-file imports:

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import OwnerShell from '../../components/owner/OwnerShell';
import { getApiErrorMessage } from '../../api/client';
import {
  changeOwnerPassword,
  fetchOwnerProfile,
  updateOwnerProfile,
  type OwnerProfile,
} from '../../api/owner';
import useAuth from '../../auth/useAuth';
import WebsiteImageManager from '../../components/owner/WebsiteImageManager';
import '../../styles/owner-order-detail.css';
import '../../styles/owner-settings.css';
```

**Change 2 — new section.** Locate the end of the rendered `detail-layout` block:

```tsx
            </aside>
          </div>
        )}
      </main>
```

Insert the new section between `)}` and `</main>`:

```tsx
        {!loading && !loadError && profile && (
          <section
            className="info-card website-images-card"
            aria-labelledby="website-images-title"
          >
            <h2 className="section-title" id="website-images-title">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="4" width="17" height="16" rx="2" />
                <circle cx="8.5" cy="9" r="1.5" />
                <path d="m20.5 15-5-5L5 20" />
              </svg>
              Foto Website
            </h2>
            <p className="settings-hint">
              Kelola gambar yang tampil di halaman beranda customer. Pratinjau tampil sebelum
              diunggah; gambar bawaan otomatis dipakai bila tidak ada gambar kustom.
            </p>
            <WebsiteImageManager />
          </section>
        )}
      </main>
```

**Explanation:** the section is rendered outside `.detail-layout`, so it spans the full content
width beneath the profile/password cards. It only renders after the profile has loaded, which
keeps the existing loading/error states untouched. No router change is required because the
settings route already exists.

**Verification:**

```bash
cd frontend
npm run typecheck
npm run dev
```

Open `http://localhost:5173/login`, log in as owner, navigate to `/owner/settings`. Expected:
“Foto Website” card with 7 image slots, each showing its fallback image and “Unggah Gambar”.

### E4. Add the service photo upload helper

**File:** `frontend/src/api/layanan.ts`

**Status:** EXISTS — modify.

**Change:** add this function at the end of the file, after `deleteLayanan()`:

```ts
/** POST /api/v1/owner/layanan/{id}/foto — multipart, field `image`. */
export async function uploadLayananPhoto(
  id: string | number,
  file: File,
): Promise<Layanan> {
  const form = new FormData();
  form.append('image', file);

  /* Biarkan Axios menentukan header multipart beserta boundary-nya. */
  const { data } = await apiClient.post<ApiResponse<Layanan>>(
    `/owner/layanan/${id}/foto`,
    form,
  );

  return data.data;
}
```

**Explanation:** the helper lives beside the other `layanan` functions so callers do not need to
know the endpoint. It uses the same authenticated `apiClient`.

### E5. Update the owner catalog photo flow

**File:** `frontend/src/pages/owner/OwnerCatalogPage.tsx`

**Status:** EXISTS — modify.

The current flow converts a file to a base64 data URL and puts it in the `foto` string field. That
is replaced with: preview locally, save the service first, then upload the file to the dedicated
endpoint.

**Change 1 — import.** Add `uploadLayananPhoto` to the existing `api/layanan` import:

```tsx
import {
  createLayanan,
  deleteLayanan,
  fetchLayanan,
  updateLayanan,
  uploadLayananPhoto,
  type Layanan,
} from '../../api/layanan';
```

**Change 2 — new state.** Immediately after:

```tsx
  const [selectedPhoto, setSelectedPhoto] = useState('');
```

add:

```tsx
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
```

**Change 3 — reset state when opening the dialog.** In `openServiceDialog()`, replace:

```tsx
    setSelectedPhoto(service?.image ?? '');
```

with:

```tsx
    setSelectedPhoto(service?.image ?? '');
    setSelectedPhotoFile(null);
    setPhotoRemoved(false);
```

**Change 4 — keep the file when previewing.** In `readPhoto()`, change the client limits and store
the file:

```tsx
  async function readPhoto(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setDialogMessage('Format foto harus JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setDialogMessage('Ukuran foto maksimal 4MB.');
      return;
    }

    try {
      setDialogMessage('');
      setSelectedPhoto(await compressPhoto(file));
      setSelectedPhotoFile(file);
      setPhotoRemoved(false);
    } catch (error) {
      console.error('Tidak dapat memproses foto:', error);
      setDialogMessage('Foto tidak dapat diproses. Silakan pilih file lain.');
    }
  }
```

> `compressPhoto()` is deliberately kept for the **preview only**. The original file is uploaded,
> so the backend receives the real image rather than a base64 string.

**Change 5 — file input `accept` and helper text.** In the hidden photo input, replace:

```tsx
              accept="image/jpeg,image/png"
```

with:

```tsx
              accept="image/jpeg,image/png,image/webp"
```

Then update the dropzone helper text from:

```tsx
                  <small id="photo-help">JPG, PNG up to 5MB</small>
```

to:

```tsx
                  <small id="photo-help">JPG, PNG, WebP up to 4MB</small>
```

**Change 6 — removal button.** Replace the existing remove-photo `onClick`:

```tsx
                onClick={() => {
                  setSelectedPhoto('');
                  setDialogMessage('');
                }}
```

with:

```tsx
                onClick={() => {
                  setSelectedPhoto('');
                  setSelectedPhotoFile(null);
                  setPhotoRemoved(true);
                  setDialogMessage('');
                }}
```

**Change 7 — submit payload and upload.** Replace the payload + save block inside
`handleSubmit()`:

```tsx
    const payload = {
      nama: formName.trim(),
      deskripsi: formDescription.trim(),
      harga: Number(formPrice),
      kategori: formCategory,
      estimasi: formEstimate.trim(),
      aktif: formActive === 'true',
      foto: selectedPhoto || null,
    };

    try {
      if (editingId) {
        await updateLayanan(editingId, payload);
      } else {
        await createLayanan(payload);
      }

      closeServiceDialog();
      await reload();
      setPageMessage(
        editingId ? 'Layanan berhasil diperbarui.' : 'Layanan berhasil ditambahkan.',
      );
    } catch (error) {
      setDialogMessage(getApiErrorMessage(error));
    }
```

with:

```tsx
    const payload = {
      nama: formName.trim(),
      deskripsi: formDescription.trim(),
      harga: Number(formPrice),
      kategori: formCategory,
      estimasi: formEstimate.trim(),
      aktif: formActive === 'true',
      ...(photoRemoved ? { foto: null } : {}),
    };

    try {
      const saved = editingId
        ? await updateLayanan(editingId, payload)
        : await createLayanan(payload);

      /* Foto diunggah setelah record tersimpan agar selalu punya id layanan. */
      if (selectedPhotoFile) {
        await uploadLayananPhoto(saved.id, selectedPhotoFile);
      }

      closeServiceDialog();
      await reload();
      setPageMessage(
        editingId ? 'Layanan berhasil diperbarui.' : 'Layanan berhasil ditambahkan.',
      );
    } catch (error) {
      setDialogMessage(getApiErrorMessage(error));
    }
```

**Explanation:**

- `payload` no longer carries a base64 string. It only sends `foto: null` when the owner explicitly
  removed an existing image.
- For a **new** service the record must exist before its photo can be attached, hence
  “create → upload”.
- If the photo upload fails, the service fields are already saved and the dialog shows the error.
  The owner can reopen the service and retry the photo without re-entering data. This is an
  intentional trade-off (a single atomic multipart “create with photo” endpoint would duplicate
  logic and diverge from the existing API shape).
- The client limits now match the backend (`JPG/PNG/WebP`, 4 MB).

**Verification:**

```bash
cd frontend
npm run typecheck
```

Then, in the browser at `/owner/catalog`: create a service, select a JPG, confirm the preview,
save, and verify the table thumbnail shows the uploaded image. Edit it, replace the photo, and
confirm the new image appears. Remove the photo and confirm the empty placeholder returns.

### Phase 3 commit checkpoint

Files created:

- `frontend/src/api/websiteImages.ts`
- `frontend/src/components/owner/WebsiteImageManager.tsx`
- `frontend/src/styles/website-images.css`

Files modified:

- `frontend/src/api/layanan.ts`
- `frontend/src/pages/owner/OwnerCatalogPage.tsx`
- `frontend/src/pages/owner/OwnerSettingsPage.tsx`

```bash
git status
git diff -- frontend/src/api frontend/src/components frontend/src/pages/owner frontend/src/styles
git add frontend/src/api/websiteImages.ts \
        frontend/src/api/layanan.ts \
        frontend/src/components/owner/WebsiteImageManager.tsx \
        frontend/src/styles/website-images.css \
        frontend/src/pages/owner/OwnerCatalogPage.tsx \
        frontend/src/pages/owner/OwnerSettingsPage.tsx
git commit -m "feat: add website image manager to owner settings"
```

---

## 9. Phase 4 — Customer Website Integration

**Goal:** the landing page reads the uploaded images, falls back to the current Unsplash images,
and never blocks or breaks if the API is unavailable.

### E7. Use managed images on the landing page

**File:** `frontend/src/pages/user/LandingPage.tsx`

**Status:** EXISTS — modify.

**Change 1 — import.** Add after the `landingContent` import:

```tsx
import {
  fetchWebsiteImages,
  websiteImageFallback,
  type WebsiteImageKey,
} from '../../api/websiteImages';
```

The import block becomes:

```tsx
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../auth/useAuth';
import Brand from '../../components/shared/Brand';
import { ROLE_HOME } from '../../auth/roles';
import {
  LANDING_FAQS,
  LANDING_STEPS,
  LANDING_TESTIMONIALS,
} from '../../data/landingContent';
import {
  fetchWebsiteImages,
  websiteImageFallback,
  type WebsiteImageKey,
} from '../../api/websiteImages';
import '../../styles/landing.css';
```

**Change 2 — state and loader.** Inside `LandingPage`, after:

```tsx
  const [openFaq, setOpenFaq] = useState<number | null>(0);
```

add:

```tsx
  const [siteImages, setSiteImages] = useState<
    Partial<Record<WebsiteImageKey, string>>
  >({});
```

Then add a new effect after the existing `document.title` effect:

```tsx
  useEffect(() => {
    let alive = true;

    fetchWebsiteImages()
      .then((list) => {
        if (!alive) return;

        const map: Partial<Record<WebsiteImageKey, string>> = {};
        list.forEach((image) => {
          if (image.url) {
            map[image.key as WebsiteImageKey] = image.url;
          }
        });

        setSiteImages(map);
      })
      .catch(() => {
        /* Gagal memuat gambar kustom bukan alasan untuk menggagalkan halaman;
           semua slot otomatis memakai gambar bawaan. */
      });

    return () => {
      alive = false;
    };
  }, []);

  const siteImage = (key: WebsiteImageKey): string =>
    siteImages[key] ?? websiteImageFallback(key);
```

**Change 3 — replace the 7 hard-coded image sources.**

| Locate (current code) | Replace with |
| --- | --- |
| `src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1100&q=90"` under `className="hero-image"` | `src={siteImage('hero')}` |
| `src="https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=700&q=85"` under “Basic Cleaning” | `src={siteImage('card_basic_cleaning')}` |
| `src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=700&q=85"` under “Hard Cleaning” | `src={siteImage('card_hard_cleaning')}` |
| `src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85"` under “Suede Cleaning” | `src={siteImage('card_suede_cleaning')}` |
| `src="https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1200&q=85"` under the wide card | `src={siteImage('promo_additional_care')}` |
| `src="https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?auto=format&fit=crop&w=900&q=85"` under `.promo-card--repair` | `src={siteImage('promo_repair')}` |
| `src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85"` under `.promo-card--gear` | `src={siteImage('promo_gear')}` |

Example result for the hero image:

```tsx
            <img
              className="hero-image"
              src={siteImage('hero')}
              alt="Sepatu sneaker yang bersih dan terawat"
            />
```

And for the first service card:

```tsx
              <Link className="service-card" to="/layanan">
                <img
                  src={siteImage('card_basic_cleaning')}
                  alt="Sneaker putih setelah basic cleaning"
                />
                <span className="service-card-copy">
                  <strong>Basic Cleaning</strong>
                  <small>Untuk cuci luar dan dalam</small>
                </span>
              </Link>
```

**Explanation:**

- `siteImage()` checks: custom URL from the API → built-in fallback. The customer never sees a
  broken image.
- Fetch failure is intentionally silent; the page still renders the original design.
- No loading spinner is added to the landing page: images are decorative and the fallbacks render
  immediately.
- Service card **content** (`Basic Cleaning`, etc.) remains static. These cards are marketing
  highlights, not records from `daftar_layanans`. Real service images are already served through
  `GET /api/v1/layanan` and displayed in `/layanan`, `/pembayaran`, and `/lacak-pesanan` via
  `useCatalog()`; no change is needed there because `toCatalogService()` already reads `foto`.

**Verification:**

```bash
cd frontend
npm run typecheck
npm run dev
```

Steps:

1. Open `/` with no custom images → the original Unsplash images appear.
2. Upload a new hero image in `/owner/settings` → return to `/` and confirm the new hero appears.
3. Delete the custom hero → reload `/` and confirm the fallback returns.
4. Temporarily stop the backend and reload `/` → the page still renders with fallbacks.

### E7 optional hardening (not required)

The landing page currently renders the hard-coded marketing text. If you later want the three
service card images to come from real catalog records, replace those `<Link>` cards with a
`useCatalog()` slice. That is a content decision, not part of this image-management feature.

### Phase 4 commit checkpoint

Files modified:

- `frontend/src/pages/user/LandingPage.tsx`

```bash
git status
git diff -- frontend/src/pages/user/LandingPage.tsx
git add frontend/src/pages/user/LandingPage.tsx
git commit -m "feat: use managed website images on the customer landing page"
```

---

## 10. Phase 5 — Security and Testing

### 10.1 Threats addressed

| Threat | Mitigation | Where |
| --- | --- | --- |
| Arbitrary file upload | `mimes:jpg,jpeg,png,webp` + Laravel MIME sniffing | Controllers |
| Oversized uploads | `max:4096` (4 MB) | Controllers |
| Stored XSS via SVG/HTML | SVG and HTML are rejected | Controllers |
| Path traversal / user filenames | `putFile()` generates hashed names | `ImageStorageService` |
| Deleting arbitrary files | `delete()` only accepts paths inside the expected directory | `ImageStorageService` |
| Unauthorized admin actions | Existing `auth:sanctum` + `admin` group | `routes/api.php` |
| Data loss on failed replacement | New file stored and row updated **before** old file deletion | Controllers |
| Unknown slot injection | `WebsiteImage::isSlot()` → 404 | `WebsiteImageController` |
| Orphaned file when DB write fails | Newly stored file deleted in the catch block | `WebsiteImageController@upload` |
| Upload floods | Existing API is authenticated; add rate limiting if needed | see below |

### 10.2 Recommended optional rate limit

The owner endpoints are already admin-only, so rate limiting is optional. If you want it, change
the two admin routes to:

```php
        Route::post('/website-images/{key}', [WebsiteImageController::class, 'upload'])
            ->middleware('throttle:30,1')
            ->name('api.v1.owner.website-images.upload');
```

This follows the existing pattern used by `/captcha` and `/auth/login`.

### 10.3 Test matrix

| Scenario | Test file | Test name |
| --- | --- | --- |
| Public list returns all slots | `WebsiteImageTest` | `test_public_index_lists_every_slot_with_null_url` |
| Owner uploads an image | `WebsiteImageTest` | `test_admin_can_upload_an_image` |
| Replacement keeps new, deletes old | `WebsiteImageTest` | `test_replacing_an_image_keeps_the_new_file_and_removes_the_old_one` |
| Owner deletes a custom image | `WebsiteImageTest` | `test_admin_can_delete_a_custom_image` |
| Non-image rejected | `WebsiteImageTest` | `test_upload_rejects_non_image_files` |
| Unknown slot rejected | `WebsiteImageTest` | `test_upload_rejects_unknown_slot` |
| Guest cannot upload | `WebsiteImageTest` | `test_guest_cannot_upload` |
| Customer cannot upload/delete | `WebsiteImageTest` | `test_customer_cannot_upload_or_delete` |
| Service photo upload + replacement | `LayananFotoTest` | `test_admin_can_upload_and_replace_a_service_photo` |
| Service photo URL in public API | `LayananFotoTest` | `test_photo_url_is_returned_from_the_public_catalog` |
| Customer cannot upload service photo | `LayananFotoTest` | `test_non_admin_cannot_upload_a_service_photo` |
| Unknown service returns 404 | `LayananFotoTest` | `test_upload_returns_404_for_unknown_service` |

Run the focused suite:

```bash
cd backend
php artisan test --filter="WebsiteImageTest|LayananFotoTest"
```

Then verify no regression in the existing catalog and settings suites:

```bash
php artisan test --filter="LayananTest|OwnerSettingsTest"
```

Expected: all pass.

### 10.4 Manual end-to-end checklist

1. As owner, upload a valid JPG for each of the 7 slots.
2. Confirm each preview changes and a success message appears.
3. Reload `/owner/settings`; all 7 custom images persist.
4. Open `/` in a new tab; all 7 images match the uploads.
5. Re-upload the hero with a PNG; confirm only the hero changes.
6. Delete `promo_gear`; confirm the fallback image returns on `/`.
7. Attempt to upload a PDF and a 6 MB image; confirm both are rejected with readable messages.
8. Log in as a customer; attempt `POST /api/v1/owner/website-images/hero` with the customer token;
   confirm `403`.
9. Upload a service photo in `/owner/catalog`; confirm it appears in `/layanan`.

### Phase 5 commit checkpoint

If you added rate limiting (or any test-only adjustment), commit it separately:

```bash
git status
git diff -- backend/routes/api.php
git add backend/routes/api.php
git commit -m "chore: rate limit website image uploads"
```

If no code changed in this phase, there is nothing to commit.

---

## 11. Phase 6 — Production Deployment

### 11.1 Backend environment variables

In `backend/.env` on the PHP host (never commit this file):

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.your-domain.com

FRONTEND_URL=https://your-frontend.pages.dev

FILESYSTEM_DISK=local
DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
```

Why:

- `APP_URL` is the base used by `Storage::disk('public')->url()`; a wrong value produces broken
  image URLs.
- `FRONTEND_URL` feeds `config/cors.php`; the Cloudflare Pages origin must be listed (comma-
  separated for multiple origins, e.g. preview deployments).
- `FILESYSTEM_DISK` stays `local` because the code explicitly uses the `public` disk.

`backend/.env.example` already documents `APP_URL` and `FRONTEND_URL`, so no change is required.

### 11.2 Frontend environment variable (Cloudflare Pages)

Set in **Cloudflare Pages → Settings → Environment variables** for the production environment:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api/v1
```

Important: Vite bakes this at build time. After changing it, trigger a new deployment. Build
settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `frontend`

### 11.3 Storage configuration on the PHP host

```bash
cd /path/to/backend
php artisan storage:link
```

This creates `public/storage` → `storage/app/public`. Verify:

```bash
ls -la public/storage
```

Expected: a symlink (or junction on Windows) pointing at `storage/app/public`.

If your host disallows symlinks, create the equivalent web-server alias so that
`https://api.your-domain.com/storage/*` serves `storage/app/public/*`. That host-specific setup is
**UNVERIFIED** for your provider; confirm with the hosting documentation.

Ensure the web server user can write:

```bash
chmod -R ug+rwx storage bootstrap/cache
```

### 11.4 PHP upload limits

`max:4096` (4 MB) is enforced by Laravel, but PHP must allow the request first. Confirm:

```ini
upload_max_filesize = 8M
post_max_size = 10M
```

If these are lower than 4 MB, uploads fail before validation with a generic error.

### 11.5 Deployment commands

```bash
cd /path/to/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

After deploying new code, always re-run `php artisan config:cache` if `.env` changed.

### 11.6 CORS check

`backend/config/cors.php` allows `api/*` and reads `FRONTEND_URL`. Confirm a preflight succeeds:

```bash
curl -i -X OPTIONS https://api.your-domain.com/api/v1/website-images \
  -H "Origin: https://your-frontend.pages.dev" \
  -H "Access-Control-Request-Method: GET"
```

Expected: `204`/`200` with `Access-Control-Allow-Origin: https://your-frontend.pages.dev`.

If images load but API calls fail, the problem is CORS or `VITE_API_BASE_URL`; if API calls work
but images 404, the problem is `APP_URL` or the storage link.

### 11.7 Persistent storage warning

Uploaded files live on the backend host’s local disk. On ephemeral platforms (containers that
rebuild), uploads disappear on redeploy. Either:

- use a host with persistent disk (typical shared/VPS PHP hosting), or
- switch the `public` disk to S3-compatible storage in `config/filesystems.php` and change
  `ImageStorageService` to use that disk name.

The S3 path is **not implemented** in this guide; it is a deliberate scope boundary.

### Phase 6 commit checkpoint

No application files are expected to change in this phase except possibly `backend/.env.example`
(already sufficient). Deployment configuration lives in the hosting dashboards.

```bash
git status
git diff
```

Do not commit `.env`, `public/storage`, or `storage/app/public/*` contents.

---

## 12. Git Commit Checkpoints (summary)

| Phase | Commit message | Files |
| --- | --- | --- |
| 1 | `feat: add website image table and public storage service` | N1, N2, N3 |
| 2 | `feat: expose website image and service photo API` | N4, N5, N6, E1, E2, E3 |
| 3 | `feat: add website image manager to owner settings` | N7, N8, N9, E4, E5, E6 |
| 4 | `feat: use managed website images on the customer landing page` | E7 |
| 5 | `chore: rate limit website image uploads` (only if applied) | E1 |
| 6 | No commit (deployment/hosting configuration) | — |

Each phase is independently deployable: Phase 1 adds schema only, Phase 2 adds endpoints, Phase 3
adds owner UI, Phase 4 changes the customer page. A partially completed project still works
because the customer page uses fallbacks.

Before every commit:

```bash
git status
git diff
```

Never stage `.env`, `backend/storage/logs`, or uploaded files.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `404` on `/api/v1/website-images` | Route cache stale or code not deployed | `php artisan route:clear && php artisan route:cache` |
| `401` on owner upload | Missing/expired Sanctum token | Re-login; confirm `Authorization: Bearer …` is sent by `apiClient` |
| `403` on owner upload | Logged in as `user`, not `admin` | Use an owner account; `AdminMiddleware` requires `role === 'admin'` |
| `422` “image must be a file of type…” | Wrong MIME or extension | Use JPG, PNG, or WebP; verify the file is a real image |
| `422` “image may not be greater than 4096 kilobytes” | File > 4 MB | Compress or resize before upload |
| `500` “Gambar gagal disimpan” | Storage not writable or disk full | Check `storage/app/public` permissions and free space; inspect `storage/logs/laravel.log` |
| Upload succeeds but `<img>` shows 404 | `public/storage` missing or `APP_URL` wrong | Run `php artisan storage:link`; verify `APP_URL` matches the public API domain |
| Image URL points to `http://localhost` in production | `APP_URL` not updated or config cached | Set production `APP_URL`; run `php artisan config:cache` |
| CORS error in browser | Frontend origin missing from `FRONTEND_URL` | Add the exact origin (`https://…`), then `php artisan config:cache` |
| Landing page still shows old image | Browser cache or API cache | Hard refresh; confirm `GET /api/v1/website-images` returns the new URL |
| Owner settings manager stuck on “Memuat foto website…” | API unreachable or `VITE_API_BASE_URL` wrong | Check the browser Network tab; verify the env var and rebuild |
| Service photo shows a huge base64 string | Old client build still sending data URLs | Rebuild the frontend; deploy the updated `OwnerCatalogPage` |
| Deleting a photo leaves a file on disk | File was manual/external or delete failed | `ImageStorageService` only deletes managed paths; clean manual files yourself |
| `419` on POST | Unrelated CSRF/cookie misconfiguration | This API is token-based; ensure the request uses Sanctum bearer auth, not cookies |

---

## 14. Final Verification Checklist

### Documentation

- [x] Only `docs/WEBSITE_IMAGE_MANAGEMENT_IMPLEMENTATION.md` was created.
- [x] No application source, migration, or configuration file was modified.
- [x] Actual class names verified: `daftar_layanan`, `OwnerProfileController`,
      `LayananController`, `AdminMiddleware`, `ImageStorageService`.
- [x] Actual response shape verified: `{ success, message, data }`.
- [x] Actual frontend client verified: `apiClient` from `frontend/src/api/client.ts`.
- [x] Actual auth verified: Sanctum token + `admin` middleware; owner routes under
      `RequireRole role="owner"`.
- [x] Actual landpage image inventory verified: 7 images, no About section.
- [x] Actual service image field verified: `daftar_layanans.foto` reused, no duplicate column.

### After implementing Phase 1

- [ ] `php artisan migrate` succeeds.
- [ ] `website_images` table exists.
- [ ] `php artisan storage:link` created `public/storage`.

### After implementing Phase 2

- [ ] `php artisan route:list --path=api/v1` shows the 4 new routes.
- [ ] `GET /api/v1/website-images` returns 7 slots.
- [ ] Owner upload returns a URL under `/storage/website-images/`.
- [ ] Replacing an image leaves exactly one file for that slot.
- [ ] Deleting an image removes the row and the file.
- [ ] `php artisan test --filter="WebsiteImageTest|LayananFotoTest"` passes.
- [ ] `php artisan test --filter="LayananTest|OwnerSettingsTest"` passes.

### After implementing Phase 3

- [ ] `npm run typecheck` passes.
- [ ] `/owner/settings` shows “Foto Website” with 7 slots.
- [ ] Preview appears before saving.
- [ ] Upload, replace, and delete each show success feedback.
- [ ] `/owner/catalog` saves service photos as files (no base64 in the database).
- [ ] Service photo removal clears `foto`.

### After implementing Phase 4

- [ ] `/` shows custom images when present.
- [ ] `/` shows fallbacks when no custom image exists.
- [ ] `/` still renders when the backend is offline.
- [ ] `/layanan` shows uploaded service photos.

### Before production

- [ ] `APP_URL` is the public backend URL (HTTPS).
- [ ] `FRONTEND_URL` contains the exact Cloudflare Pages origin.
- [ ] `VITE_API_BASE_URL` points to `https://…/api/v1` and the site was rebuilt.
- [ ] `php artisan storage:link` succeeded on the server.
- [ ] `storage/` and `bootstrap/cache/` are writable by the web server user.
- [ ] PHP `upload_max_filesize` ≥ 8M and `post_max_size` ≥ 10M.
- [ ] `php artisan config:cache && php artisan route:cache` ran after the last `.env` change.
- [ ] Uploaded images survive a redeploy (persistent disk confirmed).

### Known limitations / unverified assumptions

1. **Hosting-specific storage symlink:** the guide assumes `php artisan storage:link` works. Some
   shared hosts disallow symlinks; the alternative web-server alias is provider-specific and
   **UNVERIFIED**.
2. **Existing base64 data:** if production already contains base64 values in `daftar_layanans.foto`,
   the accessor returns them unchanged and `ImageStorageService` will not delete them. They remain
   until replaced through the new upload flow.
3. **Service card content:** the three homepage service cards are static marketing content; their
   images are managed as website slots, not tied to `daftar_layanans` rows. This matches the
   verified source code.
4. **Login in manual curl examples:** owner login requires a CAPTCHA challenge, so the guide shows
   a `tinker` token as the local shortcut. The browser login flow is unchanged.
5. **`fetchOwnerDashboard()`** in `frontend/src/api/owner.ts` calls `/owner/dashboard`, but no such
   route exists in `backend/routes/api.php` at the analysed commit. It is unrelated to this feature
   and was not changed.

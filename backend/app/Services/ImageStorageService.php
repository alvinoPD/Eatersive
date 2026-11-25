<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ImageStorageService
{
    /** Simpan file gambar dan kembalikan path relatif disk `public`. */
    public function store(UploadedFile $file, string $folder): string
    {
        $path = $file->store($folder, 'public');

        if (! is_string($path) || $path === '') {
            throw new \RuntimeException('Gagal menyimpan file gambar.');
        }

        return $path;
    }

    /** Hapus file lama bila masih berada di disk `public`. */
    public function delete(?string $path): void
    {
        if (! $path || str_starts_with($path, 'http') || str_starts_with($path, 'data:')) {
            return;
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        Storage::disk('public')->delete($path);
    }

    public function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http') || str_starts_with($path, 'data:')) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}

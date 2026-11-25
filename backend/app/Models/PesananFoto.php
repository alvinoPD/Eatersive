<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class PesananFoto extends Model
{
    protected $fillable = ['kode_grup', 'path', 'sisi', 'urutan'];

    protected $appends = ['url'];

    /** URL publik untuk ditampilkan di frontend. */
    public function getUrlAttribute(): ?string
    {
        if (! $this->path) {
            return null;
        }

        if (str_starts_with($this->path, 'http')
            || str_starts_with($this->path, 'data:')
            || str_starts_with($this->path, '/')) {
            return $this->path;
        }

        return Storage::disk('public')->url($this->path);
    }
}

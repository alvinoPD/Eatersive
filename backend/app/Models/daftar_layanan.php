<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class daftar_layanan extends Model
{
    protected $table = 'daftar_layanans';

    protected $fillable = [
        'foto',
        'nama',
        'deskripsi',
        'harga',
        'kategori',
        'estimasi',
        'aktif',
    ];

    protected function casts(): array
    {
        return [
            'harga' => 'decimal:2',
            'aktif' => 'boolean',
        ];
    }

    /** Foto bisa berupa path storage, URL eksternal, atau data URL lama. */
    protected function foto(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): ?string {
                if (! $value) {
                    return null;
                }

                if (str_starts_with($value, 'http')
                    || str_starts_with($value, 'data:')
                    || str_starts_with($value, '/')) {
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

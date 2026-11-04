<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class daftar_layanan extends Model
{
    protected $table = 'daftar_layanans';

    protected $fillable = ['foto', 'nama', 'deskripsi', 'harga', 'kategori', 'estimasi', 'aktif'];

    protected $casts = [
        'harga' => 'decimal:2',
        'aktif' => 'boolean',
    ];

    public function pesanan(): HasMany
    {
        return $this->hasMany(Pesanan::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Riview::class);
    }
}

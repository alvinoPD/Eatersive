<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pesanan extends Model
{
    protected $table = 'pesanan';

    protected $fillable = [
        'kode_pesanan',
        'kode_grup',
        'foto',
        'nama',
        'nomor_telp',
        'alamat',
        'catatan',
        'status',
        'jumlah',
        'subtotal',
        'diskon_persen',
        'diskon',
        'total_harga',
        'estimasi_selesai',
        'user_id',
        'layanan_id',
    ];

    protected function casts(): array
    {
        return [
            'jumlah' => 'integer',
            'subtotal' => 'decimal:2',
            'diskon_persen' => 'integer',
            'diskon' => 'decimal:2',
            'total_harga' => 'decimal:2',
            'estimasi_selesai' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function layanan(): BelongsTo
    {
        return $this->belongsTo(daftar_layanan::class);
    }

    public function pembayaran(): HasOne
    {
        return $this->hasOne(Pembayaran::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(PesananStatusHistory::class)->orderBy('created_at')->orderBy('id');
    }

    /** Foto barang disimpan per kelompok checkout, bukan per baris layanan. */
    public function fotos(): HasMany
    {
        return $this->hasMany(PesananFoto::class, 'kode_grup', 'kode_grup')->orderBy('urutan');
    }

    public function review(): HasOne
    {
        return $this->hasOne(Riview::class);
    }
}

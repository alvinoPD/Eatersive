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
        'total_harga',
        'estimasi_selesai',
        'user_id',
        'layanan_id',
    ];

    protected function casts(): array
    {
        return [
            'jumlah' => 'integer',
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

    public function review(): HasOne
    {
        return $this->hasOne(Riview::class);
    }
}

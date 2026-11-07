<?php

namespace App\Models;

use App\Enums\OrderStatus;
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
        'user_id',
        'layanan_id',
        'jumlah',
        'total_harga',
        'estimasi_selesai',
    ];

    protected $appends = ['status_label'];

    protected $casts = [
        'status' => OrderStatus::class,
        'jumlah' => 'integer',
        'total_harga' => 'decimal:2',
        'estimasi_selesai' => 'date',
    ];

    /* Label status untuk frontend (src/api/orders.ts → Order.status_label). */
    public function getStatusLabelAttribute(): string
    {
        $status = $this->status;

        return $status ? $status->label() : (string) $this->attributes['status'];
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

    /*
     * Tahap 4 — Kontrak frontend (Opsi A): timeline perubahan status,
     * diurutkan dari yang paling awal dibuat.
     */
    public function timeline(): HasMany
    {
        return $this->hasMany(PesananStatusLog::class, 'pesanan_id')
            ->orderBy('id');
    }
}

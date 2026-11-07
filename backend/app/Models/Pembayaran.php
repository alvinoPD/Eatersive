<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pembayaran extends Model
{
    protected $table = 'pembayarans';

    protected $fillable = [
        'pesanan_id',
        'metode_pembayaran',
        'status_pembayaran',
        'jumlah',
        'transaction_id',
        'tanggal_bayar',
    ];

    /*
     * Tahap 4 — Cast angka/tanggal supaya JSON respons konsisten.
     * `transaction_id` menyimpan order_id transaksi Midtrans (satu grup
     * checkout multi-item memakai order_id yang sama).
     */
    protected $casts = [
        'jumlah' => 'decimal:2',
        'tanggal_bayar' => 'datetime',
    ];

    public function pesanan(): BelongsTo
    {
        return $this->belongsTo(Pesanan::class);
    }
}

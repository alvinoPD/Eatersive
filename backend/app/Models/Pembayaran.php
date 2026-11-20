<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pembayaran extends Model
{
    protected $table = 'pembayarans';

    protected $fillable = ['pesanan_id', 'metode_pembayaran', 'status_pembayaran', 'jumlah', 'transaction_id', 'tanggal_bayar'];

    public function pesanan(): BelongsTo
    {
        return $this->belongsTo(Pesanan::class);
    }
}

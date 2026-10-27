<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Riview extends Model
{
    protected $table = 'riviews';

    protected $fillable = ['isi_review', 'user_id', 'layanan_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function layanan(): BelongsTo
    {
        return $this->belongsTo(daftar_layanan::class);
    }
}

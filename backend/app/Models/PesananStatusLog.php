<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/*
 * Tahap 4 — Opsi A: log baris timeline pesanan (tabel pesanan_status_logs).
 * `status_label` disimpan pada saat baris dibuat supaya label masa lalu
 * tidak berubah bila mapping label kelak diperbarui.
 */
class PesananStatusLog extends Model
{
    protected $table = 'pesanan_status_logs';

    protected $fillable = ['pesanan_id', 'status', 'status_label', 'catatan', 'changed_by'];

    /**
     * Membuat baris timeline. `status_label` dihitung dari enum bila nilai
     * status dikenal, sehingga label tidak menghilang bila null diberikan.
     */
    public static function record(
        ?Pesanan $pesanan,
        string $status,
        ?string $catatan = null,
        ?string $changedBy = null,
    ): self {
        $label = OrderStatus::tryFrom($status)?->label() ?? $status;

        return static::create([
            'pesanan_id' => $pesanan?->id,
            'status' => $status,
            'status_label' => $label,
            'catatan' => $catatan,
            'changed_by' => $changedBy,
        ]);
    }

    public function pesanan(): BelongsTo
    {
        return $this->belongsTo(Pesanan::class, 'pesanan_id');
    }
}

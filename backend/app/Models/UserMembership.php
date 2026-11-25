<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserMembership extends Model
{
    protected $fillable = [
        'user_id',
        'membership_plan_id',
        'starts_at',
        'expires_at',
        'diskon_persen',
        'catatan',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'expires_at' => 'date',
            'diskon_persen' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MembershipPlan::class, 'membership_plan_id');
    }

    /** Diskon efektif: override pelanggan, atau diskon paket. */
    public function effectiveDiscount(): int
    {
        return (int) ($this->diskon_persen ?? $this->plan?->diskon_persen ?? 0);
    }
}

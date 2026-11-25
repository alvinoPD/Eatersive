<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MembershipPlan extends Model
{
    protected $fillable = [
        'nama',
        'deskripsi',
        'harga',
        'durasi_hari',
        'diskon_persen',
        'aktif',
    ];

    protected function casts(): array
    {
        return [
            'harga' => 'decimal:2',
            'durasi_hari' => 'integer',
            'diskon_persen' => 'integer',
            'aktif' => 'boolean',
        ];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(UserMembership::class);
    }
}

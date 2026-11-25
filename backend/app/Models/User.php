<?php

namespace App\Models;

use App\Models\Pesanan;
use App\Models\Riview;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'nomor_telp'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => 'string',
        ];
    }

    public function pesanan(): HasMany
    {
        return $this->hasMany(Pesanan::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Riview::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(UserMembership::class);
    }

    /** Langganan yang masih berlaku (tanggal selesai belum lewat). */
    public function currentMembership(): ?UserMembership
    {
        return $this->memberships()
            ->with('plan')
            ->whereDate('expires_at', '>=', now()->toDateString())
            ->orderByDesc('expires_at')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Ringkasan membership untuk payload auth dan checkout.
     *
     * @return array<string, mixed>|null
     */
    public function membershipSummary(): ?array
    {
        $membership = $this->currentMembership();

        if (! $membership) {
            return null;
        }

        return [
            'plan' => $membership->plan?->nama,
            'diskon_persen' => $membership->effectiveDiscount(),
            'starts_at' => $membership->starts_at?->toDateString(),
            'expires_at' => $membership->expires_at?->toDateString(),
        ];
    }

    public function isMember(): bool
    {
        return $this->currentMembership() !== null;
    }
}

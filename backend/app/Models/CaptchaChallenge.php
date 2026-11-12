<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CaptchaChallenge extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'question',
        'nonce',
        'answer_hash',
        'context',
        'fingerprint',
        'attempts',
        'expires_at',
        'consumed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function isUsable(): bool
    {
        return $this->consumed_at === null && $this->expires_at->isFuture();
    }
}
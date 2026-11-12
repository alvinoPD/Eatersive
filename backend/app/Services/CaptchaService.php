<?php

namespace App\Services;

use App\Models\CaptchaChallenge;
use Illuminate\Http\Request;

class CaptchaService
{
    /**
     * Membuat challenge baru.
     *
     * Mengembalikan juga jawaban asli untuk dipakai controller/test. Field
     * 'answer' TIDAK BOLEH ikut dikirim ke frontend.
     *
     * @return array{challenge: CaptchaChallenge, answer: string}
     */
    public function issue(Request $request, string $context = 'login'): array
    {
        $this->prune();

        $left = random_int(2, 9);
        $right = random_int(2, 9);
        $answer = $left + $right;
        $nonce = bin2hex(random_bytes(16)); // 32 karakter

        $challenge = CaptchaChallenge::create([
            'question' => sprintf('Berapa hasil dari %d + %d?', $left, $right),
            'nonce' => $nonce,
            'answer_hash' => $this->hashAnswer($nonce, (string) $answer),
            'context' => $context,
            'fingerprint' => $this->fingerprint($request),
            'expires_at' => now()->addSeconds($this->ttl()),
        ]);

        return ['challenge' => $challenge, 'answer' => (string) $answer];
    }

    /**
     * Memverifikasi jawaban. Challenge langsung hangus bila benar,
     * dan hangus setelah percobaan salah melewati batas.
     */
    public function verify(Request $request, int $challengeId, string $answer, string $context = 'login'): bool
    {
        $challenge = CaptchaChallenge::find($challengeId);

        if ($challenge === null) {
            return false;
        }

        // Challenge login tidak boleh dipakai di checkout, dan sebaliknya.
        if ($challenge->context !== $context) {
            return false;
        }

        if ($challenge->consumed_at !== null) {
            return false;
        }

        // Challenge terikat pada IP + User-Agent pembuatnya.
        if (! hash_equals($challenge->fingerprint, $this->fingerprint($request))) {
            return false;
        }

        if ($challenge->expires_at->isPast()) {
            return false;
        }

        if ($challenge->attempts >= $this->maxAttempts()) {
            return false;
        }

        $normalized = preg_replace('/\D/', '', trim($answer)) ?? '';

        if ($normalized === '' || ! hash_equals(
            $challenge->answer_hash,
            $this->hashAnswer($challenge->nonce, (string) (int) $normalized),
        )) {
            $challenge->increment('attempts');

            if ($challenge->attempts >= $this->maxAttempts()) {
                $challenge->forceFill(['consumed_at' => now()])->save();
            }

            return false;
        }

        // Single-use: klaim challenge secara atomik. Hanya satu request yang menang.
        $claimed = CaptchaChallenge::query()
            ->whereKey($challenge->getKey())
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->update(['consumed_at' => now()]);

        return $claimed === 1;
    }

    protected function hashAnswer(string $nonce, string $answer): string
    {
        return hash_hmac('sha256', $nonce.'|'.$answer, (string) config('app.key'));
    }

    /**
     * Mengikat challenge ke client tanpa cookie session.
     */
    protected function fingerprint(Request $request): string
    {
        $raw = ($request->ip() ?? 'unknown').'|'.($request->userAgent() ?? 'unknown');

        return hash_hmac('sha256', $raw, (string) config('app.key'));
    }

    protected function ttl(): int
    {
        return max(30, (int) config('captcha.ttl', 120));
    }

    protected function maxAttempts(): int
    {
        return max(1, (int) config('captcha.max_attempts', 5));
    }

    /**
     * Bersihkan challenge lama supaya tabel tidak tumbuh tanpa batas.
     */
    protected function prune(): void
    {
        CaptchaChallenge::query()
            ->where('created_at', '<', now()->subHour())
            ->delete();
    }
}
<?php

namespace Tests\Feature\Api;

use App\Models\CaptchaChallenge;
use App\Models\User;
use App\Services\CaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class CaptchaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Membuat challenge dari IP + User-Agent yang sama dengan request login
     * di test ini, karena challenge terikat pada fingerprint tersebut.
     */
    private function issueForTestClient(): array
    {
        $request = Request::create('/api/v1/captcha', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'phpunit',
        ]);

        return app(CaptchaService::class)->issue($request, 'login');
    }

    private function postLogin(array $payload)
    {
        return $this->withHeader('User-Agent', 'phpunit')
            ->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->postJson('/api/v1/auth/login', $payload);
    }

    public function test_it_issues_a_challenge_without_leaking_the_answer(): void
    {
        $response = $this->getJson('/api/v1/captcha?context=login');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['id', 'question', 'expires_at', 'ttl'],
            ])
            ->assertJsonMissingPath('data.answer')
            ->assertJsonMissingPath('data.answer_hash');

        $this->assertDatabaseCount('captcha_challenges', 1);
    }

    public function test_login_requires_captcha_fields(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors(['captcha_id', 'captcha_answer']);
    }

    public function test_login_succeeds_with_correct_captcha_answer(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $issued = $this->issueForTestClient();

        $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $issued['challenge']->id,
            'captcha_answer' => $issued['answer'],
        ])->assertOk()->assertJsonStructure(['data' => ['token', 'token_type', 'user']]);
    }

    public function test_login_fails_with_wrong_captcha_answer(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $issued = $this->issueForTestClient();

        $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $issued['challenge']->id,
            'captcha_answer' => '999',
        ])->assertStatus(422)->assertJsonPath('data.captcha_required', true);

        // Percobaan salah tidak menghanguskan challenge selama masih di bawah batas.
        $this->assertNull(CaptchaChallenge::find($issued['challenge']->id)->consumed_at);
    }

    public function test_challenge_is_single_use(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $issued = $this->issueForTestClient();

        $payload = [
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $issued['challenge']->id,
            'captcha_answer' => $issued['answer'],
        ];

        $this->postLogin($payload)->assertOk();
        $this->postLogin($payload)->assertStatus(422);
    }

    public function test_challenge_is_bound_to_context(): void
    {
        $request = Request::create('/api/v1/captcha', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'phpunit',
        ]);

        $issued = app(CaptchaService::class)->issue($request, 'checkout');

        $this->assertFalse(app(CaptchaService::class)->verify(
            $request,
            $issued['challenge']->id,
            $issued['answer'],
            'login',
        ));
    }

    public function test_challenge_expires(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $issued = $this->issueForTestClient();
        $issued['challenge']->forceFill(['expires_at' => now()->subSecond()])->save();

        $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $issued['challenge']->id,
            'captcha_answer' => $issued['answer'],
        ])->assertStatus(422);
    }
}
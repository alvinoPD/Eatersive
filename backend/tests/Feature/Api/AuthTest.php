<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Services\CaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Challenge terikat pada IP + User-Agent, jadi kedua nilai itu disamakan
     * antara pembuatan challenge dan request login.
     */
    private function makeCaptcha(): array
    {
        $request = Request::create('/api/v1/captcha', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'phpunit',
        ]);

        return app(CaptchaService::class)->issue($request, 'login');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function postLogin(array $payload)
    {
        return $this->withHeader('User-Agent', 'phpunit')
            ->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->postJson('/api/v1/auth/login', $payload);
    }

    public function test_register_user_returns_success_with_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Customer Test',
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'token',
                    'token_type',
                    'user',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'customer@example.com',
            'role' => 'user',
        ]);
    }

    public function test_login_with_valid_credentials_returns_token(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $captcha = $this->makeCaptcha();

        $response = $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'password123',
            'captcha_id' => $captcha['challenge']->id,
            'captcha_answer' => $captcha['answer'],
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'token',
                    'token_type',
                    'user',
                ],
            ]);
    }

    public function test_login_with_invalid_credentials_returns_401(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $captcha = $this->makeCaptcha();

        $response = $this->postLogin([
            'email' => 'customer@example.com',
            'password' => 'wrongpassword',
            'captcha_id' => $captcha['challenge']->id,
            'captcha_answer' => $captcha['answer'],
        ]);

        $response->assertStatus(401);
    }

    public function test_login_without_captcha_is_rejected(): void
    {
        User::factory()->create([
            'email' => 'customer@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password123',
        ])->assertStatus(422);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
        ]);

        $response = $this->withToken($user->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/auth/me');

        $response->assertOk()->assertJsonPath('data.user.email', $user->email);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        // Reset cached auth guard so the next request re-resolves from the (revoked) token.
        $this->app['auth']->forgetGuards();

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }
}
<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OwnerSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_read_own_profile_without_password(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@example.com',
            'role' => 'admin',
            'nomor_telp' => '081234567890',
        ]);

        $response = $this->withToken($owner->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/owner/profile');

        $response->assertOk();
        $response->assertJsonPath('data.email', 'owner@example.com');
        $response->assertJsonPath('data.nomor_telp', '081234567890');
        $response->assertJsonMissingPath('data.password');
    }

    public function test_owner_can_update_profile(): void
    {
        $owner = User::factory()->create(['role' => 'admin']);

        $response = $this->withToken($owner->createToken('auth_token')->plainTextToken)
            ->putJson('/api/v1/owner/profile', [
                'name' => 'Admin Baru',
                'email' => 'admin-baru@example.com',
                'nomor_telp' => '089999999999',
            ]);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'Admin Baru');
        $this->assertDatabaseHas('users', [
            'id' => $owner->id,
            'name' => 'Admin Baru',
            'email' => 'admin-baru@example.com',
            'nomor_telp' => '089999999999',
        ]);
    }

    public function test_email_must_be_unique(): void
    {
        User::factory()->create(['email' => 'lain@example.com']);
        $owner = User::factory()->create(['role' => 'admin']);

        $this->withToken($owner->createToken('auth_token')->plainTextToken)
            ->putJson('/api/v1/owner/profile', ['email' => 'lain@example.com'])
            ->assertStatus(422);
    }

    public function test_current_password_is_required_to_change_password(): void
    {
        $owner = User::factory()->create([
            'role' => 'admin',
            'password' => 'password-lama',
        ]);

        $this->withToken($owner->createToken('auth_token')->plainTextToken)
            ->putJson('/api/v1/owner/password', [
                'current_password' => 'password-salah',
                'password' => 'password-baru',
                'password_confirmation' => 'password-baru',
            ])
            ->assertStatus(422);

        $this->assertTrue(Hash::check('password-lama', $owner->fresh()->password));
    }

    public function test_owner_can_change_password_and_other_tokens_are_revoked(): void
    {
        $owner = User::factory()->create([
            'role' => 'admin',
            'password' => 'password-lama',
        ]);

        $currentToken = $owner->createToken('auth_token')->plainTextToken;
        $otherToken = $owner->createToken('other_device')->plainTextToken;
        $otherTokenId = $owner->tokens()->where('name', 'other_device')->value('id');

        $this->withToken($currentToken)
            ->putJson('/api/v1/owner/password', [
                'current_password' => 'password-lama',
                'password' => 'password-baru',
                'password_confirmation' => 'password-baru',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('password-baru', $owner->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $otherTokenId]);

        $this->app['auth']->forgetGuards();

        $this->withToken($currentToken)
            ->getJson('/api/v1/owner/profile')
            ->assertOk();

        $this->app['auth']->forgetGuards();

        $this->withToken($otherToken)
            ->getJson('/api/v1/owner/profile')
            ->assertStatus(401);
    }

    public function test_non_admin_cannot_access_owner_settings(): void
    {
        $customer = User::factory()->create(['role' => 'user']);

        $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/owner/profile')
            ->assertStatus(403);

        $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->putJson('/api/v1/owner/password', [])
            ->assertStatus(403);
    }
}

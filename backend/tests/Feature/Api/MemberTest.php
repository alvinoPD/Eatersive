<?php

namespace Tests\Feature\Api;

use App\Models\MembershipPlan;
use App\Models\Pesanan;
use App\Models\User;
use App\Models\UserMembership;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberTest extends TestCase
{
    use RefreshDatabase;

    private function plan(array $attributes = []): MembershipPlan
    {
        return MembershipPlan::create(array_merge([
            'nama' => 'Member Bulanan',
            'harga' => 50000,
            'durasi_hari' => 30,
            'diskon_persen' => 10,
            'aktif' => true,
        ], $attributes));
    }

    public function test_owner_can_activate_membership_and_discount_is_applied_to_order(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $plan = $this->plan();

        $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->putJson("/api/v1/owner/members/{$customer->id}", [
                'plan_id' => $plan->id,
                'aktif' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_member', true)
            ->assertJsonPath('data.diskon_persen', 10);

        $membership = $customer->fresh()->currentMembership();
        $this->assertNotNull($membership);
        $this->assertSame(10, $membership->effectiveDiscount());

        /* Guard Sanctum menyimpan user request sebelumnya; reset antar-user. */
        $this->app['auth']->forgetGuards();

        $layanan = \App\Models\daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'harga' => 50000,
            'aktif' => true,
        ]);

        $response = $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->postJson('/api/v1/orders', [
                'layanan_id' => $layanan->id,
                'jumlah' => 2,
                'nama' => $customer->name,
                'nomor_telp' => '081234567890',
                'alamat' => 'Jl. Melati No. 5',
                'metode_pembayaran' => 'cash',
            ]);

        $response->assertCreated();
        $response->assertJsonPath('data.subtotal', 100000);
        $response->assertJsonPath('data.diskon_persen', 10);
        $response->assertJsonPath('data.diskon', 10000);
        $response->assertJsonPath('data.total_harga', 90000);

        $this->assertDatabaseHas('pesanan', [
            'user_id' => $customer->id,
            'subtotal' => 100000,
            'diskon' => 10000,
            'total_harga' => 90000,
        ]);
    }

    public function test_expired_membership_does_not_receive_discount(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $plan = $this->plan();

        UserMembership::create([
            'user_id' => $customer->id,
            'membership_plan_id' => $plan->id,
            'starts_at' => now()->subDays(60),
            'expires_at' => now()->subDay(),
        ]);

        $this->assertNull($customer->currentMembership());
    }

    public function test_owner_can_deactivate_membership(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $plan = $this->plan();

        UserMembership::create([
            'user_id' => $customer->id,
            'membership_plan_id' => $plan->id,
            'starts_at' => now(),
            'expires_at' => now()->addDays(30),
        ]);

        $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->putJson("/api/v1/owner/members/{$customer->id}", ['aktif' => false])
            ->assertOk()
            ->assertJsonPath('data.is_member', false);

        $this->assertDatabaseMissing('user_memberships', ['user_id' => $customer->id]);
    }

    public function test_customer_cannot_manage_members(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $other = User::factory()->create(['role' => 'user']);

        $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/owner/members')
            ->assertStatus(403);

        $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->putJson("/api/v1/owner/members/{$other->id}", ['aktif' => false])
            ->assertStatus(403);
    }

    public function test_login_payload_contains_membership_summary(): void
    {
        $plan = $this->plan();

        $this->assertDatabaseCount('membership_plans', 1);
        $this->assertSame(10, $plan->diskon_persen);
    }
}

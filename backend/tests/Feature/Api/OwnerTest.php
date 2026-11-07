<?php

namespace Tests\Feature\Api;

use App\Models\daftar_layanan;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

/*
 * Tahap 4 — Opsi A: test endpoint owner (dashboard, profil, password).
 * Kontrak mengikuti frontend src/api/owner.ts.
 */
class OwnerTest extends TestCase
{
    use RefreshDatabase;

    private function asAdmin(User $user): self
    {
        Auth::forgetGuards();

        return $this->flushHeaders()
            ->withHeader('Authorization', 'Bearer '.$user->createToken('testing')->plainTextToken);
    }

    public function test_dashboard_returns_counts_and_revenue(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $layanan = daftar_layanan::create(['nama' => 'Basic', 'harga' => 100000, 'aktif' => true]);

        $customer = User::factory()->create();

        $confirmed = Pesanan::create([
            'nama' => 'A', 'status' => 'confirmed', 'user_id' => $customer->id,
            'layanan_id' => $layanan->id, 'jumlah' => 1, 'total_harga' => 100000,
        ]);
        $completed = Pesanan::create([
            'nama' => 'B', 'status' => 'completed', 'user_id' => $customer->id,
            'layanan_id' => $layanan->id, 'jumlah' => 1, 'total_harga' => 100000,
        ]);

        Pembayaran::create([
            'pesanan_id' => $confirmed->id, 'metode_pembayaran' => 'qris',
            'status_pembayaran' => 'paid', 'jumlah' => 100000,
        ]);
        Pembayaran::create([
            'pesanan_id' => $completed->id, 'metode_pembayaran' => 'qris',
            'status_pembayaran' => 'pending', 'jumlah' => 100000,
        ]);

        $response = $this->asAdmin($admin)->getJson('/api/v1/owner/dashboard');

        $response
            ->assertOk()
            ->assertJsonPath('data.total_orders', 2)
            ->assertJsonPath('data.confirmed_orders', 1)
            ->assertJsonPath('data.completed_orders', 1)
            ->assertJsonPath('data.total_revenue', 100000)
            ->assertJsonStructure([
                'data' => [
                    'recent_orders' => [['id', 'nama', 'layanan', 'status', 'status_label', 'total_harga']],
                ],
            ]);
    }

    public function test_profile_update_changes_nomor_telp(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->asAdmin($admin)
            ->putJson('/api/v1/owner/profile', [
                'nomor_telp' => '081234567890',
            ])
            ->assertOk()
            ->assertJsonPath('data.nomor_telp', '081234567890');
    }

    public function test_password_change_fails_with_wrong_current_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->asAdmin($admin)
            ->putJson('/api/v1/owner/password', [
                'current_password' => 'password-salah',
                'password' => 'password-baru-123',
            ])
            ->assertStatus(422);
    }

    public function test_password_change_succeeds_with_correct_current_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->asAdmin($admin)
            ->putJson('/api/v1/owner/password', [
                'current_password' => 'password',
                'password' => 'password-baru-123',
            ])
            ->assertOk();
    }

    public function test_customer_cannot_access_owner_endpoints(): void
    {
        $customer = User::factory()->create();

        $this->asAdmin($customer)->getJson('/api/v1/owner/dashboard')->assertStatus(403);
        $this->asAdmin($customer)->getJson('/api/v1/owner/profile')->assertStatus(403);
    }
}

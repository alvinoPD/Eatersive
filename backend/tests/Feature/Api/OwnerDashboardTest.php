<?php

namespace Tests\Feature\Api;

use App\Models\daftar_layanan;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnerDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function createOrder(User $user, string $status, int $total, string $paymentStatus): Pesanan
    {
        $layanan = daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'harga' => $total,
        ]);

        $pesanan = Pesanan::create([
            'kode_pesanan' => 'ETS-'.$user->id.'-'.strtoupper($status),
            'nama' => $user->name,
            'status' => $status,
            'jumlah' => 1,
            'total_harga' => $total,
            'user_id' => $user->id,
            'layanan_id' => $layanan->id,
        ]);

        Pembayaran::create([
            'pesanan_id' => $pesanan->id,
            'metode_pembayaran' => 'qris',
            'status_pembayaran' => $paymentStatus,
            'jumlah' => $total,
        ]);

        return $pesanan;
    }

    public function test_dashboard_returns_real_metrics(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create();

        $this->createOrder($customer, 'pending', 25000, 'pending');
        $this->createOrder($customer, 'processing', 50000, 'paid');
        $this->createOrder($customer, 'completed', 75000, 'paid');

        $response = $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/owner/dashboard');

        $response->assertOk();
        $response->assertJsonPath('data.total_orders', 3);
        $response->assertJsonPath('data.pending_orders', 1);
        $response->assertJsonPath('data.processing_orders', 1);
        $response->assertJsonPath('data.completed_orders', 1);
        $response->assertJsonPath('data.total_revenue', 125000);
        $response->assertJsonCount(3, 'data.recent_orders');
    }

    public function test_customer_cannot_access_dashboard(): void
    {
        $customer = User::factory()->create(['role' => 'user']);

        $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/owner/dashboard')
            ->assertStatus(403);
    }
}

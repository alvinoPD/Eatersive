<?php

namespace Tests\Feature\Api;

use App\Models\daftar_layanan;
use App\Models\Pesanan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private function order(User $customer): Pesanan
    {
        $layanan = daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'harga' => 50000,
            'aktif' => true,
        ]);

        return Pesanan::create([
            'kode_pesanan' => 'ETS-261125-0001',
            'kode_grup' => 'GRP-261125-CASH',
            'nama' => $customer->name,
            'nomor_telp' => '081234567890',
            'alamat' => 'Jl. Melati No. 5',
            'status' => 'pending',
            'jumlah' => 1,
            'subtotal' => 50000,
            'diskon_persen' => 0,
            'diskon' => 0,
            'total_harga' => 50000,
            'user_id' => $customer->id,
            'layanan_id' => $layanan->id,
        ]);
    }

    public function test_admin_can_mark_cash_payment_as_paid(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'user']);
        $order = $this->order($customer);

        $order->pembayaran()->create([
            'metode_pembayaran' => 'cash',
            'status_pembayaran' => 'pending',
            'jumlah' => 50000,
        ]);

        $response = $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->patchJson("/api/v1/orders/{$order->id}/payment", [
                'status_pembayaran' => 'paid',
                'catatan' => 'Dibayar tunai saat pengambilan',
            ]);

        $response->assertOk();
        $response->assertJsonPath('data.pembayaran.status_pembayaran', 'paid');

        $this->assertNotNull($order->pembayaran->fresh()->tanggal_bayar);

        $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/owner/dashboard')
            ->assertOk()
            ->assertJsonPath('data.total_revenue', 50000);
    }

    public function test_customer_cannot_mark_payment_as_paid(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $order = $this->order($customer);

        $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->patchJson("/api/v1/orders/{$order->id}/payment", ['status_pembayaran' => 'paid'])
            ->assertStatus(403);
    }
}

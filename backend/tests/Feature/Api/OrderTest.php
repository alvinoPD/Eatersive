<?php

namespace Tests\Feature\Api;

use App\Models\daftar_layanan;
use App\Models\Pesanan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private function layanan(array $attributes = []): daftar_layanan
    {
        return daftar_layanan::create(array_merge([
            'nama' => 'Deep Cleaning',
            'deskripsi' => 'Cuci menyeluruh',
            'harga' => 50000,
            'kategori' => 'Cleaning',
            'estimasi' => '2–3 Hari',
            'aktif' => true,
        ], $attributes));
    }

    private function pesanan(User $user, array $attributes = []): Pesanan
    {
        $layanan = $this->layanan();

        return Pesanan::create(array_merge([
            'kode_pesanan' => 'ETS-261106-0001',
            'kode_grup' => 'GRP-261106-TEST',
            'nama' => $user->name,
            'nomor_telp' => '081234567890',
            'alamat' => 'Jl. Melati No. 5',
            'status' => 'pending',
            'jumlah' => 1,
            'total_harga' => 50000,
            'user_id' => $user->id,
            'layanan_id' => $layanan->id,
        ], $attributes));
    }

    public function test_customer_can_create_order_and_total_is_calculated_by_server(): void
    {
        $user = User::factory()->create();
        $layanan = $this->layanan();

        $response = $this->withToken($user->createToken('auth_token')->plainTextToken)
            ->postJson('/api/v1/orders', [
                'layanan_id' => $layanan->id,
                'jumlah' => 2,
                'nama' => 'Budi Santoso',
                'nomor_telp' => '081234567890',
                'alamat' => 'Jl. Melati No. 5',
                'catatan' => 'Titip di pos',
                'metode_pembayaran' => 'qris',
                'total_harga' => 1,
            ]);

        $response->assertCreated();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.total_harga', 100000);
        $response->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('pesanan', [
            'user_id' => $user->id,
            'layanan_id' => $layanan->id,
            'total_harga' => 100000,
            'jumlah' => 2,
        ]);
        $this->assertDatabaseHas('pembayarans', [
            'jumlah' => 100000,
            'status_pembayaran' => 'pending',
        ]);
        $this->assertDatabaseCount('pesanan_status_histories', 1);
    }

    public function test_create_order_requires_authentication(): void
    {
        $this->postJson('/api/v1/orders', [])->assertStatus(401);
    }

    public function test_index_only_returns_orders_belonging_to_authenticated_user(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->pesanan($owner, ['kode_pesanan' => 'ETS-261106-0001']);
        $this->pesanan($other, ['kode_pesanan' => 'ETS-261106-0002']);

        $response = $this->withToken($owner->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/orders');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $response->assertJsonPath('data.0.kode_pesanan', 'ETS-261106-0001');
    }

    public function test_customer_cannot_view_another_customers_order(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pesanan = $this->pesanan($owner);

        $this->withToken($other->createToken('auth_token')->plainTextToken)
            ->getJson("/api/v1/orders/{$pesanan->id}")
            ->assertStatus(403);
    }

    public function test_detail_returns_real_timeline(): void
    {
        $user = User::factory()->create();
        $pesanan = $this->pesanan($user);

        $pesanan->statusHistories()->create([
            'status' => 'processing',
            'catatan' => 'Mulai deep cleaning.',
            'changed_by' => null,
        ]);

        $response = $this->withToken($user->createToken('auth_token')->plainTextToken)
            ->getJson("/api/v1/orders/{$pesanan->id}");

        $response->assertOk();
        $response->assertJsonPath('data.timeline.0.status', 'processing');
        $response->assertJsonPath('data.timeline.0.catatan', 'Mulai deep cleaning.');
    }

    public function test_admin_can_update_status_and_history_is_appended(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create();
        $pesanan = $this->pesanan($customer);

        $response = $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->patchJson("/api/v1/orders/{$pesanan->id}/status", [
                'status' => 'confirmed',
                'catatan' => 'Pesanan dikonfirmasi.',
            ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'confirmed');
        $this->assertDatabaseHas('pesanan', [
            'id' => $pesanan->id,
            'status' => 'confirmed',
        ]);
        $this->assertDatabaseHas('pesanan_status_histories', [
            'pesanan_id' => $pesanan->id,
            'status' => 'confirmed',
            'changed_by' => $admin->id,
        ]);
    }

    public function test_status_cannot_move_backwards(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create();
        $pesanan = $this->pesanan($customer, ['status' => 'completed']);

        $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->patchJson("/api/v1/orders/{$pesanan->id}/status", ['status' => 'processing'])
            ->assertStatus(422);

        $this->assertDatabaseHas('pesanan', [
            'id' => $pesanan->id,
            'status' => 'completed',
        ]);
    }

    public function test_customer_cannot_update_status(): void
    {
        $customer = User::factory()->create();
        $pesanan = $this->pesanan($customer);

        $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->patchJson("/api/v1/orders/{$pesanan->id}/status", ['status' => 'confirmed'])
            ->assertStatus(403);
    }

    public function test_cancelled_status_requires_note(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create();
        $pesanan = $this->pesanan($customer);

        $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->patchJson("/api/v1/orders/{$pesanan->id}/status", ['status' => 'cancelled'])
            ->assertStatus(422);
    }

    public function test_admin_can_list_all_orders(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create();
        $this->pesanan($customer, ['kode_pesanan' => 'ETS-261106-0001']);
        $this->pesanan($customer, ['kode_pesanan' => 'ETS-261106-0002']);

        $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->getJson('/api/v1/owner/orders')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}

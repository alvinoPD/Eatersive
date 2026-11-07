<?php

namespace Tests\Feature\Api;

use App\Models\daftar_layanan;
use App\Models\Pesanan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

/*
 * Tahap 4 — Test alur pesanan: create customer, guard ownership,
 * update status oleh admin, dan endpoint owner.
 */
class PesananTest extends TestCase
{
    use RefreshDatabase;

    private function createLayanan(array $attributes = []): daftar_layanan
    {
        return daftar_layanan::create(array_merge([
            'nama' => 'Deep Cleaning',
            'deskripsi' => 'Cuci luar dan dalam',
            'harga' => 50000,
            'kategori' => 'Cleaning',
            'estimasi' => '2–3 Hari',
            'aktif' => true,
        ], $attributes));
    }

    private function authUser(User $user): string
    {
        return $user->createToken('testing')->plainTextToken;
    }

    /* Kirim request sebagai user dengan header token yang selalu fresh.
     * Auth::forgetGuards() penting: RequestGuard meng-cache user, sehingga
     * tanpa ini request kedua dalam satu test tetap memakai identitas pertama. */
    private function as(User $user): self
    {
        Auth::forgetGuards();

        return $this->flushHeaders()
            ->withHeader('Authorization', 'Bearer '.$this->authUser($user));
    }

    public function test_guest_cannot_create_order(): void
    {
        $response = $this->postJson('/api/v1/orders', [
            'layanan_id' => 1,
            'jumlah' => 1,
            'nama' => 'Budi',
            'alamat' => 'Jl. Test',
        ]);

        $response->assertUnauthorized();
    }

    public function test_customer_can_create_order_with_recalculated_total(): void
    {
        $layanan = $this->createLayanan(['harga' => 45000]);
        $user = User::factory()->create();

        $response = $this->as($user)
            ->postJson('/api/v1/orders', [
                'layanan_id' => $layanan->id,
                'jumlah' => 2,
                'nama' => 'Budi Santoso',
                'nomor_telp' => '081234567890',
                'alamat' => 'Jl. Kemang Timur No. 12',
                'catatan' => 'Sebelum jam 5 sore',
                'metode_pembayaran' => 'qris',
            ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'kode_pesanan',
                    'kode_grup',
                    'status',
                    'status_label',
                    'total_harga',
                    'jumlah',
                    'layanan' => ['nama'],
                    'pembayaran' => ['status_pembayaran', 'jumlah'],
                    'timeline',
                ],
            ]);

        $this->assertDatabaseHas('pesanan', [
            'user_id' => $user->id,
            'layanan_id' => $layanan->id,
            // Total dihitung ulang dari harga database, bukan dari client.
            'total_harga' => 90000,
            'jumlah' => 2,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('pembayarans', [
            'pesanan_id' => $response->json('data.id'),
            'status_pembayaran' => 'pending',
            'jumlah' => 90000,
        ]);

        $this->assertDatabaseCount('pesanan_status_logs', 1);
    }

    public function test_create_order_validates_required_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->as($user)
            ->postJson('/api/v1/orders', [
                'layanan_id' => 999,
                'jumlah' => 0,
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['layanan_id', 'jumlah', 'nama', 'alamat']);
    }

    public function test_customer_cannot_view_other_customer_order(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $layanan = $this->createLayanan();

        $pesanan = Pesanan::create([
            'nama' => 'Customer Lain',
            'status' => 'pending',
            'user_id' => $other->id,
            'layanan_id' => $layanan->id,
            'jumlah' => 1,
            'total_harga' => 50000,
        ]);

        $response = $this->as($owner)
            ->getJson('/api/v1/orders/'.$pesanan->id);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_status_and_timeline_is_written(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $layanan = $this->createLayanan();
        $pesanan = Pesanan::create([
            'nama' => 'Budi',
            'status' => 'pending',
            'user_id' => User::factory()->create()->id,
            'layanan_id' => $layanan->id,
            'jumlah' => 1,
            'total_harga' => 50000,
        ]);

        $response = $this->as($admin)
            ->patchJson('/api/v1/orders/'.$pesanan->id.'/status', [
                'status' => 'processing',
                'catatan' => 'Sepatu masuk proses deep cleaning',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.status_label', 'Sedang Dikerjakan');

        $this->assertDatabaseHas('pesanan_status_logs', [
            'pesanan_id' => $pesanan->id,
            'status' => 'processing',
            'status_label' => 'Sedang Dikerjakan',
            'changed_by' => $admin->name,
        ]);
    }

    public function test_admin_cannot_set_unknown_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $layanan = $this->createLayanan();
        $pesanan = Pesanan::create([
            'nama' => 'Budi',
            'status' => 'pending',
            'user_id' => User::factory()->create()->id,
            'layanan_id' => $layanan->id,
            'jumlah' => 1,
            'total_harga' => 50000,
        ]);

        $response = $this->as($admin)
            ->patchJson('/api/v1/orders/'.$pesanan->id.'/status', [
                'status' => 'dibatalkan_sekalian',
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_customer_cannot_update_status(): void
    {
        $customer = User::factory()->create();
        $layanan = $this->createLayanan();
        $pesanan = Pesanan::create([
            'nama' => 'Budi',
            'status' => 'pending',
            'user_id' => $customer->id,
            'layanan_id' => $layanan->id,
            'jumlah' => 1,
            'total_harga' => 50000,
        ]);

        $response = $this->as($customer)
            ->patchJson('/api/v1/orders/'.$pesanan->id.'/status', [
                'status' => 'completed',
            ]);

        $response->assertStatus(403);
    }

    public function test_owner_orders_lists_all_orders_for_admin_only(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $layanan = $this->createLayanan();

        Pesanan::create([
            'nama' => 'Budi',
            'status' => 'pending',
            'user_id' => User::factory()->create()->id,
            'layanan_id' => $layanan->id,
            'jumlah' => 1,
            'total_harga' => 50000,
        ]);

        $this->as($admin)
            ->getJson('/api/v1/owner/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->as(User::factory()->create())
            ->getJson('/api/v1/owner/orders')
            ->assertStatus(403);
    }
}

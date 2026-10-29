<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\daftar_layanan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LayananTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_success_with_list(): void
    {
        daftar_layanan::create([
            'nama' => 'Cuci Sepatu',
            'deskripsi' => 'Cuci sepatu kering',
            'harga' => 25000,
        ]);

        $response = $this->getJson('/api/v1/layanan');

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_show_returns_layanan(): void
    {
        $layanan = daftar_layanan::create([
            'nama' => 'Cuci Sepatu',
            'deskripsi' => 'Cuci sepatu kering',
            'harga' => 25000,
        ]);

        $response = $this->getJson("/api/v1/layanan/{$layanan->id}");

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.id', $layanan->id);
        $response->assertJsonPath('data.nama', 'Cuci Sepatu');
    }

    public function test_show_returns_404_when_layanan_not_found(): void
    {
        $response = $this->getJson('/api/v1/layanan/999');

        $response->assertStatus(404);
    }

    public function test_admin_can_create_layanan(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);

        $response = $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->postJson('/api/v1/layanan', [
                'nama' => 'Cuci Sepatu',
                'deskripsi' => 'Cuci sepatu kering',
                'harga' => 25000,
                'kategori' => 'Cleaning',
                'estimasi' => '2–3 Hari',
                'aktif' => true,
            ]);

        $response->assertCreated();
        $response->assertJsonPath('success', true);
        $this->assertDatabaseHas('daftar_layanans', [
            'nama' => 'Cuci Sepatu',
            'harga' => 25000,
            'kategori' => 'Cleaning',
            'estimasi' => '2–3 Hari',
            'aktif' => true,
        ]);
    }

    public function test_admin_can_update_layanan(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);

        $layanan = daftar_layanan::create([
            'nama' => 'Cuci Sepatu',
            'deskripsi' => 'Cuci sepatu kering',
            'harga' => 25000,
        ]);

        $response = $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->putJson("/api/v1/layanan/{$layanan->id}", [
                'nama' => 'Cuci Sepatu Premium',
                'harga' => 35000,
            ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $this->assertDatabaseHas('daftar_layanans', [
            'id' => $layanan->id,
            'nama' => 'Cuci Sepatu Premium',
            'harga' => 35000,
        ]);
    }

    public function test_admin_can_delete_layanan(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);

        $layanan = daftar_layanan::create([
            'nama' => 'Cuci Sepatu',
            'deskripsi' => 'Cuci sepatu kering',
            'harga' => 25000,
        ]);

        $response = $this->withToken($admin->createToken('auth_token')->plainTextToken)
            ->deleteJson("/api/v1/layanan/{$layanan->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('daftar_layanans', [
            'id' => $layanan->id,
        ]);
    }

    public function test_guest_cannot_create_layanan(): void
    {
        $response = $this->postJson('/api/v1/layanan', [
            'nama' => 'Cuci Sepatu',
            'deskripsi' => 'Cuci sepatu kering',
            'harga' => 25000,
        ]);

        $response->assertStatus(401);
    }

    public function test_non_admin_cannot_create_layanan(): void
    {
        $customer = User::factory()->create([
            'email' => 'customer@example.com',
            'role' => 'user',
        ]);

        $response = $this->withToken($customer->createToken('auth_token')->plainTextToken)
            ->postJson('/api/v1/layanan', [
                'nama' => 'Cuci Sepatu',
                'deskripsi' => 'Cuci sepatu kering',
                'harga' => 25000,
            ]);

        $response->assertStatus(403);
    }
}

<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\daftar_layanan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RiviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_store_review(): void
    {
        $user = User::factory()->create([
            'email' => 'customer@example.com',
        ]);

        $layanan = daftar_layanan::create([
            'nama' => 'Cuci Sepatu',
            'deskripsi' => 'Cuci sepatu kering',
            'harga' => 25000,
        ]);

        $response = $this->withToken($user->createToken('auth_token')->plainTextToken)
            ->postJson('/api/v1/reviews', [
                'layanan_id' => $layanan->id,
                'isi_review' => 'Cuci cepat dan bersih',
                'rating' => 5,
                'kode_pesanan' => 'ETS-261128-0001',
            ]);

        $response->assertCreated();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.rating', 5);
        $response->assertJsonPath('data.status', 'Menunggu');
        $this->assertDatabaseHas('riviews', [
            'user_id' => $user->id,
            'layanan_id' => $layanan->id,
            'isi_review' => 'Cuci cepat dan bersih',
            'rating' => 5,
            'kode_pesanan' => 'ETS-261128-0001',
        ]);
    }

    public function test_store_review_requires_rating(): void
    {
        $user = User::factory()->create();
        $layanan = daftar_layanan::create([
            'nama' => 'Cuci Sepatu',
            'deskripsi' => 'Cuci sepatu kering',
            'harga' => 25000,
        ]);

        $this->withToken($user->createToken('auth_token')->plainTextToken)
            ->postJson('/api/v1/reviews', [
                'layanan_id' => $layanan->id,
                'isi_review' => 'Cuci cepat dan bersih',
            ])
            ->assertStatus(422);
    }

    public function test_owner_can_list_and_moderate_reviews(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['name' => 'Budi Santoso']);
        $layanan = daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'deskripsi' => 'Cuci menyeluruh',
            'harga' => 50000,
        ]);

        $review = \App\Models\Riview::create([
            'user_id' => $customer->id,
            'layanan_id' => $layanan->id,
            'isi_review' => 'Hasilnya bersih sekali',
            'rating' => 4,
            'status' => 'Menunggu',
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/owner/reviews')
            ->assertOk()
            ->assertJsonPath('data.0.id', $review->id)
            ->assertJsonPath('data.0.user.name', 'Budi Santoso')
            ->assertJsonPath('data.0.layanan.nama', 'Deep Cleaning')
            ->assertJsonPath('data.0.rating', 4);

        $this->withToken($token)
            ->patchJson("/api/v1/owner/reviews/{$review->id}", [
                'status' => 'Dipublikasikan',
                'owner_reply' => 'Terima kasih sudah memesan.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Dipublikasikan')
            ->assertJsonPath('data.owner_reply', 'Terima kasih sudah memesan.');
    }

    public function test_store_review_requires_authentication(): void
    {
        $response = $this->postJson('/api/v1/reviews', [
            'layanan_id' => 1,
            'isi_review' => 'Cuci cepat dan bersih',
        ]);

        $response->assertStatus(401);
    }
}

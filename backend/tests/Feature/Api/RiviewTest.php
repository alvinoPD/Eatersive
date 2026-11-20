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
            ]);

        $response->assertCreated();
        $response->assertJsonPath('success', true);
        $this->assertDatabaseHas('riviews', [
            'user_id' => $user->id,
            'layanan_id' => $layanan->id,
            'isi_review' => 'Cuci cepat dan bersih',
        ]);
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

<?php

namespace Tests\Feature\Api;

use App\Models\daftar_layanan;
use App\Models\Pesanan;
use App\Models\PesananFoto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrderPhotoTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function order(User $customer): Pesanan
    {
        $layanan = daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'harga' => 50000,
            'aktif' => true,
        ]);

        return Pesanan::create([
            'kode_pesanan' => 'ETS-261125-0001',
            'kode_grup' => 'GRP-261125-PHOTO',
            'nama' => $customer->name,
            'nomor_telp' => '081234567890',
            'alamat' => 'Jl. Melati No. 5',
            'status' => 'pending',
            'jumlah' => 1,
            'total_harga' => 50000,
            'user_id' => $customer->id,
            'layanan_id' => $layanan->id,
        ]);
    }

    private function image(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode(self::PNG),
        );
    }

    public function test_customer_can_upload_four_sides_and_photo_appears_in_detail(): void
    {
        Storage::fake('public');

        $customer = User::factory()->create(['role' => 'user']);
        $order = $this->order($customer);
        $token = $customer->createToken('auth_token')->plainTextToken;

        foreach (['depan', 'kanan', 'kiri', 'atas'] as $side) {
            $this->withToken($token)
                ->post('/api/v1/orders/photos', [
                    'kode_grup' => $order->kode_grup,
                    'sisi' => $side,
                    'photo' => $this->image("sepatu-{$side}.png"),
                ], ['Accept' => 'application/json'])
                ->assertCreated();
        }

        $this->assertDatabaseCount('pesanan_fotos', 4);

        $this->withToken($token)
            ->getJson("/api/v1/orders/{$order->id}")
            ->assertOk()
            ->assertJsonCount(4, 'data.photos')
            ->assertJsonPath('data.photos.0.sisi', 'depan');
    }

    public function test_uploaded_side_replaces_previous_photo(): void
    {
        Storage::fake('public');

        $customer = User::factory()->create(['role' => 'user']);
        $order = $this->order($customer);
        $token = $customer->createToken('auth_token')->plainTextToken;

        foreach ([1, 2] as $attempt) {
            $this->withToken($token)
                ->post('/api/v1/orders/photos', [
                    'kode_grup' => $order->kode_grup,
                    'sisi' => 'depan',
                    'photo' => $this->image("depan-{$attempt}.png"),
                ], ['Accept' => 'application/json'])
                ->assertCreated();
        }

        $this->assertDatabaseCount('pesanan_fotos', 1);
    }

    public function test_other_customer_cannot_upload_to_group(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create(['role' => 'user']);
        $other = User::factory()->create(['role' => 'user']);
        $order = $this->order($owner);

        $this->withToken($other->createToken('auth_token')->plainTextToken)
            ->post('/api/v1/orders/photos', [
                'kode_grup' => $order->kode_grup,
                'sisi' => 'depan',
                'photo' => $this->image('depan.png'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(404);

        $this->assertDatabaseCount('pesanan_fotos', 0);
    }
}

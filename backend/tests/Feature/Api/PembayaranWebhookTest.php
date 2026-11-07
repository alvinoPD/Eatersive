<?php

namespace Tests\Feature\Api;

use App\Models\daftar_layanan;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/*
 * Tahap 4 — Test webhook Midtrans: verifikasi signature, pemetaan
 * status transaksi ke pembayarans + sinkronisasi pesanan, serta
 * idempotensi untuk notifikasi dobel.
 */
class PembayaranWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Server key pengganti untuk menghitung signature di test.
        config(['midtrans.server_key' => 'test-server-key']);
        config(['midtrans.client_key' => 'test-client-key']);
    }

    private function createPesananWithPembayaran(string $transactionId = 'GRUP-TEST01'): Pesanan
    {
        $layanan = daftar_layanan::create([
            'nama' => 'Deep Cleaning',
            'harga' => 50000,
            'aktif' => true,
        ]);

        $pesanan = Pesanan::create([
            'kode_grup' => $transactionId,
            'nama' => 'Budi Santoso',
            'status' => 'pending',
            'user_id' => User::factory()->create()->id,
            'layanan_id' => $layanan->id,
            'jumlah' => 1,
            'total_harga' => 50000,
        ]);

        Pembayaran::create([
            'pesanan_id' => $pesanan->id,
            'metode_pembayaran' => 'qris',
            'status_pembayaran' => 'pending',
            'jumlah' => 50000,
            'transaction_id' => $transactionId,
        ]);

        return $pesanan->refresh();
    }

    private function webhook(string $transactionId, string $transactionStatus, string $grossAmount, string $statusCode = '200', ?string $fraudStatus = null): TestResponse
    {
        $signature = hash('sha512', $transactionId.$statusCode.$grossAmount.'test-server-key');

        return $this->postJson('/api/v1/pembayaran/webhook', array_filter([
            'order_id' => $transactionId,
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'signature_key' => $signature,
            'transaction_status' => $transactionStatus,
            'fraud_status' => $fraudStatus,
            'payment_type' => 'qris',
            'transaction_time' => '2026-11-07T10:00:00+07:00',
        ]));
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $pesanan = $this->createPesananWithPembayaran();

        $response = $this->postJson('/api/v1/pembayaran/webhook', [
            'order_id' => 'GRUP-TEST01',
            'status_code' => '200',
            'gross_amount' => '50000.00',
            'signature_key' => 'signature-palsu',
            'transaction_status' => 'settlement',
            'payment_type' => 'qris',
        ]);

        $response->assertStatus(401);
        $this->assertDatabaseHas('pembayarans', ['id' => $pesanan->pembayaran->id, 'status_pembayaran' => 'pending']);
    }

    public function test_settlement_marks_payment_paid_and_confirms_order(): void
    {
        $pesanan = $this->createPesananWithPembayaran();

        $this->webhook('GRUP-TEST01', 'settlement', '50000.00')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('pembayarans', [
            'pesanan_id' => $pesanan->id,
            'status_pembayaran' => 'paid',
            'transaction_id' => 'GRUP-TEST01',
        ]);

        $this->assertDatabaseHas('pesanan', [
            'id' => $pesanan->id,
            'status' => 'confirmed',
        ]);

        $this->assertDatabaseHas('pesanan_status_logs', [
            'pesanan_id' => $pesanan->id,
            'status' => 'confirmed',
            'changed_by' => 'midtrans',
        ]);
    }

    public function test_webhook_is_idempotent_for_duplicate_notifications(): void
    {
        $this->createPesananWithPembayaran();

        $this->webhook('GRUP-TEST01', 'settlement', '50000.00')->assertOk();
        $this->webhook('GRUP-TEST01', 'settlement', '50000.00')->assertOk();

        // Baris timeline "confirmed" hanya dibuat satu kali.
        $this->assertDatabaseCount('pesanan_status_logs', 1);
    }

    public function test_expire_marks_payment_expired_without_cancelling_order(): void
    {
        $pesanan = $this->createPesananWithPembayaran();

        $this->webhook('GRUP-TEST01', 'expire', '50000.00')->assertOk();

        $this->assertDatabaseHas('pembayarans', ['pesanan_id' => $pesanan->id, 'status_pembayaran' => 'expired']);
        $this->assertDatabaseHas('pesanan', ['id' => $pesanan->id, 'status' => 'pending']);
    }

    public function test_cancel_failed_payment_cancels_pending_order(): void
    {
        $pesanan = $this->createPesananWithPembayaran();

        $this->webhook('GRUP-TEST01', 'cancel', '50000.00')->assertOk();

        $this->assertDatabaseHas('pembayarans', ['pesanan_id' => $pesanan->id, 'status_pembayaran' => 'failed']);
        $this->assertDatabaseHas('pesanan', ['id' => $pesanan->id, 'status' => 'cancelled']);
    }

    public function test_unknown_order_id_is_accepted_but_ignored(): void
    {
        $this->createPesananWithPembayaran();

        $this->webhook('GRUP-TAKDIKETAHUI', 'settlement', '10000.00')->assertOk();
    }
}

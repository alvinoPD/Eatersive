<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Tahap 4 — Kontrak frontend (Opsi A): timeline perubahan status pesanan.
 * Baris pertama dibuat saat pesanan dibuat; baris berikutnya saat admin
 * mengubah status atau saat pembayaran mengubah status otomatis.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pesanan_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pesanan_id')->constrained('pesanan')->onDelete('cascade');
            $table->string('status');
            $table->string('status_label');
            $table->text('catatan')->nullable();
            $table->string('changed_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pesanan_status_logs');
    }
};

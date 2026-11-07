<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Tahap 4 — Kontrak frontend (Opsi A): kolom tambahan untuk pesanan.
 * Format respons yang diharapkan frontend membutuhkan kode pesanan unik,
 * kode grup checkout multi-item, catatan, kuantitas, total harga,
 * dan estimasi selesai.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pesanan', function (Blueprint $table) {
            $table->string('kode_pesanan')->unique()->nullable()->after('id');
            $table->string('kode_grup')->index()->nullable()->after('kode_pesanan');
            $table->text('catatan')->nullable()->after('alamat');
            $table->unsignedInteger('jumlah')->default(1)->after('status');
            $table->decimal('total_harga', 12, 2)->nullable()->after('jumlah');
            $table->date('estimasi_selesai')->nullable()->after('total_harga');
        });
    }

    public function down(): void
    {
        Schema::table('pesanan', function (Blueprint $table) {
            $table->dropColumn([
                'kode_pesanan',
                'kode_grup',
                'catatan',
                'jumlah',
                'total_harga',
                'estimasi_selesai',
            ]);
        });
    }
};

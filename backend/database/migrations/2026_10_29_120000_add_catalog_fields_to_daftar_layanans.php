<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambah atribut katalog yang dipakai UI (kategori, estimasi, status aktif)
     * dan memperbesar kolom foto agar bisa menampung data URL/base64.
     */
    public function up(): void
    {
        Schema::table('daftar_layanans', function (Blueprint $table): void {
            $table->string('kategori', 50)->default('Cleaning')->after('deskripsi');
            $table->string('estimasi', 50)->default('2–3 Hari')->after('kategori');
            $table->boolean('aktif')->default(true)->after('estimasi');
            $table->text('foto')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('daftar_layanans', function (Blueprint $table): void {
            $table->dropColumn(['kategori', 'estimasi', 'aktif']);
            $table->string('foto', 255)->nullable()->change();
        });
    }
};

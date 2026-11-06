<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nomor telepon akun, dibutuhkan halaman pengaturan owner.
     * Nama kolom mengikuti konvensi yang sudah dipakai tabel pesanan.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'nomor_telp')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('nomor_telp', 20)->nullable()->after('email');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'nomor_telp')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('nomor_telp');
        });
    }
};

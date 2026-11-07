<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Tahap 4 — Opsi A: kolom nomor telepon opsional untuk akun user.
 * Dipakai endpoint profil owner (GET/PUT /owner/profile) sesuai kontrak
 * frontend src/api/owner.ts (OwnerProfile.nomor_telp).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('nomor_telp')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('nomor_telp');
        });
    }
};

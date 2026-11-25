<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pesanan_fotos')) {
            return;
        }

        Schema::create('pesanan_fotos', function (Blueprint $table) {
            $table->id();
            $table->string('kode_grup', 24)->index();
            $table->string('path');
            $table->string('sisi', 10)->default('depan');
            $table->unsignedTinyInteger('urutan')->default(0);
            $table->timestamps();

            $table->unique(['kode_grup', 'sisi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pesanan_fotos');
    }
};

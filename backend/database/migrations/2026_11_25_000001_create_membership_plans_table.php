<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('membership_plans')) {
            return;
        }

        Schema::create('membership_plans', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 80);
            $table->text('deskripsi')->nullable();
            $table->decimal('harga', 12, 2)->default(0);
            $table->unsignedSmallInteger('durasi_hari')->default(30);
            $table->unsignedTinyInteger('diskon_persen')->default(10);
            $table->boolean('aktif')->default(true);
            $table->timestamps();

            $table->index('aktif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('membership_plans');
    }
};

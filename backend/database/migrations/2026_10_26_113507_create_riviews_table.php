<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('riviews', function (Blueprint $table) {
            $table->id();
            $table->string('isi_review');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('layanan_id')->constrained('daftar_layanans')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('riviews');
    }
};

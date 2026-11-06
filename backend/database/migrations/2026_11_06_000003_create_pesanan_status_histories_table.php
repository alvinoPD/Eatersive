<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Riwayat perubahan status pesanan. Menjadi sumber timeline tracking,
     * menggantikan simulasi progress di frontend.
     */
    public function up(): void
    {
        if (Schema::hasTable('pesanan_status_histories')) {
            return;
        }

        Schema::create('pesanan_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pesanan_id')->constrained('pesanan')->cascadeOnDelete();
            $table->string('status', 20);
            $table->text('catatan')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['pesanan_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pesanan_status_histories');
    }
};

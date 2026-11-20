<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('captcha_challenges', function (Blueprint $table): void {
            $table->id();
            $table->string('question', 120);
            $table->char('nonce', 32);
            $table->char('answer_hash', 64);
            $table->string('context', 32)->default('login');
            $table->char('fingerprint', 64)->index();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at')->index();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('captcha_challenges');
    }
};
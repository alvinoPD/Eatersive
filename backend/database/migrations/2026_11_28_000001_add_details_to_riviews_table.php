<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Detail ulasan yang dibutuhkan dashboard owner. Semua penambahan memakai
     * nilai default sehingga ulasan lama tetap valid.
     */
    public function up(): void
    {
        $columns = [
            'rating' => fn (Blueprint $table) => $table->unsignedTinyInteger('rating')->default(5)->after('isi_review'),
            'status' => fn (Blueprint $table) => $table->string('status', 20)->default('Menunggu')->after('rating'),
            'owner_reply' => fn (Blueprint $table) => $table->text('owner_reply')->nullable()->after('status'),
            'kode_pesanan' => fn (Blueprint $table) => $table->string('kode_pesanan', 24)->nullable()->after('owner_reply'),
        ];

        foreach ($columns as $name => $definition) {
            if (Schema::hasColumn('riviews', $name)) {
                continue;
            }

            Schema::table('riviews', function (Blueprint $table) use ($definition) {
                $definition($table);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $columns = array_values(array_filter(
            ['rating', 'status', 'owner_reply', 'kode_pesanan'],
            fn (string $column) => Schema::hasColumn('riviews', $column),
        ));

        if ($columns === []) {
            return;
        }

        Schema::table('riviews', fn (Blueprint $table) => $table->dropColumn($columns));
    }
};

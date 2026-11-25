<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasSubtotal = Schema::hasColumn('pesanan', 'subtotal');
        $hasDiskonPersen = Schema::hasColumn('pesanan', 'diskon_persen');
        $hasDiskon = Schema::hasColumn('pesanan', 'diskon');

        Schema::table('pesanan', function (Blueprint $table) use (
            $hasSubtotal,
            $hasDiskonPersen,
            $hasDiskon,
        ) {
            if (! $hasSubtotal) {
                $table->decimal('subtotal', 12, 2)->nullable()->after('jumlah');
            }

            if (! $hasDiskonPersen) {
                $table->unsignedTinyInteger('diskon_persen')->default(0)->after('subtotal');
            }

            if (! $hasDiskon) {
                $table->decimal('diskon', 12, 2)->default(0)->after('diskon_persen');
            }
        });
    }

    public function down(): void
    {
        $columns = array_values(array_filter(
            ['subtotal', 'diskon_persen', 'diskon'],
            fn (string $column) => Schema::hasColumn('pesanan', $column),
        ));

        if ($columns === []) {
            return;
        }

        Schema::table('pesanan', function (Blueprint $table) use ($columns) {
            $table->dropColumn($columns);
        });
    }
};

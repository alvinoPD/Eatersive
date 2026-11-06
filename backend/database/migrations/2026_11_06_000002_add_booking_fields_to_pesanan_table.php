<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Field yang dibutuhkan riwayat booking dan tracking. Semua nullable agar
     * baris pesanan lama tetap valid. Aman dijalankan pada skema yang sebagian
     * sudah berubah.
     */
    public function up(): void
    {
        $candidates = [
            'kode_pesanan',
            'kode_grup',
            'jumlah',
            'total_harga',
            'catatan',
            'estimasi_selesai',
        ];

        $missing = array_values(array_filter(
            $candidates,
            fn (string $column) => ! Schema::hasColumn('pesanan', $column),
        ));

        Schema::table('pesanan', function (Blueprint $table) use ($missing) {
            if (in_array('kode_pesanan', $missing, true)) {
                $table->string('kode_pesanan', 24)->nullable()->after('id');
            }

            if (in_array('kode_grup', $missing, true)) {
                $table->string('kode_grup', 24)->nullable()->after('kode_pesanan');
            }

            if (in_array('jumlah', $missing, true)) {
                $table->unsignedSmallInteger('jumlah')->default(1)->after('status');
            }

            if (in_array('total_harga', $missing, true)) {
                $table->decimal('total_harga', 12, 2)->nullable()->after('jumlah');
            }

            if (in_array('catatan', $missing, true)) {
                $table->text('catatan')->nullable()->after('alamat');
            }

            if (in_array('estimasi_selesai', $missing, true)) {
                $table->date('estimasi_selesai')->nullable()->after('total_harga');
            }
        });

        if (! Schema::hasIndex('pesanan', 'pesanan_kode_pesanan_unique')) {
            Schema::table('pesanan', fn (Blueprint $table) => $table->unique('kode_pesanan'));
        }

        if (! Schema::hasIndex('pesanan', 'pesanan_kode_grup_index')) {
            Schema::table('pesanan', fn (Blueprint $table) => $table->index('kode_grup'));
        }

        if (! Schema::hasIndex('pesanan', 'pesanan_status_index')) {
            Schema::table('pesanan', fn (Blueprint $table) => $table->index('status'));
        }

        if (! Schema::hasIndex('pesanan', 'pesanan_created_at_index')) {
            Schema::table('pesanan', fn (Blueprint $table) => $table->index('created_at'));
        }
    }

    public function down(): void
    {
        foreach ([
            'pesanan_kode_pesanan_unique' => 'dropUnique',
            'pesanan_kode_grup_index' => 'dropIndex',
            'pesanan_status_index' => 'dropIndex',
            'pesanan_created_at_index' => 'dropIndex',
        ] as $index => $method) {
            if (! Schema::hasIndex('pesanan', $index)) {
                continue;
            }

            Schema::table('pesanan', fn (Blueprint $table) => $table->{$method}($index));
        }

        $columns = array_values(array_filter(
            ['kode_pesanan', 'kode_grup', 'jumlah', 'total_harga', 'catatan', 'estimasi_selesai'],
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

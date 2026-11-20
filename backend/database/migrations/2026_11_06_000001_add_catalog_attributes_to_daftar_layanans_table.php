<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menambahkan atribut katalog yang sudah dipakai frontend tetapi belum
     * tersimpan di database. Aman dijalankan bila sebagian kolom sudah ada.
     */
    public function up(): void
    {
        $hasKategori = Schema::hasColumn('daftar_layanans', 'kategori');
        $hasEstimasi = Schema::hasColumn('daftar_layanans', 'estimasi');
        $hasAktif = Schema::hasColumn('daftar_layanans', 'aktif');

        Schema::table('daftar_layanans', function (Blueprint $table) use (
            $hasKategori,
            $hasEstimasi,
            $hasAktif,
        ) {
            if (! $hasKategori) {
                $table->string('kategori', 32)->nullable()->after('harga');
            }

            if (! $hasEstimasi) {
                $table->string('estimasi', 64)->nullable()->after('kategori');
            }

            if (! $hasAktif) {
                $table->boolean('aktif')->default(true)->after('estimasi');
            }
        });
    }

    public function down(): void
    {
        $columns = array_values(array_filter(
            ['kategori', 'estimasi', 'aktif'],
            fn (string $column) => Schema::hasColumn('daftar_layanans', $column),
        ));

        if ($columns === []) {
            return;
        }

        Schema::table('daftar_layanans', function (Blueprint $table) use ($columns) {
            $table->dropColumn($columns);
        });
    }
};

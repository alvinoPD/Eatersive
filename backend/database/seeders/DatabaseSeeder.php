<?php

namespace Database\Seeders;

use App\Models\daftar_layanan;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed data awal: akun owner/admin, akun pelanggan, dan katalog layanan.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'owner@eatersive.id'],
            [
                'name' => 'Admin EaterSive',
                'password' => Hash::make('owner123'),
                'role' => 'admin',
            ],
        );

        User::updateOrCreate(
            ['email' => 'user@eatersive.id'],
            [
                'name' => 'Budi Santoso',
                'password' => Hash::make('user123'),
                'role' => 'user',
            ],
        );

        $layanan = [
            [
                'nama' => 'Basic',
                'deskripsi' => 'Jasa cuci luar dan dalam',
                'harga' => 35000,
                'kategori' => 'Cleaning',
                'estimasi' => '2–3 Hari',
                'aktif' => true,
                'foto' => null,
            ],
            [
                'nama' => 'Hard',
                'deskripsi' => 'Untuk sepatu yang susah dibersihkan',
                'harga' => 40000,
                'kategori' => 'Treatment',
                'estimasi' => '2–3 Hari',
                'aktif' => true,
                'foto' => null,
            ],
            [
                'nama' => 'Suede / Nubuck',
                'deskripsi' => 'Treatment khusus sepatu suede/nubuck, 3M (Menyegarkan, Menghidupkan, Melembutkan)',
                'harga' => 50000,
                'kategori' => 'Repair',
                'estimasi' => '2–4 Hari',
                'aktif' => true,
                'foto' => null,
            ],
            [
                'nama' => 'Helm & Bag',
                'deskripsi' => 'Perawatan helm & tas untuk mengangkat noda dan menjaga kualitas material.',
                'harga' => 30000,
                'kategori' => 'Cleaning',
                'estimasi' => '24 Jam',
                'aktif' => true,
                'foto' => null,
            ],
            [
                'nama' => 'Hat / Cap',
                'deskripsi' => 'Perawatan topi untuk mengangkat noda dan menjaga bentuk serta kualitas bahan.',
                'harga' => 30000,
                'kategori' => 'Treatment',
                'estimasi' => '2–3 Hari',
                'aktif' => true,
                'foto' => null,
            ],
            [
                'nama' => 'Flat Shoes & Kid Shoes',
                'deskripsi' => 'Perawatan flat shoes & sepatu anak untuk membersihkan noda dan menjaga kualitas serta kenyamanan sepatu.',
                'harga' => 25000,
                'kategori' => 'Treatment',
                'estimasi' => '7–10 Hari',
                'aktif' => true,
                'foto' => null,
            ],
        ];

        foreach ($layanan as $item) {
            daftar_layanan::updateOrCreate(['nama' => $item['nama']], $item);
        }
    }
}

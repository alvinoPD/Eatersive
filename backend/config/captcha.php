<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Local CAPTCHA
    |--------------------------------------------------------------------------
    |
    | CAPTCHA dibuat dan diverifikasi sepenuhnya di backend. Nilai di bawah bisa
    | dioverride lewat .env tanpa mengubah kode.
    |
    */

    // Umur challenge dalam detik.
    'ttl' => (int) env('CAPTCHA_TTL', 120),

    // Jumlah percobaan jawaban salah sebelum challenge dianggap hangus.
    'max_attempts' => (int) env('CAPTCHA_MAX_ATTEMPTS', 5),

    // Context yang diizinkan. Context mencegah challenge login dipakai di checkout.
    'contexts' => ['login', 'checkout'],

];
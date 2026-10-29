<?php

$frontendOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('FRONTEND_URL', 'http://localhost:5173,http://127.0.0.1:5173'))
)));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Frontend React (Vite) berjalan di origin berbeda dari backend Laravel,
    | sehingga origin-nya harus diizinkan di sini.
    |
    | Atur daftar origin lewat FRONTEND_URL di file .env, pisahkan dengan
    | koma bila lebih dari satu, contoh:
    | FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $frontendOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    // Belum ada authentication berbasis cookie, jadi credentials dimatikan.
    // Aktifkan kembali (dan ganti allowed_origins menjadi origin spesifik)
    // bila nanti memakai Sanctum dengan cookie-based SPA authentication.
    'supports_credentials' => false,

];

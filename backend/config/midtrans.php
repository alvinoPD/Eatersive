<?php

/*
 * Tahap 4 — Konfigurasi integrasi Midtrans (Snap).
 *
 * Kunci diambil dari file .env backend:
 *   MIDTRANS_SERVER_KEY        kunci server (SB-Mid-server-... untuk sandbox)
 *   MIDTRANS_CLIENT_KEY        kunci client publik (SB-Mid-client-...), dikirim
 *                              ke frontend lewat respons charge untuk snap.js
 *   MIDTRANS_IS_PRODUCTION     false = sandbox, true = produksi
 *
 * MIDTRANS_MERCHANT_ID tidak dibutuhkan untuk Snap dengan server key,
 * tapi tetap disediakan bila dibutuhkan fitur lain.
 */
return [
    'server_key' => env('MIDTRANS_SERVER_KEY'),
    'client_key' => env('MIDTRANS_CLIENT_KEY'),
    'merchant_id' => env('MIDTRANS_MERCHANT_ID'),
    'is_production' => (bool) env('MIDTRANS_IS_PRODUCTION', false),
    'is_3ds' => (bool) env('MIDTRANS_IS_3DS', true),
    'configured' => (bool) env('MIDTRANS_SERVER_KEY'),
];

<?php

namespace App\Enums;

/*
 * Tahap 4 — Status pembayaran sesuai backend_prd:
 * pending / paid / expired / failed (+ refunded dipetakan dari
 * transaksi refund Midtrans agar tidak tertukar dengan paid).
 */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Expired = 'expired';
    case Failed = 'failed';
    case Refunded = 'refunded';
}

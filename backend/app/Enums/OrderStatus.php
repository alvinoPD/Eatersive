<?php

namespace App\Enums;

/*
 * Tahap 4 — Opsi A: enum status pesanan mengikuti kontrak frontend
 * (src/api/orders.ts → OrderStatus) plus label Indonesia yang
 * dikirim sebagai `status_label`.
 */
enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Processing = 'processing';
    case QualityCheck = 'quality_check';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    /** Baris pertama timeline yang ever dibuat per pesanan. */
    public const INITIAL = self::Pending;

    /** Status yang boleh dipakai admin saat mengubah status pengerjaan. */
    public const ADMIN_SETTABLE = [
        self::Confirmed,
        self::Processing,
        self::QualityCheck,
        self::Completed,
        self::Cancelled,
    ];

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu',
            self::Confirmed => 'Dikonfirmasi',
            self::Processing => 'Sedang Dikerjakan',
            self::QualityCheck => 'Pengecekan',
            self::Completed => 'Selesai',
            self::Cancelled => 'Dibatalkan',
        };
    }
}

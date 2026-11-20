<?php

namespace App\Http\Controllers;

use App\Models\Pesanan;
use Illuminate\Http\JsonResponse;

class OwnerDashboardController extends Controller
{
    /**
     * Ringkasan angka untuk dashboard owner. Semua nilai dihitung dari database.
     */
    public function index(): JsonResponse
    {
        $counts = Pesanan::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $totalRevenue = (int) round((float) Pesanan::query()
            ->whereHas('pembayaran', fn ($query) => $query->where('status_pembayaran', 'paid'))
            ->sum('total_harga'));

        $recentOrders = Pesanan::query()
            ->with('layanan')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (Pesanan $pesanan) => [
                'id' => $pesanan->id,
                'kode_pesanan' => $pesanan->kode_pesanan,
                'nama' => $pesanan->nama,
                'layanan' => $pesanan->layanan?->nama,
                'status' => $pesanan->status,
                'status_label' => PesananController::STATUS_LABELS[$pesanan->status] ?? $pesanan->status,
                'total_harga' => (int) round((float) $pesanan->total_harga),
                'created_at' => $pesanan->created_at?->toIso8601String(),
            ])
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'Ringkasan dashboard berhasil diambil',
            'data' => [
                'total_orders' => (int) $counts->sum(),
                'pending_orders' => (int) ($counts['pending'] ?? 0),
                'confirmed_orders' => (int) ($counts['confirmed'] ?? 0),
                'processing_orders' => (int) ($counts['processing'] ?? 0),
                'quality_check_orders' => (int) ($counts['quality_check'] ?? 0),
                'completed_orders' => (int) ($counts['completed'] ?? 0),
                'cancelled_orders' => (int) ($counts['cancelled'] ?? 0),
                'total_revenue' => $totalRevenue,
                'recent_orders' => $recentOrders,
            ],
        ]);
    }
}

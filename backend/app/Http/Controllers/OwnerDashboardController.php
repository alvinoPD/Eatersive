<?php

namespace App\Http\Controllers;

use App\Models\Pesanan;
use App\Models\PesananFoto;
use App\Models\UserMembership;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

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
            ->with(['layanan', 'pembayaran'])
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
                'metode_pembayaran' => $pesanan->pembayaran?->metode_pembayaran,
                'status_pembayaran' => $pesanan->pembayaran?->status_pembayaran,
                'created_at' => $pesanan->created_at?->toIso8601String(),
            ])
            ->all();

        $months = collect(range(5, 0))
            ->map(fn (int $offset) => Carbon::now()->subMonths($offset)->startOfMonth());

        $monthlyOrders = Pesanan::query()
            ->with('pembayaran')
            ->where('created_at', '>=', $months->first()->copy()->startOfDay())
            ->get();

        $monthly = $months->map(function (Carbon $month) use ($monthlyOrders) {
            $orders = $monthlyOrders->filter(
                fn (Pesanan $order) => $order->created_at?->format('Y-m') === $month->format('Y-m'),
            );

            $revenue = $orders
                ->filter(fn (Pesanan $order) => $order->pembayaran?->status_pembayaran === 'paid')
                ->sum(fn (Pesanan $order) => (float) $order->total_harga);

            return [
                'month' => $month->format('Y-m'),
                'label' => $month->locale('id')->translatedFormat('M Y'),
                'orders' => $orders->count(),
                'revenue' => (int) round($revenue),
            ];
        })->all();

        $memberCount = (int) UserMembership::query()
            ->whereDate('expires_at', '>=', now()->toDateString())
            ->distinct('user_id')
            ->count('user_id');

        $discountTotal = (int) round((float) Pesanan::query()->sum('diskon'));

        $recentPhotos = PesananFoto::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $orderCodes = Pesanan::query()
            ->whereIn('kode_grup', $recentPhotos->pluck('kode_grup')->unique()->all())
            ->get(['kode_grup', 'kode_pesanan'])
            ->keyBy('kode_grup');

        $recentPhotos = $recentPhotos
            ->map(fn (PesananFoto $photo) => [
                'id' => $photo->id,
                'url' => $photo->url,
                'sisi' => $photo->sisi,
                'kode_grup' => $photo->kode_grup,
                'kode_pesanan' => $orderCodes[$photo->kode_grup]->kode_pesanan ?? null,
                'created_at' => $photo->created_at?->toIso8601String(),
            ])
            ->values()
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
                'total_discount' => $discountTotal,
                'member_count' => $memberCount,
                'active_customers' => (int) Pesanan::query()->distinct('user_id')->count('user_id'),
                'queue_count' => (int) (($counts['pending'] ?? 0) + ($counts['confirmed'] ?? 0) + ($counts['processing'] ?? 0)),
                'recent_orders' => $recentOrders,
                'recent_photos' => $recentPhotos,
                'monthly' => $monthly,
            ],
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Models\Pembayaran;
use App\Models\Pesanan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/*
 * Tahap 4 — Opsi A: endpoint khusus owner untuk dashboard, profil, dan
 * keamanan akun. Kontrak mengikuti frontend `src/api/owner.ts`.
 */
class OwnerController extends Controller
{
    /**
     * Ringkasan dashboard: hitungan pesanan per status, omset dari
     * pembayaran lunas, dan daftar pesanan terbaru.
     */
    public function dashboard(): JsonResponse
    {
        $counts = Pesanan::query()
            ->selectRaw('status, COUNT(*) AS total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $sum = 0.0;

        foreach (OrderStatus::cases() as $status) {
            $sum += (float) ($counts[$status->value] ?? 0);
        }

        $recent = Pesanan::with(['layanan:id,nama', 'pembayaran:id,pesanan_id,status_pembayaran,jumlah'])
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Ringkasan dashboard berhasil diambil',
            'data' => [
                'total_orders' => (int) $sum,
                'pending_orders' => (int) ($counts[OrderStatus::Pending->value] ?? 0),
                'confirmed_orders' => (int) ($counts[OrderStatus::Confirmed->value] ?? 0),
                'processing_orders' => (int) ($counts[OrderStatus::Processing->value] ?? 0),
                'quality_check_orders' => (int) ($counts[OrderStatus::QualityCheck->value] ?? 0),
                'completed_orders' => (int) ($counts[OrderStatus::Completed->value] ?? 0),
                'cancelled_orders' => (int) ($counts[OrderStatus::Cancelled->value] ?? 0),
                'total_revenue' => (float) Pembayaran::where('status_pembayaran', 'paid')->sum('jumlah'),
                'recent_orders' => $recent
                    ->map(fn (Pesanan $pesanan): array => [
                        'id' => $pesanan->id,
                        'kode_pesanan' => $pesanan->kode_pesanan,
                        'nama' => $pesanan->nama,
                        'layanan' => $pesanan->layanan?->nama,
                        'status' => $pesanan->status->value,
                        'status_label' => $pesanan->status_label,
                        'total_harga' => (float) $pesanan->total_harga,
                        'created_at' => optional($pesanan->created_at)?->toISOString(),
                    ])
                    ->all(),
            ],
        ]);
    }

    /**
     * Profil akun owner yang sedang login.
     */
    public function profile(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diambil',
            'data' => $this->profilePayload($request->user()),
        ]);
    }

    /**
     * Perbarui nama, email, dan nomor telepon owner.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $attributes = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email:rfc', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'nomor_telp' => ['sometimes', 'nullable', 'string', 'max:25'],
        ]);

        $user->fill($attributes);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui',
            'data' => $this->profilePayload($user),
        ]);
    }

    /**
     * Ganti password owner (wajib konfirmasi password lama).
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $attributes = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', Password::min(8)],
        ]);

        if (! Hash::check($attributes['current_password'], $request->user()->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password saat ini tidak sesuai',
                'data' => null,
            ], 422);
        }

        $request->user()->update([
            'password' => Hash::make($attributes['password']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah',
            'data' => null,
        ]);
    }

    private function profilePayload($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'nomor_telp' => $user->nomor_telp,
            'role' => $user->role,
            'created_at' => optional($user->created_at)?->toISOString(),
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\MembershipPlan;
use App\Models\User;
use App\Models\UserMembership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OwnerMemberController extends Controller
{
    /**
     * Daftar pelanggan beserta total belanja dan membership aktif.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $members = User::query()
            ->where('role', '!=', 'admin')
            ->when(
                isset($validated['q']),
                function ($query) use ($validated) {
                    $term = '%'.$validated['q'].'%';
                    $query->where(function ($nested) use ($term) {
                        $nested->where('name', 'like', $term)
                            ->orWhere('email', 'like', $term)
                            ->orWhere('nomor_telp', 'like', $term);
                    });
                },
            )
            ->withCount('pesanan')
            ->withSum('pesanan as total_spend', 'total_harga')
            ->withMax('pesanan as last_order_at', 'created_at')
            ->with(['memberships' => fn ($query) => $query->with('plan')->orderByDesc('expires_at')])
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (User $user) => $this->formatMember($user))
            ->all();

        $plans = MembershipPlan::query()->orderByDesc('aktif')->orderBy('harga')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar pelanggan berhasil diambil',
            'data' => [
                'members' => $members,
                'plans' => $plans,
                'stats' => [
                    'total_customers' => count($members),
                    'active_members' => collect($members)->where('is_member', true)->count(),
                    'total_discount' => (int) round((float) \App\Models\Pesanan::query()->sum('diskon')),
                ],
            ],
        ]);
    }

    /**
     * Aktifkan/perpanjang membership atau atur diskon pelanggan.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $attributes = $request->validate([
            'plan_id' => ['nullable', 'integer', 'exists:membership_plans,id'],
            'aktif' => ['nullable', 'boolean'],
            'diskon_persen' => ['nullable', 'integer', 'min:0', 'max:100'],
            'durasi_hari' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ]);

        $aktif = $attributes['aktif'] ?? true;
        $plan = isset($attributes['plan_id']) ? MembershipPlan::find($attributes['plan_id']) : null;

        if (! $aktif || ! $plan) {
            UserMembership::where('user_id', $user->id)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Membership pelanggan dinonaktifkan',
                'data' => $this->formatMember($user->fresh()),
            ]);
        }

        $membership = DB::transaction(function () use ($attributes, $user, $plan) {
            $current = UserMembership::where('user_id', $user->id)
                ->whereDate('expires_at', '>=', now()->toDateString())
                ->orderByDesc('expires_at')
                ->first();

            $base = $current && $current->expires_at?->greaterThan(Carbon::today())
                ? $current->expires_at->copy()
                : Carbon::today();

            $durasi = (int) ($attributes['durasi_hari'] ?? $plan->durasi_hari);
            $expires = $base->copy()->addDays($durasi);

            return UserMembership::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'membership_plan_id' => $plan->id,
                    'starts_at' => $current?->starts_at ?? Carbon::today(),
                    'expires_at' => $expires,
                    'diskon_persen' => $attributes['diskon_persen'] ?? null,
                    'catatan' => $attributes['catatan'] ?? null,
                ],
            );
        });

        $user->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Membership pelanggan berhasil diperbarui',
            'data' => $this->formatMember($user),
        ]);
    }

    /**
     * Paket membership yang aktif (dipakai halaman publik/landing).
     */
    public function publicIndex(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Daftar paket membership berhasil diambil',
            'data' => MembershipPlan::query()
                ->where('aktif', true)
                ->orderBy('harga')
                ->get(),
        ]);
    }

    public function storePlan(Request $request): JsonResponse
    {
        $plan = MembershipPlan::create($this->validatePlan($request));

        return response()->json([
            'success' => true,
            'message' => 'Paket membership berhasil ditambahkan',
            'data' => $plan,
        ], 201);
    }

    public function updatePlan(Request $request, MembershipPlan $plan): JsonResponse
    {
        $plan->update($this->validatePlan($request, true));

        return response()->json([
            'success' => true,
            'message' => 'Paket membership berhasil diperbarui',
            'data' => $plan->fresh(),
        ]);
    }

    public function destroyPlan(MembershipPlan $plan): JsonResponse
    {
        $plan->delete();

        return response()->json([
            'success' => true,
            'message' => 'Paket membership berhasil dihapus',
            'data' => null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePlan(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'nama' => [$required, 'string', 'max:80'],
            'deskripsi' => ['nullable', 'string', 'max:1000'],
            'harga' => [$required, 'numeric', 'min:0'],
            'durasi_hari' => [$required, 'integer', 'min:1', 'max:3650'],
            'diskon_persen' => [$required, 'integer', 'min:0', 'max:100'],
            'aktif' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatMember(User $user): array
    {
        $active = $user->memberships
            ->first(fn (UserMembership $membership) => $membership->expires_at?->gte(Carbon::today()));

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'nomor_telp' => $user->nomor_telp,
            'is_member' => $active !== null,
            'plan_id' => $active?->membership_plan_id,
            'plan_name' => $active?->plan?->nama,
            'diskon_persen' => $active?->effectiveDiscount() ?? 0,
            'member_since' => $active?->starts_at?->toDateString(),
            'member_until' => $active?->expires_at?->toDateString(),
            'total_orders' => (int) ($user->pesanan_count ?? 0),
            'total_spend' => (int) round((float) ($user->total_spend ?? 0)),
            'last_order_at' => $user->last_order_at
                ? Carbon::parse($user->last_order_at)->toIso8601String()
                : null,
        ];
    }
}

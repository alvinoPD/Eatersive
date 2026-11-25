import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import OwnerShell from '../../components/owner/OwnerShell';
import { getApiErrorMessage } from '../../api/client';
import {
  createMembershipPlan,
  deleteMembershipPlan,
  fetchOwnerMembers,
  updateMembershipPlan,
  updateOwnerMember,
  type MembershipPlan,
  type OwnerMember,
  type OwnerMembersResponse,
} from '../../api/owner';
import { formatCurrency } from '../../lib/checkout';
import '../../styles/members.css';

const EMPTY_DATA: OwnerMembersResponse = {
  members: [],
  plans: [],
  stats: { total_customers: 0, active_members: 0, total_discount: 0 },
};

const EMPTY_PLAN_FORM = {
  nama: '',
  deskripsi: '',
  harga: '',
  durasi_hari: '30',
  diskon_persen: '10',
  aktif: true,
};

export default function OwnerMembersPage() {
  const [data, setData] = useState<OwnerMembersResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const [memberTarget, setMemberTarget] = useState<OwnerMember | null>(null);
  const [memberPlanId, setMemberPlanId] = useState('');
  const [memberDuration, setMemberDuration] = useState('');
  const [memberDiscount, setMemberDiscount] = useState('');
  const [memberActive, setMemberActive] = useState(true);
  const [memberSaving, setMemberSaving] = useState(false);

  const [planTarget, setPlanTarget] = useState<MembershipPlan | null>(null);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN_FORM);
  const [planSaving, setPlanSaving] = useState(false);

  const memberDialogRef = useRef<HTMLDialogElement>(null);
  const planDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.title = 'Member Pelanggan — EaterSive';
  }, []);

  async function reload(query = search) {
    try {
      setLoading(true);
      const response = await fetchOwnerMembers(query.trim() || undefined);
      setData(response);
      setError('');
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    fetchOwnerMembers()
      .then((response) => {
        if (!alive) return;
        setData(response);
        setError('');
      })
      .catch((fetchError) => {
        if (alive) setError(getApiErrorMessage(fetchError));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const visibleMembers = useMemo(() => data.members, [data.members]);

  function openMemberDialog(member: OwnerMember) {
    setMemberTarget(member);
    setMemberPlanId(String(member.plan_id ?? data.plans.find((plan) => plan.aktif)?.id ?? ''));
    setMemberDuration('');
    setMemberDiscount(member.diskon_persen ? String(member.diskon_persen) : '');
    setMemberActive(member.is_member);
    setMessage('');
    memberDialogRef.current?.showModal();
  }

  function closeMemberDialog() {
    memberDialogRef.current?.close();
    setMemberTarget(null);
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberTarget || memberSaving) return;

    setMemberSaving(true);

    try {
      await updateOwnerMember(memberTarget.id, {
        plan_id: memberActive && memberPlanId ? Number(memberPlanId) : null,
        aktif: memberActive,
        diskon_persen: memberDiscount === '' ? null : Number(memberDiscount),
        durasi_hari: memberDuration === '' ? null : Number(memberDuration),
      });
      closeMemberDialog();
      await reload();
      setMessage(`Membership ${memberTarget.name} berhasil diperbarui.`);
    } catch (saveError) {
      setMessage(getApiErrorMessage(saveError));
    } finally {
      setMemberSaving(false);
    }
  }

  function openPlanDialog(plan: MembershipPlan | null) {
    setPlanTarget(plan);
    setPlanForm(
      plan
        ? {
            nama: plan.nama,
            deskripsi: plan.deskripsi ?? '',
            harga: String(plan.harga),
            durasi_hari: String(plan.durasi_hari),
            diskon_persen: String(plan.diskon_persen),
            aktif: plan.aktif,
          }
        : EMPTY_PLAN_FORM,
    );
    setMessage('');
    planDialogRef.current?.showModal();
  }

  function closePlanDialog() {
    planDialogRef.current?.close();
    setPlanTarget(null);
  }

  async function handlePlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (planSaving) return;

    setPlanSaving(true);
    const payload = {
      nama: planForm.nama.trim(),
      deskripsi: planForm.deskripsi.trim() || null,
      harga: Number(planForm.harga),
      durasi_hari: Number(planForm.durasi_hari),
      diskon_persen: Number(planForm.diskon_persen),
      aktif: planForm.aktif,
    };

    try {
      if (planTarget) {
        await updateMembershipPlan(planTarget.id, payload);
      } else {
        await createMembershipPlan(payload);
      }
      closePlanDialog();
      await reload();
      setMessage(planTarget ? 'Paket membership diperbarui.' : 'Paket membership ditambahkan.');
    } catch (saveError) {
      setMessage(getApiErrorMessage(saveError));
    } finally {
      setPlanSaving(false);
    }
  }

  async function removePlan(plan: MembershipPlan) {
    if (!window.confirm(`Hapus paket "${plan.nama}"? Member yang memakai paket ini akan berakhir.`)) {
      return;
    }

    try {
      await deleteMembershipPlan(plan.id);
      await reload();
      setMessage(`Paket ${plan.nama} dihapus.`);
    } catch (deleteError) {
      setMessage(getApiErrorMessage(deleteError));
    }
  }

  return (
    <OwnerShell pageId="page-owner-members" shellClassName="members-shell" activeNav="members">
      <main className="members-content">
        <section className="members-heading">
          <div>
            <h1>Member Pelanggan</h1>
            <p>
              Kelola paket subscription dan diskon pelanggan. Diskon otomatis dipakai saat
              checkout.
            </p>
          </div>
          <button className="members-add-button" type="button" onClick={() => openPlanDialog(null)}>
            + Tambah Paket
          </button>
        </section>

        {error && (
          <p className="members-message is-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="members-message" role="status">
            {message}
          </p>
        )}

        <section className="members-stats" aria-label="Ringkasan member">
          <article>
            <span>Total Pelanggan</span>
            <strong>{data.stats.total_customers}</strong>
          </article>
          <article>
            <span>Member Aktif</span>
            <strong>{data.stats.active_members}</strong>
          </article>
          <article>
            <span>Total Diskon Diberikan</span>
            <strong>{formatCurrency(data.stats.total_discount)}</strong>
          </article>
          <article>
            <span>Paket Tersedia</span>
            <strong>{data.plans.filter((plan) => plan.aktif).length}</strong>
          </article>
        </section>

        <section className="members-panel" aria-labelledby="plans-title">
          <div className="members-panel-heading">
            <div>
              <h2 id="plans-title">Paket Membership</h2>
              <p>Harga, durasi, dan diskon yang bisa diberikan owner.</p>
            </div>
          </div>
          <div className="members-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama Paket</th>
                  <th>Harga</th>
                  <th>Durasi</th>
                  <th>Diskon</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      <strong>{plan.nama}</strong>
                      {plan.deskripsi && <small>{plan.deskripsi}</small>}
                    </td>
                    <td>{formatCurrency(Number(plan.harga))}</td>
                    <td>{plan.durasi_hari} hari</td>
                    <td>{plan.diskon_persen}%</td>
                    <td>
                      <span className={`members-badge${plan.aktif ? ' is-active' : ''}`}>
                        {plan.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="members-row-actions">
                        <button type="button" onClick={() => openPlanDialog(plan)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => removePlan(plan)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.plans.length === 0 && (
              <p className="members-empty">Belum ada paket. Tambahkan paket pertama Anda.</p>
            )}
          </div>
        </section>

        <section className="members-panel" aria-labelledby="customers-title">
          <div className="members-panel-heading">
            <div>
              <h2 id="customers-title">Pelanggan</h2>
              <p>Aktifkan subscription atau atur diskon khusus per pelanggan.</p>
            </div>
            <form
              className="members-search"
              onSubmit={(event) => {
                event.preventDefault();
                void reload();
              }}
            >
              <input
                type="search"
                placeholder="Cari nama, email, atau telepon..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="submit">Cari</button>
            </form>
          </div>
          <div className="members-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pelanggan</th>
                  <th>Pesanan</th>
                  <th>Total Belanja</th>
                  <th>Membership</th>
                  <th>Diskon</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                      <small>{member.nomor_telp ?? '—'}</small>
                    </td>
                    <td>{member.total_orders}</td>
                    <td>{formatCurrency(member.total_spend)}</td>
                    <td>
                      {member.is_member ? (
                        <>
                          <span className="members-badge is-active">{member.plan_name}</span>
                          <small>s.d. {member.member_until}</small>
                        </>
                      ) : (
                        <span className="members-badge">Non-member</span>
                      )}
                    </td>
                    <td>{member.diskon_persen}%</td>
                    <td>
                      <button
                        className="members-manage"
                        type="button"
                        onClick={() => openMemberDialog(member)}
                      >
                        Atur
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleMembers.length === 0 && (
              <p className="members-empty">
                {loading ? 'Memuat pelanggan…' : 'Belum ada pelanggan yang cocok.'}
              </p>
            )}
          </div>
        </section>
      </main>

      <dialog
        className="members-dialog"
        ref={memberDialogRef}
        onClose={() => setMemberTarget(null)}
      >
        <form onSubmit={handleMemberSubmit}>
          <div className="members-dialog-heading">
            <h2>Atur Membership</h2>
            <button type="button" aria-label="Tutup" onClick={closeMemberDialog}>
              ×
            </button>
          </div>
          <p className="members-dialog-subtitle">{memberTarget?.name}</p>

          <label className="members-field">
            <span>Paket</span>
            <select
              value={memberPlanId}
              onChange={(event) => setMemberPlanId(event.target.value)}
              disabled={!memberActive}
            >
              <option value="">Pilih paket…</option>
              {data.plans
                .filter((plan) => plan.aktif)
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nama} — {plan.diskon_persen}% / {plan.durasi_hari} hari
                  </option>
                ))}
            </select>
          </label>

          <label className="members-checkbox">
            <input
              type="checkbox"
              checked={memberActive}
              onChange={(event) => setMemberActive(event.target.checked)}
            />
            <span>Aktifkan membership</span>
          </label>

          <div className="members-field-row">
            <label className="members-field">
              <span>Durasi (hari, opsional)</span>
              <input
                type="number"
                min={1}
                max={3650}
                placeholder="Ikuti paket"
                value={memberDuration}
                onChange={(event) => setMemberDuration(event.target.value)}
              />
            </label>
            <label className="members-field">
              <span>Diskon override % (opsional)</span>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Ikuti paket"
                value={memberDiscount}
                onChange={(event) => setMemberDiscount(event.target.value)}
              />
            </label>
          </div>

          <div className="members-dialog-actions">
            <button type="button" onClick={closeMemberDialog}>
              Batal
            </button>
            <button type="submit" disabled={memberSaving || (memberActive && !memberPlanId)}>
              {memberSaving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </dialog>

      <dialog className="members-dialog" ref={planDialogRef} onClose={() => setPlanTarget(null)}>
        <form onSubmit={handlePlanSubmit}>
          <div className="members-dialog-heading">
            <h2>{planTarget ? 'Edit Paket' : 'Tambah Paket'}</h2>
            <button type="button" aria-label="Tutup" onClick={closePlanDialog}>
              ×
            </button>
          </div>

          <label className="members-field">
            <span>Nama Paket</span>
            <input
              required
              maxLength={80}
              placeholder="Contoh: Member Bulanan"
              value={planForm.nama}
              onChange={(event) => setPlanForm({ ...planForm, nama: event.target.value })}
            />
          </label>

          <label className="members-field">
            <span>Deskripsi</span>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="Benefit singkat paket..."
              value={planForm.deskripsi}
              onChange={(event) => setPlanForm({ ...planForm, deskripsi: event.target.value })}
            />
          </label>

          <div className="members-field-row">
            <label className="members-field">
              <span>Harga (IDR)</span>
              <input
                required
                type="number"
                min={0}
                step={1000}
                value={planForm.harga}
                onChange={(event) => setPlanForm({ ...planForm, harga: event.target.value })}
              />
            </label>
            <label className="members-field">
              <span>Durasi (hari)</span>
              <input
                required
                type="number"
                min={1}
                max={3650}
                value={planForm.durasi_hari}
                onChange={(event) => setPlanForm({ ...planForm, durasi_hari: event.target.value })}
              />
            </label>
            <label className="members-field">
              <span>Diskon (%)</span>
              <input
                required
                type="number"
                min={0}
                max={100}
                value={planForm.diskon_persen}
                onChange={(event) =>
                  setPlanForm({ ...planForm, diskon_persen: event.target.value })
                }
              />
            </label>
          </div>

          <label className="members-checkbox">
            <input
              type="checkbox"
              checked={planForm.aktif}
              onChange={(event) => setPlanForm({ ...planForm, aktif: event.target.checked })}
            />
            <span>Paket aktif dan bisa dipilih</span>
          </label>

          <div className="members-dialog-actions">
            <button type="button" onClick={closePlanDialog}>
              Batal
            </button>
            <button type="submit" disabled={planSaving}>
              {planSaving ? 'Menyimpan…' : 'Simpan Paket'}
            </button>
          </div>
        </form>
      </dialog>
    </OwnerShell>
  );
}

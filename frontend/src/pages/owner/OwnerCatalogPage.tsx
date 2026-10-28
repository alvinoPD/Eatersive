import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import OwnerShell from '../../components/owner/OwnerShell';
import {
  DEFAULT_OWNER_SERVICES,
  OWNER_CATALOG_STORAGE_KEY,
} from '../../data/ownerCatalog';
import { formatCurrency } from '../../lib/checkout';
import type { OwnerCatalogService, ServiceCategory } from '../../types/eatersive';
import '../../styles/owner-catalog.css';

type CategoryFilter = 'all' | ServiceCategory;
type SortOption = 'newest' | 'oldest' | 'name' | 'price-low' | 'price-high';

const CATEGORIES: ServiceCategory[] = ['Cleaning', 'Unyellowing', 'Repair', 'Treatment'];

function isOwnerCatalogService(value: unknown): value is OwnerCatalogService {
  if (!value || typeof value !== 'object') return false;
  const service = value as Partial<OwnerCatalogService>;

  return (
    typeof service.id === 'string' &&
    typeof service.name === 'string' &&
    typeof service.description === 'string' &&
    typeof service.category === 'string' &&
    CATEGORIES.includes(service.category as ServiceCategory) &&
    typeof service.estimate === 'string' &&
    typeof service.active === 'boolean' &&
    typeof service.image === 'string' &&
    Number.isFinite(service.price) &&
    Number.isFinite(service.sequence)
  );
}

function loadCatalog(): { services: OwnerCatalogService[]; error: string } {
  const fallback = DEFAULT_OWNER_SERVICES.map((service) => ({ ...service }));

  try {
    const rawServices = window.localStorage.getItem(OWNER_CATALOG_STORAGE_KEY);
    if (!rawServices) return { services: fallback, error: '' };

    const parsed: unknown = JSON.parse(rawServices);
    if (!Array.isArray(parsed) || !parsed.every(isOwnerCatalogService)) {
      throw new TypeError('Format katalog tersimpan tidak valid.');
    }

    return { services: parsed, error: '' };
  } catch (error) {
    console.error('Tidak dapat membaca data katalog:', error);
    return {
      services: fallback,
      error: 'Data katalog tersimpan tidak dapat dibaca. Menampilkan katalog demo.',
    };
  }
}

async function compressPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Foto tidak dapat dibaca.'));
    });
    reader.addEventListener('error', () => reject(new Error('Foto tidak dapat dibaca.')));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.addEventListener('load', () => resolve(element));
    element.addEventListener('error', () => reject(new Error('Foto tidak dapat diproses.')));
    element.src = dataUrl;
  });

  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Foto tidak dapat diproses di browser ini.');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function OwnerCatalogPage() {
  const [initialCatalog] = useState(loadCatalog);
  const [services, setServices] = useState<OwnerCatalogService[]>(
    initialCatalog.services,
  );
  const [pageMessage, setPageMessage] = useState(initialCatalog.error);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogMessage, setDialogMessage] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [dragging, setDragging] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ServiceCategory>('Cleaning');
  const [formPrice, setFormPrice] = useState('');
  const [formEstimate, setFormEstimate] = useState('');
  const [formActive, setFormActive] = useState('true');
  const [formDescription, setFormDescription] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.title = 'Kelola Katalog — EaterSive';
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (dialogOpen && !dialog.open) dialog.showModal();
    if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen]);

  const visibleServices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');
    return services
      .filter((service) => {
        const matchesQuery = `${service.name} ${service.description} ${service.category}`
          .toLocaleLowerCase('id')
          .includes(query);
        return matchesQuery && (category === 'all' || service.category === category);
      })
      .sort((first, second) => {
        switch (sort) {
          case 'oldest':
            return first.sequence - second.sequence;
          case 'name':
            return first.name.localeCompare(second.name, 'id');
          case 'price-low':
            return first.price - second.price;
          case 'price-high':
            return second.price - first.price;
          default:
            return second.sequence - first.sequence;
        }
      });
  }, [category, search, services, sort]);

  const activeCount = services.filter((service) => service.active).length;

  function persist(nextServices: OwnerCatalogService[]): boolean {
    try {
      window.localStorage.setItem(
        OWNER_CATALOG_STORAGE_KEY,
        JSON.stringify(nextServices),
      );
      return true;
    } catch (error) {
      console.error('Tidak dapat menyimpan data katalog:', error);
      setPageMessage(
        'Perubahan tidak dapat disimpan di browser ini. Periksa ruang penyimpanan.',
      );
      return false;
    }
  }

  function openServiceDialog(service: OwnerCatalogService | null) {
    setEditingId(service?.id ?? null);
    setFormName(service?.name ?? '');
    setFormCategory(service?.category ?? 'Cleaning');
    setFormPrice(service ? String(service.price) : '');
    setFormEstimate(service?.estimate ?? '');
    setFormActive(String(service?.active ?? true));
    setFormDescription(service?.description ?? '');
    setSelectedPhoto(service?.image ?? '');
    setDialogMessage('');
    setDialogOpen(true);
  }

  function closeServiceDialog() {
    setDialogOpen(false);
  }

  async function readPhoto(file: File) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setDialogMessage('Format foto harus JPG atau PNG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDialogMessage('Ukuran foto maksimal 5MB.');
      return;
    }

    try {
      setDialogMessage('');
      setSelectedPhoto(await compressPhoto(file));
    } catch (error) {
      console.error('Tidak dapat memproses foto:', error);
      setDialogMessage('Foto tidak dapat diproses. Silakan pilih file lain.');
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    const [file] = Array.from(event.dataTransfer.files);
    if (file) void readPhoto(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current?.reportValidity()) return;

    const existingService = services.find((service) => service.id === editingId);
    const nextSequence = Math.max(...services.map((service) => service.sequence), 0) + 1;
    const service: OwnerCatalogService = {
      id:
        existingService?.id ??
        `srv-${
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        }`,
      name: formName.trim(),
      description: formDescription.trim(),
      category: formCategory,
      price: Number(formPrice),
      estimate: formEstimate.trim(),
      active: formActive === 'true',
      image: selectedPhoto,
      sequence: existingService?.sequence ?? nextSequence,
    };

    const nextServices = existingService
      ? services.map((item) => (item.id === existingService.id ? service : item))
      : [...services, service];

    if (!persist(nextServices)) {
      setDialogMessage(
        'Layanan gagal disimpan. Kurangi ukuran foto atau periksa ruang penyimpanan.',
      );
      return;
    }

    setServices(nextServices);
    closeServiceDialog();
    setPageMessage(
      existingService
        ? 'Layanan berhasil diperbarui di perangkat ini.'
        : 'Layanan berhasil ditambahkan di perangkat ini.',
    );
  }

  function toggleActive(service: OwnerCatalogService) {
    const nextServices = services.map((item) =>
      item.id === service.id ? { ...item, active: !item.active } : item,
    );
    if (!persist(nextServices)) return;
    setServices(nextServices);
    setPageMessage(
      `Layanan ${service.name} berhasil ${
        service.active ? 'dinonaktifkan' : 'diaktifkan'
      } di perangkat ini.`,
    );
  }

  function deleteService(service: OwnerCatalogService) {
    if (!window.confirm(`Hapus layanan "${service.name}" dari katalog?`)) return;

    const nextServices = services.filter((item) => item.id !== service.id);
    if (!persist(nextServices)) return;
    setServices(nextServices);
    setPageMessage(`Layanan ${service.name} berhasil dihapus dari perangkat ini.`);
  }

  return (
    <div id="page-owner-catalog">
      <OwnerShell
        pageId="page-owner-catalog-shell"
        shellClassName="catalog-shell"
        activeNav="catalog"
      >
        <main className="catalog-content">
          <section className="page-heading" aria-labelledby="page-title">
            <div>
              <h1 id="page-title">Kelola Katalog</h1>
              <p>Atur daftar layanan cuci, perbaikan, dan perawatan sepatu Anda.</p>
            </div>
            <button
              className="add-service-button"
              type="button"
              onClick={() => openServiceDialog(null)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Tambah Layanan
            </button>
          </section>

          <section className="summary-grid" aria-label="Ringkasan katalog">
            <article className="summary-card summary-card--total">
              <span className="summary-icon summary-icon--blue" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
                  <path d="m4.2 7.6 7.8 4.5 7.8-4.5M12 12v9" />
                </svg>
              </span>
              <div>
                <p>Total Layanan</p>
                <strong>{services.length}</strong>
              </div>
              <svg
                className="summary-chart"
                viewBox="0 0 240 60"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="catalog-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#2862ed" stopOpacity=".28" />
                    <stop offset="1" stopColor="#2862ed" stopOpacity=".04" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 43 C35 45 45 50 73 39 S117 26 145 18 S193 3 211 9 S231 17 240 14 V60 H0Z"
                  fill="url(#catalog-gradient)"
                />
                <path
                  d="M0 43 C35 45 45 50 73 39 S117 26 145 18 S193 3 211 9 S231 17 240 14"
                  fill="none"
                  stroke="#2862ed"
                  strokeWidth="2"
                />
              </svg>
            </article>
            <article className="summary-card">
              <span className="summary-icon summary-icon--green" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                  <path d="m8.5 12 2.3 2.3 4.8-5" />
                </svg>
              </span>
              <div>
                <p>Layanan Aktif</p>
                <strong>{activeCount}</strong>
              </div>
            </article>
            <article className="summary-card">
              <span className="summary-icon summary-icon--orange" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v5m0 3h.01" />
                </svg>
              </span>
              <div>
                <p>Butuh Update</p>
                <strong>{services.length - activeCount}</strong>
              </div>
            </article>
          </section>

          <section className="catalog-panel" aria-label="Daftar layanan">
            <div className="table-toolbar">
              <label className="search-field">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.3" />
                  <path d="m16 16 4 4" />
                </svg>
                <span className="visually-hidden">Cari nama layanan atau kategori</span>
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Cari nama layanan atau kategori..."
                  autoComplete="off"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="select-field">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h16l-6.2 7.2V19l-3.6-1.8v-5L4 5Z" />
                </svg>
                <span className="visually-hidden">Filter kategori</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                >
                  <option value="all">Filter Kategori</option>
                  {CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className="select-chevron" aria-hidden="true">
                  ⌄
                </span>
              </label>
              <label className="select-field select-field--sort">
                <span className="visually-hidden">Urutkan katalog</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortOption)}
                >
                  <option value="newest">Urutkan: Terbaru</option>
                  <option value="oldest">Urutkan: Terlama</option>
                  <option value="name">Urutkan: Nama A–Z</option>
                  <option value="price-low">Harga: Terendah</option>
                  <option value="price-high">Harga: Tertinggi</option>
                </select>
                <span className="select-chevron" aria-hidden="true">
                  ⌄
                </span>
              </label>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col" className="number-cell">
                      No
                    </th>
                    <th scope="col">Layanan</th>
                    <th scope="col">Kategori</th>
                    <th scope="col" className="price-cell">
                      Harga
                    </th>
                    <th scope="col">Estimasi</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="actions-heading">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleServices.map((service, index) => (
                    <tr key={service.id}>
                      <td className="number-cell row-number">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td>
                        <div className="service-cell">
                          {service.image && <img src={service.image} alt="" loading="lazy" />}
                          <div className="service-copy">
                            <strong>{service.name}</strong>
                            <span>{service.description}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="category-badge">{service.category}</span>
                      </td>
                      <td className="price-cell">
                        <span className="price-value">{formatCurrency(service.price)}</span>
                      </td>
                      <td>
                        <span className="estimate">
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="8" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                          <span>{service.estimate}</span>
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status ${
                            service.active ? 'status--active' : 'status--inactive'
                          }`}
                        >
                          {service.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <details
                          className="action-menu"
                          open={openMenuId === service.id}
                          onToggle={(event) => {
                            if (event.currentTarget.open) setOpenMenuId(service.id);
                            else
                              setOpenMenuId((current) =>
                                current === service.id ? null : current,
                              );
                          }}
                        >
                          <summary aria-label={`Aksi untuk ${service.name}`}>⋮</summary>
                          <div className="action-options">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                openServiceDialog(service);
                              }}
                            >
                              Edit layanan
                            </button>
                            <button type="button" onClick={() => toggleActive(service)}>
                              {service.active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button type="button" onClick={() => deleteService(service)}>
                              Hapus layanan
                            </button>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleServices.length === 0 && (
                <p className="empty-state">Tidak ada layanan yang cocok.</p>
              )}
            </div>
            <div className="table-footer">
              <p>
                Menampilkan {visibleServices.length} dari {services.length} layanan
              </p>
              <button
                className="reset-button"
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                  setSort('newest');
                  setPageMessage('');
                  searchRef.current?.focus();
                }}
              >
                Atur Ulang Filter
              </button>
            </div>
          </section>
          <p className="form-message" role="status" aria-live="polite">
            {pageMessage}
          </p>
        </main>
      </OwnerShell>

      <dialog
        className="service-dialog"
        ref={dialogRef}
        aria-labelledby="dialog-title"
        onClose={() => setDialogOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeServiceDialog();
        }}
      >
        <form className="service-form" ref={formRef} onSubmit={handleSubmit}>
          <div className="dialog-heading">
            <div>
              <h2 id="dialog-title">
                {editingId ? 'Edit Layanan' : 'Tambah Layanan Baru'}
              </h2>
              <p>Isi detail layanan di bawah ini untuk menambahkannya ke katalog publik.</p>
            </div>
            <button
              className="dialog-close"
              type="button"
              aria-label="Tutup"
              onClick={closeServiceDialog}
            >
              ×
            </button>
          </div>
          <div className="form-field">
            <label htmlFor="service-name">Nama Layanan</label>
            <input
              id="service-name"
              name="name"
              required
              maxLength={60}
              placeholder="Contoh: Deep Cleaning Suede"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="service-category">Kategori</label>
              <select
                id="service-category"
                name="category"
                required
                value={formCategory}
                onChange={(event) =>
                  setFormCategory(event.target.value as ServiceCategory)
                }
              >
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="service-price">Harga (IDR)</label>
              <input
                id="service-price"
                name="price"
                type="number"
                min="0"
                step="1000"
                required
                placeholder="65000"
                value={formPrice}
                onChange={(event) => setFormPrice(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="service-estimate">Estimasi Durasi</label>
              <input
                id="service-estimate"
                name="estimate"
                required
                maxLength={30}
                placeholder="Contoh: 2–3 Hari"
                value={formEstimate}
                onChange={(event) => setFormEstimate(event.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="service-active">Status Awal</label>
              <select
                id="service-active"
                name="active"
                value={formActive}
                onChange={(event) => setFormActive(event.target.value)}
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="service-description">Deskripsi Layanan</label>
            <textarea
              id="service-description"
              name="description"
              rows={3}
              maxLength={180}
              placeholder="Jelaskan apa saja yang didapat pelanggan..."
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
            />
          </div>
          <div className="form-field">
            <span className="field-label">Foto Layanan</span>
            <input
              className="visually-hidden"
              id="service-photo"
              ref={photoInputRef}
              name="photo"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => {
                const [file] = Array.from(event.target.files ?? []);
                if (file) void readPhoto(file);
                event.target.value = '';
              }}
            />
            <button
              className={`photo-dropzone${dragging ? ' is-dragging' : ''}`}
              type="button"
              aria-describedby="photo-help"
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragging(false);
                }
              }}
              onDrop={handleDrop}
            >
              {selectedPhoto ? (
                <img className="photo-preview" src={selectedPhoto} alt="Pratinjau foto layanan" />
              ) : (
                <span className="photo-placeholder">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="4" width="17" height="16" rx="2" />
                    <circle cx="8.5" cy="9" r="1.5" />
                    <path d="m20.5 15-5-5L5 20" />
                  </svg>
                  <span>Klik atau tarik file untuk unggah foto</span>
                  <small id="photo-help">JPG, PNG up to 5MB</small>
                </span>
              )}
            </button>
            {selectedPhoto && (
              <button
                className="remove-photo"
                type="button"
                onClick={() => {
                  setSelectedPhoto('');
                  setDialogMessage('');
                }}
              >
                Hapus foto
              </button>
            )}
          </div>
          <p className="dialog-message" role="status" aria-live="polite">
            {dialogMessage}
          </p>
          <div className="dialog-actions">
            <button className="cancel-button" type="button" onClick={closeServiceDialog}>
              Batal
            </button>
            <button className="save-button" type="submit">
              Simpan Layanan
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

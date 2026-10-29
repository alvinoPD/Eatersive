import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import OwnerShell from '../../components/owner/OwnerShell';
import {
  OWNER_REVIEWS_STORAGE_KEY,
  REVIEW_PAGE_SIZE,
  readOwnerReviews,
} from '../../data/ownerReviews';
import type { OwnerReview, OwnerReviewStatus } from '../../types/eatersive';
import '../../styles/owner-reviews.css';

type StatusFilter = 'all' | OwnerReviewStatus;

const STATUS_CLASS: Record<OwnerReviewStatus, string> = {
  Dipublikasikan: 'published',
  Menunggu: 'waiting',
  Dilaporkan: 'reported',
  Disembunyikan: 'hidden',
};

const STATUS_ACTIONS: Array<{ status: OwnerReviewStatus; label: string }> = [
  { status: 'Dipublikasikan', label: 'Publikasikan' },
  { status: 'Menunggu', label: 'Tandai menunggu' },
  { status: 'Disembunyikan', label: 'Sembunyikan' },
  { status: 'Dilaporkan', label: 'Tandai dilaporkan' },
];

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export default function OwnerReviewsPage() {
  const [reviews, setReviews] = useState<OwnerReview[]>(readOwnerReviews);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState('');
  const [replyReviewId, setReplyReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const replyDialogRef = useRef<HTMLDialogElement>(null);
  const selectPageRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Moderasi Review — EaterSive';
  }, []);

  useEffect(() => {
    const dialog = replyDialogRef.current;
    if (!dialog) return;

    if (replyReviewId && !dialog.open) dialog.showModal();
    if (!replyReviewId && dialog.open) dialog.close();
  }, [replyReviewId]);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id');
    return reviews.filter((review) => {
      const matchesStatus = activeStatus === 'all' || review.status === activeStatus;
      const matchesService =
        serviceFilter === 'all' || review.service === serviceFilter;
      const matchesSearch = `${review.name} ${review.orderId}`
        .toLocaleLowerCase('id')
        .includes(query);
      return matchesStatus && matchesService && matchesSearch;
    });
  }, [activeStatus, reviews, search, serviceFilter]);

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
      : '—';
  const positiveRate =
    totalReviews > 0
      ? `${Math.round(
          (reviews.filter((review) => review.rating >= 4).length / totalReviews) * 100,
        )}%`
      : '—';

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEW_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * REVIEW_PAGE_SIZE;
  const pageReviews = filteredReviews.slice(startIndex, startIndex + REVIEW_PAGE_SIZE);
  const allPageSelected =
    pageReviews.length > 0 && pageReviews.every((review) => selectedIds.has(review.id));
  const somePageSelected =
    pageReviews.some((review) => selectedIds.has(review.id)) && !allPageSelected;

  useEffect(() => {
    if (!selectPageRef.current) return;
    selectPageRef.current.indeterminate = somePageSelected;
  }, [somePageSelected]);

  const replyReview = replyReviewId
    ? reviews.find((review) => review.id === replyReviewId) ?? null
    : null;

  function persist(nextReviews: OwnerReview[]): boolean {
    try {
      window.localStorage.setItem(
        OWNER_REVIEWS_STORAGE_KEY,
        JSON.stringify(nextReviews),
      );
      return true;
    } catch (error) {
      console.error('Tidak dapat menyimpan data ulasan:', error);
      setPageMessage('Perubahan moderasi gagal disimpan di browser ini.');
      return false;
    }
  }

  function resetSelection() {
    setSelectedIds(new Set());
    setCurrentPage(1);
  }

  function changeStatus(reviewIds: string[], status: OwnerReviewStatus) {
    const ids = new Set(reviewIds);
    const nextReviews = reviews.map((review) =>
      ids.has(review.id) ? { ...review, status } : review,
    );
    if (!persist(nextReviews)) return false;

    setReviews(nextReviews);
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    return true;
  }

  function toggleSelection(reviewId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  }

  function openReplyDialog(review: OwnerReview) {
    setReplyReviewId(review.id);
    setReplyText(review.ownerReply ?? '');
  }

  function closeReplyDialog() {
    setReplyReviewId(null);
  }

  function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replyReview) return;

    const reply = replyText.trim();
    if (!reply) return;

    const nextReviews = reviews.map((review) =>
      review.id === replyReview.id ? { ...review, ownerReply: reply } : review,
    );
    if (!persist(nextReviews)) return;

    setReviews(nextReviews);
    setPageMessage(`Balasan untuk ${replyReview.name} berhasil disimpan di perangkat ini.`);
    setReplyReviewId(null);

    const repliedId = replyReview.id;
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-review-id="${repliedId}"] [data-action="reply"]`)
        ?.focus();
    });
  }

  function pageNumbers(): Array<number | 'ellipsis'> {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (safePage <= 3) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    if (safePage >= totalPages - 2) {
      return [
        1,
        'ellipsis',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      'ellipsis',
      safePage - 1,
      safePage,
      safePage + 1,
      'ellipsis',
      totalPages,
    ];
  }

  return (
    <div id="page-owner-reviews">
      <OwnerShell
        pageId="page-owner-reviews-shell"
        shellClassName="reviews-shell"
        activeNav="reviews"
      >
        <main className="reviews-content">
          <section className="page-heading" aria-labelledby="page-title">
            <div>
              <h1 id="page-title">Moderasi Review</h1>
              <p>Pantau dan kelola ulasan pelanggan untuk menjaga reputasi SoleCare.</p>
            </div>
            <button
              className="publish-button"
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => {
                const count = selectedIds.size;
                if (count === 0) return;
                if (changeStatus([...selectedIds], 'Dipublikasikan')) {
                  setPageMessage(`${count} ulasan berhasil dipublikasikan.`);
                }
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8" />
                <path d="m8.5 12 2.3 2.3 4.8-5" />
              </svg>
              {selectedIds.size > 0 ? `Publikasi Massal (${selectedIds.size})` : 'Publikasi Massal'}
            </button>
          </section>

          <section className="stats-grid" aria-label="Ringkasan ulasan">
            <article className="stat-card">
              <span className="stat-icon stat-icon--blue" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 5h14v11H9l-4 3V5Z" />
                </svg>
              </span>
              <div>
                <p>Total Review</p>
                <strong>{totalReviews.toLocaleString('id-ID')}</strong>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon stat-icon--dark" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
                </svg>
              </span>
              <div>
                <p>Rating Rata-rata</p>
                <strong>{averageRating === '—' ? '—' : `${averageRating}/5`}</strong>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon stat-icon--green" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 10v10H4V10h3Zm0 9h9.2a2 2 0 0 0 1.9-1.4l1.3-4.5a2 2 0 0 0-1.9-2.6H14l.7-3.2A2 2 0 0 0 12.8 5L7 12" />
                </svg>
              </span>
              <div>
                <p>Review Positif</p>
                <strong>{positiveRate}</strong>
              </div>
            </article>
          </section>

          <section className="reviews-panel" aria-label="Daftar ulasan pelanggan">
            <div className="review-toolbar">
              <div className="review-tabs" role="tablist" aria-label="Filter status ulasan">
                {(
                  [
                    { value: 'all', label: 'Semua' },
                    { value: 'Menunggu', label: 'Menunggu' },
                    { value: 'Dilaporkan', label: 'Dilaporkan' },
                  ] as Array<{ value: StatusFilter; label: string }>
                ).map((tab) => {
                  const isActive = activeStatus === tab.value;
                  return (
                    <button
                      key={tab.value}
                      className={`review-tab${tab.value === 'Dilaporkan' ? ' review-tab--reported' : ''}${
                        isActive ? ' is-active' : ''
                      }`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setActiveStatus(tab.value);
                        resetSelection();
                        setPageMessage('');
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="review-filters">
                <label className="search-field">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10.8" cy="10.8" r="6.3" />
                    <path d="m16 16 4 4" />
                  </svg>
                  <span className="visually-hidden">Cari pelanggan atau ID</span>
                  <input
                    ref={searchRef}
                    type="search"
                    placeholder="Cari pelanggan atau ID..."
                    autoComplete="off"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      resetSelection();
                    }}
                  />
                </label>
                <label className="service-filter">
                  <span className="visually-hidden">Filter layanan</span>
                  <select
                    value={serviceFilter}
                    onChange={(event) => {
                      setServiceFilter(event.target.value);
                      resetSelection();
                    }}
                  >
                    <option value="all">Semua Layanan</option>
                    <option value="Deep Cleaning">Deep Cleaning</option>
                    <option value="Unyellowing">Unyellowing</option>
                    <option value="Shoe Repair">Shoe Repair</option>
                  </select>
                </label>
                <button
                  className="filter-reset"
                  type="button"
                  aria-label="Atur ulang filter"
                  title="Atur ulang filter"
                  onClick={() => {
                    setSearch('');
                    setServiceFilter('all');
                    setActiveStatus('all');
                    resetSelection();
                    setPageMessage('');
                    searchRef.current?.focus();
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 5h16l-6.2 7.2V19l-3.6-1.8v-5L4 5Z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col" className="check-cell">
                      <input
                        ref={selectPageRef}
                        type="checkbox"
                        aria-label="Pilih semua ulasan di halaman ini"
                        checked={allPageSelected}
                        onChange={(event) => {
                          setSelectedIds((current) => {
                            const next = new Set(current);
                            pageReviews.forEach((review) => {
                              if (event.target.checked) next.add(review.id);
                              else next.delete(review.id);
                            });
                            return next;
                          });
                        }}
                      />
                    </th>
                    <th scope="col">Pelanggan</th>
                    <th scope="col">Rating &amp; Komentar</th>
                    <th scope="col">Layanan</th>
                    <th scope="col">Tgl Post</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="action-heading">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageReviews.map((review) => (
                    <tr key={review.id} data-review-id={review.id}>
                      <td className="check-cell">
                        <input
                          type="checkbox"
                          className="review-checkbox"
                          checked={selectedIds.has(review.id)}
                          onChange={() => toggleSelection(review.id)}
                          aria-label={`Pilih ulasan dari ${review.name}`}
                        />
                      </td>
                      <td>
                        <div className="customer-cell">
                          <img
                            className="customer-avatar"
                            src={review.avatar}
                            alt=""
                            loading="lazy"
                          />
                          <div className="customer-copy">
                            <strong>{review.name}</strong>
                            <span>{review.orderId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="comment-cell">
                        <span className="rating-stars" aria-label={`Rating ${review.rating} dari 5`}>
                          {[1, 2, 3, 4, 5].map((value) => (
                            <span key={value} className={value <= review.rating ? 'is-filled' : ''}>
                              ★
                            </span>
                          ))}
                        </span>
                        <span className="review-comment">“{review.comment}”</span>
                        {review.ownerReply && (
                          <span className="saved-reply">Balasan Anda: {review.ownerReply}</span>
                        )}
                      </td>
                      <td>
                        <span className="service-badge">{review.service}</span>
                      </td>
                      <td className="date-cell">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="4" y="6" width="16" height="15" rx="2" />
                          <path d="M8 3v6m8-6v6M4 11h16" />
                        </svg>
                        <br />
                        {formatReviewDate(review.postedAt)}
                      </td>
                      <td>
                        <span
                          className={`review-status review-status--${STATUS_CLASS[review.status]}`}
                        >
                          {review.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <details
                          className="action-menu"
                          open={openMenuId === review.id}
                          onToggle={(event) => {
                            if (event.currentTarget.open) setOpenMenuId(review.id);
                            else
                              setOpenMenuId((current) =>
                                current === review.id ? null : current,
                              );
                          }}
                        >
                          <summary aria-label={`Aksi untuk ulasan ${review.name}`}>⋮</summary>
                          <div className="action-options">
                            <button
                              type="button"
                              data-action="reply"
                              onClick={() => {
                                setOpenMenuId(null);
                                openReplyDialog(review);
                              }}
                            >
                              {review.ownerReply ? 'Edit balasan' : 'Balas ulasan'}
                            </button>
                            {STATUS_ACTIONS.map((action) => (
                              <button
                                key={action.status}
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (changeStatus([review.id], action.status)) {
                                    setPageMessage(
                                      `Ulasan ${review.orderId} ditandai sebagai ${action.status.toLowerCase()}.`,
                                    );
                                  }
                                }}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredReviews.length === 0 && (
                <p className="empty-state">
                  {totalReviews === 0
                    ? 'Belum ada ulasan. Ulasan pelanggan akan muncul di sini setelah pesanan selesai.'
                    : 'Tidak ada ulasan yang cocok dengan filter.'}
                </p>
              )}
            </div>

            <div className="table-footer">
              <p>
                Menampilkan {filteredReviews.length === 0 ? 0 : startIndex + 1}–
                {Math.min(startIndex + REVIEW_PAGE_SIZE, filteredReviews.length)} dari{' '}
                {filteredReviews.length.toLocaleString('id-ID')} ulasan
              </p>
              <nav className="pagination" aria-label="Navigasi halaman ulasan">
                <button
                  type="button"
                  className="page-button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                >
                  Sebelumnya
                </button>
                {pageNumbers().map((page, index) =>
                  page === 'ellipsis' ? (
                    <span className="page-ellipsis" key={`ellipsis-${index}`}>
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      className={`page-button${page === safePage ? ' is-active' : ''}`}
                      aria-current={page === safePage ? 'page' : undefined}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="page-button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                >
                  Berikutnya ›
                </button>
              </nav>
            </div>
            <p className="page-message" role="status" aria-live="polite">
              {pageMessage}
            </p>
          </section>

          <section className="sentiment-panel" aria-labelledby="sentiment-title">
            <div className="sentiment-heading">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5h14v11H9l-4 3V5Z" />
              </svg>
              <div>
                <h2 id="sentiment-title">Analisis Sentimen Terkini</h2>
                <p>Ringkasan otomatis feedback pelanggan bulan ini.</p>
              </div>
            </div>
            <p className="empty-state">
              {totalReviews === 0
                ? 'Analisis sentimen belum tersedia karena belum ada ulasan yang masuk.'
                : 'Analisis sentimen belum tersedia. Ringkasan akan dihitung otomatis setelah data ulasan terhubung ke backend.'}
            </p>
          </section>
        </main>
      </OwnerShell>

      <dialog
        className="reply-dialog"
        ref={replyDialogRef}
        aria-labelledby="reply-title"
        onClose={() => setReplyReviewId(null)}
        onClick={(event) => {
          if (event.target === replyDialogRef.current) closeReplyDialog();
        }}
      >
        <form className="reply-form" onSubmit={handleReplySubmit}>
          <div className="reply-dialog-header">
            <div>
              <p className="reply-eyebrow">Tanggapi pelanggan</p>
              <h2 id="reply-title">Balas Ulasan</h2>
            </div>
            <button
              className="reply-close"
              type="button"
              aria-label="Tutup dialog"
              onClick={closeReplyDialog}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          {replyReview && (
            <section className="reply-review" aria-label="Ulasan yang akan dibalas">
              <div className="reply-customer">
                <img className="reply-avatar" src={replyReview.avatar} alt="" />
                <div>
                  <strong>{replyReview.name}</strong>
                  <span>{replyReview.orderId}</span>
                </div>
                <span className="reply-rating">
                  {'★'.repeat(replyReview.rating)}
                  {'☆'.repeat(5 - replyReview.rating)} · {replyReview.rating}/5
                </span>
              </div>
              <p className="reply-comment">“{replyReview.comment}”</p>
            </section>
          )}
          <label className="reply-label" htmlFor="reply-message">
            Balasan Anda
          </label>
          <textarea
            id="reply-message"
            name="reply"
            rows={5}
            maxLength={500}
            placeholder="Tulis balasan yang ramah dan profesional..."
            required
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
          />
          <div className="reply-form-meta">
            <span>Balasan akan ditampilkan bersama ulasan pelanggan.</span>
            <span aria-live="polite">{replyText.length}/500</span>
          </div>
          <div className="reply-form-actions">
            <button className="reply-cancel" type="button" onClick={closeReplyDialog}>
              Batal
            </button>
            <button className="reply-submit" type="submit" disabled={replyText.trim().length === 0}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 3 10.5 13.5" />
                <path d="m21 3-6.7 18-3.8-7.3L3 10l18-7Z" />
              </svg>
              Simpan Balasan
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

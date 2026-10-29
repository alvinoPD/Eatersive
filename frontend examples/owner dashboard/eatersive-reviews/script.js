const storageKey = "eatersive-owner-reviews";
const pageSize = 5;
const mockTotal = 125;
const templates = [
  {
    name: "Budi Santoso",
    orderId: "ORD-9921",
    rating: 5,
    comment:
      "Hasilnya sangat memuaskan! Sepatu putih saya kembali bersih dan wangi.",
    service: "Deep Cleaning",
    status: "Dipublikasikan",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80",
  },
  {
    name: "Siti Aminah",
    orderId: "ORD-9542",
    rating: 3,
    comment:
      "Kuning di sol sepatu hampir hilang semua. Memang tidak bisa 100% kan.",
    service: "Unyellowing",
    status: "Menunggu",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80",
  },
  {
    name: "Rizky Ramadhan",
    orderId: "ORD-9887",
    rating: 5,
    comment:
      "Jahitannya rapi sekali dan sol yang lepas sudah kuat lagi. Terima kasih SoleCare!",
    service: "Shoe Repair",
    status: "Dipublikasikan",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=80&h=80&q=80",
  },
  {
    name: "Dewi Lestari",
    orderId: "ORD-9851",
    rating: 4,
    comment:
      "Waktu pengerjaannya agak lama dari estimasi. Sepatu bersih tapi aromanya masih ada.",
    service: "Deep Cleaning",
    status: "Dilaporkan",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=80&h=80&q=80",
  },
  {
    name: "Andika Pratama",
    orderId: "ORD-9512",
    rating: 5,
    comment:
      "Mantap! Hasil maksimal dan harga terjangkau. Bakal jadi langganan tetap.",
    service: "Unyellowing",
    status: "Disembunyikan",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80",
  },
];

const reviewsBody = document.querySelector("#reviews-body");
const searchInput = document.querySelector("#review-search");
const serviceFilter = document.querySelector("#service-filter");
const statusTabs = [...document.querySelectorAll(".review-tab")];
const selectPage = document.querySelector("#select-page");
const publishButton = document.querySelector("#publish-selected");
const pagination = document.querySelector("#pagination");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const pageMessage = document.querySelector("#page-message");
const sidebar = document.querySelector("#sidebar");
const menuToggle = document.querySelector("#menu-toggle");
const sidebarScrim = document.querySelector("#sidebar-scrim");
const replyDialog = document.querySelector("#reply-dialog");
const replyForm = document.querySelector("#reply-form");
const replyMessage = document.querySelector("#reply-message");
const replySubmit = document.querySelector("#reply-submit");
const replyCharacterCount = document.querySelector("#reply-character-count");
const replyAvatar = document.querySelector("#reply-avatar");
const replyCustomer = document.querySelector("#reply-customer");
const replyOrder = document.querySelector("#reply-order");
const replyRating = document.querySelector("#reply-rating");
const replyComment = document.querySelector("#reply-comment");
const selectedReviewIds = new Set();
let activeStatus = "all";
let currentPage = 1;
let activeReplyReviewId = null;
let reviews = readReviews();

function createMockReviews() {
  return Array.from({ length: mockTotal }, (_, index) => {
    const template = templates[index % templates.length];
    const duplicateNumber = Math.floor(index / templates.length);
    const date = new Date(Date.UTC(2024, 4, 15 - (index % 90)));
    return {
      id: `review-${index + 1}`,
      name:
        duplicateNumber === 0
          ? template.name
          : `${template.name} ${duplicateNumber + 1}`,
      orderId:
        duplicateNumber === 0
          ? template.orderId
          : `ORD-${String(9000 + index).slice(-4)}`,
      rating: template.rating,
      comment: template.comment,
      service: template.service,
      status: template.status,
      avatar: template.avatar,
      postedAt: date.toISOString(),
    };
  });
}

function isValidReview(review) {
  return (
    review &&
    typeof review.id === "string" &&
    typeof review.name === "string" &&
    typeof review.orderId === "string" &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    typeof review.comment === "string" &&
    typeof review.service === "string" &&
    ["Dipublikasikan", "Menunggu", "Dilaporkan", "Disembunyikan"].includes(
      review.status,
    ) &&
    typeof review.avatar === "string" &&
    typeof review.postedAt === "string" &&
    (review.ownerReply === undefined ||
      (typeof review.ownerReply === "string" && review.ownerReply.length <= 500))
  );
}

function readReviews() {
  try {
    const savedReviews = localStorage.getItem(storageKey);
    if (!savedReviews) return createMockReviews();

    const parsedReviews = JSON.parse(savedReviews);
    if (!Array.isArray(parsedReviews) || !parsedReviews.every(isValidReview)) {
      throw new TypeError("Data ulasan tersimpan memiliki format yang tidak valid.");
    }

    return parsedReviews;
  } catch (error) {
    console.error("Tidak dapat membaca data ulasan:", error);
    pageMessage.textContent =
      "Data ulasan tersimpan tidak dapat dibaca. Menampilkan data demo.";
    return createMockReviews();
  }
}

function saveReviews() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(reviews));
    return true;
  } catch (error) {
    console.error("Tidak dapat menyimpan data ulasan:", error);
    pageMessage.textContent =
      "Perubahan moderasi gagal disimpan di browser ini.";
    return false;
  }
}

function getFilteredReviews() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  return reviews.filter((review) => {
    const matchesStatus = activeStatus === "all" || review.status === activeStatus;
    const matchesService =
      serviceFilter.value === "all" || review.service === serviceFilter.value;
    const matchesSearch = `${review.name} ${review.orderId}`
      .toLocaleLowerCase("id")
      .includes(query);
    return matchesStatus && matchesService && matchesSearch;
  });
}

function createCell(className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  return cell;
}

function createReviewRow(review) {
  const row = document.createElement("tr");
  row.dataset.reviewId = review.id;

  const checkCell = createCell("check-cell");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "review-checkbox";
  checkbox.checked = selectedReviewIds.has(review.id);
  checkbox.setAttribute("aria-label", `Pilih ulasan dari ${review.name}`);
  checkCell.append(checkbox);

  const customerCell = createCell();
  const customer = document.createElement("div");
  customer.className = "customer-cell";
  const avatar = document.createElement("img");
  avatar.className = "customer-avatar";
  avatar.src = review.avatar;
  avatar.alt = "";
  avatar.loading = "lazy";
  const customerCopy = document.createElement("div");
  customerCopy.className = "customer-copy";
  const customerName = document.createElement("strong");
  customerName.textContent = review.name;
  const orderId = document.createElement("span");
  orderId.textContent = review.orderId;
  customerCopy.append(customerName, orderId);
  customer.append(avatar, customerCopy);
  customerCell.append(customer);

  const commentCell = createCell("comment-cell");
  const stars = document.createElement("span");
  stars.className = "rating-stars";
  stars.setAttribute("aria-label", `Rating ${review.rating} dari 5`);
  for (let index = 1; index <= 5; index += 1) {
    const star = document.createElement("span");
    star.className = index <= review.rating ? "is-filled" : "";
    star.textContent = "★";
    stars.append(star);
  }
  const comment = document.createElement("span");
  comment.className = "review-comment";
  comment.textContent = `“${review.comment}”`;
  commentCell.append(stars, comment);
  if (review.ownerReply) {
    const savedReply = document.createElement("span");
    savedReply.className = "saved-reply";
    savedReply.textContent = `Balasan Anda: ${review.ownerReply}`;
    commentCell.append(savedReply);
  }

  const serviceCell = createCell();
  const serviceBadge = document.createElement("span");
  serviceBadge.className = "service-badge";
  serviceBadge.textContent = review.service;
  serviceCell.append(serviceBadge);

  const dateCell = createCell("date-cell");
  const date = new Date(review.postedAt);
  const dateText = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  dateCell.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 3v6m8-6v6M4 11h16"/></svg>';
  dateCell.append(document.createElement("br"), document.createTextNode(dateText));

  const statusCell = createCell();
  const status = document.createElement("span");
  status.className = `review-status review-status--${statusClass(review.status)}`;
  status.textContent = review.status;
  statusCell.append(status);

  const actionsCell = createCell("actions-cell");
  const details = document.createElement("details");
  details.className = "action-menu";
  const summary = document.createElement("summary");
  summary.setAttribute("aria-label", `Aksi untuk ulasan ${review.name}`);
  summary.textContent = "⋮";
  const options = document.createElement("div");
  options.className = "action-options";
  [
    {
      action: "reply",
      label: review.ownerReply ? "Edit balasan" : "Balas ulasan",
    },
    { status: "Dipublikasikan", label: "Publikasikan" },
    { status: "Menunggu", label: "Tandai menunggu" },
    { status: "Disembunyikan", label: "Sembunyikan" },
    { status: "Dilaporkan", label: "Tandai dilaporkan" },
  ].forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    if (action.action) button.dataset.action = action.action;
    if (action.status) button.dataset.status = action.status;
    button.textContent = action.label;
    options.append(button);
  });
  details.append(summary, options);
  actionsCell.append(details);

  row.append(
    checkCell,
    customerCell,
    commentCell,
    serviceCell,
    dateCell,
    statusCell,
    actionsCell,
  );
  return row;
}

function statusClass(status) {
  if (status === "Dipublikasikan") return "published";
  if (status === "Menunggu") return "waiting";
  if (status === "Dilaporkan") return "reported";
  return "hidden";
}

function makePageButton(label, page, { active = false, disabled = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `page-button${active ? " is-active" : ""}`;
  button.textContent = label;
  button.disabled = disabled;
  if (active) button.setAttribute("aria-current", "page");
  button.addEventListener("click", () => {
    if (page === currentPage || disabled) return;
    currentPage = page;
    renderReviews();
  });
  return button;
}

function renderPagination(totalPages) {
  pagination.replaceChildren();
  pagination.append(
    makePageButton("Sebelumnya", Math.max(1, currentPage - 1), {
      disabled: currentPage === 1,
    }),
  );

  let pageNumbers;
  if (totalPages <= 5) {
    pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  } else if (currentPage <= 3) {
    pageNumbers = [1, 2, 3, 4, 5, "ellipsis", totalPages];
  } else if (currentPage >= totalPages - 2) {
    pageNumbers = [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  } else {
    pageNumbers = [
      1,
      "ellipsis",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis",
      totalPages,
    ];
  }

  pageNumbers.forEach((page) => {
    if (page === "ellipsis") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "page-ellipsis";
      ellipsis.textContent = "…";
      pagination.append(ellipsis);
    } else {
      pagination.append(
        makePageButton(String(page), page, { active: page === currentPage }),
      );
    }
  });

  pagination.append(
    makePageButton("Berikutnya ›", Math.min(totalPages, currentPage + 1), {
      disabled: currentPage === totalPages,
    }),
  );
}

function renderReviews() {
  const filteredReviews = getFilteredReviews();
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageReviews = filteredReviews.slice(start, start + pageSize);

  reviewsBody.replaceChildren(
    ...pageReviews.map((review) => createReviewRow(review)),
  );
  reviewsBody.querySelectorAll(".action-menu").forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      reviewsBody.querySelectorAll(".action-menu[open]").forEach((openMenu) => {
        if (openMenu !== menu) openMenu.open = false;
      });
    });
  });
  emptyState.hidden = filteredReviews.length > 0;
  const firstItem = filteredReviews.length > 0 ? start + 1 : 0;
  const lastItem = Math.min(start + pageSize, filteredReviews.length);
  resultsCount.textContent = `Menampilkan ${firstItem}–${lastItem} dari ${filteredReviews.length.toLocaleString("id-ID")} ulasan demo`;
  selectPage.checked =
    pageReviews.length > 0 &&
    pageReviews.every((review) => selectedReviewIds.has(review.id));
  selectPage.indeterminate =
    pageReviews.some((review) => selectedReviewIds.has(review.id)) &&
    !selectPage.checked;
  publishButton.disabled = selectedReviewIds.size === 0;
  publishButton.textContent =
    selectedReviewIds.size > 0
      ? `Publikasi Massal (${selectedReviewIds.size})`
      : "Publikasi Massal";
  renderPagination(totalPages);
}

function setReviewStatus(reviewIds, status) {
  const selectedIds = new Set(reviewIds);
  reviews = reviews.map((review) =>
    selectedIds.has(review.id) ? { ...review, status } : review,
  );
  if (!saveReviews()) return false;
  selectedIds.forEach((id) => selectedReviewIds.delete(id));
  renderReviews();
  return true;
}

function updateReplyCharacterCount() {
  const length = replyMessage.value.length;
  replyCharacterCount.textContent = `${length}/500`;
  replySubmit.disabled = replyMessage.value.trim().length === 0;
}

function openReplyDialog(review) {
  activeReplyReviewId = review.id;
  replyAvatar.src = review.avatar;
  replyCustomer.textContent = review.name;
  replyOrder.textContent = review.orderId;
  replyRating.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)} · ${review.rating}/5`;
  replyComment.textContent = `“${review.comment}”`;
  replyMessage.value = review.ownerReply || "";
  updateReplyCharacterCount();
  replyDialog.showModal();
  replyMessage.focus();
}

function closeReplyDialog() {
  if (replyDialog.open) replyDialog.close();
}

statusTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeStatus = tab.dataset.status;
    currentPage = 1;
    selectedReviewIds.clear();
    statusTabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });
    pageMessage.textContent = "";
    renderReviews();
  });
});

searchInput.addEventListener("input", () => {
  currentPage = 1;
  selectedReviewIds.clear();
  renderReviews();
});

serviceFilter.addEventListener("change", () => {
  currentPage = 1;
  selectedReviewIds.clear();
  renderReviews();
});

document.querySelector("#reset-filters").addEventListener("click", () => {
  searchInput.value = "";
  serviceFilter.value = "all";
  activeStatus = "all";
  currentPage = 1;
  selectedReviewIds.clear();
  statusTabs.forEach((tab, index) => {
    const isActive = index === 0;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  pageMessage.textContent = "";
  renderReviews();
});

selectPage.addEventListener("change", () => {
  const filteredReviews = getFilteredReviews();
  const start = (currentPage - 1) * pageSize;
  const pageReviews = filteredReviews.slice(start, start + pageSize);
  pageReviews.forEach((review) => {
    if (selectPage.checked) selectedReviewIds.add(review.id);
    else selectedReviewIds.delete(review.id);
  });
  renderReviews();
});

reviewsBody.addEventListener("change", (event) => {
  if (!event.target.matches(".review-checkbox")) return;
  const reviewId = event.target.closest("tr").dataset.reviewId;
  if (event.target.checked) selectedReviewIds.add(reviewId);
  else selectedReviewIds.delete(reviewId);
  renderReviews();
});

reviewsBody.addEventListener("click", (event) => {
  const actionButton = event.target.closest(".action-options button");
  if (!actionButton) return;
  const row = actionButton.closest("tr");
  const reviewId = row?.dataset.reviewId;
  const review = reviews.find((item) => item.id === reviewId);
  if (!review) return;

  if (actionButton.dataset.action === "reply") {
    openReplyDialog(review);
    return;
  }

  if (setReviewStatus([reviewId], actionButton.dataset.status)) {
    pageMessage.textContent = `Ulasan ${review.orderId} ditandai sebagai ${actionButton.dataset.status.toLowerCase()}.`;
  }
});

replyMessage.addEventListener("input", updateReplyCharacterCount);
document.querySelector("#reply-close").addEventListener("click", closeReplyDialog);
document.querySelector("#reply-cancel").addEventListener("click", closeReplyDialog);
replyDialog.addEventListener("click", (event) => {
  if (event.target === replyDialog) closeReplyDialog();
});
replyDialog.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  closeReplyDialog();
});
replyDialog.addEventListener("close", () => {
  if (!activeReplyReviewId) return;
  const activeRow = [...reviewsBody.querySelectorAll("tr")].find(
    (row) => row.dataset.reviewId === activeReplyReviewId,
  );
  activeRow?.querySelector('[data-action="reply"]')?.focus();
});
replyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const reply = replyMessage.value.trim();
  if (!reply || !activeReplyReviewId) return;

  const review = reviews.find((item) => item.id === activeReplyReviewId);
  if (!review) return;
  const previousReviews = reviews;
  reviews = reviews.map((item) =>
    item.id === activeReplyReviewId ? { ...item, ownerReply: reply } : item,
  );
  if (!saveReviews()) {
    reviews = previousReviews;
    return;
  }

  const customerName = review.name;
  const repliedReviewId = activeReplyReviewId;
  activeReplyReviewId = null;
  closeReplyDialog();
  renderReviews();
  const repliedRow = [...reviewsBody.querySelectorAll("tr")].find(
    (row) => row.dataset.reviewId === repliedReviewId,
  );
  repliedRow?.querySelector('[data-action="reply"]')?.focus();
  pageMessage.textContent = `Balasan untuk ${customerName} berhasil disimpan.`;
});

publishButton.addEventListener("click", () => {
  if (selectedReviewIds.size === 0) return;
  const count = selectedReviewIds.size;
  if (setReviewStatus([...selectedReviewIds], "Dipublikasikan")) {
    pageMessage.textContent = `${count} ulasan berhasil dipublikasikan.`;
  }
});

function setSidebarOpen(isOpen) {
  sidebar.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Tutup navigasi" : "Buka navigasi",
  );
  sidebarScrim.hidden = !isOpen;
}

menuToggle.addEventListener("click", () => {
  setSidebarOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

sidebarScrim.addEventListener("click", () => setSidebarOpen(false));

renderReviews();

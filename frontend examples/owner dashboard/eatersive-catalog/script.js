const storageKey = "eatersive-owner-catalog";
const servicesBody = document.querySelector("#services-body");
const searchInput = document.querySelector("#service-search");
const categoryFilter = document.querySelector("#category-filter");
const sortSelect = document.querySelector("#sort-services");
const emptyState = document.querySelector("#empty-state");
const resultsCount = document.querySelector("#results-count");
const pageMessage = document.querySelector("#page-message");
const dialog = document.querySelector("#service-dialog");
const serviceForm = document.querySelector("#service-form");
const dialogMessage = document.querySelector("#dialog-message");
const photoInput = document.querySelector("#service-photo");
const photoDropzone = document.querySelector("#photo-dropzone");
const photoPreview = document.querySelector("#photo-preview");
const photoPlaceholder = document.querySelector("#photo-placeholder");
const removePhotoButton = document.querySelector("#remove-photo");
const saveServiceButton = document.querySelector("#save-service");
const orderNumberFormat = new Intl.NumberFormat("id-ID");
const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const defaultServices = [
  {
    id: "srv-basic",
    name: "Basic",
    description: "Jasa cuci luar dan dalam",
    category: "Cleaning",
    price: 65000,
    estimate: "2–3 Hari",
    active: true,
    image:
      "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=120&h=120&q=80",
    sequence: 5,
  },
  {
    id: "srv-hard",
    name: "Hard",
    description: "Untuk sepatu yang susah dibersihkan",
    category: "Unyellowing",
    price: 85000,
    estimate: "4–5 Hari",
    active: true,
    image:
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=120&h=120&q=80",
    sequence: 4,
  },
  {
    id: "srv-suede",
    name: "Suede / Nubuck",
    description: "Perbaikan sol sepatu yang lepas",
    category: "Repair",
    price: 120000,
    estimate: "7 Hari",
    active: true,
    image:
      "https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=120&h=120&q=80",
    sequence: 3,
  },
  {
    id: "srv-helm",
    name: "Helm / Bag",
    description: "Pembersihan instan bagian luar",
    category: "Cleaning",
    price: 35000,
    estimate: "30 Menit",
    active: true,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=120&h=120&q=80",
    sequence: 2,
  },
  {
    id: "srv-hat",
    name: "Hat / Cap",
    description: "Perawatan topi dan cap",
    category: "Treatment",
    price: 45000,
    estimate: "2 Hari",
    active: false,
    image:
      "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=120&h=120&q=80",
    sequence: 1,
  },
];

const sidebar = document.querySelector("#sidebar");
const menuToggle = document.querySelector("#menu-toggle");
const sidebarScrim = document.querySelector("#sidebar-scrim");
let services = readServices();
let sequence = Math.max(...services.map((service) => service.sequence), 0);
let selectedPhoto = "";
let photoReadSequence = 0;

function isValidService(service) {
  return (
    service &&
    typeof service.id === "string" &&
    typeof service.name === "string" &&
    typeof service.description === "string" &&
    typeof service.category === "string" &&
    typeof service.estimate === "string" &&
    typeof service.active === "boolean" &&
    typeof service.image === "string" &&
    Number.isFinite(service.price) &&
    Number.isFinite(service.sequence)
  );
}

function readServices() {
  try {
    const rawServices = localStorage.getItem(storageKey);
    if (!rawServices) return structuredClone(defaultServices);

    const parsedServices = JSON.parse(rawServices);
    if (!Array.isArray(parsedServices) || !parsedServices.every(isValidService)) {
      throw new TypeError("Data katalog tersimpan memiliki format yang tidak valid.");
    }

    return parsedServices;
  } catch (error) {
    console.error("Tidak dapat membaca data katalog:", error);
    pageMessage.textContent =
      "Data katalog tersimpan tidak dapat dibaca. Menampilkan katalog demo.";
    return structuredClone(defaultServices);
  }
}

function saveServices() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(services));
    return true;
  } catch (error) {
    console.error("Tidak dapat menyimpan data katalog:", error);
    pageMessage.textContent =
      "Perubahan tidak dapat disimpan di browser ini. Periksa ruang penyimpanan.";
    return false;
  }
}

function createCell(className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  return cell;
}

function createServiceRow(service, index) {
  const row = document.createElement("tr");
  row.dataset.serviceId = service.id;

  const numberCell = createCell("number-cell row-number");
  numberCell.textContent = String(index + 1).padStart(2, "0");

  const serviceCell = createCell();
  const serviceInfo = document.createElement("div");
  serviceInfo.className = "service-cell";
  const image = document.createElement("img");
  image.src = service.image;
  image.alt = "";
  image.loading = "lazy";
  const copy = document.createElement("div");
  copy.className = "service-copy";
  const name = document.createElement("strong");
  name.textContent = service.name;
  const description = document.createElement("span");
  description.textContent = service.description;
  copy.append(name, description);
  serviceInfo.append(image, copy);
  serviceCell.append(serviceInfo);

  const categoryCell = createCell();
  const category = document.createElement("span");
  category.className = "category-badge";
  category.textContent = service.category;
  categoryCell.append(category);

  const priceCell = createCell("price-cell");
  const price = document.createElement("span");
  price.className = "price-value";
  price.textContent = currency.format(service.price);
  priceCell.append(price);

  const estimateCell = createCell();
  const estimate = document.createElement("span");
  estimate.className = "estimate";
  estimate.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>';
  const estimateText = document.createElement("span");
  estimateText.textContent = service.estimate;
  estimate.append(estimateText);
  estimateCell.append(estimate);

  const statusCell = createCell();
  const status = document.createElement("span");
  status.className = `status ${service.active ? "status--active" : "status--inactive"}`;
  status.textContent = service.active ? "Aktif" : "Nonaktif";
  statusCell.append(status);

  const actionsCell = createCell("actions-cell");
  const actionMenu = document.createElement("details");
  actionMenu.className = "action-menu";
  const summary = document.createElement("summary");
  summary.setAttribute("aria-label", `Aksi untuk ${service.name}`);
  summary.textContent = "⋮";
  const options = document.createElement("div");
  options.className = "action-options";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.textContent = "Edit layanan";
  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.dataset.action = "toggle";
  toggleButton.textContent = service.active ? "Nonaktifkan" : "Aktifkan";
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "Hapus layanan";
  options.append(editButton, toggleButton, deleteButton);
  actionMenu.append(summary, options);
  actionsCell.append(actionMenu);

  row.append(
    numberCell,
    serviceCell,
    categoryCell,
    priceCell,
    estimateCell,
    statusCell,
    actionsCell,
  );
  return row;
}

function getVisibleServices() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  const category = categoryFilter.value;

  return services
    .filter((service) => {
      const matchesQuery =
        `${service.name} ${service.description} ${service.category}`
          .toLocaleLowerCase("id")
          .includes(query);
      return matchesQuery && (category === "all" || service.category === category);
    })
    .sort((first, second) => {
      switch (sortSelect.value) {
        case "oldest":
          return first.sequence - second.sequence;
        case "name":
          return first.name.localeCompare(second.name, "id");
        case "price-low":
          return first.price - second.price;
        case "price-high":
          return second.price - first.price;
        default:
          return second.sequence - first.sequence;
      }
    });
}

function renderServices() {
  const visibleServices = getVisibleServices();
  servicesBody.replaceChildren(
    ...visibleServices.map((service, index) => createServiceRow(service, index)),
  );
  emptyState.hidden = visibleServices.length > 0;
  resultsCount.textContent = `Menampilkan ${orderNumberFormat.format(visibleServices.length)} dari ${orderNumberFormat.format(services.length)} layanan`;

  document.querySelector("#total-count").textContent =
    orderNumberFormat.format(services.length);
  document.querySelector("#active-count").textContent = orderNumberFormat.format(
    services.filter((service) => service.active).length,
  );
  document.querySelector("#update-count").textContent = orderNumberFormat.format(
    services.filter((service) => !service.active).length,
  );
}

function closeActionMenus() {
  servicesBody.querySelectorAll(".action-menu[open]").forEach((menu) => {
    menu.open = false;
  });
}

function openServiceDialog(service) {
  photoReadSequence += 1;
  serviceForm.reset();
  selectedPhoto = service?.image ?? "";
  photoInput.value = "";
  updatePhotoPreview();
  document.querySelector("#service-id").value = service?.id ?? "";
  document.querySelector("#service-name").value = service?.name ?? "";
  document.querySelector("#service-description").value =
    service?.description ?? "";
  document.querySelector("#service-category").value =
    service?.category ?? "Cleaning";
  document.querySelector("#service-price").value = service?.price ?? "";
  document.querySelector("#service-estimate").value = service?.estimate ?? "";
  document.querySelector("#service-active").value = String(service?.active ?? true);
  document.querySelector("#dialog-title").textContent = service
    ? "Edit Layanan"
    : "Tambah Layanan Baru";
  dialogMessage.textContent = "";
  dialog.showModal();
  document.querySelector("#service-name").focus();
}

function closeServiceDialog() {
  photoReadSequence += 1;
  dialog.close();
}

document.querySelector("#add-service").addEventListener("click", () => {
  openServiceDialog(null);
});

document.querySelector("#dialog-close").addEventListener("click", closeServiceDialog);
document.querySelector("#cancel-dialog").addEventListener("click", closeServiceDialog);

function updatePhotoPreview() {
  const hasPhoto = Boolean(selectedPhoto);
  photoPreview.hidden = !hasPhoto;
  photoPlaceholder.hidden = hasPhoto;
  removePhotoButton.hidden = !hasPhoto;
  if (hasPhoto) photoPreview.src = selectedPhoto;
  else photoPreview.removeAttribute("src");
}

function showPhotoError(message) {
  dialogMessage.textContent = message;
  dialogMessage.classList.add("is-error");
}

function readPhoto(file) {
  if (!file) return;
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    showPhotoError("Format foto harus JPG atau PNG.");
    photoInput.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showPhotoError("Ukuran foto maksimal 5MB.");
    photoInput.value = "";
    return;
  }

  const readSequence = ++photoReadSequence;
  const reader = new FileReader();
  dialogMessage.classList.remove("is-error");
  dialogMessage.textContent = "";
  reader.addEventListener("load", () => {
    if (readSequence !== photoReadSequence) return;
    if (typeof reader.result !== "string") {
      showPhotoError("Foto tidak dapat dibaca. Silakan coba file lain.");
      return;
    }

    const image = new Image();
    image.addEventListener("load", () => {
      if (readSequence !== photoReadSequence) return;

      const maxDimension = 1400;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        showPhotoError("Foto tidak dapat diproses di browser ini.");
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      selectedPhoto = canvas.toDataURL("image/jpeg", 0.82);
      updatePhotoPreview();
    });
    image.addEventListener("error", () => {
      if (readSequence === photoReadSequence) {
        showPhotoError("Foto tidak dapat diproses. Silakan pilih file lain.");
      }
    });
    image.src = reader.result;
  });
  reader.addEventListener("error", () => {
    if (readSequence === photoReadSequence) {
      showPhotoError("Foto tidak dapat dibaca. Silakan coba file lain.");
    }
  });
  reader.readAsDataURL(file);
  photoInput.value = "";
}

photoDropzone.addEventListener("click", () => photoInput.click());
photoInput.addEventListener("change", () => readPhoto(photoInput.files[0]));

removePhotoButton.addEventListener("click", () => {
  photoReadSequence += 1;
  selectedPhoto = "";
  photoInput.value = "";
  updatePhotoPreview();
  dialogMessage.textContent = "";
});

photoDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  photoDropzone.classList.add("is-dragging");
});

photoDropzone.addEventListener("dragleave", (event) => {
  if (!photoDropzone.contains(event.relatedTarget)) {
    photoDropzone.classList.remove("is-dragging");
  }
});

photoDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  photoDropzone.classList.remove("is-dragging");
  readPhoto(event.dataTransfer.files[0]);
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeServiceDialog();
});

serviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!serviceForm.reportValidity()) return;

  saveServiceButton.disabled = true;
  dialogMessage.classList.remove("is-error");
  dialogMessage.textContent = "";
  const serviceId = document.querySelector("#service-id").value;
  const existingService = services.find((service) => service.id === serviceId);
  const service = {
    id:
      existingService?.id ??
      `srv-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`,
    name: document.querySelector("#service-name").value.trim(),
    description: document.querySelector("#service-description").value.trim(),
    category: document.querySelector("#service-category").value,
    price: Number(document.querySelector("#service-price").value),
    estimate: document.querySelector("#service-estimate").value.trim(),
    active: document.querySelector("#service-active").value === "true",
    image: selectedPhoto,
    sequence: existingService?.sequence ?? ++sequence,
  };

  const updatedServices = existingService
    ? services.map((item) =>
        item.id === existingService.id ? service : item,
      )
    : [...services, service];

  try {
    localStorage.setItem(storageKey, JSON.stringify(updatedServices));
  } catch (error) {
    console.error("Tidak dapat menyimpan data katalog:", error);
    dialogMessage.classList.add("is-error");
    dialogMessage.textContent =
      "Layanan gagal disimpan. Kurangi ukuran foto atau periksa ruang penyimpanan.";
    saveServiceButton.disabled = false;
    return;
  }

  services = updatedServices;
  renderServices();
  closeServiceDialog();
  pageMessage.textContent = existingService
    ? "Layanan berhasil diperbarui."
    : "Layanan berhasil ditambahkan.";
  saveServiceButton.disabled = false;
});

servicesBody.addEventListener("click", (event) => {
  const actionButton = event.target.closest("button[data-action]");
  if (!actionButton) return;

  const row = actionButton.closest("tr");
  const service = services.find((item) => item.id === row?.dataset.serviceId);
  if (!service) return;

  if (actionButton.dataset.action === "edit") {
    closeActionMenus();
    openServiceDialog(service);
    return;
  }

  if (actionButton.dataset.action === "toggle") {
    services = services.map((item) =>
      item.id === service.id ? { ...item, active: !item.active } : item,
    );
    if (!saveServices()) return;
    renderServices();
    pageMessage.textContent = `Layanan ${service.name} berhasil ${service.active ? "dinonaktifkan" : "diaktifkan"}.`;
    return;
  }

  if (actionButton.dataset.action === "delete") {
    if (!window.confirm(`Hapus layanan "${service.name}" dari katalog?`)) return;
    services = services.filter((item) => item.id !== service.id);
    if (!saveServices()) return;
    renderServices();
    pageMessage.textContent = `Layanan ${service.name} berhasil dihapus.`;
  }
});

servicesBody.addEventListener("toggle", (event) => {
  if (event.target.matches(".action-menu") && event.target.open) {
    servicesBody.querySelectorAll(".action-menu[open]").forEach((menu) => {
      if (menu !== event.target) menu.open = false;
    });
  }
});

searchInput.addEventListener("input", renderServices);
categoryFilter.addEventListener("change", renderServices);
sortSelect.addEventListener("change", renderServices);

document.querySelector("#reset-filters").addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "all";
  sortSelect.value = "newest";
  pageMessage.textContent = "";
  renderServices();
  searchInput.focus();
});

function setSidebarOpen(isOpen) {
  sidebar.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Tutup navigasi" : "Buka navigasi");
  sidebarScrim.hidden = !isOpen;
}

menuToggle.addEventListener("click", () => {
  setSidebarOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

sidebarScrim.addEventListener("click", () => setSidebarOpen(false));

renderServices();

const orders = {
  "ORD-6758892": {
    customer: "Rio Amamiya",
    phone: "+62 812-3456-7890",
    address: "Jl. Diponegoro No. 18, Surabaya, 60241",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
    service: "Basic",
    product: "Nike Air Force 1",
    icon: "👟",
    size: "41",
    color: "White / Orange",
    condition: "Debu ringan pada upper, outsole sedikit kusam.",
    paymentService: "Layanan: Basic Cleaning",
    servicePrice: 65000,
    deliveryPrice: 20000,
    createdAt: "2026-09-24T09:30:00",
    status: "Selesai",
    note: "Sepatu selesai dibersihkan dan siap diambil.",
  },
  "ORD-9821039": {
    customer: "Jeong Jaehyun",
    phone: "+62 812-9988-7766",
    address: "Jl. Kemang Timur No. 12, Jakarta Selatan, 12730",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80",
    service: "Hard",
    product: "Air Jordan 1 Retro High",
    icon: "👟",
    size: "42",
    color: "White / University Blue",
    condition: "Kotor berat, outsole menguning.",
    paymentService: "Layanan: Deep Cleaning + Unyellowing",
    servicePrice: 165000,
    deliveryPrice: 20000,
    createdAt: "2026-09-24T09:30:00",
    status: "Sedang Dikerjakan",
    note: "Tahap 1: Deep cleaning bagian upper.",
  },
  "ORD-3548992": {
    customer: "Arianto Samsul",
    phone: "+62 813-5566-2211",
    address: "Jl. Cempaka No. 7, Bandung, 40123",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&h=100&q=80",
    service: "Suede / Nubuck",
    product: "New Balance 574 Suede",
    icon: "👟",
    size: "43",
    color: "Grey / Navy",
    condition: "Noda pada material suede dan debu di bagian midsole.",
    paymentService: "Layanan: Suede / Nubuck Treatment",
    servicePrice: 95000,
    deliveryPrice: 20000,
    createdAt: "2026-09-25T11:10:00",
    status: "Sedang Dikerjakan",
    note: "Material suede sedang menjalani pembersihan khusus.",
  },
  "ORD-2675492": {
    customer: "Hades Alejandro",
    phone: "+62 812-7766-5544",
    address: "Jl. Pahlawan No. 22, Semarang, 50241",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80",
    service: "Helm & Bag",
    product: "Helm full-face & sling bag",
    icon: "🪖",
    size: "L",
    color: "Black",
    condition: "Helm dan tas perlu dibersihkan pada bagian dalam.",
    paymentService: "Layanan: Helm & Bag Cleaning",
    servicePrice: 80000,
    deliveryPrice: 15000,
    createdAt: "2026-09-26T14:20:00",
    status: "Pengecekan",
    note: "Barang diterima dan sedang diperiksa kondisinya.",
  },
  "ORD-5437895": {
    customer: "Jamalludin Mansyur",
    phone: "+62 857-3344-9900",
    address: "Jl. Merdeka No. 5, Yogyakarta, 55231",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
    service: "Hat/Cap",
    product: "New Era 9FORTY Cap",
    icon: "🧢",
    size: "All size",
    color: "Black / White",
    condition: "Noda keringat ringan di bagian dalam topi.",
    paymentService: "Layanan: Hat / Cap Treatment",
    servicePrice: 45000,
    deliveryPrice: 20000,
    createdAt: "2026-09-27T08:45:00",
    status: "Selesai",
    note: "Treatment selesai, topi sudah dikemas untuk pengantaran.",
  },
};

const requestedOrderId = new URLSearchParams(window.location.search).get("id");
const order = orders[requestedOrderId] ?? orders["ORD-9821039"];
const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const phoneDigits = order.phone.replace(/\D/g, "");
const createdDate = new Date(order.createdAt);

function formatCreatedDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(",", "");
}

document.querySelector("#order-number").textContent =
  orders[requestedOrderId] ? requestedOrderId : "ORD-9821039";
document.querySelector("#order-created").textContent =
  formatCreatedDate(createdDate);
document.querySelector("#customer-avatar").src = order.avatar;
document.querySelector("#customer-name").textContent = order.customer;
document.querySelector("#customer-phone").textContent = order.phone;
document.querySelector("#customer-phone").href = `tel:${phoneDigits}`;
document.querySelector("#customer-address").textContent = order.address;
document.querySelector("#contact-customer").href = `https://wa.me/${phoneDigits}`;
document.querySelector("#service-name").textContent = order.service;
document.querySelector("#product-name").textContent = order.product;
document.querySelector("#service-image").textContent = order.icon;
document.querySelector("#shoe-size").textContent = order.size;
document.querySelector("#shoe-color").textContent = order.color;
document.querySelector("#initial-condition").textContent = order.condition;
document.querySelector("#payment-service").textContent = order.paymentService;
document.querySelector("#service-price").textContent = currency.format(
  order.servicePrice,
);
document.querySelector("#delivery-price").textContent = currency.format(
  order.deliveryPrice,
);
document.querySelector("#total-price").textContent = currency.format(
  order.servicePrice + order.deliveryPrice,
);
document.querySelector("#current-stage").textContent = order.status;
document.querySelector("#current-note").textContent = order.note;

const updateForm = document.querySelector("#update-form");
const statusSelect = document.querySelector("#status-select");
const noteInput = document.querySelector("#work-note");
const formMessage = document.querySelector("#form-message");
const photoInput = document.querySelector("#photo-input");
const addPhotoButton = document.querySelector("#add-photo");
const photoTargets = [...document.querySelectorAll(".photo-upload")];
const sidebar = document.querySelector("#sidebar");
const menuToggle = document.querySelector("#menu-toggle");
const sidebarScrim = document.querySelector("#sidebar-scrim");
const orderNumber = document.querySelector("#order-number").textContent;
const storageKey = `eatersive-order-progress-${orderNumber}`;
const pendingPhotos = { before: null, after: null };
let nextPhotoTarget = "before";

function setMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-error", isError);
}

function readProgress() {
  try {
    const rawProgress = localStorage.getItem(storageKey);
    if (!rawProgress) return null;

    const progress = JSON.parse(rawProgress);
    if (
      !progress ||
      typeof progress.status !== "string" ||
      typeof progress.note !== "string" ||
      typeof progress.updatedAt !== "string"
    ) {
      return null;
    }

    return progress;
  } catch (error) {
    console.error("Tidak dapat membaca progres pesanan:", error);
    setMessage("Progres tersimpan tidak dapat dibaca.", true);
    return null;
  }
}

function renderProgress(progress) {
  if (!progress) return;

  statusSelect.value = progress.status;
  noteInput.value = progress.note;
  document.querySelector("#current-stage").textContent = progress.status;
  document.querySelector("#current-note").textContent =
    progress.note || "Status pengerjaan diperbarui.";
  document.querySelector("#current-author").textContent = "Oleh: Admin EaterSive";

  const updatedAt = new Date(progress.updatedAt);
  if (!Number.isNaN(updatedAt.getTime())) {
    const formattedTime = new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(updatedAt)
      .replace(",", "");
    document.querySelector("#current-time").textContent = formattedTime;
  }
}

statusSelect.value = order.status;
renderProgress(readProgress());

function renderPhoto(target, file) {
  if (!file) return;
  const image = document.querySelector(`#${target}-photo`);
  const placeholder = image.nextElementSibling;
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    if (typeof reader.result !== "string") {
      setMessage("Foto tidak dapat ditampilkan.", true);
      return;
    }

    image.src = reader.result;
    image.hidden = false;
    placeholder.hidden = true;
  });
  reader.addEventListener("error", () => {
    setMessage(`Foto ${target === "before" ? "sebelum" : "sesudah"} gagal dibaca.`, true);
  });
  reader.readAsDataURL(file);
}

photoTargets.forEach((button) => {
  button.addEventListener("click", () => {
    nextPhotoTarget = button.dataset.photoTarget === "before-photo" ? "before" : "after";
    photoInput.click();
  });
});

addPhotoButton.addEventListener("click", () => {
  nextPhotoTarget = pendingPhotos.before ? "after" : "before";
  photoInput.click();
});

photoInput.addEventListener("change", () => {
  const files = [...photoInput.files];
  if (files.length === 0) return;

  files.slice(0, 2).forEach((file, index) => {
    const target = files.length > 1 ? (index === 0 ? "before" : "after") : nextPhotoTarget;
    pendingPhotos[target] = file;
    renderPhoto(target, file);
  });
  setMessage("Foto siap dilampirkan saat status disimpan.");
  photoInput.value = "";
});

updateForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const progress = {
    status: statusSelect.value,
    note: noteInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch (error) {
    console.error("Tidak dapat menyimpan progres pesanan:", error);
    setMessage("Perubahan gagal disimpan di browser ini.", true);
    return;
  }

  renderProgress(progress);
  setMessage("Status pesanan berhasil diperbarui.");
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

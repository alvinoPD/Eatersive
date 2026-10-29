const serviceDetails = {
  basic: {
    name: "Basic",
    description: "Jasa cuci luar dan dalam",
    price: 35000,
    image:
      "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=160&q=75",
  },
  hard: {
    name: "Hard",
    description: "Untuk sepatu berlumur yang susah dibersihkan",
    price: 40000,
    image:
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=160&q=75",
  },
  suede: {
    name: "Suede / Nubuck",
    description: "Treatment khusus sepatu suede/nubuck",
    price: 50000,
    image:
      "https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=160&q=75",
  },
  helm: {
    name: "Helm & Bag",
    description: "Perawatan helm dan tas",
    price: 30000,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=160&q=75",
  },
  hat: {
    name: "Hat / Cap",
    description: "Perawatan topi",
    price: 30000,
    image:
      "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=160&q=75",
  },
  kids: {
    name: "Flat Shoes & Kid Shoes",
    description: "Perawatan flat shoes dan sepatu anak",
    price: 25000,
    image:
      "https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=160&q=75",
  },
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const summaryItems = document.querySelector("#summary-items");
const summaryTotal = document.querySelector("#summary-total");
const summaryEmpty = document.querySelector("#summary-empty");
const bookButton = document.querySelector("#book-button");
const addressForm = document.querySelector("#address-form");
const addressMessage = document.querySelector("#address-message");
const bookingMessage = document.querySelector("#booking-message");
const addressStorageKey = "eatersive-checkout-address";
const confirmationStorageKey = "eatersive-confirmation-order";
let addressSaved = false;

function readSelectedItems() {
  const params = new URLSearchParams(window.location.search);
  const rawItems = params.get("items");

  if (!rawItems) return new Map();

  try {
    const parsedItems = JSON.parse(rawItems);
    if (parsedItems === null || typeof parsedItems !== "object" || Array.isArray(parsedItems)) {
      return new Map();
    }

    return new Map(
      Object.entries(parsedItems).filter(
        ([id, quantity]) =>
          Object.hasOwn(serviceDetails, id) &&
          Number.isInteger(quantity) &&
          quantity > 0 &&
          quantity <= 99,
      ),
    );
  } catch {
    return new Map();
  }
}

function renderSummary(items) {
  summaryItems.replaceChildren();
  let total = 0;

  items.forEach((quantity, id) => {
    const service = serviceDetails[id];
    const itemTotal = service.price * quantity;
    total += itemTotal;

    const item = document.createElement("li");
    item.className = "summary-item";

    const image = document.createElement("img");
    image.src = service.image;
    image.alt = "";
    image.loading = "lazy";

    const details = document.createElement("span");
    details.className = "summary-item-info";
    const name = document.createElement("strong");
    name.textContent = quantity > 1 ? `${service.name} × ${quantity}` : service.name;
    const description = document.createElement("small");
    description.textContent = service.description;
    details.append(name, description);

    const price = document.createElement("span");
    price.className = "summary-item-price";
    price.textContent = currency.format(itemTotal);
    item.append(image, details, price);
    summaryItems.append(item);
  });

  summaryEmpty.hidden = items.size > 0;
  summaryTotal.textContent = currency.format(total);
  bookButton.disabled = items.size === 0;
}

function restoreAddress() {
  const savedAddress = localStorage.getItem(addressStorageKey);
  if (!savedAddress) return;

  const address = JSON.parse(savedAddress);
  for (const [name, value] of Object.entries(address)) {
    const input = addressForm.elements.namedItem(name);
    if (input && typeof value === "string") input.value = value;
  }
  addressSaved = true;
  addressMessage.textContent = "Alamat tersimpan di perangkat ini.";
}

addressForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!addressForm.reportValidity()) return;

  const address = Object.fromEntries(new FormData(addressForm));
  addressSaved = true;
  try {
    localStorage.setItem(addressStorageKey, JSON.stringify(address));
    addressMessage.textContent = "Alamat berhasil disimpan di perangkat ini.";
  } catch (error) {
    addressMessage.textContent =
      "Alamat disimpan sementara untuk demo ini, tetapi tidak dapat disimpan di perangkat.";
    console.error("Tidak dapat menyimpan alamat:", error);
  }
  bookingMessage.textContent = "";
});

bookButton.addEventListener("click", () => {
  if (!addressForm.reportValidity()) {
    addressForm.querySelector(":invalid")?.focus();
    bookingMessage.textContent = "Lengkapi dan simpan alamat sebelum melanjutkan.";
    return;
  }

  if (!addressSaved) {
    bookingMessage.textContent = "Simpan alamat terlebih dahulu sebelum membuat booking.";
    return;
  }

  try {
    const address = Object.fromEntries(new FormData(addressForm));
    const items = Object.fromEntries(readSelectedItems());
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    sessionStorage.setItem(
      confirmationStorageKey,
      JSON.stringify({
        orderId,
        createdAt: new Date().toISOString(),
        address,
        items,
        paymentMethod: "QRIS / E-Wallet",
      }),
    );
    window.location.href = "../konfirmasi-pesanan/index.html";
  } catch (error) {
    bookingMessage.textContent =
      "Pesanan tidak dapat disiapkan di browser ini. Coba lagi atau hubungi dukungan.";
    console.error("Tidak dapat menyiapkan data konfirmasi:", error);
  }
});

try {
  restoreAddress();
} catch (error) {
  addressMessage.textContent =
    "Penyimpanan alamat tidak tersedia. Anda tetap dapat mengisi alamat untuk demo ini.";
  console.error("Tidak dapat memuat alamat tersimpan:", error);
}

renderSummary(readSelectedItems());

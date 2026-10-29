const services = {
  basic: { name: "Basic", price: 35000 },
  hard: { name: "Hard", price: 40000 },
  suede: { name: "Suede / Nubuck", price: 50000 },
  helm: { name: "Helm & Bag", price: 30000 },
  hat: { name: "Hat / Cap", price: 30000 },
  kids: { name: "Flat Shoes & Kid Shoes", price: 25000 },
};

const orderStorageKey = "eatersive-confirmation-order";
const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const order = readOrder();

function readOrder() {
  try {
    const rawOrder = sessionStorage.getItem(orderStorageKey);
    if (!rawOrder) return null;

    const parsedOrder = JSON.parse(rawOrder);
    if (!parsedOrder || typeof parsedOrder !== "object") return null;

    const safeItems = Object.fromEntries(
      Object.entries(parsedOrder.items ?? {}).filter(
        ([id, quantity]) =>
          Object.hasOwn(services, id) &&
          Number.isInteger(quantity) &&
          quantity > 0 &&
          quantity <= 99,
      ),
    );
    const address =
      parsedOrder.address && typeof parsedOrder.address === "object"
        ? parsedOrder.address
        : {};

    if (Object.keys(safeItems).length === 0) return null;

    return {
      orderId:
        typeof parsedOrder.orderId === "string" ? parsedOrder.orderId : "ORD-DEMO",
      createdAt:
        typeof parsedOrder.createdAt === "string" &&
        !Number.isNaN(Date.parse(parsedOrder.createdAt))
          ? parsedOrder.createdAt
          : new Date().toISOString(),
      address,
      items: safeItems,
      paymentMethod:
        typeof parsedOrder.paymentMethod === "string"
          ? parsedOrder.paymentMethod
          : "QRIS / E-Wallet",
    };
  } catch (error) {
    console.error("Tidak dapat membaca rincian konfirmasi:", error);
    return null;
  }
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("id-ID", options).format(date).toUpperCase();
}

function renderOrder() {
  const demoNote = document.querySelector("#demo-note");
  const itemsContainer = document.querySelector("#confirmed-items");
  const noItemsMessage = document.querySelector("#no-items-message");
  const estimatedDate = document.querySelector("#estimated-date");

  if (!order) {
    document.querySelector("#confirmation-title").textContent = "Rincian Pesanan Tidak Ditemukan";
    document.querySelector("#confirmation-intro").textContent =
      "Halaman ini belum menerima data pesanan. Silakan pilih layanan dan lanjutkan proses checkout.";
    document.querySelector("#order-status").textContent = "Belum ada pesanan";
    document.querySelector("#order-id").textContent = "—";
    document.querySelector("#order-date").textContent = "—";
    document.querySelector("#pickup-address").textContent = "—";
    document.querySelector("#payment-method").textContent = "—";
    document.querySelector("#confirmed-total").textContent = currency.format(0);
    estimatedDate.textContent = "—";
    itemsContainer.hidden = true;
    noItemsMessage.hidden = false;
    document.querySelector("#track-button").disabled = true;
    document.querySelector("#receipt-button").disabled = true;
    document.querySelector("#share-button").disabled = true;
    return;
  }

  const createdAt = new Date(order.createdAt);
  const completionDate = new Date(createdAt);
  completionDate.setDate(completionDate.getDate() + 3);
  estimatedDate.textContent = formatDate(completionDate, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  document.querySelector("#order-id").textContent = order.orderId;
  document.querySelector("#order-date").textContent = formatDate(createdAt, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }) + " WIB";

  const addressParts = [order.address.address, order.address.recipient]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim());
  document.querySelector("#pickup-address").textContent =
    addressParts.join(" · ") || "Alamat belum diisi";
  document.querySelector("#payment-method").textContent = order.paymentMethod;

  let total = 0;
  for (const [id, quantity] of Object.entries(order.items)) {
    const service = services[id];
    const amount = service.price * quantity;
    total += amount;

    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = `${service.name} ×${quantity}`;
    const price = document.createElement("strong");
    price.textContent = currency.format(amount);
    item.append(name, price);
    itemsContainer.append(item);
  }
  document.querySelector("#confirmed-total").textContent = currency.format(total);
  demoNote.hidden = false;
}

document.querySelector("#track-button").addEventListener("click", () => {
  if (!order) {
    document.querySelector("#tracking-message").textContent =
      "Pilih layanan terlebih dahulu untuk melihat status pesanan.";
    return;
  }

  window.location.href = "../lacak-pesanan/index.html";
});

document.querySelector("#receipt-button").addEventListener("click", () => {
  if (!order) return;
  window.print();
});

document.querySelector("#share-button").addEventListener("click", async () => {
  if (!order) return;

  const shareData = {
    title: "Konfirmasi Pesanan EaterSive",
    text: `Pesanan ${order.orderId} berhasil dibuat.`,
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    if (!navigator.clipboard) {
      throw new Error("Berbagi tautan tidak didukung di browser ini.");
    }

    await navigator.clipboard.writeText(
      `${shareData.text} ${shareData.url}`,
    );
    document.querySelector("#tracking-message").textContent =
      "Tautan konfirmasi berhasil disalin.";
  } catch (error) {
    if (error.name === "AbortError") return;
    document.querySelector("#tracking-message").textContent =
      "Konfirmasi tidak dapat dibagikan. Silakan coba lagi.";
    console.error("Tidak dapat membagikan konfirmasi:", error);
  }
});

renderOrder();

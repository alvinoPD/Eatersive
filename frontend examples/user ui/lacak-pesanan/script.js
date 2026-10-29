const services = {
  basic: {
    name: "Basic",
    description: "Jasa cuci luar dan dalam",
    category: "Cleaning",
    price: 35000,
    image:
      "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=240&q=80",
  },
  hard: {
    name: "Hard",
    description: "Untuk sepatu berlumur yang susah dibersihkan",
    category: "Treatment",
    price: 40000,
    image:
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=240&q=80",
  },
  suede: {
    name: "Suede / Nubuck",
    description: "Treatment khusus sepatu suede/nubuck",
    category: "Repair",
    price: 50000,
    image:
      "https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=240&q=80",
  },
  helm: {
    name: "Helm & Bag",
    description: "Perawatan helm dan tas",
    category: "Cleaning",
    price: 30000,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=240&q=80",
  },
  hat: {
    name: "Hat / Cap",
    description: "Perawatan topi",
    category: "Treatment",
    price: 30000,
    image:
      "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=240&q=80",
  },
  kids: {
    name: "Flat Shoes & Kid Shoes",
    description: "Perawatan flat shoes dan sepatu anak",
    category: "Treatment",
    price: 25000,
    image:
      "https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=240&q=80",
  },
};

const orderStorageKey = "eatersive-confirmation-order";
const reviewStorageKey = "eatersive-order-review";
const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const timelineSteps = [...document.querySelectorAll(".timeline-step")];
const reviewMessage = document.querySelector("#review-message");
let selectedRating = 0;
let previewUrl = null;

function readOrder() {
  try {
    const rawOrder = sessionStorage.getItem(orderStorageKey);
    if (!rawOrder) return null;
    const parsedOrder = JSON.parse(rawOrder);
    if (!parsedOrder || typeof parsedOrder !== "object") return null;

    const items = Object.fromEntries(
      Object.entries(parsedOrder.items ?? {}).filter(
        ([id, quantity]) =>
          Object.hasOwn(services, id) &&
          Number.isInteger(quantity) &&
          quantity > 0 &&
          quantity <= 99,
      ),
    );
    if (Object.keys(items).length === 0) return null;

    const createdAt =
      typeof parsedOrder.createdAt === "string" &&
      !Number.isNaN(Date.parse(parsedOrder.createdAt))
        ? new Date(parsedOrder.createdAt)
        : new Date();

    return {
      orderId:
        typeof parsedOrder.orderId === "string" ? parsedOrder.orderId : "ORD-DEMO",
      createdAt,
      items,
      address:
        parsedOrder.address && typeof parsedOrder.address === "object"
          ? parsedOrder.address
          : {},
    };
  } catch (error) {
    console.error("Tidak dapat membaca data pelacakan pesanan:", error);
    return null;
  }
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("id-ID", options).format(date);
}

function renderTimeline(order) {
  const now = new Date();
  const elapsedMinutes = Math.max(0, (now - order.createdAt) / 60000);
  const currentStage =
    elapsedMinutes >= 2880
      ? 4
      : elapsedMinutes >= 1440
        ? 3
        : elapsedMinutes >= 180
          ? 2
          : elapsedMinutes >= 30
            ? 1
            : 0;
  const stageOffsets = [-2, -1, -0.05, 1, 2];

  timelineSteps.forEach((step, index) => {
    step.classList.toggle("is-complete", index < currentStage);
    step.classList.toggle("is-current", index === currentStage);
    if (index === currentStage) {
      step.setAttribute("aria-current", "step");
    } else {
      step.removeAttribute("aria-current");
    }

    const time = step.querySelector("time");
    const eventDate = new Date(
      order.createdAt.getTime() + stageOffsets[index] * 60 * 60 * 1000,
    );
    time.textContent =
      index < currentStage
        ? formatDate(eventDate, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : index === currentStage
          ? `Update ${formatDate(now, { hour: "2-digit", minute: "2-digit" })}`
          : `Estimasi: ${formatDate(eventDate, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}`;
  });

  document.querySelector(".current-status").textContent =
    currentStage === 0
      ? "Menunggu"
      : currentStage === 1
        ? "Dalam Perjalanan"
        : currentStage === 4
          ? "Selesai"
          : "Sedang Berjalan";
}

function renderOrder(order) {
  if (!order) {
    document.querySelector("#order-id").textContent = "—";
    document.querySelector("#order-date").textContent = "";
    document.querySelector("#timeline").hidden = true;
    document.querySelector("#empty-order").hidden = false;
    document.querySelector("#service-detail-card").hidden = true;
    document.querySelector(".detail-info-grid").hidden = true;
    document.querySelector(".info-alert").hidden = true;
    document.querySelector("#review-form").hidden = true;
    document.querySelector(".review-header p").textContent =
      "Buat pesanan terlebih dahulu untuk memberikan ulasan.";
    return;
  }

  document.querySelector("#order-id").textContent = order.orderId;
  document.querySelector("#order-date").textContent = formatDate(order.createdAt, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  renderTimeline(order);

  const [firstServiceId, firstQuantity] = Object.entries(order.items)[0];
  const service = services[firstServiceId];
  document.querySelector("#service-image").src = service.image;
  document.querySelector("#service-image").alt = service.name;
  document.querySelector("#service-name").textContent =
    firstQuantity > 1 ? `${service.name} × ${firstQuantity}` : service.name;
  document.querySelector("#service-label").textContent = service.category;
  document.querySelector("#service-description").textContent = service.description;
  document.querySelector("#service-price").textContent = currency.format(
    service.price * firstQuantity,
  );

  const addressParts = [order.address.address, order.address.recipient]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());
  document.querySelector("#pickup-address").textContent =
    addressParts.join(" · ") || "Alamat belum diisi";

  const estimatedDate = new Date(order.createdAt);
  estimatedDate.setDate(estimatedDate.getDate() + 3);
  document.querySelector("#estimated-date").textContent =
    `Pesanan Anda diperkirakan selesai pada ${formatDate(estimatedDate, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}.`;
}

document.querySelectorAll(".star-rating button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedRating = Number(button.dataset.rating);
    document.querySelectorAll(".star-rating button").forEach((star) => {
      const isSelected = Number(star.dataset.rating) <= selectedRating;
      star.classList.toggle("is-selected", isSelected);
      star.setAttribute("aria-pressed", String(Number(star.dataset.rating) === selectedRating));
      star.textContent = isSelected ? "★" : "☆";
    });
    reviewMessage.textContent = "";
    reviewMessage.classList.remove("is-error");
  });

  button.addEventListener("mouseenter", () => {
    document.querySelectorAll(".star-rating button").forEach((star) => {
      star.classList.toggle(
        "is-hovered",
        Number(star.dataset.rating) <= Number(button.dataset.rating),
      );
    });
  });
});

document.querySelector(".star-rating").addEventListener("mouseleave", () => {
  document.querySelectorAll(".star-rating button").forEach((star) => {
    star.classList.remove("is-hovered");
  });
});

document.querySelector("#review-photo").addEventListener("change", (event) => {
  const [file] = event.target.files;
  const preview = document.querySelector("#photo-preview");
  const uploadLabel = document.querySelector("#upload-label");

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  preview.hidden = true;

  if (!file) {
    uploadLabel.textContent = "Klik untuk unggah foto sepatu bersih Anda";
    return;
  }

  if (!file.type.startsWith("image/")) {
    event.target.value = "";
    uploadLabel.textContent = "File harus berupa gambar.";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    event.target.value = "";
    uploadLabel.textContent = "Ukuran gambar maksimal 5 MB.";
    return;
  }

  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.hidden = false;
  uploadLabel.textContent = file.name;
});

document.querySelector("#review-form").addEventListener("submit", (event) => {
  event.preventDefault();
  reviewMessage.classList.remove("is-error");

  if (!order) {
    reviewMessage.textContent = "Pesanan belum tersedia untuk diberi ulasan.";
    reviewMessage.classList.add("is-error");
    return;
  }

  if (selectedRating === 0) {
    reviewMessage.textContent = "Pilih rating bintang terlebih dahulu.";
    reviewMessage.classList.add("is-error");
    document.querySelector(".star-rating button").focus();
    return;
  }

  const reviewText = document.querySelector("#review-text").value.trim();
  if (!reviewText) {
    document.querySelector("#review-text").focus();
    return;
  }

  const review = {
    orderId: order.orderId,
    rating: selectedRating,
    text: reviewText,
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(reviewStorageKey, JSON.stringify(review));
    reviewMessage.textContent =
      "Terima kasih! Ulasan Anda tersimpan di perangkat ini untuk demo.";
  } catch (error) {
    reviewMessage.textContent =
      "Ulasan siap, tetapi tidak dapat disimpan di perangkat ini.";
    reviewMessage.classList.add("is-error");
    console.error("Tidak dapat menyimpan ulasan:", error);
  }

  document.querySelector("#review-form .submit-review").disabled = true;
});

renderOrder(order);

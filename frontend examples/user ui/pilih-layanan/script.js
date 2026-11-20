const serviceDetails = {
  basic: { name: "Basic", price: 35000 },
  hard: { name: "Hard", price: 40000 },
  suede: { name: "Suede / Nubuck", price: 50000 },
  helm: { name: "Helm & Bag", price: 30000 },
  hat: { name: "Hat / Cap", price: 30000 },
  kids: { name: "Flat Shoes & Kid Shoes", price: 25000 },
};

const selectedServices = new Map();
const cards = [...document.querySelectorAll(".service-card")];
const filterButtons = [...document.querySelectorAll(".filter-button")];
const searchInput = document.querySelector("#search-input");
const orderItems = document.querySelector("#order-items");
const emptyCart = document.querySelector("#empty-cart");
const orderSubtitle = document.querySelector("#order-subtitle");
const orderTotal = document.querySelector("#order-total");
const totalPrice = document.querySelector("#total-price");
const summaryCount = document.querySelector("#summary-count");
const cartCount = document.querySelector("#cart-count");
const checkoutButton = document.querySelector("#checkout-button");
const checkoutMessage = document.querySelector("#checkout-message");
const emptyState = document.querySelector("#empty-state");
const resultsHeading = document.querySelector("#results-heading");

let activeFilter = "Semua";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

function updateCatalog() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  let visibleCount = 0;

  cards.forEach((card) => {
    const matchesCategory =
      activeFilter === "Semua" || card.dataset.category === activeFilter;
    const matchesSearch = card.dataset.search.includes(query);
    const isVisible = matchesCategory && matchesSearch;
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  resultsHeading.textContent = `${activeFilter === "Semua" ? "Semua" : activeFilter} (${visibleCount})`;
  emptyState.hidden = visibleCount > 0;
}

function renderOrder() {
  orderItems.replaceChildren();
  let itemCount = 0;
  let total = 0;

  selectedServices.forEach((quantity, id) => {
    const service = serviceDetails[id];
    itemCount += quantity;
    total += service.price * quantity;

    const item = document.createElement("li");
    item.className = "order-item";

    const details = document.createElement("div");
    const name = document.createElement("span");
    name.className = "order-item-name";
    name.textContent = service.name;
    const price = document.createElement("span");
    price.className = "order-item-price";
    price.textContent = formatPrice(service.price * quantity);
    details.append(name, price);

    const controls = document.createElement("div");
    controls.className = "quantity-control";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "−";
    removeButton.setAttribute("aria-label", `Kurangi ${service.name}`);
    removeButton.addEventListener("click", () => changeQuantity(id, -1));

    const quantityLabel = document.createElement("span");
    quantityLabel.textContent = String(quantity);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "+";
    addButton.setAttribute("aria-label", `Tambah ${service.name}`);
    addButton.addEventListener("click", () => changeQuantity(id, 1));

    controls.append(removeButton, quantityLabel, addButton);
    item.append(details, controls);
    orderItems.append(item);
  });

  emptyCart.hidden = itemCount > 0;
  orderTotal.hidden = itemCount === 0;
  checkoutButton.disabled = itemCount === 0;
  orderSubtitle.textContent =
    itemCount === 0
      ? "Belum ada layanan yang dipilih"
      : `${itemCount} layanan dipilih`;
  summaryCount.textContent = itemCount > 0 ? `(${itemCount})` : "";
  totalPrice.textContent = formatPrice(total);
  cartCount.textContent = String(itemCount);
  cartCount.classList.toggle("has-items", itemCount > 0);

  document.querySelectorAll(".add-button").forEach((button) => {
    const quantity = selectedServices.get(button.dataset.id) ?? 0;
    button.classList.toggle("is-selected", quantity > 0);
    button.innerHTML =
      quantity > 0
        ? `✓ <span>Dipilih${quantity > 1 ? ` (${quantity})` : ""}</span>`
        : "＋ <span>Pilih</span>";
    button.setAttribute(
      "aria-label",
      quantity > 0
        ? `${serviceDetails[button.dataset.id].name} dipilih, tambah lagi`
        : `Pilih layanan ${serviceDetails[button.dataset.id].name}`,
    );
  });
}

function changeQuantity(id, difference) {
  const nextQuantity = (selectedServices.get(id) ?? 0) + difference;
  if (nextQuantity <= 0) {
    selectedServices.delete(id);
  } else {
    selectedServices.set(id, nextQuantity);
  }
  checkoutMessage.textContent = "";
  renderOrder();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    updateCatalog();
  });
  button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
});

searchInput.addEventListener("input", updateCatalog);

document.querySelectorAll(".add-button").forEach((button) => {
  button.addEventListener("click", () => changeQuantity(button.dataset.id, 1));
});

document.querySelector("#cart-shortcut").addEventListener("click", () => {
  document.querySelector("#order-summary").scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
});

checkoutButton.addEventListener("click", () => {
  if (selectedServices.size === 0) return;

  const items = Object.fromEntries(selectedServices);
  const checkoutUrl = new URL("../pembayaran/index.html", window.location.href);
  checkoutUrl.searchParams.set("items", JSON.stringify(items));
  window.location.href = checkoutUrl;
});

updateCatalog();
renderOrder();

const searchInput = document.querySelector("#order-search");
const categoryFilter = document.querySelector("#category-filter");
const sortSelect = document.querySelector("#sort-orders");
const ordersBody = document.querySelector("#orders-body");
const emptyState = document.querySelector("#empty-state");
const resultsCount = document.querySelector("#results-count");
const resetButton = document.querySelector("#reset-filters");
const orderRows = [...ordersBody.querySelectorAll("tr")];
const sidebar = document.querySelector("#sidebar");
const menuToggle = document.querySelector("#menu-toggle");
const sidebarScrim = document.querySelector("#sidebar-scrim");

orderRows.forEach((row) => {
  const detailUrl = `../eatersive-order-detail/index.html?id=${encodeURIComponent(row.dataset.orderId)}`;

  row.setAttribute(
    "aria-label",
    `Buka detail pesanan ${row.dataset.orderId}, ${row.querySelector(".customer-name").textContent}`,
  );
  row.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, select")) return;
    window.location.href = detailUrl;
  });
  row.addEventListener("keydown", (event) => {
    if (event.target !== row || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    window.location.href = detailUrl;
  });
});

function updateOrders() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  const selectedCategory = categoryFilter.value;
  const matchingRows = orderRows.filter((row) => {
    const matchesQuery = row.textContent.toLocaleLowerCase("id").includes(query);
    const matchesCategory =
      selectedCategory === "all" || row.dataset.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const sortedRows = [...matchingRows].sort((first, second) => {
    if (sortSelect.value === "oldest") {
      return Number(first.dataset.order) - Number(second.dataset.order);
    }

    if (sortSelect.value === "customer") {
      return first
        .querySelector(".customer-name")
        .textContent.localeCompare(
          second.querySelector(".customer-name").textContent,
          "id",
        );
    }

    return Number(second.dataset.order) - Number(first.dataset.order);
  });

  sortedRows.forEach((row, index) => {
    row.querySelector(".row-number").textContent = String(index + 1).padStart(
      2,
      "0",
    );
    row.hidden = false;
    ordersBody.append(row);
  });

  orderRows
    .filter((row) => !matchingRows.includes(row))
    .forEach((row) => {
      row.hidden = true;
      ordersBody.append(row);
    });

  emptyState.hidden = matchingRows.length > 0;
  resultsCount.textContent =
    matchingRows.length === 0
      ? "Tidak ada pesanan yang ditampilkan"
      : `Menampilkan ${matchingRows.length} pesanan`;
}

searchInput.addEventListener("input", updateOrders);
categoryFilter.addEventListener("change", updateOrders);
sortSelect.addEventListener("change", updateOrders);

resetButton.addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "all";
  sortSelect.value = "newest";
  updateOrders();
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

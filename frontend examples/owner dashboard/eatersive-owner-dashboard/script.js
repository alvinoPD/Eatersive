const searchInput = document.querySelector("#order-search");
const statusFilter = document.querySelector("#status-filter");
const orderRows = [...document.querySelectorAll("#orders-body tr")];
const emptyState = document.querySelector("#empty-state");
const chartTabs = [...document.querySelectorAll(".chart-tab")];
const chartPath = document.querySelector(".chart-line");
const chartArea = document.querySelector(".chart-area");
const chartTitle = document.querySelector("#chart-title");
const chartDescription = document.querySelector("#chart-description");
const chartLegend = document.querySelector("#chart-legend-label");
const chartYLabels = document.querySelector("#chart-y-labels");
const periodSelect = document.querySelector("#period-select");
const sidebar = document.querySelector("#sidebar");
const menuToggle = document.querySelector("#menu-toggle");
const sidebarScrim = document.querySelector("#sidebar-scrim");

function filterOrders() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  const selectedStatus = statusFilter.value;
  let visibleCount = 0;

  orderRows.forEach((row) => {
    const matchesSearch = row.textContent.toLocaleLowerCase("id").includes(query);
    const matchesStatus =
      selectedStatus === "all" || row.dataset.status === selectedStatus;
    const isVisible = matchesSearch && matchesStatus;
    row.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  emptyState.hidden = visibleCount > 0;
}

searchInput.addEventListener("input", filterOrders);
statusFilter.addEventListener("change", filterOrders);

const chartData = {
  revenue: {
    title: "Grafik pendapatan per bulan",
    description: "Visualisasi pertumbuhan bisnis 6 bulan terakhir.",
    legend: "Pendapatan (Rp)",
    path: "M0 162 C42 166 75 172 112 168 S198 138 250 128 S337 106 388 93 S475 77 512 88 S567 104 600 117",
    labels: ["Rp14.0jt", "Rp10.5jt", "Rp7.0jt", "Rp3.5jt", "Rp0.0jt"],
  },
  orders: {
    title: "Grafik jumlah pesanan per bulan",
    description: "Perbandingan jumlah pesanan dalam 6 bulan terakhir.",
    legend: "Jumlah pesanan",
    path: "M0 175 C42 158 77 170 112 145 S195 150 250 116 S335 136 388 92 S474 105 512 74 S569 87 600 55",
    labels: ["180 pesanan", "135 pesanan", "90 pesanan", "45 pesanan", "0 pesanan"],
  },
};

function setChart(type) {
  const data = chartData[type];
  if (!data) return;

  chartTabs.forEach((tab) => {
    const isActive = tab.dataset.chart === type;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });

  chartPath.setAttribute("d", data.path);
  chartArea.setAttribute("d", `${data.path} V250 H0Z`);
  chartTitle.textContent = data.title;
  chartDescription.textContent = data.description;
  chartLegend.textContent = data.legend;
  chartYLabels.replaceChildren(
    ...data.labels.map((label) => {
      const item = document.createElement("span");
      item.textContent = label;
      return item;
    }),
  );
}

chartTabs.forEach((tab) => {
  tab.addEventListener("click", () => setChart(tab.dataset.chart));
});

periodSelect.addEventListener("change", () => {
  const selectedPeriod =
    periodSelect.options[periodSelect.selectedIndex].textContent;
  chartDescription.textContent = `Visualisasi pertumbuhan bisnis 6 bulan terakhir hingga ${selectedPeriod}.`;
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

sidebar.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    sidebar.querySelectorAll(".nav-link").forEach((navLink) => {
      navLink.classList.remove("is-active");
      navLink.removeAttribute("aria-current");
    });
    link.classList.add("is-active");
    link.setAttribute("aria-current", "page");
    setSidebarOpen(false);
  });
});

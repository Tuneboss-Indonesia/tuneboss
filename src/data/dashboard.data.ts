import type { DashboardSummary, PriorityProduct, QuickAction, RecentActivity, StockItem, StockMovement } from "../types/dashboard";

export const dashboardSummary: DashboardSummary = {
  totalSku: 128,
  totalUnits: 2460,
  lowStockCount: 14,
  outOfStockCount: 3,
  stockHealth: {
    healthy: 82,
    low: 12,
    empty: 6,
  },
};

export const priorityProducts: PriorityProduct[] = [
  {
    id: "prd-001",
    name: "TuneBoss ECU Yamaha NMAX",
    sku: "TB-ECU-NMAX",
    barcode: "899-TB-001-NMAX",
    stock: 4,
    minStock: 12,
    status: "low",
  },
  {
    id: "prd-002",
    name: "TuneBoss ECU Honda Vario",
    sku: "TB-ECU-VARIO",
    barcode: "899-TB-002-VARIO",
    stock: 0,
    minStock: 8,
    status: "empty",
  },
  {
    id: "prd-003",
    name: "TuneBoss Wiring Harness",
    sku: "TB-WIRE-HARNESS",
    barcode: "899-TB-003-WIRE",
    stock: 9,
    minStock: 20,
    status: "low",
  },
  {
    id: "prd-004",
    name: "USB Tuning Cable",
    sku: "TB-USB-CABLE",
    barcode: "899-TB-004-USB",
    stock: 18,
    minStock: 15,
    status: "safe",
  },
  {
    id: "prd-005",
    name: "Sticker Seal Pack",
    sku: "TB-SEAL-PACK",
    barcode: "899-TB-005-SEAL",
    stock: 2,
    minStock: 10,
    status: "low",
  },
];

export const recentActivities: RecentActivity[] = [
  {
    id: "act-001",
    type: "inbound",
    productName: "TuneBoss ECU Yamaha NMAX",
    quantity: 24,
    operator: "Raka",
    timestamp: "Hari ini, 09:42",
  },
  {
    id: "act-002",
    type: "outbound",
    productName: "USB Tuning Cable",
    quantity: 3,
    operator: "Dini",
    timestamp: "Hari ini, 10:18",
  },
  {
    id: "act-003",
    type: "adjustment",
    productName: "Sticker Seal Pack",
    quantity: -2,
    operator: "Admin Gudang",
    timestamp: "Hari ini, 11:03",
  },
  {
    id: "act-004",
    type: "outbound",
    productName: "TuneBoss ECU Honda Vario",
    quantity: 6,
    operator: "Raka",
    timestamp: "Kemarin, 16:25",
  },
  {
    id: "act-005",
    type: "inbound",
    productName: "TuneBoss Wiring Harness",
    quantity: 30,
    operator: "Dini",
    timestamp: "Kemarin, 14:40",
  },
];

export const quickActions: QuickAction[] = [
  {
    id: "inbound",
    title: "Stok Masuk",
    description: "Catat barang masuk dari supplier.",
    state: "coming-soon",
  },
  {
    id: "outbound",
    title: "Stok Keluar",
    description: "Catat penjualan atau pengeluaran.",
    state: "coming-soon",
  },
  {
    id: "scan",
    title: "Scan Barang",
    description: "Kamera dan scanner fisik fase berikutnya.",
    state: "coming-soon",
  },
  {
    id: "history",
    title: "Lihat Riwayat",
    description: "Pantau aktivitas stok terbaru.",
    state: "ready",
  },
];

export const stockItems: StockItem[] = [
  {
    ...priorityProducts[0],
    category: "ECU",
    location: "Rack A-01",
    lastUpdated: "Hari ini, 09:42",
  },
  {
    ...priorityProducts[1],
    category: "ECU",
    location: "Rack A-02",
    lastUpdated: "Hari ini, 10:18",
  },
  {
    ...priorityProducts[2],
    category: "Accessory",
    location: "Rack B-04",
    lastUpdated: "Kemarin, 14:40",
  },
  {
    ...priorityProducts[3],
    category: "Cable",
    location: "Rack C-02",
    lastUpdated: "Hari ini, 11:03",
  },
  {
    ...priorityProducts[4],
    category: "Accessory",
    location: "Rack C-05",
    lastUpdated: "Kemarin, 16:25",
  },
];

export const stockMovements: StockMovement[] = [
  {
    id: "mv-001",
    type: "inbound",
    productName: "TuneBoss ECU Yamaha NMAX",
    sku: "TB-ECU-NMAX",
    quantity: 24,
    operator: "Raka",
    party: "Supplier Malaysia",
    timestamp: "Hari ini, 09:42",
    note: "Batch restock ECU NMAX",
  },
  {
    id: "mv-002",
    type: "outbound",
    productName: "USB Tuning Cable",
    sku: "TB-USB-CABLE",
    quantity: 3,
    operator: "Dini",
    party: "Dealer Bandung",
    timestamp: "Hari ini, 10:18",
    note: "Penjualan dealer",
  },
  {
    id: "mv-003",
    type: "outbound",
    productName: "TuneBoss ECU Honda Vario",
    sku: "TB-ECU-VARIO",
    quantity: 6,
    operator: "Raka",
    party: "Customer Walk-in",
    timestamp: "Kemarin, 16:25",
    note: "Barang keluar retail",
  },
  {
    id: "mv-004",
    type: "inbound",
    productName: "TuneBoss Wiring Harness",
    sku: "TB-WIRE-HARNESS",
    quantity: 30,
    operator: "Dini",
    party: "Gudang Pusat",
    timestamp: "Kemarin, 14:40",
    note: "Transfer stok internal",
  },
];

import { BarChart3, ClipboardList, FileBarChart, LayoutDashboard, Package, PackageMinus, PackagePlus, ScanBarcode, ShoppingCart, Tag } from "lucide-react-native";
import { stockItems, stockMovements } from "../../data/dashboard.data";
import type { CategoryItem, ChartPoint, MenuItem, PageKey, PeriodKey } from "./types";

export { stockItems, stockMovements };

export const logoUri = "https://tuneboss.com/wp-content/uploads/2022/11/logo-TuneBoss.png";

export const mainMenu: MenuItem[] = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["kategori", Tag, "Kategori"],
  ["stok", Package, "Data Barang"],
  ["penjualan", ShoppingCart, "Penjualan"],
  ["scan", ScanBarcode, "Scan Barcode"],
];

export const stockMenu: MenuItem[] = [
  ["masuk", PackagePlus, "Barang Masuk"],
  ["keluar", PackageMinus, "Barang Keluar"],
  ["laporan", FileBarChart, "Laporan"],
];

export const mobileMenu: MenuItem[] = [
  ["dashboard", LayoutDashboard, "Home"],
  ["stok", Package, "Barang"],
  ["scan", ScanBarcode, "Scan"],
  ["masuk", PackagePlus, "Masuk"],
  ["laporan", FileBarChart, "Laporan"],
];

export const reportCards: Array<[PageKey, typeof ClipboardList, string, string]> = [
  ["laporan-stok", ClipboardList, "Laporan Stok", "Lihat stok per barang dan kategori"],
  ["laporan-penjualan", BarChart3, "Laporan Penjualan", "Rekap penjualan harian dan bulanan"],
  ["laporan-masuk", PackagePlus, "Laporan Barang Masuk", "Rekap barang masuk per periode"],
  ["laporan-keluar", PackageMinus, "Laporan Barang Keluar", "Rekap barang keluar per alasan"],
];

export const categories: CategoryItem[] = [
  { id: "cat-ecu", name: "ECU", desc: "Produk ECU TuneBoss", count: 12 },
  { id: "cat-cable", name: "Kabel", desc: "USB tuning cable dan wiring harness", count: 4 },
  { id: "cat-accessory", name: "Aksesoris", desc: "Sticker seal, bracket, dan pendukung", count: 9 },
  { id: "cat-other", name: "Lainnya", desc: "Kategori lainnya", count: 2 },
];

export const salesChartData: Record<PeriodKey, ChartPoint[]> = {
  hari: [{ label: "08", value: 2 }, { label: "10", value: 4 }, { label: "12", value: 3 }, { label: "14", value: 7 }, { label: "16", value: 5 }, { label: "18", value: 8 }],
  minggu: [{ label: "Sen", value: 8 }, { label: "Sel", value: 12 }, { label: "Rab", value: 10 }, { label: "Kam", value: 16 }, { label: "Jum", value: 14 }, { label: "Sab", value: 20 }, { label: "Min", value: 9 }],
  bulan: [{ label: "1", value: 18 }, { label: "2", value: 44 }, { label: "3", value: 32 }, { label: "4", value: 70 }, { label: "5", value: 48 }, { label: "6", value: 88 }, { label: "7", value: 58 }, { label: "8", value: 76 }, { label: "9", value: 52 }, { label: "10", value: 94 }, { label: "11", value: 64 }, { label: "12", value: 82 }],
  tahun: [{ label: "2023", value: 420 }, { label: "2024", value: 610 }, { label: "2025", value: 780 }, { label: "2026", value: 540 }],
};

export const topProductsData: Record<PeriodKey, ChartPoint[]> = {
  hari: [{ label: "NMAX", value: 9 }, { label: "Vario", value: 7 }, { label: "Cable", value: 5 }, { label: "Seal", value: 4 }, { label: "Wire", value: 3 }],
  minggu: [{ label: "NMAX", value: 28 }, { label: "Wire", value: 22 }, { label: "Cable", value: 18 }, { label: "Vario", value: 14 }, { label: "Seal", value: 11 }],
  bulan: [{ label: "NMAX", value: 94 }, { label: "Vario", value: 76 }, { label: "Wire", value: 58 }, { label: "Cable", value: 52 }, { label: "Seal", value: 31 }],
  tahun: [{ label: "NMAX", value: 780 }, { label: "Vario", value: 640 }, { label: "Wire", value: 520 }, { label: "Cable", value: 460 }, { label: "Seal", value: 290 }],
};

export const transactions = [
  ["TRX-001", "18/05/2026", "2", "Rp 1.800.000", "amoris"],
  ["TRX-002", "18/05/2026", "1", "Rp 950.000", "amoris"],
];

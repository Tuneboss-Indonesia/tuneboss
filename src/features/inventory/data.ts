import { BarChart3, ClipboardList, FileBarChart, LayoutDashboard, Package, PackageMinus, PackagePlus, ScanBarcode, Settings, Tag } from "lucide-react-native";
import type { MenuItem, PageKey } from "./types";

export const logoUri = require("../../../assets/logo.png");

export const mainMenu: MenuItem[] = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["kategori", Tag, "Kategori"],
  ["stok", Package, "Data Produk"],
  ["scan", ScanBarcode, "Scan Barcode"],
];

export const stockMenu: MenuItem[] = [
  ["masuk", PackagePlus, "Produk Masuk"],
  ["keluar", PackageMinus, "Produk Keluar"],
  ["laporan", FileBarChart, "Laporan"],
  ["admin", Settings, "Admin"],
];

export const reportCards: Array<[PageKey, typeof ClipboardList, string, string]> = [
  ["laporan-stok", ClipboardList, "Laporan Stok", "Lihat stok per produk dan kategori"],
  ["laporan-penjualan", BarChart3, "Laporan Penjualan", "Rekap penjualan harian, bulanan dan tahunan"],
  ["laporan-masuk", PackagePlus, "Laporan Produk Masuk", "Rekap produk masuk per periode"],
  ["laporan-keluar", PackageMinus, "Laporan Produk Keluar", "Rekap produk keluar per periode"],
];

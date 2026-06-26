import type { LucideIcon } from "lucide-react-native";
import type { PressableStateCallbackType } from "react-native";

export type PageKey = "dashboard" | "kategori" | "stok" | "dealer" | "scan" | "masuk" | "keluar" | "laporan" | "admin" | "laporan-stok" | "laporan-penjualan" | "laporan-masuk" | "laporan-keluar";
export type UserRole = "admin" | "staff";
export type ModalKind = "kategori" | "stok" | "masuk" | "keluar" | null;
export type ModalMode = "add" | "edit";
export type PeriodKey = "hari" | "minggu" | "bulan" | "tahun";
export type MenuItem = [PageKey, LucideIcon, string];
export type PressState = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };

export type CategoryItem = {
  id: string;
  name: string;
  desc: string;
  count: number;
};

export type ChartPoint = {
  label: string;
  value: number;
};

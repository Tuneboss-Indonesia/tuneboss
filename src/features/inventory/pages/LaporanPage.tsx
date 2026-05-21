import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { reportCards } from "../data";
import { apiRequest, downloadCsv, downloadPdf, formatCurrency, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import type { PageKey, PressState } from "../types";
import { DataTable, EmptyRow, Metric, TableRow, WhiteCard } from "../components/common";

type ReportType = "stok" | "penjualan" | "masuk" | "keluar";
type ReportFilters = { categoryId: string; from: string; partyId: string; productId: string; status: string; to: string };
type FilterKey = "category" | "party" | "product" | "status";
type FilterOption = { label: string; value: string };
type Paginated<T> = { data: T[]; meta?: { currentPage?: number; lastPage?: number; total?: number } };
type ReportProduct = { category?: { name?: string } | null; id: string; name: string; stock: number; status: string };
type ReportSale = { cashier: string | null; createdAt: string; customer?: string | null; invoiceNumber: string; status: string; totalAmount: number };
type ReportMovement = { createdAt?: string; customer?: string | null; note?: string | null; operator?: string | null; party?: string | null; productName: string; quantity: number; supplier?: string | null };

const defaultFilters: ReportFilters = { categoryId: "", from: "", partyId: "", productId: "", status: "", to: "" };
const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const reportPageSize = 20;

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DateField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const selectedDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: totalDays }, (_, index) => index + 1);
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month);

  const selectDay = (day: number) => {
    onChange(dateValue(new Date(month.getFullYear(), month.getMonth(), day)));
    setOpen(false);
  };

  return (
    <View style={[styles.filterInputGroup, compact && styles.filterInputGroupMobile, open && { zIndex: 30 }]}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable onPress={() => setOpen((current) => !current)} style={styles.filterBox}>
        <Text style={value ? styles.modalSelectText : styles.scanResultMeta}>{value || "Pilih tanggal"}</Text>
      </Pressable>
      {open ? (
        <View style={[styles.calendarPopover, compact && styles.calendarPopoverMobile]}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={styles.calendarNav}><Text style={styles.secondaryButtonText}>‹</Text></Pressable>
            <Text style={styles.calendarTitle}>{monthLabel}</Text>
            <Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={styles.calendarNav}><Text style={styles.secondaryButtonText}>›</Text></Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {dayNames.map((day) => <Text key={day} style={styles.calendarDayName}>{day}</Text>)}
            {blanks.map((_, index) => <View key={`blank-${index}`} style={styles.calendarDay} />)}
            {days.map((day) => {
              const current = dateValue(new Date(month.getFullYear(), month.getMonth(), day));
              return <Pressable key={day} onPress={() => selectDay(day)} style={[styles.calendarDay, current === value && styles.calendarDayActive]}><Text style={[styles.calendarDayText, current === value && styles.calendarDayTextActive]}>{day}</Text></Pressable>;
            })}
          </View>
          <View style={styles.calendarActions}>
            <Pressable onPress={() => { onChange(""); setOpen(false); }} style={styles.cancelButton}><Text style={styles.cancelText}>Clear</Text></Pressable>
            <Pressable onPress={() => { onChange(dateValue(new Date())); setOpen(false); }} style={styles.saveButton}><Text style={styles.saveText}>Hari ini</Text></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function LaporanPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { movements, sales, summary } = useInventoryData();
  const month = new Date().getMonth();
  const monthlySales = sales.filter((sale) => new Date(sale.createdAt).getMonth() === month && sale.status === "completed").reduce((total, sale) => total + sale.totalAmount, 0);
  return <View style={styles.stack}><Text style={styles.noticeTitle}>Grafik dan Laporan</Text><View style={styles.reportMetricGrid}><Metric title="Total Barang" value={String(summary.totalSku)} /><Metric title="Total Stok" value={String(summary.totalUnits)} /><Metric title="Penjualan Bulan Ini" value={formatCurrency(monthlySales)} /><Metric title="Barang Masuk" value={String(movements.filter((item) => item.type === "inbound").reduce((total, item) => total + item.quantity, 0))} /><Metric title="Barang Keluar" value={String(movements.filter((item) => item.type === "outbound" || item.type === "sale").reduce((total, item) => total + item.quantity, 0))} /></View><View style={styles.reportGrid}>{reportCards.map(([id, Icon, title, desc]) => <Pressable key={id} onPress={() => onNavigate(id)} style={({ hovered, pressed }: PressState) => [styles.reportCard, hovered && styles.reportCardHover, pressed && styles.pressed]}><View style={styles.reportIcon}><Icon color={colors.white} size={30} /></View><Text style={styles.reportTitle}>{title}</Text><Text style={styles.reportDesc}>{desc}</Text></Pressable>)}</View></View>;
}

function reportColumns(type: ReportType) {
  if (type === "stok") return ["Barang", "Kategori", "Stok", "Status"];
  if (type === "penjualan") return ["No. Nota", "Tanggal", "Status", "Kasir", "Customer", "Total"];
  if (type === "masuk") return ["Tanggal", "Barang", "Jumlah", "Supplier", "User"];
  return ["Tanggal", "Barang", "Jumlah", "Alasan", "User"];
}

export function ReportDetail({ type, onBack }: { type: "stok" | "penjualan" | "masuk" | "keluar"; onBack: () => void }) {
  const { loadMovementsPage, loadProductsPage, loadSalesPage, movementMeta, movements, productMeta, saleMeta, sales, stockItems } = useInventoryData();
  const title = type === "stok" ? "Daftar Stok Barang" : type === "penjualan" ? "Daftar Transaksi Penjualan" : type === "masuk" ? "Daftar Barang Masuk" : "Daftar Barang Keluar";
  const rows = type === "stok"
    ? stockItems.map((item) => [item.name, item.category, String(item.stock), item.status])
    : type === "penjualan"
      ? sales.map((sale) => [sale.invoiceNumber, formatDate(sale.createdAt), sale.cashier ?? "-", formatCurrency(sale.totalAmount)])
      : movements.filter((item) => type === "masuk" ? item.type === "inbound" : item.type === "outbound" || item.type === "sale").map((item) => [formatDate(item.timestamp), item.productName, String(item.quantity), type === "masuk" ? item.party : item.note, item.operator]);
  return <View style={styles.stack}><View style={styles.reportFilter}><Text style={styles.filterBox}>API filter aktif</Text><Text style={styles.exportDisabled}>Export CSV tersedia</Text><Text style={styles.upgrade}>Via /reports/*/export</Text></View><Pressable onPress={onBack} style={({ hovered, pressed }: PressState) => [styles.backButton, hovered && styles.backButtonHover, pressed && styles.pressed]}><Text style={styles.backText}>Kembali</Text></Pressable><View style={styles.metricGrid}><Metric title="Total" value={type === "penjualan" ? formatCurrency(sales.reduce((total, sale) => total + sale.totalAmount, 0)) : `${rows.length} data`} /><Metric title="Total Transaksi" value={String(rows.length)} /><Metric title="Stok Menipis" value={`${stockItems.filter((item) => item.status === "low").length} barang`} /></View><WhiteCard title={title}><DataTable columns={reportColumns(type)} pagination={type === "stok" ? productMeta : type === "penjualan" ? saleMeta : movementMeta} onPageChange={type === "stok" ? loadProductsPage : type === "penjualan" ? loadSalesPage : (page) => loadMovementsPage(page, type === "masuk" ? "inbound" : "outbound")}>{rows.length ? rows.map((row, index) => <TableRow key={`${type}-${index}`} cells={row} />) : <EmptyRow text={type === "penjualan" ? "Tidak ada data penjualan" : "Tidak ada data pada periode ini"} />}</DataTable></WhiteCard></View>;
}

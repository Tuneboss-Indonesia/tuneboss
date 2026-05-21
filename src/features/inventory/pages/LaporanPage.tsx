import { Pressable, Text, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { reportCards } from "../data";
import { formatCurrency, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import type { PageKey, PressState } from "../types";
import { DataTable, EmptyRow, Metric, TableRow, WhiteCard } from "../components/common";

export function LaporanPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { movements, sales, summary } = useInventoryData();
  const month = new Date().getMonth();
  const monthlySales = sales.filter((sale) => new Date(sale.createdAt).getMonth() === month && sale.status === "completed").reduce((total, sale) => total + sale.totalAmount, 0);
  return <View style={styles.stack}><Text style={styles.noticeTitle}>Grafik dan Laporan</Text><View style={styles.reportMetricGrid}><Metric title="Total Barang" value={String(summary.totalSku)} /><Metric title="Total Stok" value={String(summary.totalUnits)} /><Metric title="Penjualan Bulan Ini" value={formatCurrency(monthlySales)} /><Metric title="Barang Masuk" value={String(movements.filter((item) => item.type === "inbound").reduce((total, item) => total + item.quantity, 0))} /><Metric title="Barang Keluar" value={String(movements.filter((item) => item.type === "outbound" || item.type === "sale").reduce((total, item) => total + item.quantity, 0))} /></View><View style={styles.reportGrid}>{reportCards.map(([id, Icon, title, desc]) => <Pressable key={id} onPress={() => onNavigate(id)} style={({ hovered, pressed }: PressState) => [styles.reportCard, hovered && styles.reportCardHover, pressed && styles.pressed]}><View style={styles.reportIcon}><Icon color={colors.white} size={30} /></View><Text style={styles.reportTitle}>{title}</Text><Text style={styles.reportDesc}>{desc}</Text></Pressable>)}</View></View>;
}

function reportColumns(type: "stok" | "penjualan" | "masuk" | "keluar") {
  if (type === "stok") return ["Barang", "Kategori", "Stok", "Status"];
  if (type === "penjualan") return ["No. Nota", "Tanggal", "Kasir", "Total"];
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

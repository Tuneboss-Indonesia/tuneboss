import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { reportCards } from "../data";
import { apiRequest, downloadCsv, formatCurrency, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import type { PageKey } from "../types";
import { DataTable, EmptyRow, Metric, TableRow, WhiteCard } from "../components/common";

type ReportType = "stok" | "penjualan" | "masuk" | "keluar";
type ReportFilters = { categoryId: string; from: string; partyId: string; productId: string; status: string; to: string };
type Paginated<T> = { data: T[] };
type ReportProduct = { category?: { name?: string } | null; id: string; name: string; stock: number; status: string };
type ReportSale = { cashier: string | null; createdAt: string; customer?: string | null; invoiceNumber: string; status: string; totalAmount: number };
type ReportMovement = { createdAt?: string; customer?: string | null; note?: string | null; operator?: string | null; party?: string | null; productName: string; quantity: number; supplier?: string | null };

export function LaporanPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { movements, sales, summary } = useInventoryData();
  const month = new Date().getMonth();
  const monthlySales = sales.filter((sale) => new Date(sale.createdAt).getMonth() === month && sale.status === "completed").reduce((total, sale) => total + sale.totalAmount, 0);
  return <View style={styles.stack}><Text style={styles.noticeTitle}>Grafik dan Laporan</Text><View style={styles.reportMetricGrid}><Metric title="Total Barang" value={String(summary.totalSku)} /><Metric title="Total Stok" value={String(summary.totalUnits)} /><Metric title="Penjualan Bulan Ini" value={formatCurrency(monthlySales)} /><Metric title="Barang Masuk" value={String(movements.filter((item) => item.type === "inbound").reduce((total, item) => total + item.quantity, 0))} /><Metric title="Barang Keluar" value={String(movements.filter((item) => item.type === "outbound" || item.type === "sale").reduce((total, item) => total + item.quantity, 0))} /></View><View style={styles.reportGrid}>{reportCards.map(([id, Icon, title, desc]) => <Pressable key={id} onPress={() => onNavigate(id)} style={styles.reportCard}><View style={styles.reportIcon}><Icon color={colors.white} size={30} /></View><Text style={styles.reportTitle}>{title}</Text><Text style={styles.reportDesc}>{desc}</Text></Pressable>)}</View></View>;
}

const defaultFilters: ReportFilters = { categoryId: "", from: "", partyId: "", productId: "", status: "", to: "" };

function reportColumns(type: ReportType) {
  if (type === "stok") return ["Barang", "Kategori", "Stok", "Status"];
  if (type === "penjualan") return ["No. Nota", "Tanggal", "Status", "Kasir", "Customer", "Total"];
  if (type === "masuk") return ["Tanggal", "Barang", "Jumlah", "Supplier", "User"];
  return ["Tanggal", "Barang", "Jumlah", "Alasan", "User"];
}

function reportPath(type: ReportType, exportCsv = false) {
  const base = type === "stok" ? "/reports/stock" : type === "penjualan" ? "/reports/sales" : type === "masuk" ? "/reports/inbound" : "/reports/outbound";
  return exportCsv ? `${base}/export` : base;
}

function filterQuery(type: ReportType, filters: ReportFilters) {
  const query = new URLSearchParams({ per_page: "100" });
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.productId) query.set("product_id", filters.productId);
  if (filters.categoryId) query.set("category_id", filters.categoryId);
  if (filters.status && (type === "stok" || type === "penjualan")) query.set("status", filters.status);
  if (filters.partyId && type === "masuk") query.set("supplier_id", filters.partyId);
  if (filters.partyId && (type === "penjualan" || type === "keluar")) query.set("customer_id", filters.partyId);

  return query.toString();
}

export function ReportDetail({ type, onBack }: { type: ReportType; onBack: () => void }) {
  const { categories, customers, stockItems, suppliers, token } = useInventoryData();
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [rows, setRows] = useState<string[][]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const title = type === "stok" ? "Daftar Stok Barang" : type === "penjualan" ? "Daftar Transaksi Penjualan" : type === "masuk" ? "Daftar Barang Masuk" : "Daftar Barang Keluar";
  const exportPath = `${reportPath(type, true)}?${filterQuery(type, filters)}`;

  const loadReport = async (nextFilters = filters) => {
    setLoading(true);

    try {
      const path = `${reportPath(type)}?${filterQuery(type, nextFilters)}`;

      if (type === "stok") {
        const response = await apiRequest<Paginated<ReportProduct>>(path, { token });
        setRows(response.data.map((item) => [item.name, item.category?.name ?? "-", String(item.stock), item.status]));
        setTotalAmount(0);
        setLowStockCount(response.data.filter((item) => item.status === "low").length);
      } else if (type === "penjualan") {
        const response = await apiRequest<Paginated<ReportSale>>(path, { token });
        setRows(response.data.map((sale) => [sale.invoiceNumber, formatDate(sale.createdAt), sale.status, sale.cashier ?? "-", sale.customer ?? "-", formatCurrency(sale.totalAmount)]));
        setTotalAmount(response.data.reduce((total, sale) => total + sale.totalAmount, 0));
        setLowStockCount(stockItems.filter((item) => item.status === "low").length);
      } else {
        const response = await apiRequest<Paginated<ReportMovement>>(path, { token });
        setRows(response.data.map((item) => [formatDate(item.createdAt), item.productName, String(item.quantity), type === "masuk" ? item.supplier ?? item.party ?? "-" : item.customer ?? item.note ?? "-", item.operator ?? "-"]));
        setTotalAmount(0);
        setLowStockCount(stockItems.filter((item) => item.status === "low").length);
      }
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Laporan gagal dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [type, token]);

  const exportCsv = async () => {
    try {
      await downloadCsv(exportPath, token, `laporan-${type}.csv`);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Export CSV gagal.");
    }
  };

  return <View style={styles.stack}><View style={styles.reportFilter}><View style={styles.filterInputGroup}><Text style={styles.filterLabel}>Dari</Text><TextInput style={styles.filterBox} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} value={filters.from} onChangeText={(from) => setFilters((current) => ({ ...current, from }))} /></View><View style={styles.filterInputGroup}><Text style={styles.filterLabel}>Sampai</Text><TextInput style={styles.filterBox} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} value={filters.to} onChangeText={(to) => setFilters((current) => ({ ...current, to }))} /></View><View style={styles.filterInputGroup}><Text style={styles.filterLabel}>Kategori</Text><View style={styles.chipRow}><Pressable onPress={() => setFilters((current) => ({ ...current, categoryId: "" }))} style={[styles.chip, !filters.categoryId && styles.chipActive]}><Text style={styles.chipText}>Semua</Text></Pressable>{categories.map((category) => <Pressable key={category.id} onPress={() => setFilters((current) => ({ ...current, categoryId: current.categoryId === category.id ? "" : category.id }))} style={[styles.chip, filters.categoryId === category.id && styles.chipActive]}><Text style={styles.chipText}>{category.name}</Text></Pressable>)}</View></View><View style={styles.filterInputGroup}><Text style={styles.filterLabel}>Produk</Text><View style={styles.chipRow}><Pressable onPress={() => setFilters((current) => ({ ...current, productId: "" }))} style={[styles.chip, !filters.productId && styles.chipActive]}><Text style={styles.chipText}>Semua</Text></Pressable>{stockItems.slice(0, 12).map((product) => <Pressable key={product.id} onPress={() => setFilters((current) => ({ ...current, productId: current.productId === product.id ? "" : product.id }))} style={[styles.chip, filters.productId === product.id && styles.chipActive]}><Text style={styles.chipText}>{product.sku}</Text></Pressable>)}</View></View>{type === "stok" || type === "penjualan" ? <View style={styles.filterInputGroup}><Text style={styles.filterLabel}>Status</Text><View style={styles.chipRow}>{(type === "stok" ? [["", "Semua"], ["safe", "Aman"], ["low", "Menipis"], ["empty", "Habis"]] : [["", "Semua"], ["completed", "Selesai"], ["void", "Void"]]).map(([value, label]) => <Pressable key={value || "all"} onPress={() => setFilters((current) => ({ ...current, status: value }))} style={[styles.chip, filters.status === value && styles.chipActive]}><Text style={styles.chipText}>{label}</Text></Pressable>)}</View></View> : null}{type === "masuk" || type === "keluar" || type === "penjualan" ? <View style={styles.filterInputGroup}><Text style={styles.filterLabel}>{type === "masuk" ? "Supplier" : "Customer"}</Text><View style={styles.chipRow}><Pressable onPress={() => setFilters((current) => ({ ...current, partyId: "" }))} style={[styles.chip, !filters.partyId && styles.chipActive]}><Text style={styles.chipText}>Semua</Text></Pressable>{(type === "masuk" ? suppliers : customers).map((party) => <Pressable key={party.id} onPress={() => setFilters((current) => ({ ...current, partyId: current.partyId === party.id ? "" : party.id }))} style={[styles.chip, filters.partyId === party.id && styles.chipActive]}><Text style={styles.chipText}>{party.name}</Text></Pressable>)}</View></View> : null}<View style={styles.inlineActions}><Pressable onPress={() => void loadReport()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{loading ? "Memuat..." : "Terapkan"}</Text></Pressable><Pressable onPress={() => { setFilters(defaultFilters); void loadReport(defaultFilters); }} style={styles.cancelButton}><Text style={styles.cancelText}>Reset</Text></Pressable><Pressable onPress={() => void exportCsv()} style={styles.saveButton}><Text style={styles.saveText}>Export CSV</Text></Pressable></View><Text style={styles.upgrade}>{exportPath}</Text></View><Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>Kembali</Text></Pressable><View style={styles.metricGrid}><Metric title="Total" value={type === "penjualan" ? formatCurrency(totalAmount) : `${rows.length} data`} /><Metric title="Total Transaksi" value={String(rows.length)} /><Metric title="Stok Menipis" value={`${lowStockCount} barang`} /></View><WhiteCard title={title}><DataTable columns={reportColumns(type)}>{rows.length ? rows.map((row, index) => <TableRow key={`${type}-${index}`} cells={row} />) : <EmptyRow text={type === "penjualan" ? "Tidak ada data penjualan" : "Tidak ada data pada periode ini"} />}</DataTable></WhiteCard></View>;
}

import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { Alert, Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { reportCards } from "../data";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import type { PageKey, PressState } from "../types";
import { Chip, DataTable, EmptyRow, ErrorScreen, Metric, TableRow, WhiteCard } from "../components/common";

type ReportType = "stok" | "penjualan" | "masuk" | "keluar";
type Paginated<T> = { data: T[]; meta?: { lastPage?: number } };
type ExportProductRow = { category?: string | { name?: string } | null; name: string; stock: number; status: string };
type ExportSaleRow = { address?: string | null; cashier?: string | null; createdAt: string; invoiceNumber: string; status: string; items?: Array<{ productName?: string | null; quantity: number }> };
type ExportMovementRow = { customerName?: string | null; note?: string | null; operator?: string | null; party?: string | null; paymentStatus?: string | null; productCategory?: string | null; productName: string; quantity: number; saleAddress?: string | null; serialNumbers?: string[]; timestamp?: string | null; createdAt?: string | null; type?: string };

const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const stockStatusFilters = ["Semua", "Tersedia", "Menipis", "Habis"];

async function fetchAllApiPages<T>(path: string, token: string, extraParams: Record<string, string> = {}): Promise<T[]> {
  const perPage = 100;
  const allRows: T[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const params = new URLSearchParams({ ...extraParams, page: String(page), per_page: String(perPage) });
    const response = await apiRequest<Paginated<T>>(`${path}?${params.toString()}`, { token });
    allRows.push(...response.data);
    lastPage = response.meta?.lastPage ?? (response.data.length === perPage ? page + 1 : page);
    page += 1;
  } while (page <= lastPage);

  return allRows;
}

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthPeriod() {
  const now = new Date();
  return { from: dateValue(new Date(now.getFullYear(), now.getMonth(), 1)), to: dateValue(now) };
}

function formatMonthLabel(month: Date) {
  try {
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month);
  } catch {
    return `${String(month.getMonth() + 1).padStart(2, "0")}/${month.getFullYear()}`;
  }
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
  const monthLabel = formatMonthLabel(month);

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
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const { loading, movements, sales, summary, token, error, refresh } = useInventoryData();
  const [exportLoading, setExportLoading] = useState(false);
  const month = new Date().getMonth();
  const monthlySalesQuantity = sales
    .filter((sale) => new Date(sale.createdAt).getMonth() === month && sale.status === "completed")
    .reduce((total, sale) => total + (sale.items?.reduce((itemTotal, item) => itemTotal + item.quantity, 0) ?? 0), 0);
  const inboundQuantity = movements.filter((item) => item.type === "inbound").reduce((total, item) => total + item.quantity, 0);
  const outboundQuantity = movements.filter((item) => item.type === "outbound").reduce((total, item) => total + item.quantity, 0);
  const availableStock = summary.totalUnits;

  const handleExportAll = async () => {
    setExportLoading(true);
    try {
      const [products, salesData, inbound, outbound] = await Promise.all([
        fetchAllApiPages<ExportProductRow>("/products", token),
        fetchAllApiPages<ExportSaleRow>("/sales", token),
        fetchAllApiPages<ExportMovementRow>("/stock/movements", token, { type: "inbound" }),
        fetchAllApiPages<ExportMovementRow>("/stock/movements", token, { type: "outbound" }),
      ]);

      const sheets: Array<{ name: string; columns: string[]; rows: unknown[][] }> = [
        {
          name: "Stok",
          columns: ["Produk", "Kategori", "Stok", "Status"],
          rows: products.map((item) => [item.name, typeof item.category === "string" ? item.category : item.category?.name ?? "-", String(item.stock), stockStatusLabel(item.status)]),
        },
        {
          name: "Penjualan",
          columns: ["Invoice", "Tanggal", "Produk", "Total", "Alamat"],
          rows: salesData.map((sale) => [sale.invoiceNumber, formatDate(sale.createdAt), sale.items?.map((i) => i.productName ?? "-").join(", ") || "-", String(sale.items?.reduce((total, i) => total + i.quantity, 0) ?? 0), sale.address ?? "-"]),
        },
        {
          name: "Masuk",
          columns: ["Tanggal", "Produk", "Jumlah", "No Seri", "Kategori", "Catatan"],
          rows: inbound.map((item) => [formatDate(item.createdAt ?? item.timestamp), item.productName, String(item.quantity), item.serialNumbers?.join(", ") || "-", item.productCategory ?? "-", item.note ?? "-"]),
        },
        {
          name: "Keluar",
          columns: ["Tanggal", "Produk", "Jumlah", "No Seri", "Pembeli/Dealer", "Status Bayar", "Alamat", "Catatan"],
          rows: outbound.map((item) => [formatDate(item.createdAt ?? item.timestamp), item.productName, String(item.quantity), item.serialNumbers?.join(", ") || "-", item.customerName ?? "-", item.paymentStatus ?? "-", item.saleAddress ?? item.party ?? "-", item.note ?? "-"]),
        },
      ];

      const workbook = XLSX.utils.book_new();
      for (const sheet of sheets) {
        const tableRows = [sheet.columns, ...sheet.rows];
        const worksheet = XLSX.utils.aoa_to_sheet(tableRows);
        worksheet["!cols"] = sheet.columns.map((_, index) => excelColumnWidth(index, tableRows));
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
      }

      await saveWorkbook(workbook, "laporan-lengkap.xlsx");
    } catch (error) {
      Alert.alert("Export Excel gagal", error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) return <LaporanSkeleton />;
  if (error && !movements.length && !sales.length) return <ErrorScreen message={error} onRetry={() => refresh("laporan")} />;

  return (
    <View style={styles.stack}>
      <View style={{ flexDirection: "column", gap: 10 }}>
        <Text style={[styles.noticeTitle, compact && styles.noticeTitleMobile]}>Data Laporan</Text>
        <Pressable disabled={exportLoading} onPress={handleExportAll} style={({ hovered, pressed }: PressState) => [styles.primaryButton, compact && { width: "100%" }, hovered && !exportLoading && styles.primaryButtonHover, pressed && styles.pressed, exportLoading && styles.tablePagerButtonDisabled]}>
          <Text style={[styles.primaryButtonText, compact && styles.primaryButtonTextMobile]}>{exportLoading ? "Exporting..." : "Export Excel"}</Text>
        </Pressable>
      </View>
      <View style={styles.reportMetricGrid}>
        <Metric title="Jumlah Penjualan" value={String(monthlySalesQuantity)} />
        <Metric title="Produk Masuk" value={String(inboundQuantity)} />
        <Metric title="Produk Keluar" value={String(outboundQuantity)} />
        <Metric title="Stok Tersisa" value={String(availableStock)} />
      </View>
      <View style={styles.reportGrid}>{reportCards.map(([id, Icon, title, desc]) => <Pressable key={id} onPress={() => onNavigate(id)} style={({ hovered, pressed }: PressState) => [styles.reportCard, hovered && styles.reportCardHover, pressed && styles.pressed]}><View style={styles.reportIcon}><Icon color={colors.white} size={30} /></View><Text style={styles.reportTitle}>{title}</Text><Text style={styles.reportDesc}>{desc}</Text></Pressable>)}</View>
    </View>
  );
}

function LaporanSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={[styles.skeletonBlock, { alignSelf: "center", height: 46, width: 380 }]} />
      <View style={styles.reportMetricGrid}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonMetric}>
            <View style={[styles.skeletonBlock, styles.skeletonMetricLabel]} />
            <View style={[styles.skeletonBlock, styles.skeletonMetricValue]} />
          </View>
        ))}
      </View>
      <View style={styles.reportGrid}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonReportCard}>
            <View style={[styles.skeletonBlock, styles.skeletonReportIcon]} />
            <View style={[styles.skeletonBlock, styles.skeletonReportTitle]} />
            <View style={[styles.skeletonBlock, styles.skeletonReportDesc]} />
          </View>
        ))}
      </View>
    </View>
  );
}

function reportColumns(type: ReportType) {
  if (type === "stok") return ["Produk", "Kategori", "Stok", "Status"];
  if (type === "penjualan") return ["Invoice", "Tanggal", "Produk", "Total", "Alamat"];
  if (type === "masuk") return ["Tanggal", "Produk", "Jumlah", "No Seri", "Kategori", "Catatan"];
  return ["Tanggal", "Produk", "Jumlah", "No Seri", "Pembeli/Dealer", "Status Bayar", "Alamat", "Catatan"];
}

function stockStatusLabel(status: string) {
  if (status === "empty") return "Habis";
  if (status === "low") return "Menipis";
  if (status === "Habis" || status === "Menipis" || status === "Tersedia") return status;
  return "Tersedia";
}

function stockStatusParam(status: string) {
  if (status === "Habis") return "empty";
  if (status === "Menipis") return "low";
  if (status === "Tersedia") return "safe";
  return "";
}

function excelColumnWidth(index: number, rows: unknown[][]) {
  const maxLength = rows.reduce((max, row) => Math.max(max, String(row[index] ?? "-").length), 0);
  return { wch: Math.min(Math.max(maxLength + 2, 12), 48) };
}

async function saveWorkbook(workbook: XLSX.WorkBook, filename: string) {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  } else {
    Alert.alert("Export Excel", `File tersimpan di ${uri}`);
  }
}

async function exportExcel(title: string, columns: string[], rows: unknown[][]) {
  const tableRows = [columns, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(tableRows);
  worksheet["!cols"] = columns.map((_, index) => excelColumnWidth(index, tableRows));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
  const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "laporan"}.xlsx`;
  await saveWorkbook(workbook, filename);
}

export function ReportDetail({ type, onBack }: { type: ReportType; onBack: () => void }) {
  const { loadMovementsPage, loadProductsPage, loadSalesPage, loading, movementMeta, movements, productMeta, saleMeta, sales, stockItems, summary, token } = useInventoryData();
  const [tableLoading, setTableLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const defaultPeriod = currentMonthPeriod();
  const [filterFrom, setFilterFrom] = useState(defaultPeriod.from);
  const [filterTo, setFilterTo] = useState(defaultPeriod.to);
  const [stockStatusFilter, setStockStatusFilter] = useState("Semua");
  const [salesMetricLoading, setSalesMetricLoading] = useState(false);
  const [salesMetrics, setSalesMetrics] = useState({ topProduct: "-", totalQuantity: 0 });
  const isLoading = loading || tableLoading;
  const title = type === "stok" ? "Daftar Stok Produk" : type === "penjualan" ? "Daftar Transaksi Penjualan" : type === "masuk" ? "Daftar Produk Masuk" : "Daftar Produk Keluar";
  const columns = reportColumns(type);
  const rows = type === "stok"
    ? stockItems.map((item) => [item.name, item.category, String(item.stock), stockStatusLabel(item.status)])
    : type === "penjualan"
      ? sales.map((sale) => [sale.invoiceNumber, formatDate(sale.createdAt), sale.items?.map((item) => item.productName ?? "-").join(", ") || "-", String(sale.items?.reduce((total, item) => total + item.quantity, 0) ?? 0), sale.address ?? "-"])
      : movements.filter((item) => type === "masuk" ? item.type === "inbound" : item.type === "outbound").map((item) => type === "masuk" ? [formatDate(item.timestamp), item.productName, String(item.quantity), item.serialNumbers?.join(", ") || "-", item.productCategory ?? "-", item.note ?? "-"] : [formatDate(item.timestamp), item.productName, String(item.quantity), item.serialNumbers?.join(", ") || "-", item.customerName ?? "-", item.paymentStatus ?? "-", item.saleAddress ?? item.party ?? "-", item.note ?? "-"]);
  const availableStock = summary.totalUnits;
  const lowStock = summary.lowStockCount;
  const emptyStock = summary.outOfStockCount;

  const loadAllExportRows = async () => {
    if (type === "stok") {
      const status = stockStatusParam(stockStatusFilter);
      const data = await fetchAllApiPages<ExportProductRow>("/products", token, status ? { status } : {});
      return data.map((item) => [item.name, typeof item.category === "string" ? item.category : item.category?.name ?? "-", String(item.stock), stockStatusLabel(item.status)]);
    }
    if (type === "penjualan") {
      const params = { ...(filterFrom ? { from: filterFrom } : {}), ...(filterTo ? { to: filterTo } : {}) };
      const data = await fetchAllApiPages<ExportSaleRow>("/sales", token, params);
      return data.map((sale) => [sale.invoiceNumber, formatDate(sale.createdAt), sale.items?.map((item) => item.productName ?? "-").join(", ") || "-", String(sale.items?.reduce((total, item) => total + item.quantity, 0) ?? 0), sale.address ?? "-"]);
    }
    const data = await fetchAllApiPages<ExportMovementRow>("/stock/movements", token, { type: type === "masuk" ? "inbound" : "outbound", ...(filterFrom ? { from: filterFrom } : {}), ...(filterTo ? { to: filterTo } : {}) });
    return data.map((item) => type === "masuk" ? [formatDate(item.createdAt ?? item.timestamp), item.productName, String(item.quantity), item.serialNumbers?.join(", ") || "-", item.productCategory ?? "-", item.note ?? "-"] : [formatDate(item.createdAt ?? item.timestamp), item.productName, String(item.quantity), item.serialNumbers?.join(", ") || "-", item.customerName ?? "-", item.paymentStatus ?? "-", item.saleAddress ?? item.party ?? "-", item.note ?? "-"]);
  };

  const updateSalesMetrics = async (from = filterFrom, to = filterTo) => {
    if (type !== "penjualan") return;
    setSalesMetricLoading(true);
    try {
      const params = { ...(from ? { from } : {}), ...(to ? { to } : {}) };
      const data = await fetchAllApiPages<ExportSaleRow>("/sales", token, params);
      const productTotals = new Map<string, number>();
      data.forEach((sale) => sale.items?.forEach((item) => {
        const productName = item.productName ?? "-";
        productTotals.set(productName, (productTotals.get(productName) ?? 0) + item.quantity);
      }));
      const topProduct = [...productTotals.entries()].sort((a, b) => b[1] - a[1])[0];
      setSalesMetrics({ topProduct: topProduct ? `${topProduct[0]} (${topProduct[1]})` : "-", totalQuantity: data.reduce((total, sale) => total + (sale.items?.reduce((itemTotal, item) => itemTotal + item.quantity, 0) ?? 0), 0) });
    } finally {
      setSalesMetricLoading(false);
    }
  };

  const applySalesFilter = async (from = filterFrom, to = filterTo) => {
    if (type !== "penjualan") return;
    setTableLoading(true);
    try {
      await Promise.all([loadSalesPage(1, "", from, to), updateSalesMetrics(from, to)]);
    } finally {
      setTableLoading(false);
    }
  };

  const handleExport = async () => {
    if (isLoading || exportLoading || !rows.length) return;
    setExportLoading(true);
    try {
      await exportExcel(title, columns, await loadAllExportRows());
    } catch (error) {
      Alert.alert("Export Excel gagal", error instanceof Error ? error.message : "Terjadi kesalahan saat export.");
    } finally {
      setExportLoading(false);
    }
  };

  const handlePageChange = async (page: number) => {
    setTableLoading(true);
    try {
      if (type === "stok") await loadProductsPage(page, "", stockStatusParam(stockStatusFilter));
      else if (type === "penjualan") await loadSalesPage(page, "", filterFrom, filterTo);
      else await loadMovementsPage(page, type === "masuk" ? "inbound" : "outbound", filterFrom, filterTo);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (type === "penjualan") {
      void applySalesFilter();
    }
    if (type === "stok") {
      setTableLoading(true);
      void loadProductsPage(1, "", stockStatusParam(stockStatusFilter)).finally(() => setTableLoading(false));
    }
    if (type === "masuk" || type === "keluar") {
      setTableLoading(true);
      void loadMovementsPage(1, type === "masuk" ? "inbound" : "outbound", filterFrom, filterTo).finally(() => setTableLoading(false));
    }
  }, [filterFrom, filterTo, stockStatusFilter]);

  const metrics = type === "stok"
    ? <><Metric title="Total Stok Tersedia" value={String(availableStock)} /><Metric title="Total Stok Menipis" value={`${lowStock} produk`} /><Metric title="Total Stok Habis" value={`${emptyStock} produk`} /></>
    : type === "penjualan"
      ? <><Metric title="Produk Terlaris" value={salesMetrics.topProduct} /><Metric title="Total Produk Terjual" value={`${salesMetrics.totalQuantity} unit`} /><Metric title="Total Transaksi" value={String(saleMeta.total)} /></>
      : <><Metric title="Total" value={`${rows.length} data`} /><Metric title="Total Transaksi" value={String(rows.length)} /><Metric title="Stok Menipis" value={`${stockItems.filter((item) => item.status === "low").length} produk`} /></>;
  const metricSkeleton = [0, 1, 2].map((item) => <View key={item} style={styles.skeletonMetric}><View style={[styles.skeletonBlock, styles.skeletonMetricLabel]} /><View style={[styles.skeletonBlock, styles.skeletonMetricValue]} /></View>);

  return (
    <View style={styles.stack}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
        <Pressable onPress={onBack} style={({ hovered, pressed }: PressState) => [styles.primaryButton, hovered && styles.primaryButtonHover, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>Kembali</Text>
        </Pressable>
        <Pressable disabled={isLoading || exportLoading || !rows.length} onPress={handleExport} style={({ hovered, pressed }: PressState) => [styles.primaryButton, hovered && !isLoading && !exportLoading && rows.length > 0 && styles.primaryButtonHover, pressed && styles.pressed, (isLoading || exportLoading || !rows.length) && styles.tablePagerButtonDisabled]}>
          <Text style={styles.primaryButtonText}>{exportLoading ? "Exporting..." : "Export Excel"}</Text>
        </Pressable>
      </View>
      {type === "penjualan" || type === "masuk" || type === "keluar" ? (
        <View style={styles.reportFilter}>
          <DateField label="Dari Tanggal" value={filterFrom} onChange={setFilterFrom} />
          <DateField label="Sampai Tanggal" value={filterTo} onChange={setFilterTo} />
        </View>
      ) : null}
      {type === "stok" ? (
        <View style={styles.chipRow}>
          {stockStatusFilters.map((status) => (
            <Chip key={status} label={status} active={stockStatusFilter === status} disabled={isLoading || exportLoading} onPress={() => setStockStatusFilter(status)} />
          ))}
        </View>
      ) : null}
      <View style={styles.metricGrid}>{isLoading || salesMetricLoading ? metricSkeleton : metrics}</View>
      <WhiteCard title={title}>
        <DataTable loading={isLoading} columns={columns} pagination={type === "stok" ? productMeta : type === "penjualan" ? saleMeta : movementMeta} onPageChange={handlePageChange}>
          {rows.length ? rows.map((row, index) => <TableRow key={`${type}-${index}`} cells={row} />) : <EmptyRow text={type === "penjualan" ? "Tidak ada data penjualan" : "Tidak ada data pada periode ini"} />}
        </DataTable>
      </WhiteCard>
    </View>
  );
}

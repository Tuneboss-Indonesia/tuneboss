import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { reportCards } from "../data";
import { apiRequest, downloadCsv, downloadPdf, formatCurrency, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import type { PageKey } from "../types";
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

  return (
    <View style={styles.stack}>
      <Text style={styles.noticeTitle}>Grafik dan Laporan</Text>
      <View style={styles.reportMetricGrid}>
        <Metric title="Total Barang" value={String(summary.totalSku)} />
        <Metric title="Total Stok" value={String(summary.totalUnits)} />
        <Metric title="Penjualan Bulan Ini" value={formatCurrency(monthlySales)} />
        <Metric title="Barang Masuk" value={String(movements.filter((item) => item.type === "inbound").reduce((total, item) => total + item.quantity, 0))} />
        <Metric title="Barang Keluar" value={String(movements.filter((item) => item.type === "outbound" || item.type === "sale").reduce((total, item) => total + item.quantity, 0))} />
      </View>
      <View style={styles.reportGrid}>
        {reportCards.map(([id, Icon, title, desc]) => (
          <Pressable key={id} onPress={() => onNavigate(id)} style={styles.reportCard}>
            <View style={styles.reportIcon}><Icon color={colors.white} size={30} /></View>
            <Text style={styles.reportTitle}>{title}</Text>
            <Text style={styles.reportDesc}>{desc}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function reportColumns(type: ReportType) {
  if (type === "stok") return ["Barang", "Kategori", "Stok", "Status"];
  if (type === "penjualan") return ["No. Nota", "Tanggal", "Status", "Kasir", "Customer", "Total"];
  if (type === "masuk") return ["Tanggal", "Barang", "Jumlah", "Supplier", "User"];
  return ["Tanggal", "Barang", "Jumlah", "Alasan", "User"];
}

function reportPath(type: ReportType, exportType?: "csv" | "pdf") {
  const base = type === "stok" ? "/reports/stock" : type === "penjualan" ? "/reports/sales" : type === "masuk" ? "/reports/inbound" : "/reports/outbound";
  if (exportType === "csv") return `${base}/export`;
  if (exportType === "pdf") return `${base}/export.pdf`;
  return base;
}

function filterQuery(type: ReportType, filters: ReportFilters, page?: number) {
  const query = new URLSearchParams({ per_page: String(reportPageSize) });
  if (page) query.set("page", String(page));
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.productId) query.set("product_id", filters.productId);
  if (filters.categoryId) query.set("category_id", filters.categoryId);
  if (filters.status && (type === "stok" || type === "penjualan")) query.set("status", filters.status);
  if (filters.partyId && type === "masuk") query.set("supplier_id", filters.partyId);
  if (filters.partyId && (type === "penjualan" || type === "keluar")) query.set("customer_id", filters.partyId);
  return query.toString();
}

function FilterSelect({ label, onChange, onToggle, open, options, value }: { label: string; onChange: (value: string) => void; onToggle: () => void; open: boolean; options: FilterOption[]; value: string }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const selected = options.find((option) => option.value === value);

  return (
    <View style={[styles.filterInputGroup, compact && styles.filterInputGroupMobile, open && { zIndex: 20 }]}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable onPress={onToggle} style={styles.modalSelect}>
        <Text style={styles.modalSelectText}>{selected?.label ?? "Semua"}</Text>
        <ChevronDown color={colors.muted} size={18} />
      </Pressable>
      {open ? (
        <ScrollView style={styles.filterSelectOptions} nestedScrollEnabled>
          {options.map((option) => (
            <Pressable key={option.value || "all"} onPress={() => onChange(option.value)} style={[styles.modalSelectOption, option.value === value && styles.modalSelectOptionActive]}>
              <Text style={[styles.modalSelectOptionText, option.value === value && styles.modalSelectOptionTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

export function ReportDetail({ type, onBack }: { type: ReportType; onBack: () => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const { categories, customers, stockItems, suppliers, token } = useInventoryData();
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const title = type === "stok" ? "Daftar Stok Barang" : type === "penjualan" ? "Daftar Transaksi Penjualan" : type === "masuk" ? "Daftar Barang Masuk" : "Daftar Barang Keluar";
  const exportCsvPath = `${reportPath(type, "csv")}?${filterQuery(type, filters)}`;
  const exportPdfPath = `${reportPath(type, "pdf")}?${filterQuery(type, filters)}`;
  const categoryOptions = [{ label: "Semua kategori", value: "" }, ...categories.map((category) => ({ label: category.name, value: category.id }))];
  const productOptions = [{ label: "Semua produk", value: "" }, ...stockItems.map((product) => ({ label: `${product.sku} - ${product.name}`, value: product.id }))];
  const partyOptions = [{ label: type === "masuk" ? "Semua supplier" : "Semua customer", value: "" }, ...(type === "masuk" ? suppliers : customers).map((party) => ({ label: party.name, value: party.id }))];
  const statusOptions = type === "stok" ? [{ label: "Semua status", value: "" }, { label: "Aman", value: "safe" }, { label: "Menipis", value: "low" }, { label: "Habis", value: "empty" }] : [{ label: "Semua status", value: "" }, { label: "Selesai", value: "completed" }, { label: "Void", value: "void" }];

  const updateFilter = (patch: Partial<ReportFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setOpenFilter(null);
  };

  const loadReport = async (nextFilters = filters, nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const path = `${reportPath(type)}?${filterQuery(type, nextFilters, nextPage)}`;
      let nextRows: string[][] = [];
      let nextTotalAmount = 0;
      let nextLowStockCount = lowStockCount;
      let meta: Paginated<unknown>["meta"];

      if (type === "stok") {
        const response = await apiRequest<Paginated<ReportProduct>>(path, { token });
        nextRows = response.data.map((item) => [item.name, item.category?.name ?? "-", String(item.stock), item.status]);
        nextLowStockCount = append ? lowStockCount + response.data.filter((item) => item.status === "low").length : response.data.filter((item) => item.status === "low").length;
        meta = response.meta;
      } else if (type === "penjualan") {
        const response = await apiRequest<Paginated<ReportSale>>(path, { token });
        nextRows = response.data.map((sale) => [sale.invoiceNumber, formatDate(sale.createdAt), sale.status, sale.cashier ?? "-", sale.customer ?? "-", formatCurrency(sale.totalAmount)]);
        nextTotalAmount = response.data.reduce((total, sale) => total + sale.totalAmount, 0);
        nextLowStockCount = stockItems.filter((item) => item.status === "low").length;
        meta = response.meta;
      } else {
        const response = await apiRequest<Paginated<ReportMovement>>(path, { token });
        nextRows = response.data.map((item) => [formatDate(item.createdAt), item.productName, String(item.quantity), type === "masuk" ? item.supplier ?? item.party ?? "-" : item.customer ?? item.note ?? "-", item.operator ?? "-"]);
        nextLowStockCount = stockItems.filter((item) => item.status === "low").length;
        meta = response.meta;
      }

      setRows((current) => append ? [...current, ...nextRows] : nextRows);
      setTotalAmount((current) => append ? current + nextTotalAmount : nextTotalAmount);
      setLowStockCount(nextLowStockCount);
      setPage(meta?.currentPage ?? nextPage);
      setLastPage(meta?.lastPage ?? nextPage);
      setTotalRows(meta?.total ?? (append ? rows.length + nextRows.length : nextRows.length));
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Laporan gagal dimuat.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || loading || page >= lastPage) return;
    void loadReport(filters, page + 1, true);
  };

  useEffect(() => {
    void loadReport();
  }, [type, token]);

  const exportCsv = async () => {
    if (exporting) return;
    setExporting("csv");
    try {
      await downloadCsv(exportCsvPath, token, `laporan-${type}.csv`);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Export CSV gagal.");
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    if (exporting) return;
    setExporting("pdf");
    try {
      await downloadPdf(exportPdfPath, token, `laporan-${type}.pdf`);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Export PDF gagal.");
    } finally {
      setExporting(null);
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setOpenFilter(null);
    void loadReport(defaultFilters);
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.reportFilter, compact && styles.reportFilterMobile]}>
        <DateField label="Dari" value={filters.from} onChange={(from) => updateFilter({ from })} />
        <DateField label="Sampai" value={filters.to} onChange={(to) => updateFilter({ to })} />
        <FilterSelect label="Kategori" options={categoryOptions} value={filters.categoryId} open={openFilter === "category"} onToggle={() => setOpenFilter(openFilter === "category" ? null : "category")} onChange={(categoryId) => updateFilter({ categoryId })} />
        <FilterSelect label="Produk" options={productOptions} value={filters.productId} open={openFilter === "product"} onToggle={() => setOpenFilter(openFilter === "product" ? null : "product")} onChange={(productId) => updateFilter({ productId })} />
        {type === "stok" || type === "penjualan" ? <FilterSelect label="Status" options={statusOptions} value={filters.status} open={openFilter === "status"} onToggle={() => setOpenFilter(openFilter === "status" ? null : "status")} onChange={(status) => updateFilter({ status })} /> : null}
        {type === "masuk" || type === "keluar" || type === "penjualan" ? <FilterSelect label={type === "masuk" ? "Supplier" : "Customer"} options={partyOptions} value={filters.partyId} open={openFilter === "party"} onToggle={() => setOpenFilter(openFilter === "party" ? null : "party")} onChange={(partyId) => updateFilter({ partyId })} /> : null}
        <View style={[styles.inlineActions, compact && styles.inlineActionsMobile]}>
          <Pressable disabled={loading} onPress={() => void loadReport()} style={[styles.secondaryButton, compact && styles.reportActionButtonMobile, loading && styles.disabledButton]}>
            <Text style={styles.secondaryButtonText}>{loading ? "Memuat..." : "Terapkan"}</Text>
          </Pressable>
          <Pressable disabled={loading || Boolean(exporting)} onPress={resetFilters} style={[styles.cancelButton, compact && styles.reportActionButtonMobile, (loading || exporting) && styles.disabledButton]}>
            <Text style={styles.cancelText}>Reset</Text>
          </Pressable>
          <Pressable disabled={Boolean(exporting)} onPress={() => void exportCsv()} style={[styles.saveButton, compact && styles.reportActionButtonMobile, exporting && styles.disabledButton]}>
            <Text style={styles.saveText}>{exporting === "csv" ? "Menyiapkan CSV..." : "Export CSV"}</Text>
          </Pressable>
          <Pressable disabled={Boolean(exporting)} onPress={() => void exportPdf()} style={[styles.secondaryButton, compact && styles.reportActionButtonMobile, exporting && styles.disabledButton]}>
            <Text style={styles.secondaryButtonText}>{exporting === "pdf" ? "Menyiapkan PDF..." : "Export PDF"}</Text>
          </Pressable>
        </View>
        <Text style={styles.upgrade}>Export mengikuti filter aktif. PDF memakai generator ringan agar aman di shared hosting.</Text>
      </View>
      <View style={[styles.pageHead, compact && styles.pageHeadMobile]}>
        <View>
          <Text style={[styles.noticeTitle, compact && styles.noticeTitleMobile]}>{title}</Text>
          <Text style={[styles.pageSubheading, compact && styles.pageSubheadingMobile]}>Tampilan ini mengambil data langsung dari API backend.</Text>
        </View>
        <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>Kembali</Text></Pressable>
      </View>
      <View style={styles.metricGrid}>
        <Metric title="Data Tampil" value={`${rows.length}/${totalRows || rows.length}`} />
        <Metric title="Total Nilai" value={formatCurrency(totalAmount)} />
        <Metric title="Stok Menipis" value={String(lowStockCount)} />
      </View>
      <WhiteCard title="Data Laporan" subtitle="Gunakan filter untuk mempersempit data sebelum export.">
        <DataTable columns={reportColumns(type)}>
          {rows.map((row, index) => <TableRow key={`${type}-${index}`} cells={row} />)}
          {!rows.length ? <EmptyRow text={loading ? "Memuat laporan..." : "Tidak ada data laporan"} /> : null}
        </DataTable>
        {page < lastPage ? (
          <Pressable disabled={loadingMore} onPress={loadMore} style={[styles.secondaryButton, styles.loadMoreButton, loadingMore && styles.disabledButton]}>
            <Text style={styles.secondaryButtonText}>{loadingMore ? "Memuat data..." : `Muat Lagi (${rows.length}/${totalRows})`}</Text>
          </Pressable>
        ) : null}
      </WhiteCard>
    </View>
  );
}

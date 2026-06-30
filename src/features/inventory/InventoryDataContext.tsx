import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardSummary, PriorityProduct, RecentActivity, StockItem, StockMovement } from "../../types/dashboard";
import { apiRequest } from "./api";
import type { CategoryItem, ChartPoint, PageKey } from "./types";

const emptySummary: DashboardSummary = {
  totalSku: 0,
  totalUnits: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  stockHealth: {
    healthy: 0,
    low: 0,
    empty: 0,
  },
};

export type SaleRow = {
  id: string;
  invoiceNumber: string;
  cashier: string | null;
  address?: string | null;
  status: "completed" | "void";
  items?: Array<{ productId: string; productName?: string | null; quantity: number }>;
  createdAt: string;
};

export type RestockAlertRow = {
  id: string;
  productId: string;
  product?: { name?: string; sku?: string; category?: string | null } | null;
  status: "open" | "acknowledged" | "resolved";
  severity: "low" | "empty";
  currentStock: number;
  threshold: number;
  note?: string | null;
  updatedAt?: string | null;
};

type Paginated<T> = { data: T[] };
type PaginationMeta = { currentPage: number; from?: number | null; lastPage: number; perPage: number; to?: number | null; total: number };
const emptyMeta: PaginationMeta = { currentPage: 1, from: null, lastPage: 1, perPage: 15, to: null, total: 0 };

type ProductDto = {
  id: string;
  categoryId: string;
  category?: { name?: string } | null;
  name: string;
  sku: string;
  barcode: string | null;
  imageUrl?: string | null;
  minStock: number;
  stock: number;
  serialNumbers?: string[];
  status: "safe" | "low" | "empty";
  isActive: boolean;
  updatedAt?: string;
};

type CategoryDto = { id: string; name: string; description?: string | null; productsCount?: number };
type MovementDto = StockMovement & { createdAt?: string; type: StockMovement["type"] };
type MovementFilterType = StockMovement["type"];
type BootstrapDto = { categories: CategoryDto[] };
type RealtimeDto = { pollAfterSeconds: number; summary: DashboardSummary; priorityProducts: PriorityProduct[]; recentActivities: RecentActivity[] };
type ReportSummary = {
  sales: { completedCount: number; completedQuantity: number; voidCount: number };
  stockMovements: { adjustmentCount: number; inboundQuantity: number; outboundQuantity: number; saleQuantity: number };
  stock: { lowStockCount: number; lowStockUnits: number; outOfStockCount: number; totalSku: number; totalUnits: number };
};

const emptyReportSummary: ReportSummary = {
  sales: { completedCount: 0, completedQuantity: 0, voidCount: 0 },
  stockMovements: { adjustmentCount: 0, inboundQuantity: 0, outboundQuantity: 0, saleQuantity: 0 },
  stock: { lowStockCount: 0, lowStockUnits: 0, outOfStockCount: 0, totalSku: 0, totalUnits: 0 },
};

type InventoryData = {
  categories: CategoryItem[];
  error: string | null;
  loading: boolean;
  movements: StockMovement[];
  priorityProducts: PriorityProduct[];
  recentActivities: RecentActivity[];
  reportSummary: ReportSummary;
  refresh: (page?: PageKey) => Promise<void>;
  refreshRestockAlerts: () => Promise<void>;
  refreshStockActivity: () => Promise<void>;
  loadProductsPage: (page?: number, categoryId?: string, status?: string, search?: string, perPage?: number) => Promise<void>;
  loadMovementsPage: (page?: number, type?: MovementFilterType, from?: string, to?: string) => Promise<void>;
  loadSalesPage: (page?: number, search?: string, from?: string, to?: string) => Promise<void>;
  loadRestockAlertsPage: (page?: number, search?: string) => Promise<void>;
  restockAlerts: RestockAlertRow[];
  sales: SaleRow[];
  summary: DashboardSummary;
  stockItems: StockItem[];
  token: string;
  productMeta: PaginationMeta;
  movementMeta: PaginationMeta;
  saleMeta: PaginationMeta;
  restockMeta: PaginationMeta;
};

const InventoryDataContext = createContext<InventoryData | null>(null);

export function InventoryDataProvider({ activePage, children, token }: { activePage: PageKey; children: ReactNode; token: string }) {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [priorityProducts, setPriorityProducts] = useState<PriorityProduct[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [restockAlerts, setRestockAlerts] = useState<RestockAlertRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [reportSummary, setReportSummary] = useState<ReportSummary>(emptyReportSummary);
  const [productMeta, setProductMeta] = useState<PaginationMeta>(emptyMeta);
  const [movementMeta, setMovementMeta] = useState<PaginationMeta>(emptyMeta);
  const [saleMeta, setSaleMeta] = useState<PaginationMeta>(emptyMeta);
  const [restockMeta, setRestockMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const applyProducts = (products: ProductDto[]) => {
    setStockItems(products.map((product) => ({
      id: product.id,
      barcode: product.barcode ?? "",
      category: product.category?.name ?? "-",
      categoryId: product.categoryId,
      isActive: product.isActive,
      imageUrl: product.imageUrl,
      lastUpdated: product.updatedAt ?? "-",
      location: "-",
      minStock: product.minStock,
      name: product.name,
      sku: product.sku,
      serialNumbers: product.serialNumbers ?? [],
      status: product.status,
      stock: product.stock,
    })));
  };

  const loadSummary = () => apiRequest<DashboardSummary>("/dashboard/summary", { token }).then(setSummary);
  const loadReportSummary = () => apiRequest<ReportSummary>("/reports/summary", { token }).then(setReportSummary);
  const loadPriorityProducts = () => apiRequest<PriorityProduct[]>("/dashboard/priority-products", { token }).then(setPriorityProducts);
  const loadRecentActivities = () => apiRequest<RecentActivity[]>("/dashboard/recent-activities", { token }).then((data) => setRecentActivities(data.map((item) => ({ ...item, timestamp: item.timestamp }))));
  const loadProductsPage = (page = productMeta.currentPage, categoryId = "", status = "", search = "", perPage = 15) => {
    const params = new URLSearchParams({ include_serials: "1", page: String(page), per_page: String(perPage) });
    if (categoryId) params.set("category_id", categoryId);
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    return apiRequest<Paginated<ProductDto> & { meta?: PaginationMeta }>(`/products?${params.toString()}`, { token }).then((data) => { applyProducts(data.data); setProductMeta(data.meta ?? emptyMeta); });
  };
  const loadCategories = () => apiRequest<CategoryDto[]>("/categories", { token }).then((data) => setCategories(data.map((category) => ({ id: category.id, name: category.name, desc: category.description ?? "-", count: category.productsCount ?? 0 }))));
  const loadMovementsPage = (page = movementMeta.currentPage, type?: MovementFilterType, from = "", to = "") => {
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return apiRequest<Paginated<MovementDto> & { meta?: PaginationMeta }>(`/stock/movements?${params.toString()}`, { token }).then((data) => { setMovements(data.data.map((movement) => ({ ...movement, timestamp: movement.createdAt ?? movement.timestamp }))); setMovementMeta(data.meta ?? emptyMeta); });
  };
  const loadSalesPage = (page = saleMeta.currentPage, search = "", from = "", to = "") => {
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (search.trim()) params.set("search", search.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return apiRequest<Paginated<SaleRow> & { meta?: PaginationMeta }>(`/sales?${params.toString()}`, { token }).then((data) => { setSales(data.data); setSaleMeta(data.meta ?? emptyMeta); });
  };
  const loadRestockAlertsPage = (page = restockMeta.currentPage, search = "") => {
    const params = new URLSearchParams({ active_only: "1", page: String(page), per_page: "15", severity: "empty" });
    if (search.trim()) params.set("search", search.trim());
    return apiRequest<Paginated<RestockAlertRow> & { meta?: PaginationMeta }>(`/restock-alerts?${params.toString()}`, { token }).then((data) => { setRestockAlerts(data.data); setRestockMeta(data.meta ?? emptyMeta); });
  };
  const refreshRestockAlerts = () => loadRestockAlertsPage(1);
  const refreshStockActivity = () => loadMovementsPage(1);

  const refresh = useCallback(async (page: PageKey = activePage) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (page === "dashboard") await Promise.all([loadSummary(), loadProductsPage(1, "", "", "", 100), loadMovementsPage(1, "outbound")]);
      if (page === "kategori") await loadCategories();
      if (page === "stok") await loadProductsPage(1);
      if (page === "scan") setError(null);
      if (page === "masuk") await loadMovementsPage(1, "inbound");
      if (page === "keluar") await loadMovementsPage(1, "outbound");
      if (page === "laporan") await loadReportSummary();
      if (page === "laporan-stok") await Promise.all([loadSummary(), loadProductsPage(1)]);
      if (page === "laporan-penjualan") await loadSalesPage(1);
      if (page === "laporan-masuk") await loadMovementsPage(1, "inbound");
      if (page === "laporan-keluar") await loadMovementsPage(1, "outbound");
      if (page === "admin") setError(null);
    } catch (requestError) {
      const msg = requestError instanceof Error ? requestError.message : "";
      setError(msg.match(/network|fetch|load/i) ? "Tidak ada koneksi ke server. Periksa koneksi internet Anda." : msg || "Gagal memuat data.");
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [activePage, token]);

  useEffect(() => {
    void refresh(activePage);
  }, [activePage, refresh, token]);

  const value = useMemo(() => ({ categories, error, loadMovementsPage, loadProductsPage, loadRestockAlertsPage, loadSalesPage, loading, movementMeta, movements, priorityProducts, productMeta, recentActivities, refresh, refreshRestockAlerts, refreshStockActivity, reportSummary, restockAlerts, restockMeta, saleMeta, sales, summary, stockItems, token }), [categories, error, loading, movementMeta, movements, priorityProducts, productMeta, recentActivities, refresh, refreshRestockAlerts, refreshStockActivity, reportSummary, restockAlerts, restockMeta, saleMeta, sales, summary, stockItems, token]);

  return <InventoryDataContext.Provider value={value}>{children}</InventoryDataContext.Provider>;
}

export function useInventoryData() {
  const value = useContext(InventoryDataContext);
  if (!value) throw new Error("useInventoryData must be used inside InventoryDataProvider");
  return value;
}

export async function loadChart(token: string, type: "sales" | "top", period: string): Promise<ChartPoint[]> {
  const path = type === "sales" ? "/dashboard/sales-chart" : "/dashboard/top-products";
  return apiRequest<ChartPoint[]>(`${path}?period=${period}`, { token });
}

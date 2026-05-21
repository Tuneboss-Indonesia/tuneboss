import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardSummary, PriorityProduct, RecentActivity, StockItem, StockMovement } from "../../types/dashboard";
import { dashboardSummary as fallbackSummary, priorityProducts as fallbackPriority, recentActivities as fallbackActivities, stockItems as fallbackStockItems, stockMovements as fallbackMovements } from "../../data/dashboard.data";
import { apiRequest } from "./api";
import { categories as fallbackCategories } from "./data";
import type { CategoryItem, ChartPoint, PageKey } from "./types";

export type SaleRow = {
  id: string;
  invoiceNumber: string;
  cashier: string | null;
  address?: string | null;
  totalAmount: number;
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

export type PartyRow = {
  id: string;
  name: string;
  phone?: string | null;
  isActive?: boolean;
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
  status: "safe" | "low" | "empty";
  isActive: boolean;
  updatedAt?: string;
};

type CategoryDto = { id: string; name: string; description?: string | null; productsCount?: number };
type MovementDto = StockMovement & { createdAt?: string; type: StockMovement["type"] };
type BootstrapDto = { categories: CategoryDto[]; suppliers: PartyRow[]; customers: PartyRow[] };
type RealtimeDto = { pollAfterSeconds: number; summary: DashboardSummary; priorityProducts: PriorityProduct[]; recentActivities: RecentActivity[] };

type InventoryData = {
  categories: CategoryItem[];
  error: string | null;
  loading: boolean;
  movements: StockMovement[];
  priorityProducts: PriorityProduct[];
  recentActivities: RecentActivity[];
  refresh: () => Promise<void>;
  loadProductsPage: (page?: number, categoryId?: string, status?: string, search?: string) => Promise<void>;
  loadMovementsPage: (page?: number, type?: "inbound" | "outbound") => Promise<void>;
  loadSalesPage: (page?: number, search?: string, from?: string, to?: string) => Promise<void>;
  loadRestockAlertsPage: (page?: number, search?: string) => Promise<void>;
  restockAlerts: RestockAlertRow[];
  sales: SaleRow[];
  summary: DashboardSummary;
  stockItems: StockItem[];
  suppliers: PartyRow[];
  customers: PartyRow[];
  token: string;
  productMeta: PaginationMeta;
  movementMeta: PaginationMeta;
  saleMeta: PaginationMeta;
  restockMeta: PaginationMeta;
};

const InventoryDataContext = createContext<InventoryData | null>(null);

export function InventoryDataProvider({ activePage, children, token }: { activePage: PageKey; children: ReactNode; token: string }) {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  const [priorityProducts, setPriorityProducts] = useState<PriorityProduct[]>(fallbackPriority);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(fallbackActivities);
  const [stockItems, setStockItems] = useState<StockItem[]>(fallbackStockItems);
  const [movements, setMovements] = useState<StockMovement[]>(fallbackMovements);
  const [categories, setCategories] = useState<CategoryItem[]>(fallbackCategories);
  const [restockAlerts, setRestockAlerts] = useState<RestockAlertRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [suppliers, setSuppliers] = useState<PartyRow[]>([]);
  const [customers, setCustomers] = useState<PartyRow[]>([]);
  const [productMeta, setProductMeta] = useState<PaginationMeta>(emptyMeta);
  const [movementMeta, setMovementMeta] = useState<PaginationMeta>(emptyMeta);
  const [saleMeta, setSaleMeta] = useState<PaginationMeta>(emptyMeta);
  const [restockMeta, setRestockMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      status: product.status,
      stock: product.stock,
    })));
  };

  const loadSummary = () => apiRequest<DashboardSummary>("/dashboard/summary", { token }).then(setSummary);
  const loadPriorityProducts = () => apiRequest<PriorityProduct[]>("/dashboard/priority-products", { token }).then(setPriorityProducts);
  const loadRecentActivities = () => apiRequest<RecentActivity[]>("/dashboard/recent-activities", { token }).then((data) => setRecentActivities(data.map((item) => ({ ...item, timestamp: item.timestamp }))));
  const loadProductsPage = (page = productMeta.currentPage, categoryId = "", status = "", search = "", perPage = 15) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (categoryId) params.set("category_id", categoryId);
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    return apiRequest<Paginated<ProductDto> & { meta?: PaginationMeta }>(`/products?${params.toString()}`, { token }).then((data) => { applyProducts(data.data); setProductMeta(data.meta ?? emptyMeta); });
  };
  const loadCategories = () => apiRequest<CategoryDto[]>("/categories", { token }).then((data) => setCategories(data.map((category) => ({ id: category.id, name: category.name, desc: category.description ?? "-", count: category.productsCount ?? 0 }))));
  const loadMovementsPage = (page = movementMeta.currentPage, type?: "inbound" | "outbound") => {
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (type) params.set("type", type);
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
  const loadSuppliers = () => apiRequest<Paginated<PartyRow>>("/suppliers?active=1&per_page=100", { token }).then((data) => setSuppliers(data.data));
  const loadCustomers = () => apiRequest<Paginated<PartyRow>>("/customers?active=1&per_page=100", { token }).then((data) => setCustomers(data.data));

  const refresh = useCallback(async (page: PageKey = activePage) => {
    setLoading(true);
    setError(null);

    try {
      if (page === "dashboard") await Promise.all([loadSummary(), loadPriorityProducts(), loadRecentActivities(), loadRestockAlertsPage(1)]);
      if (page === "kategori") await loadCategories();
      if (page === "stok") await Promise.all([loadProductsPage(1), loadCategories()]);
      if (page === "penjualan") await Promise.all([loadSalesPage(1), loadProductsPage(1, "", "Tersedia", "", 100)]);
      if (page === "scan") await loadProductsPage(1);
      if (page === "masuk") await Promise.all([loadMovementsPage(1, "inbound"), loadProductsPage(1), loadSuppliers()]);
      if (page === "keluar") await Promise.all([loadMovementsPage(1, "outbound"), loadProductsPage(1), loadCustomers()]);
      if (page === "laporan") await Promise.all([loadSummary(), loadMovementsPage(1), loadSalesPage(1)]);
      if (page === "laporan-stok") await Promise.all([loadSummary(), loadProductsPage(1)]);
      if (page === "laporan-penjualan") await Promise.all([loadSummary(), loadSalesPage(1)]);
      if (page === "laporan-masuk") await Promise.all([loadSummary(), loadMovementsPage(1, "inbound")]);
      if (page === "laporan-keluar") await Promise.all([loadSummary(), loadMovementsPage(1, "outbound")]);
      if (page === "admin") setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Gagal memuat data API.");
    } finally {
      setLoading(false);
    }
  }, [activePage, token]);

  useEffect(() => {
    void refresh(activePage);
  }, [activePage, refresh]);

  const value = useMemo(() => ({ categories, customers, error, loadMovementsPage, loadProductsPage, loadRestockAlertsPage, loadSalesPage, loading, movementMeta, movements, priorityProducts, productMeta, recentActivities, refresh, restockAlerts, restockMeta, saleMeta, sales, summary, stockItems, suppliers, token }), [categories, customers, error, loading, movementMeta, movements, priorityProducts, productMeta, recentActivities, refresh, restockAlerts, restockMeta, saleMeta, sales, summary, stockItems, suppliers, token]);

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

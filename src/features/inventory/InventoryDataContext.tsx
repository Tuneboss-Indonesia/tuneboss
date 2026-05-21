import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardSummary, PriorityProduct, RecentActivity, StockItem, StockMovement } from "../../types/dashboard";
import { dashboardSummary as fallbackSummary, priorityProducts as fallbackPriority, recentActivities as fallbackActivities, stockItems as fallbackStockItems, stockMovements as fallbackMovements } from "../../data/dashboard.data";
import { apiRequest } from "./api";
import { categories as fallbackCategories } from "./data";
import type { CategoryItem, ChartPoint } from "./types";

export type SaleRow = {
  id: string;
  invoiceNumber: string;
  cashier: string | null;
  totalAmount: number;
  status: "completed" | "void";
  items?: Array<{ quantity: number }>;
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

type ProductDto = {
  id: string;
  categoryId: string;
  category?: { name?: string } | null;
  name: string;
  sku: string;
  barcode: string | null;
  imageUrl?: string | null;
  salePrice: number;
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
  refreshCategories: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshRealtimeDashboard: () => Promise<number>;
  refreshRestockAlerts: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshStockActivity: () => Promise<void>;
  restockAlerts: RestockAlertRow[];
  sales: SaleRow[];
  summary: DashboardSummary;
  stockItems: StockItem[];
  suppliers: PartyRow[];
  customers: PartyRow[];
  token: string;
};

const InventoryDataContext = createContext<InventoryData | null>(null);

function mapProduct(product: ProductDto): StockItem {
  return {
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
    salePrice: product.salePrice,
    sku: product.sku,
    status: product.status,
    stock: product.stock,
  };
}

function mapCategory(category: CategoryDto): CategoryItem {
  return { id: category.id, name: category.name, desc: category.description ?? "-", count: category.productsCount ?? 0 };
}

export function InventoryDataProvider({ children, token }: { children: ReactNode; token: string }) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => setSummary(await apiRequest<DashboardSummary>("/dashboard/summary", { token }));
  const loadPriorityProducts = async () => setPriorityProducts(await apiRequest<PriorityProduct[]>("/dashboard/priority-products", { token }));
  const loadRecentActivities = async () => {
    const activityData = await apiRequest<RecentActivity[]>("/dashboard/recent-activities", { token });
    setRecentActivities(activityData.map((item) => ({ ...item, timestamp: item.timestamp })));
  };
  const loadProducts = async () => {
    const productData = await apiRequest<Paginated<ProductDto>>("/products?per_page=100", { token });
    setStockItems(productData.data.map(mapProduct));
  };
  const loadCategories = async () => {
    const categoryData = await apiRequest<CategoryDto[]>("/categories", { token });
    setCategories(categoryData.map(mapCategory));
  };
  const loadBootstrap = async () => {
    const bootstrap = await apiRequest<BootstrapDto>("/app/bootstrap", { token });
    setCategories(bootstrap.categories.map(mapCategory));
    setSuppliers(bootstrap.suppliers);
    setCustomers(bootstrap.customers);
  };
  const loadMovements = async () => {
    const movementData = await apiRequest<Paginated<MovementDto>>("/stock/movements?per_page=100", { token });
    setMovements(movementData.data.map((movement) => ({ ...movement, timestamp: movement.createdAt ?? movement.timestamp })));
  };
  const loadSales = async () => {
    const salesData = await apiRequest<Paginated<SaleRow>>("/sales?per_page=100", { token });
    setSales(salesData.data);
  };
  const loadRestockAlerts = async () => {
    const restockData = await apiRequest<Paginated<RestockAlertRow>>("/restock-alerts?active_only=1&per_page=20", { token });
    setRestockAlerts(restockData.data);
  };
  const loadSuppliers = async () => {
    const supplierData = await apiRequest<Paginated<PartyRow>>("/suppliers?active=1&per_page=100", { token });
    setSuppliers(supplierData.data);
  };
  const loadCustomers = async () => {
    const customerData = await apiRequest<Paginated<PartyRow>>("/customers?active=1&per_page=100", { token });
    setCustomers(customerData.data);
  };

  const refreshProducts = async () => {
    await Promise.all([loadSummary(), loadPriorityProducts(), loadProducts(), loadRestockAlerts()]);
  };

  const refreshCategories = async () => {
    await Promise.all([loadCategories(), loadProducts()]);
  };

  const refreshRestockAlerts = async () => {
    await loadRestockAlerts();
  };

  const refreshStockActivity = async () => {
    await Promise.all([loadSummary(), loadPriorityProducts(), loadRecentActivities(), loadProducts(), loadMovements(), loadRestockAlerts()]);
  };

  const refreshSales = async () => {
    await Promise.all([loadSummary(), loadPriorityProducts(), loadRecentActivities(), loadProducts(), loadMovements(), loadSales(), loadRestockAlerts()]);
  };

  const refreshRealtimeDashboard = async () => {
    const realtime = await apiRequest<RealtimeDto>("/dashboard/realtime", { token });
    setSummary(realtime.summary);
    setPriorityProducts(realtime.priorityProducts);
    setRecentActivities(realtime.recentActivities.map((item) => ({ ...item, timestamp: item.timestamp })));

    return realtime.pollAfterSeconds;
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadBootstrap(),
        refreshRealtimeDashboard(),
        loadProducts(),
        loadMovements(),
        loadSales(),
        loadRestockAlerts(),
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Gagal memuat data API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [token]);

  const value = useMemo(() => ({ categories, customers, error, loading, movements, priorityProducts, recentActivities, refresh, refreshCategories, refreshProducts, refreshRealtimeDashboard, refreshRestockAlerts, refreshSales, refreshStockActivity, restockAlerts, sales, summary, stockItems, suppliers, token }), [categories, customers, error, loading, movements, priorityProducts, recentActivities, restockAlerts, sales, summary, stockItems, suppliers, token]);

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

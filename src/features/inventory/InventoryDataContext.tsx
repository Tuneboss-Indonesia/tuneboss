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

type Paginated<T> = { data: T[] };

type ProductDto = {
  id: string;
  categoryId: string;
  category?: { name?: string } | null;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  minStock: number;
  stock: number;
  status: "safe" | "low" | "empty";
  isActive: boolean;
  updatedAt?: string;
};

type CategoryDto = { id: string; name: string; description?: string | null; productsCount?: number };
type MovementDto = StockMovement & { createdAt?: string; type: StockMovement["type"] };

type InventoryData = {
  categories: CategoryItem[];
  error: string | null;
  loading: boolean;
  movements: StockMovement[];
  priorityProducts: PriorityProduct[];
  recentActivities: RecentActivity[];
  refresh: () => Promise<void>;
  sales: SaleRow[];
  summary: DashboardSummary;
  stockItems: StockItem[];
  token: string;
};

const InventoryDataContext = createContext<InventoryData | null>(null);

export function InventoryDataProvider({ children, token }: { children: ReactNode; token: string }) {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  const [priorityProducts, setPriorityProducts] = useState<PriorityProduct[]>(fallbackPriority);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(fallbackActivities);
  const [stockItems, setStockItems] = useState<StockItem[]>(fallbackStockItems);
  const [movements, setMovements] = useState<StockMovement[]>(fallbackMovements);
  const [categories, setCategories] = useState<CategoryItem[]>(fallbackCategories);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, priorityData, activityData, productData, categoryData, movementData, salesData] = await Promise.all([
        apiRequest<DashboardSummary>("/dashboard/summary", { token }),
        apiRequest<PriorityProduct[]>("/dashboard/priority-products", { token }),
        apiRequest<RecentActivity[]>("/dashboard/recent-activities", { token }),
        apiRequest<Paginated<ProductDto>>("/products?per_page=100", { token }),
        apiRequest<CategoryDto[]>("/categories", { token }),
        apiRequest<Paginated<MovementDto>>("/stock/movements?per_page=100", { token }),
        apiRequest<Paginated<SaleRow>>("/sales?per_page=100", { token }),
      ]);

      setSummary(summaryData);
      setPriorityProducts(priorityData);
      setRecentActivities(activityData.map((item) => ({ ...item, timestamp: item.timestamp })));
      setStockItems(productData.data.map((product) => ({
        id: product.id,
        barcode: product.barcode ?? "",
        category: product.category?.name ?? "-",
        categoryId: product.categoryId,
        isActive: product.isActive,
        lastUpdated: product.updatedAt ?? "-",
        location: "-",
        minStock: product.minStock,
        name: product.name,
        salePrice: product.salePrice,
        sku: product.sku,
        status: product.status,
        stock: product.stock,
      })));
      setCategories(categoryData.map((category) => ({ id: category.id, name: category.name, desc: category.description ?? "-", count: category.productsCount ?? 0 })));
      setMovements(movementData.data.map((movement) => ({ ...movement, timestamp: movement.createdAt ?? movement.timestamp })));
      setSales(salesData.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Gagal memuat data API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [token]);

  const value = useMemo(() => ({ categories, error, loading, movements, priorityProducts, recentActivities, refresh, sales, summary, stockItems, token }), [categories, error, loading, movements, priorityProducts, recentActivities, sales, summary, stockItems, token]);

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

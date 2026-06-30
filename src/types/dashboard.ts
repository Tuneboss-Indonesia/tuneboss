export type DashboardSummary = {
  totalSku: number;
  totalUnits: number;
  lowStockUnits?: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockHealth: {
    healthy: number;
    low: number;
    empty: number;
  };
};

export type ProductStatus = "safe" | "low" | "empty";

export type PriorityProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  stock: number;
  serialNumbers?: string[];
  minStock: number;
  status: ProductStatus;
};

export type RecentActivity = {
  id: string;
  type: "inbound" | "outbound" | "adjustment" | "sale";
  productName: string;
  quantity: number;
  operator: string;
  timestamp: string;
};

export type StockItem = PriorityProduct & {
  category: string;
  location: string;
  lastUpdated: string;
  categoryId?: string;
  isActive?: boolean;
  imageUrl?: string | null;
  serialNumbers?: string[];
};

export type StockMovement = {
  id: string;
  productId: string;
  type: "inbound" | "outbound" | "adjustment" | "sale";
  productName: string;
  productCategory?: string | null;
  sku: string;
  serialNumbers?: string[];
  quantity: number;
  beforeQuantity?: number;
  afterQuantity?: number;
  operator: string;
  party: string;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentStatus?: "Lunas" | "DP" | "Unpaid" | "PayLater" | null;
  paymentMethod?: string | null;
  nominalAmount?: string | number | null;
  saleAddress?: string | null;
  saleInvoice?: string | null;
  timestamp: string;
  note: string;
};

export type QuickAction = {
  id: string;
  title: string;
  description: string;
  state: "ready" | "coming-soon";
};

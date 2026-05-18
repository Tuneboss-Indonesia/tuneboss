export type DashboardSummary = {
  totalSku: number;
  totalUnits: number;
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
  minStock: number;
  status: ProductStatus;
};

export type RecentActivity = {
  id: string;
  type: "inbound" | "outbound" | "adjustment";
  productName: string;
  quantity: number;
  operator: string;
  timestamp: string;
};

export type StockItem = PriorityProduct & {
  category: "ECU" | "Cable" | "Accessory";
  location: string;
  lastUpdated: string;
};

export type StockMovement = {
  id: string;
  type: "inbound" | "outbound";
  productName: string;
  sku: string;
  quantity: number;
  operator: string;
  party: string;
  timestamp: string;
  note: string;
};

export type QuickAction = {
  id: string;
  title: string;
  description: string;
  state: "ready" | "coming-soon";
};

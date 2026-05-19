import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, Metric, TableRow, WhiteCard } from "../components/common";
import { styles } from "../styles";

type Paginated<T> = { data: T[] };
type RestockOrder = {
  id: string;
  product?: { name?: string; sku?: string; stock?: number; minStock?: number } | null;
  quantity: number;
  receivedAt?: string | null;
  status: "draft" | "ordered" | "received" | "cancelled";
  supplier?: string | null;
  createdAt?: string | null;
};

export function RestockPage() {
  const { refresh, restockAlerts, stockItems, suppliers, token } = useInventoryData();
  const [orders, setOrders] = useState<RestockOrder[]>([]);
  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"draft" | "ordered">("draft");
  const [productOpen, setProductOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedProduct = stockItems.find((item) => item.id === productId);
  const selectedSupplier = suppliers.find((item) => item.id === supplierId);
  const activeOrders = orders.filter((order) => order.status === "draft" || order.status === "ordered");

  const loadOrders = async () => {
    const response = await apiRequest<Paginated<RestockOrder>>("/restock-orders?per_page=100", { token });
    setOrders(response.data);
  };

  useEffect(() => {
    void loadOrders().catch((error) => Alert.alert("Gagal", error instanceof Error ? error.message : "Restock order gagal dimuat."));
  }, [token]);

  const createOrder = async () => {
    if (!selectedProduct) {
      Alert.alert("Gagal", "Pilih produk terlebih dahulu.");
      return;
    }

    setSaving(true);
    try {
      const alert = restockAlerts.find((item) => item.productId === selectedProduct.id);
      await apiRequest("/restock-orders", { body: JSON.stringify({ note, product_id: selectedProduct.id, quantity: Number(quantity || 0), restock_alert_id: alert?.id ?? null, status, supplier_id: supplierId || null }), method: "POST", token });
      await Promise.all([loadOrders(), refresh()]);
      setNote("");
      setQuantity("1");
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Restock order gagal dibuat.");
    } finally {
      setSaving(false);
    }
  };

  const updateOrder = async (id: string, action: "receive" | "cancel") => {
    try {
      await apiRequest(`/restock-orders/${id}/${action}`, { body: JSON.stringify({ note: action === "receive" ? "Diterima dari dashboard restock" : "Dibatalkan dari dashboard restock" }), method: "POST", token });
      await Promise.all([loadOrders(), refresh()]);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Restock order gagal diproses.");
    }
  };

  return <View style={styles.stack}><CrudShell title="Restock Workflow" subtitle="Buat rencana pembelian dari stok menipis, lalu terima barang untuk menambah stok."><View style={styles.metricGrid}><Metric title="Alert Aktif" value={String(restockAlerts.length)} /><Metric title="Order Aktif" value={String(activeOrders.length)} /><Metric title="Received" value={String(orders.filter((order) => order.status === "received").length)} /></View><WhiteCard title="Buat Restock Order"><View style={styles.stack}><View style={styles.modalFieldGroup}><Text style={styles.modalLabel}>Produk</Text><Pressable onPress={() => setProductOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : "Pilih produk"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>{productOpen ? <View style={styles.modalSelectOptions}>{stockItems.filter((item) => item.status !== "safe").map((item) => <Pressable key={item.id} onPress={() => { setProductId(item.id); setQuantity(String(Math.max(item.minStock - item.stock, 1))); setProductOpen(false); }} style={[styles.modalSelectOption, productId === item.id && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, productId === item.id && styles.modalSelectOptionTextActive]}>{item.sku} - {item.name} | stok {item.stock}/{item.minStock}</Text></Pressable>)}{!stockItems.filter((item) => item.status !== "safe").length ? <Text style={styles.emptyText}>Tidak ada produk perlu restock</Text> : null}</View> : null}</View><View style={styles.modalFieldGroup}><Text style={styles.modalLabel}>Supplier</Text><Pressable onPress={() => setSupplierOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedSupplier?.name || "Pilih supplier"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>{supplierOpen ? <View style={styles.modalSelectOptions}>{suppliers.map((item) => <Pressable key={item.id} onPress={() => { setSupplierId(item.id); setSupplierOpen(false); }} style={[styles.modalSelectOption, supplierId === item.id && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, supplierId === item.id && styles.modalSelectOptionTextActive]}>{item.name}</Text></Pressable>)}</View> : null}</View><TextInput onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} style={styles.modalInput} placeholder="Qty restock" placeholderTextColor={colors.muted} value={quantity} keyboardType="number-pad" inputMode="numeric" /><TextInput onChangeText={setNote} style={styles.modalInput} placeholder="Catatan pembelian" placeholderTextColor={colors.muted} value={note} /><View style={styles.chipRow}><Pressable onPress={() => setStatus("draft")} style={[styles.chip, status === "draft" && styles.chipActive]}><Text style={styles.chipText}>Draft</Text></Pressable><Pressable onPress={() => setStatus("ordered")} style={[styles.chip, status === "ordered" && styles.chipActive]}><Text style={styles.chipText}>Ordered</Text></Pressable></View><View style={styles.modalActions}><Pressable disabled={saving} onPress={() => void createOrder()} style={styles.saveButton}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Buat Order"}</Text></Pressable></View></View></WhiteCard><WhiteCard title="Restock Orders"><DataTable columns={["Produk", "Supplier", "Qty", "Status", "Dibuat", "Aksi"]}>{orders.map((order) => <TableRow key={order.id} cells={[order.product?.name ?? "-", order.supplier ?? "-", String(order.quantity), order.status, formatDate(order.createdAt)]} actions={order.status === "draft" || order.status === "ordered" ? <View style={styles.rowActions}><Pressable onPress={() => void updateOrder(order.id, "receive")} style={styles.saveButton}><Text style={styles.saveText}>Receive</Text></Pressable><Pressable onPress={() => void updateOrder(order.id, "cancel")} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable></View> : <Text style={styles.pageSubheading}>{order.status === "received" ? formatDate(order.receivedAt) : "Final"}</Text>} />)}{!orders.length ? <EmptyRow text="Belum ada restock order" /> : null}</DataTable></WhiteCard></CrudShell></View>;
}

import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { colors } from "../../../theme/tokens";
import { styles } from "../styles";
import { apiRequest, formatCurrency, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, Metric, RowActions, TableRow } from "../components/common";

type SalePreview = {
  items: Array<{ name: string; sku: string; quantity: number; availableStock: number; subtotal: number }>;
  totalAmount: number;
  totalItems: number;
  canSubmit: boolean;
};

type CartItem = { id: string; quantity: string; sku: string };
type ProductLookup = { id: string };
type SaleDetail = {
  cashier: string | null;
  createdAt: string;
  customer?: string | null;
  invoiceNumber: string;
  items: Array<{ id: string; price: number; productName: string; quantity: number; sku: string; subtotal: number }>;
  status: "completed" | "void";
  totalAmount: number;
  voidReason?: string | null;
  voidedAt?: string | null;
  voidedBy?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function newCartItem(): CartItem {
  return { id: `${Date.now()}-${Math.random()}`, quantity: "1", sku: "" };
}

export function PenjualanPage() {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([newCartItem()]);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [preview, setPreview] = useState<SalePreview | null>(null);
  const [saving, setSaving] = useState(false);
  const { customers, refresh, sales, stockItems, token } = useInventoryData();
  const today = new Date().toDateString();
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === today && sale.status === "completed");
  const filtered = sales.filter((sale) => `${sale.invoiceNumber} ${sale.cashier ?? ""} ${sale.status}`.toLowerCase().includes(query.toLowerCase()));

  const closeModal = () => {
    setModalOpen(false);
    setCart([newCartItem()]);
    setCustomerId("");
    setPreview(null);
  };

  const updateCartItem = (id: string, patch: Partial<CartItem>) => {
    setPreview(null);
    setCart((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const removeCartItem = (id: string) => {
    setPreview(null);
    setCart((items) => items.length > 1 ? items.filter((item) => item.id !== id) : items);
  };

  const resolveProduct = async (code: string): Promise<ProductLookup> => {
    const localProduct = stockItems.find((item) => item.sku.toLowerCase() === code.toLowerCase() || item.barcode.toLowerCase() === code.toLowerCase());

    if (localProduct && uuidPattern.test(localProduct.id)) {
      return { id: localProduct.id };
    }

    return apiRequest<ProductLookup>(`/products/lookup?code=${encodeURIComponent(code)}`, { token });
  };

  const saleBody = async () => {
    const filledItems = cart.filter((item) => item.sku.trim());
    if (!filledItems.length) throw new Error("Isi minimal satu SKU/barcode produk.");

    const items = await Promise.all(filledItems.map(async (item) => {
      const product = await resolveProduct(item.sku.trim());

      return { product_id: product.id, quantity: Number(item.quantity || 0) };
    }));

    return { customer_id: customerId || null, items };
  };

  const loadPreview = async () => {
    setPreview(await apiRequest<SalePreview>("/sales/preview", { body: JSON.stringify(await saleBody()), method: "POST", token }));
  };

  const createSale = async () => {
    setSaving(true);
    try {
      const body = await saleBody();
      setPreview(await apiRequest<SalePreview>("/sales/preview", { body: JSON.stringify(body), method: "POST", token }));
      await apiRequest("/sales", { body: JSON.stringify(body), method: "POST", token });
      await refresh();
      closeModal();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Transaksi gagal dibuat.");
    } finally {
      setSaving(false);
    }
  };

  const voidSale = async (id: string) => {
    try {
      await apiRequest(`/sales/${id}/void`, { body: JSON.stringify({ reason: "Void dari admin frontend" }), method: "POST", token });
      await refresh();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Void transaksi gagal.");
    }
  };

  const openDetail = async (id: string) => {
    try {
      setDetail(await apiRequest<SaleDetail>(`/sales/${id}`, { token }));
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Detail transaksi gagal dimuat.");
    }
  };

  return <View style={styles.stack}><View style={styles.metricGrid}><Metric title="Penjualan Hari Ini" value={formatCurrency(todaySales.reduce((total, sale) => total + sale.totalAmount, 0))} /><Metric title="Transaksi Hari Ini" value={String(todaySales.length)} /></View><CrudShell title="Riwayat Transaksi" button="Transaksi Baru" onButton={() => setModalOpen(true)} search="Cari kode transaksi / kasir..." searchValue={query} onSearchChange={setQuery} date><DataTable columns={["Kode Transaksi", "Tanggal", "Jumlah Item", "Total", "Kasir", "Aksi"]}>{filtered.map((sale) => <TableRow key={sale.id} cells={[sale.invoiceNumber, formatDate(sale.createdAt), String(sale.items?.reduce((total, item) => total + item.quantity, 0) ?? 0), formatCurrency(sale.totalAmount), sale.cashier ?? "-"]} actions={<RowActions onEdit={() => void openDetail(sale.id)} onDelete={() => void voidSale(sale.id)} />} />)}{!filtered.length ? <EmptyRow text="Tidak ada transaksi ditemukan" /> : null}</DataTable></CrudShell><Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}><View style={styles.modalBackdrop}><View style={styles.modalCard}><ScrollView contentContainerStyle={styles.stack}><Text style={styles.modalTitle}>Transaksi Baru</Text><View style={styles.modalFieldGroup}><Text style={styles.modalLabel}>Customer</Text><View style={styles.chipRow}>{customers.map((customer) => <Pressable key={customer.id} onPress={() => setCustomerId(customerId === customer.id ? "" : customer.id)} style={[styles.chip, customerId === customer.id && styles.chipActive]}><Text style={styles.chipText}>{customer.name}</Text></Pressable>)}</View></View><View style={styles.modalFieldGroup}><Text style={styles.modalLabel}>Cart Item</Text>{cart.map((item, index) => <View key={item.id} style={styles.stack}><Text style={styles.cardEyebrow}>Item {index + 1}</Text><TextInput onChangeText={(value) => updateCartItem(item.id, { sku: value })} style={styles.modalInput} placeholder="SKU / Barcode" placeholderTextColor={colors.muted} value={item.sku} /><TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor={colors.muted} value={item.quantity} onChangeText={(value) => updateCartItem(item.id, { quantity: value.replace(/\D/g, "") })} keyboardType="number-pad" inputMode="numeric" />{cart.length > 1 ? <Pressable onPress={() => removeCartItem(item.id)} style={styles.cancelButton}><Text style={styles.cancelText}>Hapus Item</Text></Pressable> : null}</View>)}<Pressable onPress={() => { setPreview(null); setCart((items) => [...items, newCartItem()]); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Tambah Item</Text></Pressable></View>{preview ? <View style={styles.searchPanel}><Text style={styles.modalLabel}>Preview Backend</Text>{preview.items.map((item) => <Text key={item.sku} style={styles.pageSubheading}>{item.name} x{item.quantity} stok {item.availableStock} = {formatCurrency(item.subtotal)}</Text>)}<Text style={styles.metricValue}>{formatCurrency(preview.totalAmount)}</Text></View> : null}<View style={styles.modalActions}><Pressable onPress={closeModal} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable onPress={() => void loadPreview().catch((error) => Alert.alert("Gagal", error instanceof Error ? error.message : "Preview gagal."))} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Preview</Text></Pressable><Pressable disabled={saving} onPress={createSale} style={styles.saveButton}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable></View></ScrollView></View></View></Modal>{detail ? <SaleDetailModal sale={detail} onClose={() => setDetail(null)} /> : null}</View>;
}

function SaleDetailModal({ onClose, sale }: { onClose: () => void; sale: SaleDetail }) {
  const totalItems = sale.items.reduce((total, item) => total + item.quantity, 0);

  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><ScrollView contentContainerStyle={styles.stack}><Text style={styles.modalTitle}>Detail Penjualan</Text><View style={styles.metricGrid}><Metric title="Total" value={formatCurrency(sale.totalAmount)} /><Metric title="Item" value={String(totalItems)} /><Metric title="Status" value={sale.status} /></View><View style={styles.searchPanel}><Text style={styles.cardEyebrow}>{sale.invoiceNumber}</Text><Text style={styles.scanResultMeta}>Tanggal: {formatDate(sale.createdAt)}</Text><Text style={styles.scanResultMeta}>Kasir: {sale.cashier ?? "-"}</Text><Text style={styles.scanResultMeta}>Customer: {sale.customer ?? "-"}</Text>{sale.status === "void" ? <Text style={styles.errorText}>Void: {sale.voidReason ?? "-"} ({formatDate(sale.voidedAt)}) oleh {sale.voidedBy ?? "-"}</Text> : null}</View><DataTable columns={["SKU", "Produk", "Qty", "Harga", "Subtotal"]}>{sale.items.map((item) => <TableRow key={item.id} cells={[item.sku, item.productName, String(item.quantity), formatCurrency(item.price), formatCurrency(item.subtotal)]} />)}{!sale.items.length ? <EmptyRow text="Item transaksi kosong" /> : null}</DataTable><View style={styles.modalActions}><Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Tutup</Text></Pressable></View></ScrollView></View></View></Modal>;
}

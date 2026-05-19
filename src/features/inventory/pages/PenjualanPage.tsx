import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
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

export function PenjualanPage() {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [preview, setPreview] = useState<SalePreview | null>(null);
  const [saving, setSaving] = useState(false);
  const { customers, refresh, sales, stockItems, token } = useInventoryData();
  const today = new Date().toDateString();
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === today && sale.status === "completed");
  const filtered = sales.filter((sale) => `${sale.invoiceNumber} ${sale.cashier ?? ""} ${sale.status}`.toLowerCase().includes(query.toLowerCase()));
  const selectedProduct = stockItems.find((item) => item.sku.toLowerCase() === sku.toLowerCase() || item.barcode.toLowerCase() === sku.toLowerCase());
  const saleBody = () => ({ customer_id: customerId || null, items: [{ product_id: selectedProduct?.id, quantity: Number(quantity || 0) }] });

  const loadPreview = async () => {
    if (!selectedProduct) throw new Error("Produk tidak ditemukan. Isi SKU/barcode yang valid.");
    setPreview(await apiRequest<SalePreview>("/sales/preview", { body: JSON.stringify(saleBody()), method: "POST", token }));
  };

  const createSale = async () => {
    setSaving(true);
    try {
      await loadPreview();
      await apiRequest("/sales", { body: JSON.stringify(saleBody()), method: "POST", token });
      await refresh();
      setModalOpen(false);
      setSku("");
      setQuantity("1");
      setPreview(null);
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

  return <View style={styles.stack}><View style={styles.metricGrid}><Metric title="Penjualan Hari Ini" value={formatCurrency(todaySales.reduce((total, sale) => total + sale.totalAmount, 0))} /><Metric title="Transaksi Hari Ini" value={String(todaySales.length)} /></View><CrudShell title="Riwayat Transaksi" button="Transaksi Baru" onButton={() => setModalOpen(true)} search="Cari kode transaksi / kasir..." searchValue={query} onSearchChange={setQuery} date><DataTable columns={["Kode Transaksi", "Tanggal", "Jumlah Item", "Total", "Kasir", "Aksi"]}>{filtered.map((sale) => <TableRow key={sale.id} cells={[sale.invoiceNumber, formatDate(sale.createdAt), String(sale.items?.reduce((total, item) => total + item.quantity, 0) ?? 0), formatCurrency(sale.totalAmount), sale.cashier ?? "-"]} actions={<RowActions onEdit={() => Alert.alert("Status", sale.status)} onDelete={() => void voidSale(sale.id)} />} />)}{!filtered.length ? <EmptyRow text="Tidak ada transaksi ditemukan" /> : null}</DataTable></CrudShell><Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Transaksi Baru</Text><View style={styles.modalFieldGroup}><Text style={styles.modalLabel}>Customer</Text><View style={styles.chipRow}>{customers.map((customer) => <Pressable key={customer.id} onPress={() => setCustomerId(customerId === customer.id ? "" : customer.id)} style={[styles.chip, customerId === customer.id && styles.chipActive]}><Text style={styles.chipText}>{customer.name}</Text></Pressable>)}</View></View><TextInput onChangeText={setSku} style={styles.modalInput} placeholder="SKU / Barcode" placeholderTextColor={colors.muted} value={sku} /><TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor={colors.muted} value={quantity} onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />{preview ? <View style={styles.searchPanel}><Text style={styles.modalLabel}>Preview Backend</Text>{preview.items.map((item) => <Text key={item.sku} style={styles.pageSubheading}>{item.name} x{item.quantity} stok {item.availableStock} = {formatCurrency(item.subtotal)}</Text>)}<Text style={styles.metricValue}>{formatCurrency(preview.totalAmount)}</Text></View> : null}<View style={styles.modalActions}><Pressable onPress={() => setModalOpen(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable onPress={() => void loadPreview().catch((error) => Alert.alert("Gagal", error instanceof Error ? error.message : "Preview gagal."))} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Preview</Text></Pressable><Pressable disabled={saving} onPress={createSale} style={styles.saveButton}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable></View></View></View></Modal></View>;
}

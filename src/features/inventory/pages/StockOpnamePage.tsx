import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, Metric, TableRow, WhiteCard } from "../components/common";
import { styles } from "../styles";

export function StockOpnamePage() {
  const { movements, refresh, stockItems, token } = useInventoryData();
  const [actualStock, setActualStock] = useState("");
  const [note, setNote] = useState("");
  const [productId, setProductId] = useState(stockItems[0]?.id ?? "");
  const [productOpen, setProductOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedProduct = stockItems.find((item) => item.id === productId);
  const productOptions = stockItems.filter((item) => `${item.name} ${item.sku} ${item.barcode}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30);
  const quantity = Number(actualStock || 0);
  const difference = selectedProduct ? quantity - selectedProduct.stock : 0;
  const recentAdjustments = movements.filter((movement) => movement.type === "adjustment").slice(0, 20);

  const submit = async () => {
    if (!selectedProduct) {
      Alert.alert("Gagal", "Pilih barang terlebih dahulu.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/stock/adjustment", { body: JSON.stringify({ note: note || "Stock opname dari dashboard", productId: selectedProduct.id, quantity }), method: "POST", token });
      await refresh();
      setActualStock("");
      setNote("");
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Stock opname gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return <View style={styles.stack}><CrudShell title="Stock Opname" subtitle="Koreksi stok sistem berdasarkan hitungan fisik gudang"><View style={styles.metricGrid}><Metric title="Stok Sistem" value={selectedProduct ? String(selectedProduct.stock) : "-"} /><Metric title="Stok Aktual" value={actualStock || "0"} /><Metric title="Selisih" value={difference > 0 ? `+${difference}` : String(difference)} /></View><WhiteCard title="Form Koreksi Stok" subtitle="Quantity yang disimpan adalah stok akhir/aktual, bukan jumlah tambah atau kurang."><View style={styles.stack}><View style={styles.modalFieldGroup}><Text style={styles.modalLabel}>Produk</Text><Pressable onPress={() => setProductOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : "Pilih barang"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>{productOpen ? <View style={styles.modalSelectOptions}><TextInput onChangeText={setQuery} style={styles.modalInput} placeholder="Cari nama / SKU / barcode" placeholderTextColor={colors.muted} value={query} />{productOptions.map((item) => <Pressable key={item.id} onPress={() => { setProductId(item.id); setProductOpen(false); setQuery(""); }} style={[styles.modalSelectOption, productId === item.id && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, productId === item.id && styles.modalSelectOptionTextActive]}>{item.sku} - {item.name} | stok {item.stock}</Text></Pressable>)}{!productOptions.length ? <Text style={styles.emptyText}>Produk tidak ditemukan</Text> : null}</View> : null}</View><TextInput onChangeText={(value) => setActualStock(value.replace(/\D/g, ""))} style={styles.modalInput} placeholder="Stok aktual hasil opname" placeholderTextColor={colors.muted} value={actualStock} keyboardType="number-pad" inputMode="numeric" /><TextInput onChangeText={setNote} style={styles.modalInput} placeholder="Catatan koreksi" placeholderTextColor={colors.muted} value={note} /><View style={styles.modalActions}><Pressable disabled={saving} onPress={() => void submit()} style={styles.saveButton}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan Koreksi"}</Text></Pressable></View></View></WhiteCard><WhiteCard title="Riwayat Koreksi Terbaru"><DataTable columns={["Waktu", "Barang", "SKU", "Selisih", "Catatan", "User"]}>{recentAdjustments.map((movement) => <TableRow key={movement.id} cells={[formatDate(movement.timestamp), movement.productName, movement.sku, String(movement.quantity), movement.note || "-", movement.operator]} />)}{!recentAdjustments.length ? <EmptyRow text="Belum ada koreksi stok" /> : null}</DataTable></WhiteCard></CrudShell></View>;
}

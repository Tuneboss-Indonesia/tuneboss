import { useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Eye, ImageUp } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { apiRequest, formatCurrency, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import type { ModalMode } from "../types";
import { CrudShell, DataTable, EmptyRow, IconButton, Metric, RowActions, TableRow } from "../components/common";
import { styles } from "../styles";

const statusFilters = ["Semua", "Tersedia", "Menipis", "Habis"];

type RestockOrderRow = { createdAt?: string | null; id: string; quantity: number; status: string; supplier?: string | null };
type Paginated<T> = { data: T[] };

function getStatus(stock: number, minStock: number) {
  if (stock === 0) return "Habis";
  if (stock < minStock) return "Menipis";
  return "Tersedia";
}

export function StokPage({ onOpenModal }: { onOpenModal: (mode: ModalMode) => void }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [editing, setEditing] = useState<(typeof stockItems)[number] | null>(null);
  const [detail, setDetail] = useState<(typeof stockItems)[number] | null>(null);
  const [detailOrders, setDetailOrders] = useState<RestockOrderRow[]>([]);
  const [saving, setSaving] = useState(false);
  const { categories, movements, refresh, stockItems, token } = useInventoryData();
  const uploadImage = async (productId: string) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert("Info", "Upload gambar saat ini tersedia di web admin.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const form = new FormData();
        form.append("image", file);
        await apiRequest(`/products/${productId}/image`, { body: form, method: "POST", token });
        await refresh();
      } catch (error) {
        Alert.alert("Gagal", error instanceof Error ? error.message : "Gambar gagal diupload.");
      }
    };
    input.click();
  };

  const deleteImage = async (productId: string) => {
    await apiRequest(`/products/${productId}/image`, { method: "DELETE", token });
    await refresh();
  };

  const deleteProduct = async (productId: string) => {
    await apiRequest(`/products/${productId}`, { method: "DELETE", token });
    await refresh();
  };

  const confirmDelete = (item: (typeof stockItems)[number]) => {
    if (!item.imageUrl) {
      void deleteProduct(item.id);
      return;
    }

    Alert.alert("Hapus Data", "Pilih yang ingin dihapus.", [
      { text: "Gambar", onPress: () => void deleteImage(item.id) },
      { text: "Produk", style: "destructive", onPress: () => void deleteProduct(item.id) },
      { text: "Batal", style: "cancel" },
    ]);
  };

  const saveEdit = async (form: { barcode: string; categoryId: string; minStock: string; name: string; price: string; sku: string }) => {
    if (!editing) return;
    setSaving(true);

    try {
      await apiRequest(`/products/${editing.id}`, {
        body: JSON.stringify({
          barcode: form.barcode || null,
          category_id: form.categoryId,
          min_stock: Number(form.minStock || 0),
          name: form.name,
          sale_price: Number(form.price || 0),
          sku: form.sku,
        }),
        method: "PATCH",
        token,
      });
      await refresh();
      setEditing(null);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Barang gagal diedit.");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (item: (typeof stockItems)[number]) => {
    setDetail(item);
    try {
      const response = await apiRequest<Paginated<RestockOrderRow>>(`/restock-orders?product_id=${item.id}&per_page=20`, { token });
      setDetailOrders(response.data);
    } catch {
      setDetailOrders([]);
    }
  };

  const filtered = stockItems.filter((item) => {
    const matchesQuery = `${item.sku} ${item.name} ${item.category} ${item.barcode}`.toLowerCase().includes(query.toLowerCase());
    const status = getStatus(item.stock, item.minStock);
    const matchesStatus = statusFilter === "Semua" || status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return <><CrudShell title="Data Barang" button="Tambah Barang" onButton={() => onOpenModal("add")} search="Cari kode, nama, kategori, atau barcode..." searchValue={query} onSearchChange={setQuery} chips={statusFilters} activeChip={statusFilter} onChipPress={setStatusFilter}><DataTable columns={["Kode Barang", "Nama Barang", "Kategori", "Harga Jual", "Stok", "Status", "Gambar", "Aksi"]}>{filtered.map((item) => <TableRow key={item.id} cells={[item.sku, item.name, item.category, formatCurrency(item.salePrice ?? 0), String(item.stock), getStatus(item.stock, item.minStock), item.imageUrl ? "Ada" : "Belum"]} actions={<View style={styles.rowActions}><IconButton icon={Eye} label="Detail" onPress={() => void openDetail(item)} /><RowActions onEdit={() => setEditing(item)} onDelete={() => confirmDelete(item)} /><IconButton icon={ImageUp} label="Upload Gambar" onPress={() => void uploadImage(item.id)} /></View>} />)}{!filtered.length ? <EmptyRow text="Barang tidak ditemukan" /> : null}</DataTable></CrudShell>{editing ? <ProductEditModal categories={categories} item={editing} saving={saving} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}{detail ? <ProductDetailModal item={detail} movements={movements.filter((movement) => movement.sku === detail.sku).slice(0, 20)} orders={detailOrders} onClose={() => setDetail(null)} /> : null}</>;
}

function ProductDetailModal({ item, movements, onClose, orders }: { item: { barcode: string; category: string; minStock: number; name: string; salePrice?: number; sku: string; stock: number; status: string }; movements: Array<{ id: string; note: string; operator: string; party: string; quantity: number; timestamp: string; type: string }>; onClose: () => void; orders: RestockOrderRow[] }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><ScrollView contentContainerStyle={styles.stack}><Text style={styles.modalTitle}>Detail Barang</Text><View style={styles.metricGrid}><Metric title="Stok" value={String(item.stock)} /><Metric title="Min" value={String(item.minStock)} /><Metric title="Status" value={getStatus(item.stock, item.minStock)} /></View><View style={styles.searchPanel}><Text style={styles.cardEyebrow}>Informasi Produk</Text><Text style={styles.scanResultTitle}>{item.name}</Text><Text style={styles.scanResultMeta}>{item.sku} / {item.barcode || "-"}</Text><Text style={styles.scanResultMeta}>{item.category} - {formatCurrency(item.salePrice ?? 0)}</Text></View><View><Text style={styles.modalLabel}>Riwayat Stok</Text><DataTable columns={["Waktu", "Tipe", "Qty", "Pihak", "User"]}>{movements.map((movement) => <TableRow key={movement.id} cells={[formatDate(movement.timestamp), movement.type, String(movement.quantity), movement.party || movement.note || "-", movement.operator]} />)}{!movements.length ? <EmptyRow text="Belum ada riwayat stok" /> : null}</DataTable></View><View><Text style={styles.modalLabel}>Restock Order</Text><DataTable columns={["Tanggal", "Supplier", "Qty", "Status"]}>{orders.map((order) => <TableRow key={order.id} cells={[formatDate(order.createdAt), order.supplier ?? "-", String(order.quantity), order.status]} />)}{!orders.length ? <EmptyRow text="Belum ada restock order" /> : null}</DataTable></View><View style={styles.modalActions}><Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Tutup</Text></Pressable></View></ScrollView></View></View></Modal>;
}

function ProductEditModal({ categories, item, onClose, onSave, saving }: { categories: Array<{ id: string; name: string }>; item: { barcode: string; categoryId?: string; minStock: number; name: string; salePrice?: number; sku: string }; onClose: () => void; onSave: (form: { barcode: string; categoryId: string; minStock: string; name: string; price: string; sku: string }) => Promise<void>; saving: boolean }) {
  const [barcode, setBarcode] = useState(item.barcode);
  const [categoryId, setCategoryId] = useState(item.categoryId ?? categories[0]?.id ?? "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [minStock, setMinStock] = useState(String(item.minStock));
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.salePrice ?? 0));
  const [sku, setSku] = useState(item.sku);
  const selectedCategory = categories.find((category) => category.id === categoryId);

  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Edit Barang</Text><TextInput onChangeText={setSku} style={styles.modalInput} placeholder="SKU" placeholderTextColor={colors.muted} value={sku} /><TextInput onChangeText={setName} style={styles.modalInput} placeholder="Nama Barang" placeholderTextColor={colors.muted} value={name} /><TextInput onChangeText={setBarcode} style={styles.modalInput} placeholder="Barcode" placeholderTextColor={colors.muted} value={barcode} /><View style={styles.modalFieldGroup}><Text style={styles.modalLabel}>Kategori</Text><Pressable onPress={() => setCategoryOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedCategory?.name || "Pilih kategori"}</Text></Pressable>{categoryOpen ? <View style={styles.modalSelectOptions}>{categories.map((category) => <Pressable key={category.id} onPress={() => { setCategoryId(category.id); setCategoryOpen(false); }} style={[styles.modalSelectOption, categoryId === category.id && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, categoryId === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text></Pressable>)}</View> : null}</View><TextInput style={styles.modalInput} placeholder="Harga Jual" placeholderTextColor={colors.muted} value={price} onChangeText={(value) => setPrice(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" /><TextInput style={styles.modalInput} placeholder="Minimum Stok" placeholderTextColor={colors.muted} value={minStock} onChangeText={(value) => setMinStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" /><View style={styles.modalActions}><Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable disabled={saving} onPress={() => void onSave({ barcode, categoryId, minStock, name, price, sku })} style={styles.saveButton}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable></View></View></View></Modal>;
}

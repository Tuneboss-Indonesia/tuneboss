import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, RowActions, TableRow } from "../components/common";
import type { StockItem, StockMovement } from "../../../types/dashboard";
import { colors, fonts } from "../../../theme/tokens";
import { styles } from "../styles";
import type { PressState } from "../types";

function MovementTableRow({ columns, compact, item, onDelete, onEdit }: { columns?: string[]; compact?: boolean; item: StockMovement; onDelete: () => void; onEdit: () => void }) {
  const serials = item.serialNumbers?.join(", ") || "-";
  const cells = item.type === "inbound" ? [formatDate(item.timestamp), item.productName, String(item.quantity), serials, item.productCategory ?? "-", item.note || "-"] : [formatDate(item.timestamp), item.productName, String(item.quantity), serials, item.saleAddress ?? item.party ?? "-", item.note || "-"];
  const canModify = item.type === "inbound" || item.type === "outbound";
  return <TableRow columns={columns} compact={compact} cells={cells} actions={canModify ? <RowActions onEdit={onEdit} onDelete={onDelete} /> : null} />;
}

export function MovementPage({ kind, onOpenModal }: { kind: "inbound" | "outbound"; onOpenModal: () => void }) {
  const isIn = kind === "inbound";
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editing, setEditing] = useState<StockMovement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StockMovement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const skipAutoSearchRef = useRef(true);
  const { loading, loadMovementsPage, movementMeta, movements, stockItems, token } = useInventoryData();
  const types = isIn ? ["inbound"] : ["outbound"];
  const movementTypeFilter = isIn ? "inbound" : "outbound";
  const filterLoading = loading || refreshing || tableLoading;
  const rows = movements.filter((item) => types.includes(item.type) && `${item.productName} ${item.sku} ${item.serialNumbers?.join(" ") ?? ""} ${item.productCategory ?? ""} ${item.party} ${item.operator} ${item.note}`.toLowerCase().includes(query.toLowerCase()));

  const effectiveDateRange = () => {
    if (dateFrom && !dateTo) return { from: dateFrom, to: dateFrom };
    if (!dateFrom && dateTo) return { from: dateTo, to: dateTo };
    if (dateFrom && dateTo && dateTo < dateFrom) return { from: dateTo, to: dateFrom };
    return { from: dateFrom, to: dateTo };
  };

  const loadFilteredMovements = async (page = 1) => {
    const { from, to } = effectiveDateRange();
    setTableLoading(true);
    try {
      await loadMovementsPage(page, movementTypeFilter, from, to);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (skipAutoSearchRef.current) {
      skipAutoSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void loadFilteredMovements(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, dateFrom, dateTo]);

  const handlePageChange = (page: number) => {
    skipAutoSearchRef.current = true;
    void loadFilteredMovements(page);
  };

  const reload = async () => {
    const { from, to } = effectiveDateRange();
    setRefreshing(true);
    try {
      await loadMovementsPage(movementMeta.currentPage || 1, movementTypeFilter, from, to);
    } finally {
      setRefreshing(false);
    }
  };

  const saveEdit = async (form: { note: string; party: string; productId: string; quantity: string }) => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiRequest(`/stock/movements/${editing.id}`, {
        body: JSON.stringify({
          note: form.note.trim() || null,
          party: form.party.trim() || null,
          productId: form.productId,
          quantity: Number(form.quantity || 0),
        }),
        method: "PATCH",
        token,
      });
      setEditing(null);
      skipAutoSearchRef.current = true;
      await reload();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Riwayat stok gagal diedit.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMovement = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/stock/movements/${pendingDelete.id}`, { method: "DELETE", token });
      setPendingDelete(null);
      skipAutoSearchRef.current = true;
      await reload();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Riwayat stok gagal dihapus.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <CrudShell title={isIn ? "Riwayat Produk Masuk" : "Riwayat Produk Keluar"} button={isIn ? "Tambah Stok" : "Kurangi Stok"} onButton={onOpenModal} search={isIn ? "Cari produk, no seri..." : "Cari produk keluar..."} searchValue={query} onSearchChange={setQuery} searchDisabled={filterLoading} buttonDisabled={filterLoading} dateFrom={dateFrom} onDateFromChange={setDateFrom} dateTo={dateTo} onDateToChange={setDateTo} loading={loading}>
        <DataTable columns={isIn ? ["Tanggal", "Produk", "Jumlah", "No Seri", "Kategori", "Catatan", "Aksi"] : ["Tanggal", "Produk", "Jumlah", "No Seri", "Alamat", "Catatan", "Aksi"]} pagination={movementMeta} onPageChange={handlePageChange} loading={filterLoading}>
          {rows.length ? rows.map((item) => <MovementTableRow key={item.id} item={item} onEdit={() => setEditing(item)} onDelete={() => setPendingDelete(item)} />) : null}
          {!rows.length && !filterLoading ? <EmptyRow text="Tidak ada data ditemukan" /> : null}
        </DataTable>
      </CrudShell>
      {editing ? <MovementEditModal item={editing} stockItems={stockItems} saving={saving} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}
      {pendingDelete ? <ConfirmModal title="Hapus Riwayat" message={`Yakin ingin menghapus riwayat "${pendingDelete.productName}"? Stok akan dikoreksi otomatis.`} confirmText="Hapus" loading={deleting} onCancel={() => setPendingDelete(null)} onConfirm={deleteMovement} /> : null}
    </>
  );
}

function MovementEditModal({ item, onClose, onSave, saving, stockItems }: { item: StockMovement; onClose: () => void; onSave: (form: { note: string; party: string; productId: string; quantity: string }) => Promise<void>; saving: boolean; stockItems: StockItem[] }) {
  const [productId, setProductId] = useState(item.productId);
  const [productOpen, setProductOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [party, setParty] = useState(item.party ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const selectedProduct = stockItems.find((product) => product.id === productId);
  const fallbackCurrentStock = productId === item.productId ? item.afterQuantity ?? 0 : 0;
  const currentStock = selectedProduct?.stock ?? fallbackCurrentStock;
  const partyLabel = item.type === "inbound" ? "Supplier" : "Alamat";
  const quantityNumber = Number(quantity || 0);
  const availableStock = currentStock + (item.type === "outbound" && productId === item.productId ? item.quantity : 0);
  const stockExceeded = item.type === "outbound" && quantityNumber > availableStock;
  const quantityError = stockExceeded ? `Stok tersisa ${availableStock}, jumlah tidak boleh melebihi stok.` : "";
  const hasChanges = productId !== item.productId || quantity !== String(item.quantity) || party !== (item.party ?? "") || note !== (item.note ?? "");
  const disabled = saving || !hasChanges || !productId || !quantity.trim() || quantityNumber < 1 || stockExceeded;
  const productOptions = item.type === "outbound" ? stockItems.filter((product) => product.stock > 0 || product.id === item.productId) : stockItems;
  const hasCurrentProductOption = productOptions.some((product) => product.id === item.productId);
  const visibleProductOptions = hasCurrentProductOption ? productOptions : [{
    id: item.productId,
    barcode: "",
    category: "-",
    lastUpdated: item.timestamp,
    location: "-",
    minStock: 0,
    name: item.productName,
    sku: item.sku,
    status: fallbackCurrentStock <= 0 ? "empty" : "safe",
    stock: fallbackCurrentStock,
  }, ...productOptions] satisfies StockItem[];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.modalTitle}>Edit Riwayat</Text>
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>Produk</Text>
              <Pressable onPress={() => setProductOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}>
                <Text style={styles.modalSelectText}>{selectedProduct?.name || item.productName || "Pilih produk"}</Text>
                <ChevronDown color={colors.muted} size={18} />
              </Pressable>
              {productOpen ? (
                <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>
                  {visibleProductOptions.map((product) => (
                    <Pressable key={product.id} onPress={() => { setProductId(product.id); setProductOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, productId === product.id && styles.modalSelectOptionActive, hovered && productId !== product.id && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                      <Text style={[styles.modalSelectOptionText, productId === product.id && styles.modalSelectOptionTextActive]}>{product.name} ({product.sku}){item.type === "outbound" ? ` - Stok: ${product.stock}` : ""}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
            <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor={colors.muted} value={quantity} onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
            {quantityError ? <Text style={styles.errorText}>{quantityError}</Text> : null}
            <TextInput onChangeText={setParty} style={styles.modalInput} placeholder={partyLabel} placeholderTextColor={colors.muted} value={party} />
            <TextInput onChangeText={setNote} style={styles.modalInput} placeholder="Catatan (Opsional)" placeholderTextColor={colors.muted} value={note} />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={disabled} onPress={() => onSave({ note, party, productId, quantity })} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !disabled && styles.saveButtonHover, pressed && styles.pressed, disabled && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({ title, message, confirmText, onCancel, onConfirm, loading }: { title: string; message: string; confirmText: string; onCancel: () => void; onConfirm: () => void; loading?: boolean }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{title}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 }}>{message}</Text><View style={styles.modalActions}><Pressable disabled={loading} onPress={onCancel} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && !loading && styles.cancelButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled]}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable disabled={loading} onPress={onConfirm} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled, { backgroundColor: "#b91c1c" }]}><Text style={styles.saveText}>{loading ? "Menghapus..." : confirmText}</Text></Pressable></View></View></View></Modal>;
}

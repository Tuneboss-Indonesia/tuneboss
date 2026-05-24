import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react-native";
import { colors, fonts } from "../../../theme/tokens";
import { styles } from "../styles";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, RowActions, TableRow } from "../components/common";
import type { PressState } from "../types";

type SaleItem = { productId: string; productName?: string | null; quantity: number };
type SaleForAction = { id: string; address?: string | null; items?: SaleItem[] };

export function PenjualanPage() {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleForAction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SaleForAction | null>(null);
  const [operationError, setOperationError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const skipAutoSearchRef = useRef(true);
  const { loading, loadProductsPage, loadSalesPage, saleMeta, sales, stockItems, token } = useInventoryData();
  const selectedProductItem = stockItems.find((item) => item.id === selectedProductId);
  const quantityNumber = Number(quantity || 0);
  const stockExceeded = Boolean(selectedProductItem && quantityNumber > selectedProductItem.stock);
  const quantityError = stockExceeded ? `Stok tersisa ${selectedProductItem?.stock ?? 0}, jumlah tidak boleh melebihi stok.` : "";
  const saleDisabled = saving || !selectedProductId || !quantity.trim() || quantityNumber < 1 || stockExceeded;
  const productNames = (items?: Array<{ productName?: string | null }>) => items?.map((item) => item.productName).filter(Boolean).join(", ") || "-";
  const totalQuantity = (items?: Array<{ quantity: number }>) => String(items?.reduce((total, item) => total + item.quantity, 0) ?? 0);
  const filterLoading = loading || tableLoading;

  const effectiveDateRange = () => {
    if (dateFrom && !dateTo) return { from: dateFrom, to: dateFrom };
    if (!dateFrom && dateTo) return { from: dateTo, to: dateTo };
    if (dateFrom && dateTo && dateTo < dateFrom) return { from: dateTo, to: dateFrom };
    return { from: dateFrom, to: dateTo };
  };

  const loadFilteredSales = async (page = 1) => {
    const { from, to } = effectiveDateRange();
    setTableLoading(true);
    try {
      await loadSalesPage(page, query, from, to);
    } finally {
      setTableLoading(false);
    }
  };

  // Auto-search/filter saat ketik atau ganti tanggal (debounce 500ms)
  useEffect(() => {
    if (skipAutoSearchRef.current) {
      skipAutoSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void loadFilteredSales(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, dateFrom, dateTo]);

  const handlePageChange = (page: number) => {
    skipAutoSearchRef.current = true;
    void loadFilteredSales(page);
  };

  const loadAvailableProducts = () => loadProductsPage(1, "", "Tersedia", "", 100);

  const openCreateModal = () => {
    setModalOpen(true);
    void loadAvailableProducts();
  };

  const openEditModal = (sale: SaleForAction) => {
    setEditingSale(sale);
    void loadAvailableProducts();
  };

  const saleBody = async () => {
    if (!selectedProductId) throw new Error("Pilih produk terlebih dahulu.");
    if (selectedProductItem && Number(quantity || 0) > selectedProductItem.stock) throw new Error(`Stok tersisa ${selectedProductItem.stock}, jumlah tidak boleh melebihi stok.`);
    return { address: address.trim() || null, items: [{ product_id: selectedProductId, quantity: Number(quantity || 0) }] };
  };

  const reloadSalesAndProducts = async () => {
    const { from, to } = effectiveDateRange();
    setTableLoading(true);
    await Promise.all([
      loadSalesPage(1, query, from, to),
      loadProductsPage(1, "", "", "", 100),
    ]).finally(() => setTableLoading(false));
  };

  const createSale = async () => {
    setSaving(true);
    try {
      await apiRequest("/sales", { body: JSON.stringify(await saleBody()), method: "POST", token });
      setModalOpen(false);
      setAddress("");
      setSelectedProductId("");
      setQuantity("");
      skipAutoSearchRef.current = true;
      await reloadSalesAndProducts();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Transaksi gagal dibuat.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSale = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/sales/${pendingDelete.id}`, { method: "DELETE", token });
      setPendingDelete(null);
      skipAutoSearchRef.current = true;
      await reloadSalesAndProducts();
    } catch (error) {
      setPendingDelete(null);
      setOperationError(error instanceof Error ? error.message : "Transaksi gagal dihapus.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <CrudShell title="Riwayat Penjualan" button="Transaksi Baru" onButton={openCreateModal} search="Cari penjualan..." searchValue={query} onSearchChange={setQuery} searchDisabled={filterLoading} buttonDisabled={tableLoading} dateFrom={dateFrom} onDateFromChange={setDateFrom} dateTo={dateTo} onDateToChange={setDateTo} loading={loading}>
        <DataTable columns={["Produk", "Total", "Tanggal", "Alamat", "Aksi"]} pagination={saleMeta} onPageChange={handlePageChange} loading={filterLoading}>
          {sales.map((sale) => (
            <TableRow key={sale.id} cells={[productNames(sale.items), totalQuantity(sale.items), formatDate(sale.createdAt), sale.address ?? "-"]} actions={<RowActions onEdit={() => openEditModal(sale)} onDelete={() => setPendingDelete(sale)} />} />
          ))}
          {!sales.length && !filterLoading ? <EmptyRow text="Tidak ada transaksi ditemukan" /> : null}
        </DataTable>
      </CrudShell>
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Transaksi Baru</Text>
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>Produk</Text>
              <View style={{ position: "relative" }}>
                <Pressable onPress={() => setProductOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}>
                  <Text style={styles.modalSelectText}>{selectedProductItem?.name || "Pilih produk"}</Text>
                  <ChevronDown color={colors.muted} size={18} />
                </Pressable>
                {productOpen ? (
                  <View style={styles.modalSelectOptions}>
                    <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                      {stockItems.filter((item) => item.stock > 0).map((item) => (
                        <Pressable key={item.id} onPress={() => { setSelectedProductId(item.id); setProductOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, selectedProductId === item.id && styles.modalSelectOptionActive, hovered && selectedProductId !== item.id && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                          <Text style={[styles.modalSelectOptionText, selectedProductId === item.id && styles.modalSelectOptionTextActive]}>{item.name} (Stok: {item.stock})</Text>
                        </Pressable>
                      ))}
                      {!stockItems.some((item) => item.stock > 0) ? <Text style={[styles.modalSelectOptionText, { padding: 16 }]}>Tidak ada produk tersedia</Text> : null}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            </View>
            <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor={colors.muted} value={quantity} onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
            {quantityError ? <Text style={styles.errorText}>{quantityError}</Text> : null}
            <TextInput multiline style={[styles.modalInput, { minHeight: 92, paddingTop: 18, textAlignVertical: "top" }]} placeholder="Alamat" placeholderTextColor={colors.muted} value={address} onChangeText={setAddress} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
              <Pressable disabled={saleDisabled} onPress={createSale} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !saleDisabled && styles.saveButtonHover, pressed && styles.pressed, saleDisabled && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {editingSale ? <SaleEditModal item={editingSale} saving={saving} stockItems={stockItems} onClose={() => setEditingSale(null)} onSave={async (form) => {
        setSaving(true);
        try {
          await apiRequest(`/sales/${editingSale.id}`, { body: JSON.stringify({ address: form.address.trim() || null, items: [{ product_id: form.productId, quantity: Number(form.quantity || 0) }] }), method: "PATCH", token });
          setEditingSale(null);
          skipAutoSearchRef.current = true;
          await reloadSalesAndProducts();
        } catch (error) {
          setOperationError(error instanceof Error ? error.message : "Transaksi gagal diedit.");
        } finally {
          setSaving(false);
        }
      }} /> : null}
      {pendingDelete ? <ConfirmModal title="Hapus Transaksi" message={`Yakin ingin menghapus transaksi ${productNames(pendingDelete.items)}?`} confirmText="Hapus" loading={deleting} onCancel={() => setPendingDelete(null)} onConfirm={deleteSale} /> : null}
      {operationError ? <ConfirmModal title="Gagal" message={operationError} confirmText="OK" hideCancel onCancel={() => setOperationError("")} onConfirm={() => setOperationError("")} /> : null}
    </>
  );
}

function SaleEditModal({ item, onClose, onSave, saving, stockItems }: { item: SaleForAction; onClose: () => void; onSave: (form: { address: string; productId: string; quantity: string }) => Promise<void>; saving: boolean; stockItems: Array<{ id: string; name: string; stock: number }> }) {
  const firstItem = item.items?.[0];
  const [address, setAddress] = useState(item.address ?? "");
  const [productId, setProductId] = useState(firstItem?.productId ?? "");
  const [quantity, setQuantity] = useState(firstItem ? String(firstItem.quantity) : "");
  const [productOpen, setProductOpen] = useState(false);
  const selectedProduct = stockItems.find((product) => product.id === productId);
  const currentProductOption = firstItem?.productId && !stockItems.some((product) => product.id === firstItem.productId)
    ? [{ id: firstItem.productId, name: firstItem.productName || "Produk", stock: 0 }]
    : [];
  const options = [...currentProductOption, ...stockItems.filter((product) => product.stock > 0 || product.id === productId)];
  const quantityNumber = Number(quantity || 0);
  const currentStock = selectedProduct?.stock ?? (productId === (firstItem?.productId ?? "") ? 0 : 0);
  const availableStock = currentStock + (productId === (firstItem?.productId ?? "") ? firstItem?.quantity ?? 0 : 0);
  const stockExceeded = Boolean(productId && quantityNumber > availableStock);
  const quantityError = stockExceeded ? `Stok tersisa ${availableStock}, jumlah tidak boleh melebihi stok.` : "";
  const hasChanges = productId !== (firstItem?.productId ?? "") || quantity !== (firstItem ? String(firstItem.quantity) : "") || address.trim() !== (item.address ?? "").trim();
  const disabled = saving || !productId || !quantity.trim() || quantityNumber < 1 || !hasChanges || stockExceeded;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit Transaksi</Text>
          <View style={styles.modalFieldGroup}>
            <Text style={styles.modalLabel}>Produk</Text>
            <View style={{ position: "relative" }}>
              <Pressable onPress={() => setProductOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}>
                <Text style={styles.modalSelectText}>{selectedProduct?.name || firstItem?.productName || "Pilih produk"}</Text>
                <ChevronDown color={colors.muted} size={18} />
              </Pressable>
              {productOpen ? (
                <View style={styles.modalSelectOptions}>
                  <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                    {options.map((product) => (
                      <Pressable key={product.id} onPress={() => { setProductId(product.id); setProductOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, productId === product.id && styles.modalSelectOptionActive, hovered && productId !== product.id && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                        <Text style={[styles.modalSelectOptionText, productId === product.id && styles.modalSelectOptionTextActive]}>{product.name} (Stok: {product.stock})</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </View>
          <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor={colors.muted} value={quantity} onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
          {quantityError ? <Text style={styles.errorText}>{quantityError}</Text> : null}
          <TextInput multiline style={[styles.modalInput, { minHeight: 92, paddingTop: 18, textAlignVertical: "top" }]} placeholder="Alamat" placeholderTextColor={colors.muted} value={address} onChangeText={setAddress} />
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={disabled} onPress={() => onSave({ address, productId, quantity })} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !disabled && styles.saveButtonHover, pressed && styles.pressed, disabled && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({ title, message, confirmText, onCancel, onConfirm, hideCancel, loading }: { title: string; message: string; confirmText: string; onCancel: () => void; onConfirm: () => void; hideCancel?: boolean; loading?: boolean }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{title}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 }}>{message}</Text><View style={styles.modalActions}>{!hideCancel ? <Pressable disabled={loading} onPress={onCancel} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && !loading && styles.cancelButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled]}><Text style={styles.cancelText}>Batal</Text></Pressable> : null}<Pressable disabled={loading} onPress={onConfirm} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled, !hideCancel && { backgroundColor: "#b91c1c" }]}><Text style={styles.saveText}>{loading ? "Menghapus..." : confirmText}</Text></Pressable></View></View></View></Modal>;
}

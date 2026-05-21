import { useEffect, useRef, useState } from "react";
import { Alert, Image, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { ChevronDown, ImageUp, Eye, X } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { apiRequest } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import type { ModalMode, PressState } from "../types";
import type { StockItem } from "../../../types/dashboard";
import { CrudShell, DataTable, EmptyRow, IconButton, RowActions, TableRow } from "../components/common";
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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StockItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingImage, setViewingImage] = useState<StockItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const skipAutoSearchRef = useRef(false);
  const { categories, loadProductsPage, loading, productMeta, refresh, stockItems, token } = useInventoryData();
  const prevStockLengthRef = useRef(stockItems.length);

  // Reset category filter when items are added/removed
  useEffect(() => {
    if (stockItems.length !== prevStockLengthRef.current) {
      setCategoryFilter("");
      setCategoryOpen(false);
      prevStockLengthRef.current = stockItems.length;
    }
  }, [stockItems.length]);

  // Auto-search saat ketik (debounce 500ms)
  useEffect(() => {
    if (skipAutoSearchRef.current) {
      skipAutoSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setTableLoading(true);
      void loadProductsPage(1, categoryFilter, statusFilter === "Semua" ? "" : statusFilter, query).finally(() => setTableLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const handlePageChange = (page: number) => {
    skipAutoSearchRef.current = true;
    setTableLoading(true);
    void loadProductsPage(page, categoryFilter, statusFilter === "Semua" ? "" : statusFilter, query).finally(() => setTableLoading(false));
  };

  const handleStatusPress = (chip: string) => {
    if (loading || tableLoading) return;
    setStatusFilter(chip);
    setTableLoading(true);
    void loadProductsPage(1, categoryFilter, chip === "Semua" ? "" : chip, query).finally(() => setTableLoading(false));
  };

  const handleCategoryPress = (categoryId: string) => {
    if (loading || tableLoading) return;
    setCategoryFilter(categoryId);
    setCategoryOpen(false);
    setTableLoading(true);
    void loadProductsPage(1, categoryId, statusFilter === "Semua" ? "" : statusFilter, query).finally(() => setTableLoading(false));
  };

  const handleResetCategory = () => {
    if (loading || tableLoading) return;
    setCategoryFilter("");
    setCategoryOpen(false);
    setTableLoading(true);
    void loadProductsPage(1, "", statusFilter === "Semua" ? "" : statusFilter, query).finally(() => setTableLoading(false));
  };

  const selectedCategory = categories.find((c) => c.id === categoryFilter);

  const uploadImage = async (productId: string, file: File) => {
    try {
      const form = new FormData();
      form.append("image", file);
      await apiRequest(`/products/${productId}/image`, { body: form, method: "POST", token });
      await refresh();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Gambar gagal diupload.");
    }
  };

  const handleImageUpload = (productId: string) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert("Info", "Upload gambar saat ini tersedia di web admin.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) await uploadImage(productId, file);
    };
    input.click();
  };

  const handleReplaceImage = () => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !viewingImage) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setImageFile(file);
    };
    input.click();
  };

  const saveImageChange = async () => {
    if (!viewingImage || !imageFile) return;
    setUploadingImage(true);
    try {
      await uploadImage(viewingImage.id, imageFile);
      setViewingImage(null);
      setImageFile(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    await apiRequest(`/products/${productId}`, { method: "DELETE", token });
    await refreshProducts();
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(pendingDelete.id);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Gagal menghapus produk.");
    } finally {
      setDeleteLoading(false);
      setPendingDelete(null);
    }
  };

  const confirmDelete = (item: StockItem) => {
    setPendingDelete(item);
  };

  const saveEdit = async (form: { categoryId: string; stock: string; name: string; sku: string }) => {
    if (!editing) return;
    setSaving(true);

    try {
      await apiRequest(`/products/${editing.id}`, {
        body: JSON.stringify({
          barcode: editing.barcode || null,
          category_id: form.categoryId || editing.categoryId,
          min_stock: editing.minStock,
          name: form.name,
          sku: form.sku,
          current_stock: Number(form.stock),
        }),
        method: "PATCH",
        token,
      });
      await refreshProducts();
      setEditing(null);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Barang gagal diedit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <CrudShell title="Data Produk" button="Tambah Barang" onButton={() => onOpenModal("add")} search="Cari kode, nama, kategori...  " searchValue={query} onSearchChange={setQuery} chips={statusFilters} chipsDisabled={loading || tableLoading} activeChip={statusFilter} onChipPress={handleStatusPress} loading={loading} searchDisabled={loading || tableLoading} buttonDisabled={loading || tableLoading}>
        {/* Category Filter Dropdown */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, zIndex: 20 }}>
          <Text style={{ color: colors.muted, fontFamily: "Futura PT", fontSize: 14 }}>Filter Kategori:</Text>
          <View style={{ position: "relative", zIndex: 20 }} pointerEvents={loading || tableLoading ? "none" : "auto"}>
            <Pressable onPress={() => setCategoryOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, { minWidth: 180 }, hovered && styles.modalSelectHover, pressed && styles.pressed, (loading || tableLoading) && styles.tablePagerButtonDisabled]}>
              <Text style={[styles.modalSelectText, (loading || tableLoading) && { color: colors.muted }]}>{selectedCategory?.name ?? "Semua Kategori"}</Text>
              <ChevronDown color={colors.muted} size={16} />
            </Pressable>
            {categoryOpen ? (
              <View style={[styles.modalSelectOptions, { position: "absolute", top: "100%", left: 0, zIndex: 30, minWidth: 180, maxHeight: 200, overflow: "scroll", scrollbarWidth: "none", msOverflowStyle: "none" } as any]}>
                <Pressable onPress={handleResetCategory} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, !categoryFilter && styles.modalSelectOptionActive, hovered && categoryFilter && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                  <Text style={[styles.modalSelectOptionText, !categoryFilter && styles.modalSelectOptionTextActive]}>Semua Kategori</Text>
                </Pressable>
                {categories.map((category) => (
                  <Pressable key={category.id} onPress={() => handleCategoryPress(category.id)} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, categoryFilter === category.id && styles.modalSelectOptionActive, hovered && categoryFilter !== category.id && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                    <Text style={[styles.modalSelectOptionText, categoryFilter === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        <DataTable columns={["Kode Produk", "Produk", "Kategori", "Stok", "Status", "Gambar", "Aksi"]} pagination={productMeta} onPageChange={handlePageChange} loading={loading || tableLoading}>
          {stockItems.map((item) => (
            <TableRow key={item.id} cells={[item.sku, item.name, item.category, String(item.stock), getStatus(item.stock, item.minStock), item.imageUrl ? "Ada" : "Belum"]} actions={
              <View style={styles.rowActions}>
                <RowActions onEdit={() => setEditing(item)} onDelete={() => confirmDelete(item)} />
                {item.imageUrl ? (
                  <IconButton icon={Eye} label="Lihat Gambar" onPress={() => setViewingImage(item)} />
                ) : (
                  <IconButton icon={ImageUp} label="Upload Gambar" onPress={() => handleImageUpload(item.id)} />
                )}
              </View>
            } />
          ))}
          {!stockItems.length && !loading && !tableLoading ? <EmptyRow text="Barang tidak ditemukan" /> : null}
        </DataTable>
      </CrudShell>
      {editing ? <ProductEditModal categories={categories} item={editing} saving={saving} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}
      {pendingDelete ? <ConfirmModal title="Hapus Produk" message={`Yakin ingin menghapus "${pendingDelete.name}"?`} confirmText="Hapus" onCancel={() => setPendingDelete(null)} onConfirm={executeDelete} loading={deleteLoading} /> : null}
      {viewingImage ? <ImageViewerModal item={viewingImage} imageFile={imageFile} uploading={uploadingImage} onClose={() => { setViewingImage(null); setImageFile(null); }} onReplace={handleReplaceImage} onSave={saveImageChange} /> : null}
    </>
  );
}

function ProductEditModal({ categories, item, onClose, onSave, saving }: { categories: Array<{ id: string; name: string }>; item: { barcode: string; categoryId?: string; minStock: number; name: string; sku: string; stock: number }; onClose: () => void; onSave: (form: { categoryId: string; stock: string; name: string; sku: string }) => Promise<void>; saving: boolean }) {
  const [categoryId, setCategoryId] = useState(item.categoryId ?? "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [stock, setStock] = useState(String(item.stock));
  const [name, setName] = useState(item.name);
  const [sku, setSku] = useState(item.sku);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const hasChanges = sku !== item.sku || name !== item.name || categoryId !== (item.categoryId ?? "") || stock !== String(item.stock);

  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Edit Barang</Text><TextInput onChangeText={setSku} style={styles.modalInput} placeholder="Kode Produk" placeholderTextColor={colors.muted} value={sku} /><TextInput onChangeText={setName} style={styles.modalInput} placeholder="Produk" placeholderTextColor={colors.muted} value={name} /><View style={styles.modalFieldGroup}><Text style={styles.modalLabel}>Kategori</Text><Pressable onPress={() => setCategoryOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{selectedCategory?.name || "Pilih kategori"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>{categoryOpen ? <View style={[styles.modalSelectOptions, { maxHeight: 160, overflow: "scroll", scrollbarWidth: "none", msOverflowStyle: "none" } as any]}>{categories.map((category) => <Pressable key={category.id} onPress={() => { setCategoryId(category.id); setCategoryOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, categoryId === category.id && styles.modalSelectOptionActive, hovered && categoryId !== category.id && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, categoryId === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text></Pressable>)}</View> : null}</View><TextInput style={styles.modalInput} placeholder="Stok" placeholderTextColor={colors.muted} value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" /><View style={styles.modalActions}><Pressable onPress={onClose} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable disabled={saving || !hasChanges} onPress={() => void onSave({ categoryId, stock, name, sku })} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !saving && hasChanges && styles.saveButtonHover, pressed && styles.pressed, (saving || !hasChanges) && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable></View></View></View></Modal>;
}

function ImageViewerModal({ item, imageFile, uploading, onClose, onReplace, onSave }: { item: StockItem; imageFile: File | null; uploading: boolean; onClose: () => void; onReplace: () => void; onSave: () => void }) {
  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : (item.imageUrl || "");
  const [loadError, setLoadError] = useState(false);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { width: "90%", maxWidth: 500, alignItems: "center" }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
            <Text style={styles.modalTitle}>Gambar Produk</Text>
            <Pressable onPress={onClose}><X color={colors.muted} size={24} /></Pressable>
          </View>
          {previewUrl && !loadError ? (
            Platform.OS === "web" ? (
              <img src={previewUrl} alt={item.name} style={{ width: "100%", height: 300, borderRadius: 8, marginBottom: 16, objectFit: "contain", backgroundColor: "#1a1a1a" }} onError={() => setLoadError(true)} />
            ) : (
              <Image source={{ uri: previewUrl }} style={{ width: "100%", height: 300, borderRadius: 8, marginBottom: 16, backgroundColor: "#1a1a1a" }} resizeMode="contain" onError={() => setLoadError(true)} />
            )
          ) : (
            <View style={{ width: "100%", height: 300, borderRadius: 8, marginBottom: 16, backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: colors.muted }}>{loadError ? "Gagal memuat gambar" : "Tidak ada gambar"}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <Pressable onPress={onReplace} style={({ hovered, pressed }: PressState) => [styles.cancelButton, { flex: 1 }, hovered && styles.cancelButtonHover, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Ganti Gambar</Text>
            </Pressable>
            {imageFile ? (
              <Pressable onPress={onSave} disabled={uploading} style={({ hovered, pressed }: PressState) => [styles.saveButton, { flex: 1 }, hovered && !uploading && styles.saveButtonHover, pressed && styles.pressed, uploading && styles.tablePagerButtonDisabled]}>
                <Text style={styles.saveText}>{uploading ? "Menyimpan..." : "Simpan"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({ title, message, confirmText, onCancel, onConfirm, hideCancel, loading }: { title: string; message: string; confirmText: string; onCancel?: () => void; onConfirm: () => void; hideCancel?: boolean; loading?: boolean }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={{ color: colors.muted, fontFamily: "Futura PT", fontSize: 18, marginTop: 12, textAlign: "center" }}>{message}</Text>
          <View style={styles.modalActions}>
            {!hideCancel ? <Pressable onPress={onCancel} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable> : null}
            <Pressable onPress={onConfirm} disabled={loading} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled, { backgroundColor: "#b91c1c" }]}><Text style={styles.saveText}>{loading ? "Menghapus..." : confirmText}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

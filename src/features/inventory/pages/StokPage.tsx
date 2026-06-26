import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown, ImageUp, Eye, X } from "lucide-react-native";
import { colors, fonts } from "../../../theme/tokens";
import { apiRequest } from "../api";
import { appendPickedImage, pickedImageName, pickedImagePreviewUri, pickImage, type PickedImage } from "../imagePicker";
import { useInventoryData } from "../InventoryDataContext";
import type { ModalMode, PressState } from "../types";
import type { StockItem } from "../../../types/dashboard";
import { CrudShell, DataTable, EmptyRow, IconButton, RowActions, TableRow } from "../components/common";
import { styles } from "../styles";

const statusFilters = ["Semua", "Tersedia", "Menipis", "Habis"];

type Paginated<T> = { data: T[] };
type ProductTableLoading = "search" | "filter" | "page" | null;

function getStatus(stock: number, minStock: number) {
  if (stock === 0) return "Habis";
  if (stock < 5) return "Menipis";
  return "Tersedia";
}

export function StokPage({ onOpenModal }: { onOpenModal: (mode: ModalMode) => void }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [tableLoading, setTableLoading] = useState<ProductTableLoading>(null);
  const [pendingDelete, setPendingDelete] = useState<StockItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewingImage, setViewingImage] = useState<StockItem | null>(null);
  const [imageFile, setImageFile] = useState<PickedImage | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { categories, loadProductsPage, loading, productMeta, refresh, stockItems, token } = useInventoryData();
  const skipInitialSearchRef = useRef(true);
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...categories, ...stockItems.map((item) => ({ id: item.categoryId ?? "", name: item.category, desc: "-", count: 0 }))]
      .filter((category) => category.id && !seen.has(category.id) && seen.add(category.id));
  }, [categories, stockItems]);

  // Auto-search saat ketik (debounce 500ms)
  useEffect(() => {
    if (skipInitialSearchRef.current) {
      skipInitialSearchRef.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      setTableLoading("search");
      void loadProductsPage(1, categoryFilter, statusFilter === "Semua" ? "" : statusFilter, query).finally(() => setTableLoading(null));
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const handlePageChange = (page: number) => {
    setTableLoading("page");
    void loadProductsPage(page, categoryFilter, statusFilter === "Semua" ? "" : statusFilter, query).finally(() => setTableLoading(null));
  };

  const handleStatusPress = (chip: string) => {
    if (loading || isTableBusy) return;
    setStatusFilter(chip);
    setTableLoading("filter");
    void loadProductsPage(1, categoryFilter, chip === "Semua" ? "" : chip, query).finally(() => setTableLoading(null));
  };

  const handleCategoryPress = (categoryId: string) => {
    if (loading || isTableBusy) return;
    setCategoryFilter(categoryId);
    setCategoryOpen(false);
    setTableLoading("filter");
    void loadProductsPage(1, categoryId, statusFilter === "Semua" ? "" : statusFilter, query).finally(() => setTableLoading(null));
  };

  const handleResetCategory = () => {
    if (loading || isTableBusy) return;
    setCategoryFilter("");
    setCategoryOpen(false);
    setTableLoading("filter");
    void loadProductsPage(1, "", statusFilter === "Semua" ? "" : statusFilter, query).finally(() => setTableLoading(null));
  };

  const selectedCategory = categoryOptions.find((c) => c.id === categoryFilter);
  const isTableBusy = tableLoading !== null;
  const showTableSkeleton = loading || tableLoading === "page" || tableLoading === "filter";

  const uploadImage = async (productId: string, file: PickedImage) => {
    try {
      const form = new FormData();
      appendPickedImage(form, "image", file);
      await apiRequest(`/products/${productId}/image`, { body: form, method: "POST", token });
      await refresh();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Gambar gagal diupload.");
    }
  };

  const handleImageUpload = async (productId: string) => {
    const image = await pickImage();
    if (image) await uploadImage(productId, image);
  };

  const handleReplaceImage = async () => {
    if (!viewingImage) return;
    const image = await pickImage();
    if (image) setImageFile(image);
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
    await refresh();
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

  const saveEdit = async (form: { barcode: string; categoryId: string; stock: string; name: string; sku: string }) => {
    if (!editing) return;
    setSaving(true);

    try {
      await apiRequest(`/products/${editing.id}`, {
        body: JSON.stringify({
          barcode: form.barcode.trim() || null,
          category_id: form.categoryId || editing.categoryId,
          min_stock: editing.minStock,
          name: form.name,
          sku: form.sku,
          current_stock: Number(form.stock),
        }),
        method: "PATCH",
        token,
      });
      await refresh();
      setEditing(null);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Produk gagal diedit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <CrudShell title="Data Produk" button="Tambah Produk" onButton={() => onOpenModal("add")} search="Cari kode, no seri, nama, kategori..." searchValue={query} onSearchChange={setQuery} chips={statusFilters} chipsDisabled={loading || isTableBusy} activeChip={statusFilter} onChipPress={handleStatusPress} loading={loading} searchDisabled={loading || isTableBusy} buttonDisabled={loading || isTableBusy}>
        {/* Category Filter Dropdown */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, zIndex: 20 }}>
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14 }}>Filter Kategori:</Text>
          <View style={{ position: "relative", zIndex: 20 }} pointerEvents={loading || isTableBusy ? "none" : "auto"}>
            <Pressable onPress={() => setCategoryOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, { minWidth: 180 }, hovered && styles.modalSelectHover, pressed && styles.pressed, (loading || isTableBusy) && styles.tablePagerButtonDisabled]}>
              <Text style={[styles.modalSelectText, (loading || isTableBusy) && { color: colors.muted }]}>{selectedCategory?.name ?? "Semua Kategori"}</Text>
              <ChevronDown color={colors.muted} size={16} />
            </Pressable>
            {categoryOpen ? (
              <ScrollView style={[styles.modalSelectOptions, styles.productFilterOptions]} showsVerticalScrollIndicator={false}>
                <Pressable onPress={handleResetCategory} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, !categoryFilter && styles.modalSelectOptionActive, hovered && categoryFilter && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                  <Text style={[styles.modalSelectOptionText, !categoryFilter && styles.modalSelectOptionTextActive]}>Semua Kategori</Text>
                </Pressable>
                {categoryOptions.map((category) => (
                  <Pressable key={category.id} onPress={() => handleCategoryPress(category.id)} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, categoryFilter === category.id && styles.modalSelectOptionActive, hovered && categoryFilter !== category.id && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                    <Text style={[styles.modalSelectOptionText, categoryFilter === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
        <DataTable columns={["Produk", "Kode Produk + No Seri", "Kategori", "Stok", "Status", "Aksi"]} pagination={productMeta} onPageChange={handlePageChange} loading={showTableSkeleton}>
          {stockItems.map((item) => (
            <TableRow key={item.id} cells={[item.name, item.serialNumbers?.length ? item.serialNumbers.join(", ") : item.sku, item.category, String(item.stock), getStatus(item.stock, item.minStock)]} actions={
              <View style={styles.rowActions}>
                <RowActions onEdit={() => setEditing(item)} onDelete={() => confirmDelete(item)} />
                {item.imageUrl ? (
                  <IconButton icon={Eye} label="Lihat Gambar" onPress={() => setViewingImage(item)} />
                ) : (
                  <IconButton icon={ImageUp} label="Upload Gambar" onPress={() => void handleImageUpload(item.id)} />
                )}
              </View>
            } />
          ))}
          {!stockItems.length && !showTableSkeleton ? <EmptyRow text="Produk tidak ditemukan" /> : null}
        </DataTable>
      </CrudShell>
      {editing ? <ProductEditModal categories={categoryOptions} item={editing} saving={saving} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}
      {pendingDelete ? <ConfirmModal title="Hapus Produk" message={`Yakin ingin menghapus "${pendingDelete.name}"?`} confirmText="Hapus" onCancel={() => setPendingDelete(null)} onConfirm={executeDelete} loading={deleteLoading} /> : null}
      {viewingImage ? <ImageViewerModal item={viewingImage} imageFile={imageFile} uploading={uploadingImage} onClose={() => { setViewingImage(null); setImageFile(null); }} onReplace={() => void handleReplaceImage()} onSave={saveImageChange} /> : null}
    </>
  );
}

function ProductEditModal({ categories, item, onClose, onSave, saving }: { categories: Array<{ id: string; name: string }>; item: { barcode: string; categoryId?: string; minStock: number; name: string; sku: string; stock: number }; onClose: () => void; onSave: (form: { barcode: string; categoryId: string; stock: string; name: string; sku: string }) => Promise<void>; saving: boolean }) {
  const [categoryId, setCategoryId] = useState(item.categoryId ?? "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [stock, setStock] = useState(String(item.stock));
  const [name, setName] = useState(item.name);
  const [sku, setSku] = useState(item.sku);
  const [barcode, setBarcode] = useState(item.barcode);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const hasChanges = sku !== item.sku || barcode !== item.barcode || name !== item.name || categoryId !== (item.categoryId ?? "") || stock !== String(item.stock);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.modalTitle}>Edit Produk</Text>
            <TextInput onChangeText={setSku} style={styles.modalInput} placeholder="Kode Produk" placeholderTextColor={colors.muted} value={sku} />
            <TextInput onChangeText={setBarcode} style={styles.modalInput} placeholder="Kode Barcode" placeholderTextColor={colors.muted} value={barcode} />
            <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Produk" placeholderTextColor={colors.muted} value={name} />
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>Kategori</Text>
              <Pressable onPress={() => setCategoryOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}>
                <Text style={styles.modalSelectText}>{selectedCategory?.name || "Pilih kategori"}</Text>
                <ChevronDown color={colors.muted} size={18} />
              </Pressable>
              {categoryOpen ? (
                <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>
                  {categories.map((category) => (
                    <Pressable key={category.id} onPress={() => { setCategoryId(category.id); setCategoryOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, categoryId === category.id && styles.modalSelectOptionActive, hovered && categoryId !== category.id && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                      <Text style={[styles.modalSelectOptionText, categoryId === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
            <TextInput style={styles.modalInput} placeholder="Stok Awal" placeholderTextColor={colors.muted} value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={saving || !hasChanges || !sku.trim() || !name.trim() || !categoryId} onPress={() => onSave({ barcode, categoryId, stock, name, sku })} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !saving && hasChanges && styles.saveButtonHover, pressed && styles.pressed, (saving || !hasChanges || !sku.trim() || !name.trim() || !categoryId) && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ImageViewerModal({ item, imageFile, uploading, onClose, onReplace, onSave }: { item: StockItem; imageFile: PickedImage | null; uploading: boolean; onClose: () => void; onReplace: () => void; onSave: () => void }) {
  const [loadError, setLoadError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(item.imageUrl || "");

  useEffect(() => {
    setLoadError(false);

    if (!imageFile) {
      setPreviewUrl(item.imageUrl || "");
      return undefined;
    }

    const uri = pickedImagePreviewUri(imageFile);
    setPreviewUrl(uri);

    return () => {
      if (!("uri" in imageFile) && typeof URL !== "undefined") {
        URL.revokeObjectURL(uri);
      }
    };
  }, [imageFile, item.imageUrl]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { width: "90%", maxWidth: 500, alignItems: "center" }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
            <Text style={styles.modalTitle}>Gambar Produk</Text>
            <Pressable onPress={onClose}><X color={colors.muted} size={24} /></Pressable>
          </View>
          {previewUrl && !loadError ? (
            <Image source={{ uri: previewUrl }} style={{ width: "100%", height: 300, borderRadius: 8, marginBottom: 16, backgroundColor: "#1a1a1a" }} resizeMode="contain" onError={() => setLoadError(true)} accessibilityLabel={item.name} />
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
          <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 18, marginTop: 12, textAlign: "center" }}>{message}</Text>
          <View style={styles.modalActions}>
            {!hideCancel ? <Pressable onPress={onCancel} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable> : null}
            <Pressable onPress={onConfirm} disabled={loading} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled, { backgroundColor: "#b91c1c" }]}><Text style={styles.saveText}>{loading ? "Menghapus..." : confirmText}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

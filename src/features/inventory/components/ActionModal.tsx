import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown, ImageUp } from "lucide-react-native";
import { apiRequest } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { appendPickedImage, pickedImageName, pickImage, type PickedImage } from "../imagePicker";
import type { CategoryItem, ModalKind, ModalMode, PressState } from "../types";
import { styles } from "../styles";
import { colors } from "../../../theme/tokens";

export function ActionModal({ kind, mode, editingCategory, onClose }: { kind: ModalKind; mode: ModalMode; editingCategory?: CategoryItem | null; onClose: () => void }) {
  const { categories, loadProductsPage, refresh, stockItems, token } = useInventoryData();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [stock, setStock] = useState("");
  const [serialNumbers, setSerialNumbers] = useState("");
  const [party, setParty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<PickedImage | null>(null);
  const loadedOutboundProductsRef = useRef(false);
  const actionLabel = mode === "edit" ? "Edit" : "Tambah";
  const title = kind === "kategori" ? `${actionLabel} Kategori` : kind === "stok" ? `${actionLabel} Produk` : kind === "masuk" ? "Tambah Stok Masuk" : kind === "keluar" ? "Kurangi Stok" : "";
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const selectedProduct = stockItems.find((item) => item.id === selectedProductId);
  const productOptions = kind === "keluar" ? stockItems.filter((item) => item.stock > 0) : stockItems;
  const quantityNumber = Number(stock || 0);
  const serialList = serialNumbers.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
  const movementQuantity = serialList.length || quantityNumber;
  const stockExceeded = kind === "keluar" && Boolean(selectedProduct && movementQuantity > selectedProduct.stock);
  const movementError = stockExceeded ? `Stok tersisa ${selectedProduct?.stock ?? 0}, jumlah tidak boleh melebihi stok.` : "";
  const movementDisabled = (kind === "masuk" || kind === "keluar") && (!selectedProductId || movementQuantity < 1 || (kind === "keluar" && (!selectedProduct || stockExceeded)));

  // Pre-fill form when editing category
  const [originalName, setOriginalName] = useState("");
  const [originalDesc, setOriginalDesc] = useState("");

  useEffect(() => {
    if (mode === "edit" && kind === "kategori" && editingCategory) {
      setName(editingCategory.name);
      const desc = editingCategory.desc === "-" ? "" : editingCategory.desc;
      setDescription(desc);
      setOriginalName(editingCategory.name);
      setOriginalDesc(desc);
    } else if (mode === "add") {
      setName("");
      setDescription("");
      setOriginalName("");
      setOriginalDesc("");
    }
  }, [mode, kind, editingCategory]);

  useEffect(() => {
    if (kind !== "masuk" && kind !== "keluar") {
      loadedOutboundProductsRef.current = false;
      return;
    }

    if (loadedOutboundProductsRef.current) return;
    loadedOutboundProductsRef.current = true;
    void loadProductsPage(1, "", kind === "keluar" ? "Tersedia" : "", "", 100);
  }, [kind, loadProductsPage]);

  const reset = () => {
    setName("");
    setDescription("");
    setSku("");
    setBarcode("");
    setStock("");
    setSerialNumbers("");
    setParty("");
    setSelectedCategoryId("");
    setSelectedProductId("");
    setNote("");
    setImageFile(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const uploadImage = async (productId: string) => {
    if (!imageFile) return;
    try {
      const form = new FormData();
      appendPickedImage(form, "image", imageFile);
      await apiRequest(`/products/${productId}/image`, { body: form, method: "POST", token });
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Gambar gagal diupload.");
    }
  };

  const save = async () => {
    if (!kind) return;
    setSaving(true);

    try {
      if (kind === "kategori") {
        if (mode === "edit" && editingCategory) {
          await apiRequest(`/categories/${editingCategory.id}`, { body: JSON.stringify({ description: description || null, name }), method: "PATCH", token });
        } else {
          await apiRequest("/categories", { body: JSON.stringify({ description: description || null, name }), method: "POST", token });
        }
      }

      if (kind === "stok") {
        const result = await apiRequest<{ id: string }>("/products", {
          body: JSON.stringify({ barcode: barcode.trim() || null, category_id: selectedCategoryId, min_stock: 1, name, sku, initial_stock: Number(stock || 0) }),
          method: "POST",
          token,
        });
        if (result.id) await uploadImage(result.id);
      }

      if (kind === "masuk" || kind === "keluar") {
        const product = stockItems.find((item) => item.id === selectedProductId);
        if (!product) throw new Error("Produk tidak ditemukan. Pilih produk yang valid.");
        if (kind === "keluar" && product.stock <= 0) throw new Error("Produk ini stoknya 0, tidak bisa dikurangi.");
        if (kind === "keluar" && Number(stock || 0) > product.stock) throw new Error(`Jumlah keluar tidak boleh lebih dari stok tersedia (${product.stock}).`);

        await apiRequest(kind === "masuk" ? "/stock/inbound" : "/stock/outbound", {
          body: JSON.stringify({ note: note.trim() || null, party: party.trim() || null, productId: product.id, quantity: movementQuantity, serialNumbers: serialList }),
          method: "POST",
          token,
        });
      }

      await refresh();
      close();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Data gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleImagePick = async () => {
    const image = await pickImage();
    if (image) setImageFile(image);
  };

  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            {kind === "kategori" ? (
              <>
                <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Nama produk" placeholderTextColor="#9aa4b5" value={name} />
                <TextInput onChangeText={setDescription} style={styles.modalInput} placeholder="Deskripsi kategori" placeholderTextColor="#9aa4b5" value={description} />
              </>
            ) : null}
            {kind === "stok" ? (
              <>
                <TextInput onChangeText={setSku} style={styles.modalInput} placeholder="Kode Produk" placeholderTextColor="#9aa4b5" value={sku} />
                <TextInput onChangeText={setBarcode} style={styles.modalInput} placeholder="Kode Barcode" placeholderTextColor="#9aa4b5" value={barcode} />
                <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Produk" placeholderTextColor="#9aa4b5" value={name} />
                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalLabel}>Kategori</Text>
                  <Pressable onPress={() => setCategoryOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{selectedCategory?.name || "Pilih kategori"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                  {categoryOpen ? <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>{categories.map((category) => <Pressable key={category.id} onPress={() => { setSelectedCategoryId(category.id); setCategoryOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, selectedCategoryId === category.id && styles.modalSelectOptionActive, hovered && selectedCategoryId !== category.id && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, selectedCategoryId === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text></Pressable>)}</ScrollView> : null}
                </View>
                <TextInput style={styles.modalInput} placeholder="Stok Awal" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
                <Pressable onPress={() => void handleImagePick()} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed, { justifyContent: "center" }]}><ImageUp color={colors.primary} size={18} /><Text style={[styles.modalSelectText, { textAlign: "center" }]}>{imageFile ? pickedImageName(imageFile) : "Upload Gambar (Opsional)"}</Text></Pressable>
              </>
            ) : null}
            {kind === "masuk" || kind === "keluar" ? (
              <>
                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalLabel}>Produk</Text>
                  <Pressable onPress={() => setProductOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{selectedProduct?.name || "Pilih produk"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                  {productOpen ? <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>{productOptions.map((item) => <Pressable key={item.id} onPress={() => { setSelectedProductId(item.id); setProductOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, selectedProductId === item.id && styles.modalSelectOptionActive, hovered && selectedProductId !== item.id && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, selectedProductId === item.id && styles.modalSelectOptionTextActive]}>{item.name} ({item.sku}){kind === "keluar" ? ` - Stok: ${item.stock}` : ""}</Text></Pressable>)}{!productOptions.length ? <Text style={[styles.modalSelectOptionText, { padding: 16 }]}>Tidak ada produk dengan stok tersedia</Text> : null}</ScrollView> : null}
                </View>
                <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
                {movementError ? <Text style={styles.errorText}>{movementError}</Text> : null}
                <TextInput multiline onChangeText={setSerialNumbers} style={[styles.modalInput, { minHeight: 88, textAlignVertical: "top" }]} placeholder="Kode Produk + No Seri, satu per baris" placeholderTextColor="#9aa4b5" value={serialNumbers} />
                <TextInput onChangeText={setParty} style={styles.modalInput} placeholder={kind === "masuk" ? "Supplier" : "Alamat"} placeholderTextColor="#9aa4b5" value={party} />
                <TextInput onChangeText={setNote} style={styles.modalInput} placeholder="Catatan (Opsional)" placeholderTextColor="#9aa4b5" value={note} />
              </>
            ) : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={close} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={saving || (kind === "kategori" && !name.trim()) || (kind === "stok" && (!sku.trim() || !name.trim() || !selectedCategoryId)) || movementDisabled || (mode === "edit" && kind === "kategori" && name === originalName && description === originalDesc)} onPress={save} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !saving && styles.saveButtonHover, pressed && styles.pressed, (saving || (kind === "kategori" && !name.trim()) || (kind === "stok" && (!sku.trim() || !name.trim() || !selectedCategoryId)) || movementDisabled || (mode === "edit" && kind === "kategori" && name === originalName && description === originalDesc)) && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

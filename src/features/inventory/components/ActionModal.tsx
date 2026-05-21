import { useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { ChevronDown, ImageUp } from "lucide-react-native";
import { apiRequest } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import type { CategoryItem, ModalKind, ModalMode, PressState } from "../types";
import { styles } from "../styles";
import { colors } from "../../../theme/tokens";

export function ActionModal({ kind, mode, editingCategory, onClose }: { kind: ModalKind; mode: ModalMode; editingCategory?: CategoryItem | null; onClose: () => void }) {
  const { categories, customers, refresh, stockItems, suppliers, token } = useInventoryData();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [party, setParty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const actionLabel = mode === "edit" ? "Edit" : "Tambah";
  const title = kind === "kategori" ? `${actionLabel} Kategori` : kind === "stok" ? `${actionLabel} Barang` : kind === "masuk" ? "Tambah Stok Masuk" : kind === "keluar" ? "Kurangi Stok" : "";
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const parties = kind === "masuk" ? suppliers : customers;
  const selectedParty = parties.find((item) => item.id === selectedPartyId);

  useEffect(() => {
    if (kind === "masuk" || kind === "keluar") setSelectedPartyId("");
  }, [kind]);

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

  const reset = () => {
    setName("");
    setDescription("");
    setSku("");
    setStock("");
    setParty("");
    setSelectedCategoryId("");
    setSelectedPartyId("");
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
      form.append("image", imageFile);
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
          body: JSON.stringify({ barcode: null, category_id: selectedCategoryId, min_stock: 1, name, sku, initial_stock: Number(stock || 0) }),
          method: "POST",
          token,
        });
        if (result.id) await uploadImage(result.id);
      }

      if (kind === "masuk" || kind === "keluar") {
        const product = stockItems.find((item) => item.sku.toLowerCase() === sku.toLowerCase() || item.barcode.toLowerCase() === sku.toLowerCase());
        if (!product) throw new Error("Produk tidak ditemukan. Isi SKU/barcode yang valid.");

        await apiRequest(kind === "masuk" ? "/stock/inbound" : "/stock/outbound", {
          body: JSON.stringify({ customer_id: kind === "keluar" ? selectedPartyId || null : null, note, party, productId: product.id, quantity: Number(stock || 0), supplier_id: kind === "masuk" ? selectedPartyId || null : null }),
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

  const handleImagePick = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert("Info", "Upload gambar saat ini tersedia di web admin.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setImageFile(file);
    };
    input.click();
  };

  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {kind === "kategori" ? (
            <>
              <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Nama kategori barang" placeholderTextColor="#9aa4b5" value={name} />
              <TextInput onChangeText={setDescription} style={styles.modalInput} placeholder="Deskripsi kategori" placeholderTextColor="#9aa4b5" value={description} />
            </>
          ) : null}
          {kind === "stok" ? (
            <>
              <TextInput onChangeText={setSku} style={styles.modalInput} placeholder="Kode Produk" placeholderTextColor="#9aa4b5" value={sku} />
              <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Produk" placeholderTextColor="#9aa4b5" value={name} />
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>Kategori</Text>
                <Pressable onPress={() => setCategoryOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{selectedCategory?.name || "Pilih kategori"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                {categoryOpen ? <View style={[styles.modalSelectOptions, { maxHeight: 160, overflow: "scroll", scrollbarWidth: "none", msOverflowStyle: "none" } as any]}>{categories.map((category) => <Pressable key={category.id} onPress={() => { setSelectedCategoryId(category.id); setCategoryOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, selectedCategoryId === category.id && styles.modalSelectOptionActive, hovered && selectedCategoryId !== category.id && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, selectedCategoryId === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text></Pressable>)}</View> : null}
              </View>
              <TextInput style={styles.modalInput} placeholder="Stok Awal" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
              {Platform.OS === "web" && (
                <Pressable onPress={handleImagePick} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed, { justifyContent: "center" }]}><Text style={[styles.modalSelectText, { textAlign: "center" }]}>{imageFile ? `${imageFile.name}` : "Upload Gambar (Opsional) "}</Text></Pressable>
              )}
            </>
          ) : null}
          {kind === "masuk" || kind === "keluar" ? (
            <>
              <TextInput onChangeText={setSku} style={styles.modalInput} placeholder="SKU / Barcode" placeholderTextColor="#9aa4b5" value={sku} />
              <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>{kind === "masuk" ? "Supplier" : "Customer"}</Text>
                <Pressable onPress={() => setPartyOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{selectedParty?.name || "Pilih dari data API"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                {partyOpen ? <View style={[styles.modalSelectOptions, { maxHeight: 160, overflow: "scroll", scrollbarWidth: "none", msOverflowStyle: "none" } as any]}>{parties.map((item) => <Pressable key={item.id} onPress={() => { setSelectedPartyId(item.id); setParty(""); setPartyOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, selectedPartyId === item.id && styles.modalSelectOptionActive, hovered && selectedPartyId !== item.id && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, selectedPartyId === item.id && styles.modalSelectOptionTextActive]}>{item.name}</Text></Pressable>)}</View> : null}
              </View>
              <TextInput onChangeText={setParty} style={styles.modalInput} placeholder={kind === "masuk" ? "Supplier" : "Tujuan / Customer"} placeholderTextColor="#9aa4b5" value={party} />
              <TextInput onChangeText={setNote} style={styles.modalInput} placeholder="Catatan" placeholderTextColor="#9aa4b5" value={note} />
            </>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable onPress={close} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={saving || (kind === "kategori" && !name.trim()) || (kind === "stok" && (!sku.trim() || !name.trim() || !selectedCategoryId)) || (mode === "edit" && kind === "kategori" && name === originalName && description === originalDesc)} onPress={save} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !saving && styles.saveButtonHover, pressed && styles.pressed, (saving || (kind === "kategori" && !name.trim()) || (kind === "stok" && (!sku.trim() || !name.trim() || !selectedCategoryId)) || (mode === "edit" && kind === "kategori" && name === originalName && description === originalDesc)) && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

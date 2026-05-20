import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { apiRequest } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import type { ModalKind, ModalMode } from "../types";
import { styles } from "../styles";
import { colors } from "../../../theme/tokens";

export function ActionModal({ initialProductId, kind, mode, onClose }: { initialProductId?: string; kind: ModalKind; mode: ModalMode; onClose: () => void }) {
  const { categories, customers, refreshCategories, refreshProducts, refreshStockActivity, stockItems, suppliers, token } = useInventoryData();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [party, setParty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const actionLabel = mode === "edit" ? "Edit" : "Tambah";
  const title = kind === "kategori" ? `${actionLabel} Kategori` : kind === "stok" ? `${actionLabel} Barang` : kind === "masuk" ? "Tambah Stok Masuk" : kind === "keluar" ? "Kurangi Stok" : "";
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const selectedProduct = stockItems.find((item) => item.id === selectedProductId);
  const productOptions = stockItems.filter((item) => `${item.name} ${item.sku} ${item.barcode}`.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 25);
  const parties = kind === "masuk" ? suppliers : customers;
  const selectedParty = parties.find((item) => item.id === selectedPartyId);
  const transactionProduct = selectedProduct ?? stockItems.find((item) => item.sku.toLowerCase() === sku.toLowerCase() || item.barcode.toLowerCase() === sku.toLowerCase());
  const transactionQuantity = Number(stock || 0);
  const afterStock = transactionProduct ? transactionProduct.stock + (kind === "keluar" ? -transactionQuantity : transactionQuantity) : 0;
  const insufficientStock = Boolean(kind === "keluar" && transactionProduct && transactionQuantity > transactionProduct.stock);

  useEffect(() => {
    if (kind && !selectedCategoryId) setSelectedCategoryId(categories[0]?.id ?? "");
  }, [categories, kind, selectedCategoryId]);

  useEffect(() => {
    if (kind === "masuk" || kind === "keluar") setSelectedPartyId("");
    if (kind === "masuk" || kind === "keluar") {
      const product = stockItems.find((item) => item.id === initialProductId);
      setSelectedProductId(product?.id ?? "");
      setSku(product?.sku ?? "");
    }
  }, [initialProductId, kind, stockItems]);

  const reset = () => {
    setName("");
    setDescription("");
    setSku("");
    setSelectedProductId("");
    setProductQuery("");
    setBarcode("");
    setPrice("");
    setStock("");
    setParty("");
    setSelectedPartyId("");
    setNote("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = async () => {
    if (!kind) return;
    setSaving(true);

    try {
      if (kind === "kategori") {
        await apiRequest("/categories", { body: JSON.stringify({ description, name }), method: "POST", token });
      }

      if (kind === "stok") {
        await apiRequest("/products", {
          body: JSON.stringify({ barcode: barcode || null, category_id: selectedCategoryId, min_stock: Number(stock || 0), name, sale_price: Number(price || 0), sku }),
          method: "POST",
          token,
        });
      }

      if (kind === "masuk" || kind === "keluar") {
        const product = selectedProduct ?? stockItems.find((item) => item.sku.toLowerCase() === sku.toLowerCase() || item.barcode.toLowerCase() === sku.toLowerCase());
        if (!product) throw new Error("Produk tidak ditemukan. Isi SKU/barcode yang valid.");

        await apiRequest(kind === "masuk" ? "/stock/inbound" : "/stock/outbound", {
          body: JSON.stringify({ customer_id: kind === "keluar" ? selectedPartyId || null : null, note, party, productId: product.id, quantity: Number(stock || 0), supplier_id: kind === "masuk" ? selectedPartyId || null : null }),
          method: "POST",
          token,
        });
      }

      if (kind === "kategori") await refreshCategories();
      if (kind === "stok") await refreshProducts();
      if (kind === "masuk" || kind === "keluar") await refreshStockActivity();
      close();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Data gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.stack}>
            <Text style={styles.modalTitle}>{title}</Text>
            {mode === "edit" ? <Text style={styles.errorText}>Edit detail dari modal belum diaktifkan; gunakan tambah/nonaktif untuk sementara.</Text> : null}
          {kind === "kategori" ? (
            <>
              <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Nama kategori barang" placeholderTextColor="#9aa4b5" value={name} />
              <TextInput onChangeText={setDescription} style={styles.modalInput} placeholder="Deskripsi kategori" placeholderTextColor="#9aa4b5" value={description} />
            </>
          ) : null}
          {kind === "stok" ? (
            <>
              <TextInput onChangeText={setSku} style={styles.modalInput} placeholder="SKU" placeholderTextColor="#9aa4b5" value={sku} />
              <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Nama Barang" placeholderTextColor="#9aa4b5" value={name} />
              <TextInput onChangeText={setBarcode} style={styles.modalInput} placeholder="Barcode" placeholderTextColor="#9aa4b5" value={barcode} />
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>Kategori</Text>
                <Pressable onPress={() => setCategoryOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedCategory?.name || "Pilih kategori"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                {categoryOpen ? <View style={styles.modalSelectOptions}>{categories.map((category) => <Pressable key={category.id} onPress={() => { setSelectedCategoryId(category.id); setCategoryOpen(false); }} style={[styles.modalSelectOption, selectedCategoryId === category.id && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, selectedCategoryId === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text></Pressable>)}</View> : null}
              </View>
              <TextInput style={styles.modalInput} placeholder="Harga Jual" placeholderTextColor="#9aa4b5" value={price} onChangeText={(value) => setPrice(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
              <TextInput style={styles.modalInput} placeholder="Minimum Stok" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
            </>
          ) : null}
          {kind === "masuk" || kind === "keluar" ? (
            <>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>Produk</Text>
                <Pressable onPress={() => setProductOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : "Pilih barang dari data API"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                {productOpen ? <View style={styles.modalSelectOptions}><TextInput onChangeText={setProductQuery} style={styles.modalInput} placeholder="Cari nama / SKU / barcode" placeholderTextColor="#9aa4b5" value={productQuery} />{productOptions.map((item) => <Pressable key={item.id} onPress={() => { setSelectedProductId(item.id); setSku(item.sku); setProductQuery(""); setProductOpen(false); }} style={[styles.modalSelectOption, selectedProductId === item.id && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, selectedProductId === item.id && styles.modalSelectOptionTextActive]}>{item.sku} - {item.name} | stok {item.stock}</Text></Pressable>)}{!productOptions.length ? <Text style={styles.emptyText}>Produk tidak ditemukan</Text> : null}</View> : null}
              </View>
              <TextInput onChangeText={setSku} style={styles.modalInput} placeholder="SKU / Barcode" placeholderTextColor="#9aa4b5" value={sku} />
              {transactionProduct ? <View style={styles.searchPanel}><Text style={styles.cardEyebrow}>Info Barang</Text><Text style={styles.scanResultTitle}>{transactionProduct.name}</Text><Text style={styles.scanResultMeta}>Stok saat ini: {transactionProduct.stock}</Text><Text style={styles.scanResultMeta}>Setelah transaksi: {afterStock}</Text>{insufficientStock ? <Text style={styles.errorText}>Jumlah keluar melebihi stok saat ini.</Text> : null}</View> : null}
              <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>{kind === "masuk" ? "Supplier" : "Customer"}</Text>
                <Pressable onPress={() => setPartyOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedParty?.name || "Pilih dari data API"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                {partyOpen ? <View style={styles.modalSelectOptions}>{parties.map((item) => <Pressable key={item.id} onPress={() => { setSelectedPartyId(item.id); setParty(""); setPartyOpen(false); }} style={[styles.modalSelectOption, selectedPartyId === item.id && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, selectedPartyId === item.id && styles.modalSelectOptionTextActive]}>{item.name}</Text></Pressable>)}</View> : null}
              </View>
              <TextInput onChangeText={setParty} style={styles.modalInput} placeholder={kind === "masuk" ? "Supplier" : "Tujuan / Customer"} placeholderTextColor="#9aa4b5" value={party} />
              <TextInput onChangeText={setNote} style={styles.modalInput} placeholder="Catatan" placeholderTextColor="#9aa4b5" value={note} />
            </>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable onPress={close} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={saving || mode === "edit"} onPress={save} style={styles.saveButton}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

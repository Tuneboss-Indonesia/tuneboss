import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { apiRequest } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import type { CategoryItem, ModalKind, ModalMode, PressState } from "../types";
import { styles } from "../styles";
import { colors } from "../../../theme/tokens";

const paymentStatuses = ["Lunas", "DP", "Unpaid", "PayLater"] as const;

type DealerOption = { address?: string | null; id: string; name: string; phone?: string | null };
type DealerPayload = DealerOption[] | { data?: DealerOption[] };

export function ActionModal({ kind, mode, editingCategory, onClose }: { kind: ModalKind; mode: ModalMode; editingCategory?: CategoryItem | null; onClose: () => void }) {
  const { categories, loadProductsPage, refresh, stockItems, token } = useInventoryData();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [serialNumbers, setSerialNumbers] = useState("");
  const [party, setParty] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Unpaid");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [nominalAmount, setNominalAmount] = useState("");
  const [paymentStatusOpen, setPaymentStatusOpen] = useState(false);
  const [dealerOpen, setDealerOpen] = useState(false);
  const [dealers, setDealers] = useState<DealerOption[]>([]);
  const [serialOpen, setSerialOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const loadedOutboundProductsRef = useRef(false);
  const actionLabel = mode === "edit" ? "Edit" : "Tambah";
  const title = kind === "kategori" ? `${actionLabel} Kategori` : kind === "stok" ? `${actionLabel} Produk` : kind === "masuk" ? "Tambah Stok Masuk" : kind === "keluar" ? "Kurangi Stok" : "";
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const selectedProduct = stockItems.find((item) => item.id === selectedProductId);
  const availableSerials = selectedProduct?.serialNumbers ?? [];
  const dealerOptions = customerName.trim() ? dealers.filter((dealer) => `${dealer.name} ${dealer.address ?? ""} ${dealer.phone ?? ""}`.toLowerCase().includes(customerName.trim().toLowerCase())) : dealers;
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

  useEffect(() => {
    if (kind !== "keluar") return;
    void apiRequest<DealerPayload>("/dealers", { token }).then((response) => setDealers(Array.isArray(response) ? response : response.data ?? [])).catch(() => setDealers([]));
  }, [kind, token]);

  const reset = () => {
    setName("");
    setDescription("");
    setSku("");
    setStock("");
    setSerialNumbers("");
    setParty("");
    setCustomerName("");
    setCustomerPhone("");
    setPaymentStatus("Unpaid");
    setPaymentMethod("");
    setNominalAmount("");
    setPaymentStatusOpen(false);
    setDealerOpen(false);
    setSerialOpen(false);
    setSelectedCategoryId("");
    setSelectedProductId("");
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
        if (mode === "edit" && editingCategory) {
          await apiRequest(`/categories/${editingCategory.id}`, { body: JSON.stringify({ description: description || null, name }), method: "PATCH", token });
        } else {
          await apiRequest("/categories", { body: JSON.stringify({ description: description || null, name }), method: "POST", token });
        }
      }

      if (kind === "stok") {
        await apiRequest<{ id: string }>("/products", {
          body: JSON.stringify({ barcode: null, category_id: selectedCategoryId, min_stock: 1, name, sku, initial_stock: Number(stock || 0) }),
          method: "POST",
          token,
        });
      }

      if (kind === "masuk" || kind === "keluar") {
        const product = stockItems.find((item) => item.id === selectedProductId);
        if (!product) throw new Error("Produk tidak ditemukan. Pilih produk yang valid.");
        if (kind === "keluar" && product.stock <= 0) throw new Error("Produk ini stoknya 0, tidak bisa dikurangi.");
        if (kind === "keluar" && Number(stock || 0) > product.stock) throw new Error(`Jumlah keluar tidak boleh lebih dari stok tersedia (${product.stock}).`);

        await apiRequest(kind === "masuk" ? "/stock/inbound" : "/stock/outbound", {
          body: JSON.stringify({ customerName: kind === "keluar" ? customerName.trim() || null : null, customerPhone: kind === "keluar" ? customerPhone.trim() || null : null, nominalAmount: kind === "keluar" ? Number(nominalAmount || 0) || null : null, note: note.trim() || null, party: kind === "keluar" ? party.trim() || null : null, paymentMethod: kind === "keluar" ? paymentMethod.trim() || null : null, paymentStatus: kind === "keluar" ? paymentStatus : null, productId: product.id, quantity: movementQuantity, serialNumbers: serialList }),
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

  const chooseDealer = (dealer: DealerOption) => {
    setCustomerName(dealer.name);
    setCustomerPhone(dealer.phone ?? "");
    setParty(dealer.address ?? "");
    setDealerOpen(false);
  };

  const toggleSerial = (serial: string) => {
    const current = serialNumbers.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
    setSerialNumbers(current.includes(serial) ? current.filter((value) => value !== serial).join("\n") : [...current, serial].join("\n"));
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
                <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Produk" placeholderTextColor="#9aa4b5" value={name} />
                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalLabel}>Kategori</Text>
                  <Pressable onPress={() => setCategoryOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{selectedCategory?.name || "Pilih kategori"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                  {categoryOpen ? <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>{categories.map((category) => <Pressable key={category.id} onPress={() => { setSelectedCategoryId(category.id); setCategoryOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, selectedCategoryId === category.id && styles.modalSelectOptionActive, hovered && selectedCategoryId !== category.id && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, selectedCategoryId === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text></Pressable>)}</ScrollView> : null}
                </View>
                <TextInput style={styles.modalInput} placeholder="Stok Awal" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
              </>
            ) : null}
            {kind === "masuk" || kind === "keluar" ? (
              <>
                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalLabel}>Produk</Text>
                  <Pressable onPress={() => setProductOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{selectedProduct?.name || "Pilih produk"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                  {productOpen ? <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>{productOptions.map((item) => <Pressable key={item.id} onPress={() => { setSelectedProductId(item.id); setProductOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, selectedProductId === item.id && styles.modalSelectOptionActive, hovered && selectedProductId !== item.id && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, selectedProductId === item.id && styles.modalSelectOptionTextActive]}>{item.name} ({item.sku}){kind === "keluar" ? ` - Stok: ${item.stock}` : ""}</Text></Pressable>)}{!productOptions.length ? <Text style={[styles.modalSelectOptionText, { padding: 16 }]}>Tidak ada produk dengan stok tersedia</Text> : null}</ScrollView> : null}
                </View>
                {kind === "masuk" ? <TextInput editable={false} style={styles.modalInput} placeholder="Kategori" placeholderTextColor="#9aa4b5" value={selectedProduct?.category ?? ""} /> : null}
                <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
                {movementError ? <Text style={styles.errorText}>{movementError}</Text> : null}
                <View style={styles.modalFieldGroup}>
                  <TextInput multiline onChangeText={setSerialNumbers} style={[styles.modalInput, { minHeight: 88, textAlignVertical: "top" }]} placeholder="Kode Produk + No Seri, satu per baris" placeholderTextColor="#9aa4b5" value={serialNumbers} />
                  {kind === "keluar" && availableSerials.length ? <Pressable onPress={() => setSerialOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>Pilih no seri tersedia</Text><ChevronDown color={colors.muted} size={18} /></Pressable> : null}
                  {kind === "keluar" && serialOpen ? <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>{availableSerials.map((serial) => <Pressable key={serial} onPress={() => toggleSerial(serial)} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, serialList.includes(serial) && styles.modalSelectOptionActive, hovered && !serialList.includes(serial) && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, serialList.includes(serial) && styles.modalSelectOptionTextActive]}>{serial}</Text></Pressable>)}</ScrollView> : null}
                </View>
                {kind === "keluar" ? <View style={styles.modalFieldGroup}><TextInput onChangeText={(value) => { setCustomerName(value); setDealerOpen(Boolean(value.trim())); }} style={styles.modalInput} placeholder="Nama pembeli/dealer" placeholderTextColor="#9aa4b5" value={customerName} /><Pressable onPress={() => setDealerOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>Pilih dealer</Text><ChevronDown color={colors.muted} size={18} /></Pressable>{dealerOpen ? <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>{dealerOptions.map((dealer) => <Pressable key={dealer.id} onPress={() => chooseDealer(dealer)} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, hovered && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={styles.modalSelectOptionText}>{dealer.name}{dealer.phone ? ` - ${dealer.phone}` : ""}</Text></Pressable>)}{!dealerOptions.length ? <Text style={[styles.modalSelectOptionText, { padding: 16 }]}>Dealer tidak ditemukan</Text> : null}</ScrollView> : null}</View> : null}
                {kind === "keluar" ? <TextInput onChangeText={setCustomerPhone} style={styles.modalInput} placeholder="No. Telp / WhatsApp" placeholderTextColor="#9aa4b5" value={customerPhone} /> : null}
                {kind === "keluar" ? (
                  <View style={styles.modalFieldGroup}>
                    <Text style={styles.modalLabel}>Status pembayaran</Text>
                    <Pressable onPress={() => setPaymentStatusOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{paymentStatus}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                    {paymentStatusOpen ? <View style={styles.modalSelectOptions}>{paymentStatuses.map((status) => <Pressable key={status} onPress={() => { setPaymentStatus(status); setPaymentStatusOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, paymentStatus === status && styles.modalSelectOptionActive, hovered && paymentStatus !== status && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, paymentStatus === status && styles.modalSelectOptionTextActive]}>{status}</Text></Pressable>)}</View> : null}
                  </View>
                ) : null}
                {kind === "keluar" ? <TextInput onChangeText={setParty} style={styles.modalInput} placeholder="Alamat" placeholderTextColor="#9aa4b5" value={party} /> : null}
                {kind === "keluar" ? <TextInput onChangeText={setPaymentMethod} style={styles.modalInput} placeholder="Metode Pembayaran" placeholderTextColor="#9aa4b5" value={paymentMethod} /> : null}
                {kind === "keluar" ? <TextInput onChangeText={(value) => setNominalAmount(value.replace(/\D/g, ""))} style={styles.modalInput} placeholder="Nominal" placeholderTextColor="#9aa4b5" value={nominalAmount} keyboardType="number-pad" inputMode="numeric" /> : null}
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

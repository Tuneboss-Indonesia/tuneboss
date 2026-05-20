import { useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { ChevronDown, PackageMinus, PackagePlus, ScanBarcode } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import type { StockItem } from "../../../types/dashboard";
import { apiRequest, formatCurrency } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import { Metric } from "../components/common";

type LookupResponse = StockItem & { salePrice?: number; categoryId?: string };

export function ScanPage({ onGoInbound, onGoOutbound }: { onGoInbound: (productId?: string) => void; onGoOutbound: (productId?: string) => void }) {
  const { categories, refreshProducts, stockItems, token } = useInventoryData();
  const [mode, setMode] = useState<"camera" | "scanner">("scanner");
  const [barcode, setBarcode] = useState(stockItems[0]?.barcode || stockItems[0]?.sku || "");
  const [result, setResult] = useState<StockItem | null>(stockItems[0] ?? null);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({ barcode: "", categoryId: categories[0]?.id ?? "", minStock: "1", name: "", price: "0", sku: "" });
  const selectedCategory = categories.find((category) => category.id === newProduct.categoryId);

  const processBarcode = async (value = barcode) => {
    const code = value.trim();
    if (!code) return;

    try {
      const found = await apiRequest<LookupResponse>(`/products/lookup?code=${encodeURIComponent(code)}`, { token });
      setResult({ ...found, category: found.category || "-", lastUpdated: "-", location: "-" });
      setError("");
    } catch {
      const fallback = stockItems.find((item) => item.barcode.toLowerCase() === code.toLowerCase() || item.sku.toLowerCase() === code.toLowerCase());
      setResult(fallback ?? null);
      setError(fallback ? "" : "Barcode/SKU tidak ditemukan di API.");
      if (!fallback) setNewProduct((current) => ({ ...current, barcode: code, categoryId: current.categoryId || categories[0]?.id || "", sku: code }));
    }
  };

  const createProduct = async () => {
    if (!newProduct.categoryId) {
      Alert.alert("Gagal", "Pilih kategori barang terlebih dahulu.");
      return;
    }

    setSaving(true);

    try {
      const product = await apiRequest<LookupResponse>("/products", {
        body: JSON.stringify({ barcode: newProduct.barcode || null, category_id: newProduct.categoryId, min_stock: Number(newProduct.minStock || 0), name: newProduct.name, sale_price: Number(newProduct.price || 0), sku: newProduct.sku }),
        method: "POST",
        token,
      });

      await refreshProducts();
      setResult({ ...product, category: product.category || selectedCategory?.name || "-", lastUpdated: "-", location: "-" });
      setBarcode(product.barcode || product.sku);
      setError("");
      setCreateOpen(false);
      setNewProduct({ barcode: "", categoryId: categories[0]?.id ?? "", minStock: "1", name: "", price: "0", sku: "" });
    } catch (requestError) {
      Alert.alert("Gagal", requestError instanceof Error ? requestError.message : "Barang gagal ditambahkan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.stack}>
      <View style={styles.pageHead}>
        <View style={styles.pageHeadText}>
          <Text style={styles.pageHeading}>Scan Barcode</Text>
          <Text style={styles.pageSubheading}>Scanner fisik mengisi input seperti keyboard. Lookup memakai endpoint produk backend.</Text>
        </View>
      </View>
      <View style={styles.scanModeRow}>
        <Pressable onPress={() => setMode("scanner")} style={[styles.scanModeCard, mode === "scanner" && styles.scanModeActive]}>
          <ScanBarcode color={mode === "scanner" ? colors.white : colors.primary} size={28} />
          <Text style={styles.scanModeTitle}>Scanner Fisik</Text>
          <Text style={styles.scanModeText}>Fokus ke input, scan barcode, tekan Enter atau tombol Proses.</Text>
        </Pressable>
        <Pressable onPress={() => setMode("camera")} style={[styles.scanModeCard, mode === "camera" && styles.scanModeActive]}>
          <ScanBarcode color={mode === "camera" ? colors.white : colors.primary} size={28} />
          <Text style={styles.scanModeTitle}>Kamera HP</Text>
          <Text style={styles.scanModeText}>Preview kamera tetap UI-only; integrasi kamera masuk tahap berikutnya.</Text>
        </Pressable>
      </View>
      <View style={styles.scanGrid}>
        <View style={styles.cameraPanel}>
          <View style={styles.scanCornerTop} />
          <View style={styles.scanLine} />
          <Text style={styles.cameraTitle}>{mode === "camera" ? "Camera Preview" : "Scanner Input Mode"}</Text>
          <Text style={styles.cameraHint}>{mode === "camera" ? "Arahkan kamera ke barcode barang." : "Gunakan scanner USB/Bluetooth lalu barcode masuk ke field."}</Text>
          <View style={styles.scanCornerBottom} />
        </View>
        <View style={styles.scanFormCard}>
          <Text style={styles.formLabel}>Barcode / SKU</Text>
          <View style={styles.searchInputWrap}>
            <ScanBarcode color={colors.primary} size={22} />
            <TextInput
              onChangeText={(value) => {
                setBarcode(value);
                if (value.length >= 8 && mode === "scanner") void processBarcode(value);
              }}
              onSubmitEditing={() => void processBarcode()}
              placeholder="Scan atau ketik barcode"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={barcode}
            />
          </View>
          <Pressable onPress={() => void processBarcode()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Proses</Text>
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {error && !result ? <Pressable onPress={() => setCreateOpen(true)} style={styles.secondaryButton}><PackagePlus color={colors.primary} size={18} /><Text style={styles.secondaryButtonText}>Tambah Barang Baru</Text></Pressable> : null}
          {result ? (
            <View style={styles.scanResultCard}>
              <Text style={styles.cardEyebrow}>Hasil Lookup</Text>
              <Text style={styles.scanResultTitle}>{result.name}</Text>
              <Text style={styles.scanResultMeta}>{result.sku} / {result.barcode}</Text>
              <Text style={styles.scanResultMeta}>{result.category} - {formatCurrency(result.salePrice ?? 0)}</Text>
              <View style={styles.scanResultStats}>
                <Metric title="Stok" value={String(result.stock)} />
                <Metric title="Min" value={String(result.minStock)} />
              </View>
              <View style={styles.scanActionRow}>
                <Pressable onPress={() => onGoInbound(result.id)} style={styles.secondaryButton}><PackagePlus color={colors.primary} size={18} /><Text style={styles.secondaryButtonText}>Stok Masuk</Text></Pressable>
                <Pressable onPress={() => onGoOutbound(result.id)} style={styles.secondaryButton}><PackageMinus color={colors.primary} size={18} /><Text style={styles.secondaryButtonText}>Stok Keluar</Text></Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Barang Baru</Text>
            <Text style={styles.pageSubheading}>Barcode/SKU belum ada di database. Lengkapi data barang untuk menyimpan produk baru.</Text>
            <TextInput onChangeText={(sku) => setNewProduct((current) => ({ ...current, sku }))} style={styles.modalInput} placeholder="SKU" placeholderTextColor={colors.muted} value={newProduct.sku} />
            <TextInput onChangeText={(name) => setNewProduct((current) => ({ ...current, name }))} style={styles.modalInput} placeholder="Nama Barang" placeholderTextColor={colors.muted} value={newProduct.name} />
            <TextInput onChangeText={(value) => setNewProduct((current) => ({ ...current, barcode: value }))} style={styles.modalInput} placeholder="Barcode" placeholderTextColor={colors.muted} value={newProduct.barcode} />
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>Kategori</Text>
              <Pressable onPress={() => setCategoryOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedCategory?.name || "Pilih kategori"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
              {categoryOpen ? <View style={styles.modalSelectOptions}>{categories.map((category) => <Pressable key={category.id} onPress={() => { setNewProduct((current) => ({ ...current, categoryId: category.id })); setCategoryOpen(false); }} style={[styles.modalSelectOption, newProduct.categoryId === category.id && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, newProduct.categoryId === category.id && styles.modalSelectOptionTextActive]}>{category.name}</Text></Pressable>)}</View> : null}
            </View>
            <TextInput onChangeText={(value) => setNewProduct((current) => ({ ...current, price: value.replace(/\D/g, "") }))} style={styles.modalInput} placeholder="Harga Jual" placeholderTextColor={colors.muted} value={newProduct.price} keyboardType="number-pad" inputMode="numeric" />
            <TextInput onChangeText={(value) => setNewProduct((current) => ({ ...current, minStock: value.replace(/\D/g, "") }))} style={styles.modalInput} placeholder="Minimum Stok" placeholderTextColor={colors.muted} value={newProduct.minStock} keyboardType="number-pad" inputMode="numeric" />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setCreateOpen(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable>
              <Pressable disabled={saving} onPress={() => void createProduct()} style={styles.saveButton}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

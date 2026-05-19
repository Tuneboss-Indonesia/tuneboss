import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { PackageMinus, PackagePlus, ScanBarcode } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import type { StockItem } from "../../../types/dashboard";
import { apiRequest, formatCurrency } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import { Metric } from "../components/common";

type LookupResponse = StockItem & { salePrice?: number; categoryId?: string };

export function ScanPage({ onGoInbound, onGoOutbound }: { onGoInbound: () => void; onGoOutbound: () => void }) {
  const { stockItems, token } = useInventoryData();
  const [mode, setMode] = useState<"camera" | "scanner">("scanner");
  const [barcode, setBarcode] = useState(stockItems[0]?.barcode || stockItems[0]?.sku || "");
  const [result, setResult] = useState<StockItem | null>(stockItems[0] ?? null);
  const [error, setError] = useState("");

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
                <Pressable onPress={onGoInbound} style={styles.secondaryButton}><PackagePlus color={colors.primary} size={18} /><Text style={styles.secondaryButtonText}>Stok Masuk</Text></Pressable>
                <Pressable onPress={onGoOutbound} style={styles.secondaryButton}><PackageMinus color={colors.primary} size={18} /><Text style={styles.secondaryButtonText}>Stok Keluar</Text></Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

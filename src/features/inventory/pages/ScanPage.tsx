import { useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { PackageMinus, PackagePlus, ScanBarcode } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { stockItems } from "../data";
import { styles } from "../styles";
import type { StockItem } from "../../../types/dashboard";
import { Metric } from "../components/common";

export function ScanPage({ onGoInbound, onGoOutbound }: { onGoInbound: () => void; onGoOutbound: () => void }) {
  const [mode, setMode] = useState<"camera" | "scanner">("scanner");
  const [barcode, setBarcode] = useState("899-TB-001-NMAX");
  const [result, setResult] = useState<StockItem | null>(stockItems[0]);
  const [error, setError] = useState("");
  const processBarcode = (value = barcode) => {
    const found = stockItems.find((item) => item.barcode.toLowerCase() === value.trim().toLowerCase() || item.sku.toLowerCase() === value.trim().toLowerCase());
    setResult(found ?? null);
    setError(found ? "" : "Barcode/SKU tidak ditemukan. Coba 899-TB-001-NMAX atau TB-ECU-NMAX.");
  };

  return <View style={styles.stack}><View style={styles.pageHead}><View style={styles.pageHeadText}><Text style={styles.pageHeading}>Scan Barcode</Text><Text style={styles.pageSubheading}>Pilih mode kamera HP atau scanner fisik. Scanner USB/Bluetooth mengisi input seperti keyboard.</Text></View></View><View style={styles.scanModeRow}><Pressable onPress={() => setMode("scanner")} style={[styles.scanModeCard, mode === "scanner" && styles.scanModeActive]}><ScanBarcode color={mode === "scanner" ? colors.white : colors.primary} size={28} /><Text style={styles.scanModeTitle}>Scanner Fisik</Text><Text style={styles.scanModeText}>Fokus ke input, scan barcode, tekan Enter atau tombol Proses.</Text></Pressable><Pressable onPress={() => setMode("camera")} style={[styles.scanModeCard, mode === "camera" && styles.scanModeActive]}><ScanBarcode color={mode === "camera" ? colors.white : colors.primary} size={28} /><Text style={styles.scanModeTitle}>Kamera HP</Text><Text style={styles.scanModeText}>Preview kamera dummy. Modul kamera real masuk fase berikutnya.</Text></Pressable></View><View style={styles.scanGrid}><View style={styles.cameraPanel}><View style={styles.scanCornerTop} /><View style={styles.scanLine} /><Text style={styles.cameraTitle}>{mode === "camera" ? "Camera Preview" : "Scanner Input Mode"}</Text><Text style={styles.cameraHint}>{mode === "camera" ? "Arahkan kamera ke barcode barang." : "Gunakan scanner USB/Bluetooth lalu barcode masuk ke field."}</Text><View style={styles.scanCornerBottom} /></View><View style={styles.scanFormCard}><Text style={styles.formLabel}>Barcode / SKU</Text><View style={styles.searchInputWrap}><ScanBarcode color={colors.primary} size={22} /><TextInput value={barcode} onChangeText={(value) => { setBarcode(value); if (value.length >= 8 && mode === "scanner") processBarcode(value); }} onSubmitEditing={() => processBarcode()} placeholder="Scan atau ketik barcode" placeholderTextColor={colors.muted} style={styles.searchInput} /></View><Pressable onPress={() => processBarcode()} style={styles.primaryButton}><ScanBarcode color={colors.white} size={18} /><Text style={styles.primaryButtonText}>Proses Scan</Text></Pressable>{error ? <Text style={styles.errorText}>{error}</Text> : null}{result ? <View style={styles.scanResultCard}><Text style={styles.cardEyebrow}>Data Barang</Text><Text style={styles.scanResultTitle}>{result.name}</Text><Text style={styles.scanResultMeta}>{result.sku} / {result.barcode}</Text><View style={styles.scanResultStats}><Metric title="Stok" value={`${result.stock}`} /><Metric title="Min" value={`${result.minStock}`} /></View><View style={styles.scanActionRow}><Pressable onPress={onGoInbound} style={styles.primaryButton}><PackagePlus color={colors.white} size={18} /><Text style={styles.primaryButtonText}>Stok Masuk</Text></Pressable><Pressable onPress={onGoOutbound} style={styles.secondaryButton}><PackageMinus color={colors.primary} size={18} /><Text style={styles.secondaryButtonText}>Stok Keluar</Text></Pressable></View></View> : null}</View></View></View>;
}

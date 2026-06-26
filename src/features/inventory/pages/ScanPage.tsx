import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { ChevronDown, PackageMinus, PackagePlus, ScanBarcode, X } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import type { StockItem } from "../../../types/dashboard";
import { apiRequest } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import { Metric } from "../components/common";
import type { PressState } from "../types";

type LookupResponse = StockItem & { categoryId?: string };
type ScanMovementType = "masuk" | "keluar";

export function ScanPage({ onGoInbound, onGoOutbound }: { onGoInbound: () => void; onGoOutbound: () => void }) {
  const { token } = useInventoryData();
  const [mode, setMode] = useState<"camera" | "scanner">("camera");
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<StockItem | null>(null);
  const [error, setError] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraLocked, setCameraLocked] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [movementType, setMovementType] = useState<ScanMovementType | null>(null);
  const [quantity, setQuantity] = useState("");
  const [party, setParty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const scannerInputRef = useRef<TextInput>(null);
  const lastProcessedRef = useRef("");
  const scannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processBarcode = async (value = barcode) => {
    const code = value.trim();
    if (!code) return;
    if (lookupLoading || lastProcessedRef.current === code) return;
    lastProcessedRef.current = code;
    setLookupLoading(true);

    try {
      const found = await apiRequest<LookupResponse>(`/products/lookup?code=${encodeURIComponent(code)}`, { token });
      setResult({ ...found, category: found.category || "-", lastUpdated: "-", location: "-" });
      setError("");
    } catch {
      setResult(null);
      setError("Barcode/SKU produk tidak ditemukan.");
      lastProcessedRef.current = "";
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => () => {
    if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
  }, []);

  useEffect(() => {
    if (mode !== "scanner" || result) return;
    const focusTimer = setTimeout(() => scannerInputRef.current?.focus(), 120);
    return () => clearTimeout(focusTimer);
  }, [mode, result]);

  const handleCameraScan = (scan: BarcodeScanningResult) => {
    if (mode !== "camera" || cameraLocked || !scan.data) return;
    setCameraLocked(true);
    setBarcode(scan.data);
    void processBarcode(scan.data).finally(() => {
      setTimeout(() => setCameraLocked(false), 1000);
    });
  };

  const handleScannerInput = (value: string) => {
    setBarcode(value);
    setError("");
    lastProcessedRef.current = "";

    if (scannerTimerRef.current) clearTimeout(scannerTimerRef.current);
    if (mode !== "scanner" || value.trim().length < 4) return;

    scannerTimerRef.current = setTimeout(() => {
      void processBarcode(value);
    }, 350);
  };

  const closeResult = () => {
    setResult(null);
    setMovementType(null);
    setQuantity("");
    setParty("");
    setNote("");
    setBarcode("");
    setError("");
    lastProcessedRef.current = "";
  };

  const saveMovement = async () => {
    if (!result || !movementType) return;

    const quantityNumber = Number(quantity || 0);
    if (quantityNumber < 1) {
      Alert.alert("Gagal", "Jumlah harus lebih dari 0.");
      return;
    }

    if (movementType === "keluar" && quantityNumber > result.stock) {
      Alert.alert("Gagal", `Stok tersisa ${result.stock}, jumlah keluar tidak boleh melebihi stok.`);
      return;
    }

    setSaving(true);
    try {
      await apiRequest(movementType === "masuk" ? "/stock/inbound" : "/stock/outbound", {
        body: JSON.stringify({
          note: note.trim() || null,
          party: party.trim() || null,
          productId: result.id,
          quantity: quantityNumber,
        }),
        method: "POST",
        token,
      });

      Alert.alert("Berhasil", movementType === "masuk" ? "Stok produk berhasil ditambah." : "Stok produk berhasil dikurangi.");
      closeResult();
    } catch (requestError) {
      Alert.alert("Gagal", requestError instanceof Error ? requestError.message : "Data stok gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const quantityNumber = Number(quantity || 0);
  const movementError = movementType === "keluar" && result && quantityNumber > result.stock ? `Stok tersisa ${result.stock}, jumlah tidak boleh melebihi stok.` : "";
  const saveDisabled = saving || !movementType || !quantity.trim() || quantityNumber < 1 || Boolean(movementError);

  return (
    <View style={styles.stack}>
      <View style={styles.pageHead}>
        <View style={styles.pageHeadText}>
          <Text style={styles.pageHeading}>Scan Barcode</Text>
        </View>
      </View>
      <View style={styles.scanModeRow}>
        <Pressable onPress={() => setMode("camera")} style={({ hovered, pressed }: PressState) => [styles.scanModeCard, mode === "camera" && styles.scanModeActive, hovered && mode !== "camera" && styles.scanModeCardHover, pressed && styles.pressed]}>
          <ScanBarcode color={mode === "camera" ? colors.white : colors.primary} size={28} />
          <Text style={styles.scanModeTitle}>Kamera Perangkat</Text>
          <Text style={styles.scanModeText}>Gunakan kamera perangkat untuk scan barcode produk.</Text>
        </Pressable>
        <Pressable onPress={() => setMode("scanner")} style={({ hovered, pressed }: PressState) => [styles.scanModeCard, mode === "scanner" && styles.scanModeActive, hovered && mode !== "scanner" && styles.scanModeCardHover, pressed && styles.pressed]}>
          <ScanBarcode color={mode === "scanner" ? colors.white : colors.primary} size={28} />
          <Text style={styles.scanModeTitle}>Alat Scanner</Text>
          <Text style={styles.scanModeText}>Arahkan alat scanner ke barcode produk.</Text>
        </Pressable>
      </View>
      <View style={styles.scanGrid}>
        <View style={[styles.cameraPanel, { flex: 1.4 }]}>
          {permission?.granted ? (
            <CameraView
              barcodeScannerSettings={{ barcodeTypes: ["aztec", "codabar", "code128", "code39", "code93", "datamatrix", "ean13", "ean8", "itf14", "pdf417", "qr", "upc_a", "upc_e"] }}
              facing="back"
              onBarcodeScanned={handleCameraScan}
              style={styles.cameraView}
            />
          ) : null}
          <View style={styles.scanCornerTop} />
          {!permission?.granted ? (
            <Pressable onPress={() => void requestPermission()} style={({ hovered, pressed }: PressState) => [styles.primaryButton, { marginTop: 16 }, hovered && styles.primaryButtonHover, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Izinkan Kamera</Text>
            </Pressable>
          ) : null}
          <View style={styles.scanCornerBottom} />
        </View>
        <View style={[styles.scanFormCard, { flex: 0.8 }]}>
          <Text style={styles.formLabel}>Barcode / SKU</Text>
          <View style={styles.searchInputWrap}>
            <ScanBarcode color={colors.primary} size={22} />
            <TextInput
              autoFocus={mode === "scanner"}
              onChangeText={(value) => {
                handleScannerInput(value);
              }}
              onSubmitEditing={() => void processBarcode()}
              placeholder="Scan atau ketik barcode"
              placeholderTextColor={colors.muted}
              ref={scannerInputRef}
              style={styles.searchInput}
              value={barcode}
            />
          </View>
          <Pressable onPress={() => void processBarcode()} style={({ hovered, pressed }: PressState) => [styles.primaryButton, hovered && styles.primaryButtonHover, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>{lookupLoading ? "Memproses..." : "Proses"}</Text>
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
      {result ? (
        <Modal visible transparent animationType="fade" onRequestClose={closeResult}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.modalTitle}>Produk</Text>
                <Pressable onPress={closeResult}><X color={colors.muted} size={24} /></Pressable>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
                <View style={styles.scanResultCard}>
                  <Text style={styles.scanResultTitle}>{result.name}</Text>
                  <Text style={styles.scanResultMeta}>{result.sku} / {result.barcode || "-"}</Text>
                  <Text style={styles.scanResultMeta}>{result.category} - Stok: {result.stock}</Text>
                  <View style={styles.scanResultStats}>
                    <Metric title="Stok" value={String(result.stock)} />
                  </View>
                </View>
                <View style={styles.scanActionRow}>
                  <Pressable onPress={() => { setMovementType("masuk"); setQuantity(""); setParty(""); setNote(""); }} style={({ hovered, pressed }: PressState) => [styles.secondaryButton, movementType === "masuk" && styles.scanModeActive, hovered && styles.secondaryButtonHover, pressed && styles.pressed]}><PackagePlus color={movementType === "masuk" ? colors.white : colors.primary} size={18} /><Text style={[styles.secondaryButtonText, movementType === "masuk" && { color: colors.white }]}>Produk Masuk</Text></Pressable>
                  <Pressable disabled={result.stock <= 0} onPress={() => { setMovementType("keluar"); setQuantity(""); setParty(""); setNote(""); }} style={({ hovered, pressed }: PressState) => [styles.secondaryButton, movementType === "keluar" && styles.scanModeActive, hovered && result.stock > 0 && styles.secondaryButtonHover, pressed && styles.pressed, result.stock <= 0 && styles.tablePagerButtonDisabled]}><PackageMinus color={movementType === "keluar" ? colors.white : colors.primary} size={18} /><Text style={[styles.secondaryButtonText, movementType === "keluar" && { color: colors.white }, result.stock <= 0 && { color: colors.muted }]}>Produk Keluar</Text></Pressable>
                </View>
                {movementType ? (
                  <>
                    <View style={styles.modalFieldGroup}>
                      <Text style={styles.modalLabel}>{movementType === "masuk" ? "Stok Masuk" : "Stok Keluar"}</Text>
                      <View style={styles.modalSelect}>
                        <Text style={styles.modalSelectText}>{result.name}</Text>
                        <ChevronDown color={colors.muted} size={18} />
                      </View>
                    </View>
                    <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor={colors.muted} value={quantity} onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
                    {movementError ? <Text style={styles.errorText}>{movementError}</Text> : null}
                    <TextInput onChangeText={setParty} style={styles.modalInput} placeholder={movementType === "masuk" ? "Supplier" : "Alamat / Tujuan"} placeholderTextColor={colors.muted} value={party} />
                    <TextInput onChangeText={setNote} style={styles.modalInput} placeholder="Catatan (Opsional)" placeholderTextColor={colors.muted} value={note} />
                  </>
                ) : null}
              </ScrollView>
              <View style={styles.modalActions}>
                <Pressable onPress={closeResult} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
                <Pressable disabled={saveDisabled} onPress={() => void saveMovement()} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !saveDisabled && styles.saveButtonHover, pressed && styles.pressed, saveDisabled && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

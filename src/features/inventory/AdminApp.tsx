import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Layout } from "./components/Layout";
import { ActionModal } from "./components/ActionModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthScreen } from "./AuthScreen";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryDataProvider, useInventoryData } from "./InventoryDataContext";
import { KategoriPage } from "./pages/KategoriPage";
import { LaporanPage, ReportDetail } from "./pages/LaporanPage";
import { MovementPage } from "./pages/MovementPage";
import { PenjualanPage } from "./pages/PenjualanPage";
import { ScanPage } from "./pages/ScanPage";
import { RestockPage } from "./pages/RestockPage";
import { StockOpnamePage } from "./pages/StockOpnamePage";
import { StokPage } from "./pages/StokPage";
import type { ModalKind, ModalMode, PageKey } from "./types";
import { styles } from "./styles";

export function AdminApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [modalProductId, setModalProductId] = useState<string | undefined>();
  const [token, setToken] = useState(() => loadStoredAuth()?.accessToken ?? "");
  const [fontsLoaded] = useFonts({
    "Futura PT": require("../../../assets/fonts/Futura-PT-Book.woff2"),
    "Futura PT Medium": require("../../../assets/fonts/Futura-PT-Medium.woff2"),
    SQR721BE: require("../../../assets/fonts/SQR721BE.woff2"),
  });

  const openModal = (kind: Exclude<ModalKind, null>, mode: ModalMode = "add", productId?: string) => {
    setModalMode(mode);
    setModalProductId(productId);
    setModal(kind);
  };

  if (!fontsLoaded) return <View style={styles.loading}><Text style={styles.loadingText}>Loading TuneBoss...</Text></View>;

  if (!token) {
    return <AuthScreen onLogin={(payload) => { storeAuth(payload); setToken(payload.accessToken); }} />;
  }

  return (
    <ErrorBoundary>
      <InventoryDataProvider token={token}>
        <InventoryContent page={page} onLogout={() => { clearStoredAuth(); setToken(""); }} onNavigate={setPage} openModal={openModal} />
        <ActionModal initialProductId={modalProductId} kind={modal} mode={modalMode} onClose={() => { setModal(null); setModalProductId(undefined); }} />
      </InventoryDataProvider>
    </ErrorBoundary>
  );
}

function InventoryContent({ onLogout, onNavigate, openModal, page }: { onLogout: () => void; onNavigate: (page: PageKey) => void; openModal: (kind: Exclude<ModalKind, null>, mode?: ModalMode, productId?: string) => void; page: PageKey }) {
  const { loading } = useInventoryData();

  return (
    <Layout active={page} onLogout={onLogout} onNavigate={onNavigate}>
      {loading ? <InventoryLoading /> : null}
      {!loading && page === "dashboard" ? <DashboardPage /> : null}
      {!loading && page === "kategori" ? <KategoriPage onOpenModal={(mode) => openModal("kategori", mode)} /> : null}
      {!loading && page === "stok" ? <StokPage onOpenModal={(mode) => openModal("stok", mode)} /> : null}
      {!loading && page === "penjualan" ? <PenjualanPage /> : null}
      {!loading && page === "scan" ? <ScanPage onGoInbound={(productId) => openModal("masuk", "add", productId)} onGoOutbound={(productId) => openModal("keluar", "add", productId)} /> : null}
      {!loading && page === "masuk" ? <MovementPage kind="inbound" onOpenModal={() => openModal("masuk")} /> : null}
      {!loading && page === "keluar" ? <MovementPage kind="outbound" onOpenModal={() => openModal("keluar")} /> : null}
      {!loading && page === "opname" ? <StockOpnamePage /> : null}
      {!loading && page === "restock" ? <RestockPage /> : null}
      {!loading && page === "laporan" ? <LaporanPage onNavigate={onNavigate} /> : null}
      {!loading && page === "admin" ? <AdminPage /> : null}
      {!loading && page === "laporan-stok" ? <ReportDetail type="stok" onBack={() => onNavigate("laporan")} /> : null}
      {!loading && page === "laporan-penjualan" ? <ReportDetail type="penjualan" onBack={() => onNavigate("laporan")} /> : null}
      {!loading && page === "laporan-masuk" ? <ReportDetail type="masuk" onBack={() => onNavigate("laporan")} /> : null}
      {!loading && page === "laporan-keluar" ? <ReportDetail type="keluar" onBack={() => onNavigate("laporan")} /> : null}
    </Layout>
  );
}

function InventoryLoading() {
  return (
    <View style={styles.stack}>
      <View style={styles.skeletonGrid}>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
      <View style={styles.loadingPanel}>
        <ActivityIndicator color="#ed6c05" size="large" />
        <Text style={styles.loadingTitle}>Memuat Data</Text>
        <Text style={styles.loadingHint}>Dashboard sedang mengambil data terbaru dari API. Tampilan akan muncul setelah sinkronisasi selesai.</Text>
      </View>
    </View>
  );
}

function loadStoredAuth(): { accessToken: string } | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const value = localStorage.getItem("tuneboss.auth");
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function storeAuth(payload: { accessToken: string }) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem("tuneboss.auth", JSON.stringify(payload));
  } catch {
    // Native builds keep the token in memory until secure storage is added.
  }
}

function clearStoredAuth() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem("tuneboss.auth");
  } catch {
    // Ignore storage cleanup failures.
  }
}

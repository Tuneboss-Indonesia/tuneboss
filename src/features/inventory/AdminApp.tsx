import { useEffect, useState } from "react";
import { Text, View } from "react-native";
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
import type { CategoryItem, ModalKind, ModalMode, PageKey } from "./types";
import { styles } from "./styles";
import { apiRequest, setUnauthenticatedHandler } from "./api";

type AuthPayload = { accessToken: string; expiresAt?: string | null };
const authStorageKey = "tuneboss.auth";

export function AdminApp() {
  const [page, setPage] = useState<PageKey>(() => loadStoredPage() ?? "dashboard");
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [token, setToken] = useState(() => loadStoredAuth()?.accessToken ?? "");
  const [fontsLoaded] = useFonts({
    "Futura PT": require("../../../assets/fonts/Futura-PT-Book.woff2"),
    "Futura PT Medium": require("../../../assets/fonts/Futura-PT-Medium.woff2"),
    SQR721BE: require("../../../assets/fonts/SQR721BE.woff2"),
  });

  // Persist page changes to localStorage
  useEffect(() => {
    storePage(page);
  }, [page]);

  const openModal = (kind: Exclude<ModalKind, null>, mode: ModalMode = "add", item?: CategoryItem) => {
    setModalMode(mode);
    setModalProductId(productId);
    setModal(kind);
    if (kind === "kategori" && item) setEditingCategory(item);
    else setEditingCategory(null);
  };

  if (!fontsLoaded || !authLoaded) return <View style={styles.loading}><Text style={styles.loadingText}>Loading TuneBoss...</Text></View>;

  if (!auth?.accessToken) {
    return <AuthScreen onLogin={setLoggedIn} />;
  }

  return (
    <ErrorBoundary>
      <InventoryDataProvider activePage={page} token={token}>
        <Layout active={page} onLogout={() => { clearStoredAuth(); clearStoredPage(); setToken(""); setPage("dashboard"); }} onNavigate={setPage}>
          {page === "dashboard" ? <DashboardPage /> : null}
          {page === "kategori" ? <KategoriPage onOpenModal={(mode, item) => openModal("kategori", mode, item)} /> : null}
          {page === "stok" ? <StokPage onOpenModal={(mode) => openModal("stok", mode)} /> : null}
          {page === "penjualan" ? <PenjualanPage /> : null}
          {page === "scan" ? <ScanPage onGoInbound={() => setPage("masuk")} onGoOutbound={() => setPage("keluar")} /> : null}
          {page === "masuk" ? <MovementPage kind="inbound" onOpenModal={() => openModal("masuk")} /> : null}
          {page === "keluar" ? <MovementPage kind="outbound" onOpenModal={() => openModal("keluar")} /> : null}
          {page === "laporan" ? <LaporanPage onNavigate={setPage} /> : null}
          {page === "admin" ? <AdminPage /> : null}
          {page === "laporan-stok" ? <ReportDetail type="stok" onBack={() => setPage("laporan")} /> : null}
          {page === "laporan-penjualan" ? <ReportDetail type="penjualan" onBack={() => setPage("laporan")} /> : null}
          {page === "laporan-masuk" ? <ReportDetail type="masuk" onBack={() => setPage("laporan")} /> : null}
          {page === "laporan-keluar" ? <ReportDetail type="keluar" onBack={() => setPage("laporan")} /> : null}
        </Layout>
        <ActionModal kind={modal} mode={modalMode} editingCategory={editingCategory} onClose={() => { setEditingCategory(null); setModal(null); }} />
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

function loadStoredAuth(): AuthPayload | null {
  try {
    if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
    const value = localStorage.getItem(authStorageKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

async function loadStoredAuthAsync(): Promise<AuthPayload | null> {
  try {
    const value = await SecureStore.getItemAsync(authStorageKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

async function storeAuth(payload: AuthPayload) {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") localStorage.setItem(authStorageKey, JSON.stringify(payload));
    if (Platform.OS !== "web") await SecureStore.setItemAsync(authStorageKey, JSON.stringify(payload));
  } catch {
    // Keep the token in memory if persistent storage is temporarily unavailable.
  }
}

async function clearStoredAuth() {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") localStorage.removeItem(authStorageKey);
    if (Platform.OS !== "web") await SecureStore.deleteItemAsync(authStorageKey);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function loadStoredPage(): PageKey | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const value = localStorage.getItem("tuneboss.page");
    return value as PageKey | null;
  } catch {
    return null;
  }
}

function storePage(page: PageKey) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem("tuneboss.page", page);
  } catch {
    // Ignore storage failures.
  }
}

function clearStoredPage() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem("tuneboss.page");
  } catch {
    // Ignore storage cleanup failures.
  }
}

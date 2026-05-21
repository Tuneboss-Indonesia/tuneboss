import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
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
import { apiRequest, setUnauthenticatedHandler } from "./api";

type AuthPayload = { accessToken: string; expiresAt?: string | null };
const authStorageKey = "tuneboss.auth";

export function AdminApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [modalProductId, setModalProductId] = useState<string | undefined>();
  const [auth, setAuth] = useState<AuthPayload | null>(() => Platform.OS === "web" ? loadStoredAuth() : null);
  const [authLoaded, setAuthLoaded] = useState(Platform.OS === "web");
  const [fontsLoaded] = useFonts({
    "Futura PT": require("../../../assets/fonts/Futura-PT-Book.woff2"),
    "Futura PT Medium": require("../../../assets/fonts/Futura-PT-Medium.woff2"),
    SQR721BE: require("../../../assets/fonts/SQR721BE.woff2"),
  });

  const logout = () => {
    void clearStoredAuth();
    setAuth(null);
  };

  const setLoggedIn = (payload: AuthPayload) => {
    void storeAuth(payload);
    setAuth(payload);
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    void loadStoredAuthAsync().then(setAuth).finally(() => setAuthLoaded(true));
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(logout);
    return () => setUnauthenticatedHandler(null);
  }, []);

  useEffect(() => {
    if (!auth?.accessToken || !auth.expiresAt) return;

    const refreshInMs = Math.max(new Date(auth.expiresAt).getTime() - Date.now() - 5 * 60 * 1000, 30 * 1000);
    const timer = setTimeout(() => {
      void apiRequest<AuthPayload>("/auth/refresh", { method: "POST", token: auth.accessToken }).then(setLoggedIn).catch(logout);
    }, refreshInMs);

    return () => clearTimeout(timer);
  }, [auth?.accessToken, auth?.expiresAt]);

  const openModal = (kind: Exclude<ModalKind, null>, mode: ModalMode = "add", productId?: string) => {
    setModalMode(mode);
    setModalProductId(productId);
    setModal(kind);
  };

  if (!fontsLoaded || !authLoaded) return <View style={styles.loading}><Text style={styles.loadingText}>Loading TuneBoss...</Text></View>;

  if (!auth?.accessToken) {
    return <AuthScreen onLogin={setLoggedIn} />;
  }

  return (
    <ErrorBoundary>
      <InventoryDataProvider token={auth.accessToken}>
        <InventoryContent page={page} onLogout={logout} onNavigate={setPage} openModal={openModal} />
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

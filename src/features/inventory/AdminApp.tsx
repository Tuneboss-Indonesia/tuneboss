import { useState } from "react";
import { Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Layout } from "./components/Layout";
import { ActionModal } from "./components/ActionModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthScreen } from "./AuthScreen";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryDataProvider } from "./InventoryDataContext";
import { KategoriPage } from "./pages/KategoriPage";
import { LaporanPage, ReportDetail } from "./pages/LaporanPage";
import { MovementPage } from "./pages/MovementPage";
import { PenjualanPage } from "./pages/PenjualanPage";
import { ScanPage } from "./pages/ScanPage";
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
        <Layout active={page} onLogout={() => { clearStoredAuth(); setToken(""); }} onNavigate={setPage}>
          {page === "dashboard" ? <DashboardPage /> : null}
          {page === "kategori" ? <KategoriPage onOpenModal={(mode) => openModal("kategori", mode)} /> : null}
          {page === "stok" ? <StokPage onOpenModal={(mode) => openModal("stok", mode)} /> : null}
          {page === "penjualan" ? <PenjualanPage /> : null}
          {page === "scan" ? <ScanPage onGoInbound={(productId) => openModal("masuk", "add", productId)} onGoOutbound={(productId) => openModal("keluar", "add", productId)} /> : null}
          {page === "masuk" ? <MovementPage kind="inbound" onOpenModal={() => openModal("masuk")} /> : null}
          {page === "keluar" ? <MovementPage kind="outbound" onOpenModal={() => openModal("keluar")} /> : null}
          {page === "opname" ? <StockOpnamePage /> : null}
          {page === "laporan" ? <LaporanPage onNavigate={setPage} /> : null}
          {page === "admin" ? <AdminPage /> : null}
          {page === "laporan-stok" ? <ReportDetail type="stok" onBack={() => setPage("laporan")} /> : null}
          {page === "laporan-penjualan" ? <ReportDetail type="penjualan" onBack={() => setPage("laporan")} /> : null}
          {page === "laporan-masuk" ? <ReportDetail type="masuk" onBack={() => setPage("laporan")} /> : null}
          {page === "laporan-keluar" ? <ReportDetail type="keluar" onBack={() => setPage("laporan")} /> : null}
        </Layout>
        <ActionModal initialProductId={modalProductId} kind={modal} mode={modalMode} onClose={() => { setModal(null); setModalProductId(undefined); }} />
      </InventoryDataProvider>
    </ErrorBoundary>
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

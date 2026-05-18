import { useState } from "react";
import { Text, View } from "react-native";
import { useFonts } from "expo-font";
import { Layout } from "./components/Layout";
import { ActionModal } from "./components/ActionModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardPage } from "./pages/DashboardPage";
import { KategoriPage } from "./pages/KategoriPage";
import { LaporanPage, ReportDetail } from "./pages/LaporanPage";
import { MovementPage } from "./pages/MovementPage";
import { PenjualanPage } from "./pages/PenjualanPage";
import { ScanPage } from "./pages/ScanPage";
import { StokPage } from "./pages/StokPage";
import type { ModalKind, ModalMode, PageKey } from "./types";
import { styles } from "./styles";

export function AdminApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [fontsLoaded] = useFonts({
    "Futura PT": require("../../../assets/fonts/Futura-PT-Book.woff2"),
    "Futura PT Medium": require("../../../assets/fonts/Futura-PT-Medium.woff2"),
    SQR721BE: require("../../../assets/fonts/SQR721BE.woff2"),
  });

  const openModal = (kind: Exclude<ModalKind, null>, mode: ModalMode = "add") => {
    setModalMode(mode);
    setModal(kind);
  };

  if (!fontsLoaded) return <View style={styles.loading}><Text style={styles.loadingText}>Loading TuneBoss...</Text></View>;

  return (
    <ErrorBoundary>
      <Layout active={page} onNavigate={setPage}>
        {page === "dashboard" ? <DashboardPage /> : null}
        {page === "kategori" ? <KategoriPage onOpenModal={(mode) => openModal("kategori", mode)} /> : null}
        {page === "stok" ? <StokPage onOpenModal={(mode) => openModal("stok", mode)} /> : null}
        {page === "penjualan" ? <PenjualanPage /> : null}
        {page === "scan" ? <ScanPage onGoInbound={() => setPage("masuk")} onGoOutbound={() => setPage("keluar")} /> : null}
        {page === "masuk" ? <MovementPage kind="inbound" onOpenModal={() => openModal("masuk")} /> : null}
        {page === "keluar" ? <MovementPage kind="outbound" onOpenModal={() => openModal("keluar")} /> : null}
        {page === "laporan" ? <LaporanPage onNavigate={setPage} /> : null}
        {page === "laporan-stok" ? <ReportDetail type="stok" onBack={() => setPage("laporan")} /> : null}
        {page === "laporan-penjualan" ? <ReportDetail type="penjualan" onBack={() => setPage("laporan")} /> : null}
        {page === "laporan-masuk" ? <ReportDetail type="masuk" onBack={() => setPage("laporan")} /> : null}
        {page === "laporan-keluar" ? <ReportDetail type="keluar" onBack={() => setPage("laporan")} /> : null}
      </Layout>
      <ActionModal kind={modal} mode={modalMode} onClose={() => setModal(null)} />
    </ErrorBoundary>
  );
}

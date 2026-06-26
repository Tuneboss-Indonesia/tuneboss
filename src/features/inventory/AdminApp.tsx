import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
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
import { ScanPage } from "./pages/ScanPage";
import { StokPage } from "./pages/StokPage";
import { deleteStoredValue, getStoredValue, setStoredValue, storageKeys } from "./platformStorage";
import type { CategoryItem, ModalKind, ModalMode, PageKey, UserRole } from "./types";
import { styles } from "./styles";

type StoredAuth = {
  accessToken: string;
  user?: {
    id?: string;
    role?: UserRole;
  };
};

const fontAssets: Parameters<typeof useFonts>[0] = Platform.OS === "web" ? {
  "Futura PT": require("../../../assets/fonts/Futura-PT-Book.woff2"),
  "Futura PT Medium": require("../../../assets/fonts/Futura-PT-Medium.woff2"),
  SQR721BE: require("../../../assets/fonts/SQR721BE.woff2"),
} : {};

export function AdminApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [stokCategoryId, setStokCategoryId] = useState("");
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const token = auth?.accessToken ?? "";
  const role = auth?.user?.role ?? "staff";
  const [fontsLoaded] = useFonts(fontAssets);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredSession() {
      const [authValue, pageValue] = await Promise.all([
        loadStoredAuth(),
        loadStoredPage(),
      ]);

      if (cancelled) return;
      setAuth(authValue);
      if (pageValue) setPage(pageValue);
      setStorageReady(true);
    }

    void loadStoredSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (storageReady) void storePage(page);
  }, [page, storageReady]);

  useEffect(() => {
    if (role !== "admin" && page === "admin") setPage("dashboard");
  }, [page, role]);

  const navigate = (nextPage: PageKey) => {
    if (nextPage === "admin" && role !== "admin") {
      setPage("dashboard");
      return;
    }
    if (nextPage !== "stok") setStokCategoryId("");
    setPage(nextPage);
  };

  const openModal = (kind: Exclude<ModalKind, null>, mode: ModalMode = "add", item?: CategoryItem) => {
    setModalMode(mode);
    setModal(kind);
    if (kind === "kategori" && item) setEditingCategory(item);
    else setEditingCategory(null);
  };

  if (!fontsLoaded || !storageReady) return <View style={styles.loading}><Text style={styles.loadingText}>Loading TuneBoss...</Text></View>;

  if (!token) {
    return <AuthScreen onLogin={(payload) => { void storeAuth(payload); setAuth(payload); }} />;
  }

  return (
    <ErrorBoundary>
      <InventoryDataProvider activePage={page} token={token}>
        <Layout active={page} role={role} onLogout={() => { void clearStoredAuth(); void clearStoredPage(); setAuth(null); setPage("dashboard"); }} onNavigate={navigate}>
          {page === "dashboard" ? <DashboardPage /> : null}
          {page === "kategori" ? <KategoriPage onSelectCategory={(category) => { setStokCategoryId(category.id); setPage("stok"); }} onOpenModal={(mode, item) => openModal("kategori", mode, item)} /> : null}
          {page === "stok" ? <StokPage initialCategoryId={stokCategoryId} onOpenModal={(mode) => openModal("stok", mode)} /> : null}
          {page === "scan" ? <ScanPage onGoInbound={() => setPage("masuk")} onGoOutbound={() => setPage("keluar")} /> : null}
          {page === "masuk" ? <MovementPage kind="inbound" onOpenModal={() => openModal("masuk")} /> : null}
          {page === "keluar" ? <MovementPage kind="outbound" onOpenModal={() => openModal("keluar")} /> : null}
          {page === "laporan" ? <LaporanPage onNavigate={navigate} /> : null}
          {page === "admin" && role === "admin" ? <AdminPage currentUserId={auth?.user?.id} /> : null}
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

async function loadStoredAuth(): Promise<StoredAuth | null> {
  try {
    const value = await getStoredValue(storageKeys.auth);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

async function storeAuth(payload: StoredAuth) {
  await setStoredValue(storageKeys.auth, JSON.stringify(payload));
}

async function clearStoredAuth() {
  await deleteStoredValue(storageKeys.auth);
}

async function loadStoredPage(): Promise<PageKey | null> {
  try {
    const value = await getStoredValue(storageKeys.page);
    if (value === "penjualan") return "dashboard";
    return value as PageKey | null;
  } catch {
    return null;
  }
}

async function storePage(page: PageKey) {
  await setStoredValue(storageKeys.page, page);
}

async function clearStoredPage() {
  await deleteStoredValue(storageKeys.page);
}

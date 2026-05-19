import { useState } from "react";
import { Alert, Platform } from "react-native";
import { apiRequest, formatCurrency } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import type { ModalMode } from "../types";
import { CrudShell, DataTable, EmptyRow, RowActions, TableRow } from "../components/common";

const statusFilters = ["Semua", "Tersedia", "Menipis", "Habis"];

function getStatus(stock: number, minStock: number) {
  if (stock === 0) return "Habis";
  if (stock < minStock) return "Menipis";
  return "Tersedia";
}

export function StokPage({ onOpenModal }: { onOpenModal: (mode: ModalMode) => void }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const { refresh, stockItems, token } = useInventoryData();
  const uploadImage = async (productId: string) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert("Info", "Upload gambar saat ini tersedia di web admin.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const form = new FormData();
        form.append("image", file);
        await apiRequest(`/products/${productId}/image`, { body: form, method: "POST", token });
        await refresh();
      } catch (error) {
        Alert.alert("Gagal", error instanceof Error ? error.message : "Gambar gagal diupload.");
      }
    };
    input.click();
  };

  const deleteImage = async (productId: string) => {
    await apiRequest(`/products/${productId}/image`, { method: "DELETE", token });
    await refresh();
  };

  const deleteProduct = async (productId: string) => {
    await apiRequest(`/products/${productId}`, { method: "DELETE", token });
    await refresh();
  };

  const confirmDelete = (item: (typeof stockItems)[number]) => {
    if (!item.imageUrl) {
      void deleteProduct(item.id);
      return;
    }

    Alert.alert("Hapus Data", "Pilih yang ingin dihapus.", [
      { text: "Gambar", onPress: () => void deleteImage(item.id) },
      { text: "Produk", style: "destructive", onPress: () => void deleteProduct(item.id) },
      { text: "Batal", style: "cancel" },
    ]);
  };
  const filtered = stockItems.filter((item) => {
    const matchesQuery = `${item.sku} ${item.name} ${item.category} ${item.barcode}`.toLowerCase().includes(query.toLowerCase());
    const status = getStatus(item.stock, item.minStock);
    const matchesStatus = statusFilter === "Semua" || status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return <CrudShell title="Data Barang" button="Tambah Barang" onButton={() => onOpenModal("add")} search="Cari kode, nama, kategori, atau barcode..." searchValue={query} onSearchChange={setQuery} chips={statusFilters} activeChip={statusFilter} onChipPress={setStatusFilter}><DataTable columns={["Kode Barang", "Nama Barang", "Kategori", "Harga Jual", "Stok", "Status", "Gambar", "Aksi"]}>{filtered.map((item) => <TableRow key={item.id} cells={[item.sku, item.name, item.category, formatCurrency(item.salePrice ?? 0), String(item.stock), getStatus(item.stock, item.minStock), item.imageUrl ? "Ada" : "Belum"]} actions={<RowActions onEdit={() => void uploadImage(item.id)} onDelete={() => confirmDelete(item)} />} />)}{!filtered.length ? <EmptyRow text="Barang tidak ditemukan" /> : null}</DataTable></CrudShell>;
}

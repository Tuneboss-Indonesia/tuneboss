import { useState } from "react";
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
  const filtered = stockItems.filter((item) => {
    const matchesQuery = `${item.sku} ${item.name} ${item.category} ${item.barcode}`.toLowerCase().includes(query.toLowerCase());
    const status = getStatus(item.stock, item.minStock);
    const matchesStatus = statusFilter === "Semua" || status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return <CrudShell title="Data Barang" button="Tambah Barang" onButton={() => onOpenModal("add")} search="Cari kode, nama, kategori, atau barcode..." searchValue={query} onSearchChange={setQuery} chips={statusFilters} activeChip={statusFilter} onChipPress={setStatusFilter}><DataTable columns={["Kode Barang", "Nama Barang", "Kategori", "Harga Jual", "Stok", "Status", "Aksi"]}>{filtered.map((item) => <TableRow key={item.id} cells={[item.sku, item.name, item.category, formatCurrency(item.salePrice ?? 0), String(item.stock), getStatus(item.stock, item.minStock)]} actions={<RowActions onEdit={() => onOpenModal("edit")} onDelete={async () => { await apiRequest(`/products/${item.id}`, { method: "DELETE", token }); await refresh(); }} />} />)}{!filtered.length ? <EmptyRow text="Barang tidak ditemukan" /> : null}</DataTable></CrudShell>;
}

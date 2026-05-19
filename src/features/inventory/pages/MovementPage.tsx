import { useState } from "react";
import { formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, TableRow } from "../components/common";
import type { StockMovement } from "../../../types/dashboard";

function MovementTableRow({ item }: { item: StockMovement }) {
  const cells = item.type === "inbound" ? [formatDate(item.timestamp), item.productName, String(item.quantity), "-", "-", item.party, item.operator] : [formatDate(item.timestamp), item.productName, String(item.quantity), "-", item.note, item.operator];
  return <TableRow cells={cells} />;
}

export function MovementPage({ kind, onOpenModal }: { kind: "inbound" | "outbound"; onOpenModal: () => void }) {
  const isIn = kind === "inbound";
  const [query, setQuery] = useState("");
  const { movements } = useInventoryData();
  const types = isIn ? ["inbound"] : ["outbound", "sale"];
  const rows = movements.filter((item) => types.includes(item.type) && `${item.productName} ${item.sku} ${item.party} ${item.operator} ${item.note}`.toLowerCase().includes(query.toLowerCase()));
  return <CrudShell title={isIn ? "Riwayat Barang Masuk" : "Riwayat Barang Keluar"} button={isIn ? "Tambah Stok" : "Kurangi Stok"} onButton={onOpenModal} search={isIn ? "Cari barang, supplier..." : "Cari barang keluar..."} searchValue={query} onSearchChange={setQuery} date><DataTable columns={isIn ? ["Tanggal", "Barang", "Jumlah", "Batch", "Expired", "Supplier", "User"] : ["Tanggal", "Barang", "Jumlah", "Dari Batch", "Alasan", "Diinput Oleh"]}>{rows.length ? rows.map((item) => <MovementTableRow key={item.id} item={item} />) : <EmptyRow text="Tidak ada data ditemukan" />}</DataTable></CrudShell>;
}

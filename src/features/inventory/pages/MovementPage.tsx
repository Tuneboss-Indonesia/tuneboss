import { useState } from "react";
import { stockMovements } from "../data";
import { CrudShell, DataTable, EmptyRow, TableRow } from "../components/common";

function MovementTableRow({ item }: { item: (typeof stockMovements)[number] }) {
  const cells = item.type === "inbound" ? [item.timestamp, item.productName, String(item.quantity), "BCH-2405-001", "18/11/2026", item.party, item.operator] : [item.timestamp, item.productName, String(item.quantity), "BCH-2405-001", item.note, item.operator];
  return <TableRow cells={cells} />;
}

export function MovementPage({ kind, onOpenModal }: { kind: "inbound" | "outbound"; onOpenModal: () => void }) {
  const isIn = kind === "inbound";
  const [query, setQuery] = useState("");
  const rows = stockMovements.filter((item) => item.type === kind && `${item.productName} ${item.sku} ${item.party} ${item.operator} ${item.note}`.toLowerCase().includes(query.toLowerCase()));
  return <CrudShell title={isIn ? "Riwayat Barang Masuk" : "Riwayat Barang Keluar"} button={isIn ? "Tambah Stok" : "Kurangi Stok"} onButton={onOpenModal} search={isIn ? "Cari barang, supplier..." : "Cari barang keluar..."} searchValue={query} onSearchChange={setQuery} date><DataTable columns={isIn ? ["Tanggal", "Barang", "Jumlah", "Batch", "Expired", "Supplier", "User"] : ["Tanggal", "Barang", "Jumlah", "Dari Batch", "Alasan", "Diinput Oleh"]}>{rows.length ? rows.map((item) => <MovementTableRow key={item.id} item={item} />) : <EmptyRow text="Tidak ada data ditemukan" />}</DataTable></CrudShell>;
}

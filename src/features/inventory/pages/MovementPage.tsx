import { useState } from "react";
import { Text, View } from "react-native";
import { formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, TableRow } from "../components/common";
import type { StockMovement } from "../../../types/dashboard";
import { styles } from "../styles";

function MovementTableRow({ item }: { item: StockMovement }) {
  const cells = item.type === "inbound" ? [formatDate(item.timestamp), item.productName, String(item.quantity), "-", "-", item.party, item.operator] : [formatDate(item.timestamp), item.productName, String(item.quantity), "-", item.note, item.operator];
  return <TableRow cells={cells} />;
}

function MovementSkeleton() {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>{["Tanggal", "Barang", "Jumlah", "Batch", "Expired", "Supplier", "User"].map((col) => <Text key={col} style={styles.th}>{col}</Text>)}</View>
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} style={styles.skeletonTableRow}>
          {[0, 1, 2, 3, 4, 5, 6].map((cell) => <View key={cell} style={styles.skeletonTableCell} />)}
        </View>
      ))}
    </View>
  );
}

export function MovementPage({ kind, onOpenModal }: { kind: "inbound" | "outbound"; onOpenModal: () => void }) {
  const isIn = kind === "inbound";
  const [query, setQuery] = useState("");
  const { loading, loadMovementsPage, movementMeta, movements } = useInventoryData();
  const types = isIn ? ["inbound"] : ["outbound", "sale"];
  const rows = movements.filter((item) => types.includes(item.type) && `${item.productName} ${item.sku} ${item.party} ${item.operator} ${item.note}`.toLowerCase().includes(query.toLowerCase()));
  return <CrudShell title={isIn ? "Riwayat Barang Masuk" : "Riwayat Barang Keluar"} button={isIn ? "Tambah Stok" : "Kurangi Stok"} onButton={onOpenModal} search={isIn ? "Cari barang, supplier..." : "Cari barang keluar..."} searchValue={query} onSearchChange={setQuery} date loading={loading}>{loading ? <MovementSkeleton /> : <DataTable columns={isIn ? ["Tanggal", "Barang", "Jumlah", "Batch", "Expired", "Supplier", "User"] : ["Tanggal", "Barang", "Jumlah", "Dari Batch", "Alasan", "Diinput Oleh"]} pagination={movementMeta} onPageChange={(page) => loadMovementsPage(page, kind)}>{rows.length ? rows.map((item) => <MovementTableRow key={item.id} item={item} />) : <EmptyRow text="Tidak ada data ditemukan" />}</DataTable>}</CrudShell>;
}

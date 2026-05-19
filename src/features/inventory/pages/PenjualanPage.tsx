import { Alert, View } from "react-native";
import { useState } from "react";
import { styles } from "../styles";
import { formatCurrency, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, Metric, RowActions, TableRow } from "../components/common";

export function PenjualanPage() {
  const [query, setQuery] = useState("");
  const { sales } = useInventoryData();
  const today = new Date().toDateString();
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === today && sale.status === "completed");
  const filtered = sales.filter((sale) => `${sale.invoiceNumber} ${sale.cashier ?? ""} ${sale.status}`.toLowerCase().includes(query.toLowerCase()));
  return <View style={styles.stack}><View style={styles.metricGrid}><Metric title="Penjualan Hari Ini" value={formatCurrency(todaySales.reduce((total, sale) => total + sale.totalAmount, 0))} /><Metric title="Transaksi Hari Ini" value={String(todaySales.length)} /></View><CrudShell title="Riwayat Transaksi" button="Transaksi Baru" onButton={() => Alert.alert("Info", "Pembuatan transaksi via UI masuk tahap berikutnya. API sudah tersedia.")} search="Cari kode transaksi / kasir..." searchValue={query} onSearchChange={setQuery} date><DataTable columns={["Kode Transaksi", "Tanggal", "Jumlah Item", "Total", "Kasir", "Aksi"]}>{filtered.map((sale) => <TableRow key={sale.id} cells={[sale.invoiceNumber, formatDate(sale.createdAt), String(sale.items?.reduce((total, item) => total + item.quantity, 0) ?? 0), formatCurrency(sale.totalAmount), sale.cashier ?? "-"]} actions={<RowActions onEdit={() => Alert.alert("Status", sale.status)} onDelete={() => Alert.alert("Void", "Void transaksi tersedia untuk admin lewat API.")} />} />)}{!filtered.length ? <EmptyRow text="Tidak ada transaksi ditemukan" /> : null}</DataTable></CrudShell></View>;
}

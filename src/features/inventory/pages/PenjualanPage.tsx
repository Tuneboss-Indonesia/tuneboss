import { Alert, View } from "react-native";
import { useState } from "react";
import { styles } from "../styles";
import { transactions } from "../data";
import { CrudShell, DataTable, EmptyRow, Metric, RowActions, TableRow } from "../components/common";

export function PenjualanPage() {
  const [query, setQuery] = useState("");
  const filtered = transactions.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase()));
  return <View style={styles.stack}><View style={styles.metricGrid}><Metric title="Penjualan Hari Ini" value="Rp 0" /><Metric title="Transaksi Hari Ini" value="0" /></View><CrudShell title="Riwayat Transaksi" button="Transaksi Baru" onButton={() => Alert.alert("Berhasil", "Aksi transaksi baru berjalan.")} search="Cari kode transaksi / kasir..." searchValue={query} onSearchChange={setQuery} date><DataTable columns={["Kode Transaksi", "Tanggal", "Jumlah Item", "Total", "Kasir", "Aksi"]}>{filtered.map((row) => <TableRow key={row[0]} cells={row} actions={<RowActions onEdit={() => Alert.alert("Edit", "Edit transaksi berhasil dipanggil.")} onDelete={() => Alert.alert("Hapus", "Hapus transaksi berhasil dipanggil.")} />} />)}{!filtered.length ? <EmptyRow text="Tidak ada transaksi ditemukan" /> : null}</DataTable></CrudShell></View>;
}

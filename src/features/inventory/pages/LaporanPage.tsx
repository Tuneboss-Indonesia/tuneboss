import { Pressable, Text, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { reportCards } from "../data";
import { styles } from "../styles";
import type { PageKey } from "../types";
import { DataTable, EmptyRow, Metric, TableRow, WhiteCard } from "../components/common";

export function LaporanPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return <View style={styles.stack}><Text style={styles.noticeTitle}>Grafik dan Laporan</Text><View style={styles.reportMetricGrid}><Metric title="Total Barang" value="0" /><Metric title="Total Stok" value="0" /><Metric title="Penjualan Bulan Ini" value="Rp 0k" /><Metric title="Barang Masuk" value="0" /><Metric title="Barang Keluar" value="0" /></View><View style={styles.reportGrid}>{reportCards.map(([id, Icon, title, desc]) => <Pressable key={id} onPress={() => onNavigate(id)} style={styles.reportCard}><View style={styles.reportIcon}><Icon color={colors.white} size={30} /></View><Text style={styles.reportTitle}>{title}</Text><Text style={styles.reportDesc}>{desc}</Text></Pressable>)}</View></View>;
}

function reportColumns(type: "stok" | "penjualan" | "masuk" | "keluar") {
  if (type === "stok") return ["Barang", "Kategori", "Stok", "Status"];
  if (type === "penjualan") return ["No. Nota", "Tanggal", "Kasir", "Total"];
  if (type === "masuk") return ["Tanggal", "Barang", "Jumlah", "Supplier", "User"];
  return ["Tanggal", "Barang", "Jumlah", "Alasan", "User"];
}

export function ReportDetail({ type, onBack }: { type: "stok" | "penjualan" | "masuk" | "keluar"; onBack: () => void }) {
  const title = type === "stok" ? "Daftar Stok Barang" : type === "penjualan" ? "Daftar Transaksi Penjualan" : type === "masuk" ? "Daftar Barang Masuk" : "Daftar Barang Keluar";
  return <View style={styles.stack}><View style={styles.reportFilter}><Text style={styles.filterBox}>01/05/2026</Text><Text style={styles.filterBox}>18/05/2026</Text><Text style={styles.exportDisabled}>Export (Pro)</Text><Text style={styles.upgrade}>Upgrade {"->"}</Text></View><Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>Kembali</Text></Pressable><View style={styles.metricGrid}><Metric title="Total" value={type === "penjualan" ? "Rp 0" : "0 unit"} /><Metric title="Total Transaksi" value="0" /><Metric title="Stok Menipis" value="0 barang" /></View><WhiteCard title={title}><DataTable columns={reportColumns(type)}><EmptyRow text={type === "penjualan" ? "Tidak ada data penjualan" : "Tidak ada data pada periode ini"} /></DataTable></WhiteCard></View>;
}

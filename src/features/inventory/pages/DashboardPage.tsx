import { useEffect, useState } from "react";
import { Alert, Pressable, Text, useWindowDimensions, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { salesChartData, topProductsData } from "../data";
import { apiRequest, formatDate, periodMap } from "../api";
import { styles } from "../styles";
import type { ChartPoint, PeriodKey } from "../types";
import { DataTable, EmptyRow, Metric, TableRow, WhiteCard } from "../components/common";
import { loadChart, useInventoryData } from "../InventoryDataContext";

function PeriodTabs({ value, onChange }: { value: PeriodKey; onChange: (value: PeriodKey) => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const options: Array<[PeriodKey, string]> = [["hari", "Hari"], ["minggu", "Minggu"], ["bulan", "Bulan"], ["tahun", "Tahun"]];
  return <View style={[styles.periodTabs, compact && styles.periodTabsMobile]}>{options.map(([key, label]) => <Pressable key={key} onPress={() => onChange(key)} style={[styles.periodTab, compact && styles.periodTabMobile, value === key && styles.periodTabActive]}><Text style={[styles.periodTabText, compact && styles.periodTabTextMobile, value === key && styles.periodTabTextActive]}>{label}</Text></Pressable>)}</View>;
}

function SalesBarChart({ data, period }: { data: ChartPoint[]; period: PeriodKey }) {
  const { BarChart } = require("react-native-gifted-charts") as typeof import("react-native-gifted-charts");
  const [chartWidth, setChartWidth] = useState(0);
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const chartData = data.map((item) => ({ ...item, frontColor: colors.primary }));
  const maxValue = Math.max(...chartData.map((item) => item.value), 10);
  return <View style={styles.chart} onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>{chartWidth ? <BarChart data={chartData} width={Math.max(chartWidth - (compact ? 8 : 24), 240)} height={compact ? 170 : 220} barWidth={compact ? 16 : period === "tahun" ? 42 : 24} spacing={compact ? 10 : period === "tahun" ? 34 : 18} initialSpacing={compact ? 4 : 10} roundedTop frontColor={colors.primary} maxValue={Math.ceil(maxValue / 10) * 10} noOfSections={compact ? 4 : 5} yAxisThickness={0} xAxisThickness={1} xAxisColor={colors.border} rulesColor={colors.border} yAxisTextStyle={[styles.axisText, compact && styles.axisTextMobile]} xAxisLabelTextStyle={[styles.axisText, compact && styles.axisTextMobile]} isAnimated animationDuration={450} /> : null}</View>;
}

function TopProductsChart({ data, period }: { data: ChartPoint[]; period: PeriodKey }) {
  const { BarChart } = require("react-native-gifted-charts") as typeof import("react-native-gifted-charts");
  const [chartWidth, setChartWidth] = useState(0);
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const chartData = data.slice(0, 5).map((item) => ({ ...item, frontColor: colors.primary }));
  const maxValue = Math.max(...chartData.map((item) => item.value), 10);
  return <View style={styles.chart} onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>{chartWidth ? <BarChart data={chartData} horizontal width={Math.max(chartWidth - (compact ? 8 : 24), 240)} height={compact ? 190 : 240} barWidth={compact ? 18 : 24} spacing={compact ? 18 : 26} initialSpacing={compact ? 4 : 8} frontColor={colors.primary} maxValue={Math.ceil(maxValue / 10) * 10} noOfSections={4} yAxisThickness={0} xAxisThickness={0} rulesColor={colors.border} yAxisTextStyle={[styles.axisText, compact && styles.axisTextMobile]} xAxisLabelTextStyle={[styles.axisText, compact && styles.axisTextMobile]} showValuesAsTopLabel topLabelTextStyle={[styles.axisText, compact && styles.axisTextMobile]} isAnimated animationDuration={450} /> : null}</View>;
}

export function DashboardPage() {
  const [salesPeriod, setSalesPeriod] = useState<PeriodKey>("bulan");
  const [topPeriod, setTopPeriod] = useState<PeriodKey>("bulan");
  const [salesData, setSalesData] = useState<ChartPoint[]>(salesChartData.bulan);
  const [topData, setTopData] = useState<ChartPoint[]>(topProductsData.bulan);
  const { error, loading, refreshRestockAlerts, restockAlerts, summary, token } = useInventoryData();
  const { width } = useWindowDimensions();
  const compact = width < 760;

  useEffect(() => {
    void loadChart(token, "sales", periodMap[salesPeriod]).then((data) => setSalesData(data.length ? data : salesChartData[salesPeriod])).catch(() => setSalesData(salesChartData[salesPeriod]));
  }, [salesPeriod, token]);

  useEffect(() => {
    void loadChart(token, "top", periodMap[topPeriod]).then((data) => setTopData(data.length ? data : topProductsData[topPeriod])).catch(() => setTopData(topProductsData[topPeriod]));
  }, [topPeriod, token]);

  const updateAlert = async (id: string, action: "acknowledge" | "resolve") => {
    try {
      await apiRequest(`/restock-alerts/${id}/${action}`, { body: JSON.stringify({ note: action === "acknowledge" ? "Diproses dari dashboard" : "Selesai dari dashboard" }), method: "POST", token });
      await refreshRestockAlerts();
    } catch (requestError) {
      Alert.alert("Gagal", requestError instanceof Error ? requestError.message : "Restock alert gagal diproses.");
    }
  };

  return <View style={styles.stack}>{error ? <Text style={styles.errorText}>{error}</Text> : null}{loading ? <Text style={styles.loadingText}>Memuat data API...</Text> : null}<View style={styles.metricGrid}><Metric title="Total SKU" value={String(summary.totalSku)} /><Metric title="Total Stok" value={String(summary.totalUnits)} /><Metric title="Stok Menipis" value={String(summary.lowStockCount)} /><Metric title="Stok Habis" value={String(summary.outOfStockCount)} /></View><WhiteCard title="Restock Alerts" subtitle="Produk yang perlu diproses pembelian ulang"><DataTable columns={["Produk", "SKU", "Status", "Stok", "Update", "Aksi"]}>{restockAlerts.map((alert) => <TableRow key={alert.id} cells={[alert.product?.name ?? "-", alert.product?.sku ?? "-", alert.severity === "empty" ? "Habis" : "Menipis", `${alert.currentStock}/${alert.threshold}`, formatDate(alert.updatedAt)]} actions={<View style={styles.rowActions}>{alert.status === "open" ? <Pressable onPress={() => void updateAlert(alert.id, "acknowledge")} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Acknowledge</Text></Pressable> : null}<Pressable onPress={() => void updateAlert(alert.id, "resolve")} style={styles.saveButton}><Text style={styles.saveText}>Resolve</Text></Pressable></View>} />)}{!restockAlerts.length ? <EmptyRow text="Tidak ada alert restock aktif" /> : null}</DataTable></WhiteCard><View style={[styles.chartGrid, compact && styles.chartGridMobile]}><WhiteCard title="Grafik Penjualan" action={<PeriodTabs value={salesPeriod} onChange={setSalesPeriod} />}><SalesBarChart data={salesData} period={salesPeriod} /></WhiteCard><WhiteCard title="Barang Terlaris" action={<PeriodTabs value={topPeriod} onChange={setTopPeriod} />}><TopProductsChart data={topData} period={topPeriod} /></WhiteCard></View></View>;
}

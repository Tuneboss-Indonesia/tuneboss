import { useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { salesChartData, topProductsData } from "../data";
import { styles } from "../styles";
import type { PeriodKey } from "../types";
import { WhiteCard } from "../components/common";

function PeriodTabs({ value, onChange }: { value: PeriodKey; onChange: (value: PeriodKey) => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const options: Array<[PeriodKey, string]> = [["hari", "Hari"], ["minggu", "Minggu"], ["bulan", "Bulan"], ["tahun", "Tahun"]];
  return <View style={[styles.periodTabs, compact && styles.periodTabsMobile]}>{options.map(([key, label]) => <Pressable key={key} onPress={() => onChange(key)} style={[styles.periodTab, compact && styles.periodTabMobile, value === key && styles.periodTabActive]}><Text style={[styles.periodTabText, compact && styles.periodTabTextMobile, value === key && styles.periodTabTextActive]}>{label}</Text></Pressable>)}</View>;
}

function SalesBarChart({ period }: { period: PeriodKey }) {
  const { BarChart } = require("react-native-gifted-charts") as typeof import("react-native-gifted-charts");
  const [chartWidth, setChartWidth] = useState(0);
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const data = salesChartData[period].map((item) => ({ ...item, frontColor: colors.primary }));
  const maxValue = Math.max(...data.map((item) => item.value), 10);
  return <View style={styles.chart} onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>{chartWidth ? <BarChart data={data} width={Math.max(chartWidth - (compact ? 8 : 24), 240)} height={compact ? 170 : 220} barWidth={compact ? 16 : period === "tahun" ? 42 : 24} spacing={compact ? 10 : period === "tahun" ? 34 : 18} initialSpacing={compact ? 4 : 10} roundedTop frontColor={colors.primary} maxValue={Math.ceil(maxValue / 10) * 10} noOfSections={compact ? 4 : 5} yAxisThickness={0} xAxisThickness={1} xAxisColor={colors.border} rulesColor={colors.border} yAxisTextStyle={[styles.axisText, compact && styles.axisTextMobile]} xAxisLabelTextStyle={[styles.axisText, compact && styles.axisTextMobile]} isAnimated animationDuration={450} /> : null}</View>;
}

function TopProductsChart({ period }: { period: PeriodKey }) {
  const { BarChart } = require("react-native-gifted-charts") as typeof import("react-native-gifted-charts");
  const [chartWidth, setChartWidth] = useState(0);
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const data = topProductsData[period].slice(0, 5).map((item) => ({ ...item, frontColor: colors.primary }));
  const maxValue = Math.max(...data.map((item) => item.value), 10);
  return <View style={styles.chart} onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>{chartWidth ? <BarChart data={data} horizontal width={Math.max(chartWidth - (compact ? 8 : 24), 240)} height={compact ? 190 : 240} barWidth={compact ? 18 : 24} spacing={compact ? 18 : 26} initialSpacing={compact ? 4 : 8} frontColor={colors.primary} maxValue={Math.ceil(maxValue / 10) * 10} noOfSections={4} yAxisThickness={0} xAxisThickness={0} rulesColor={colors.border} yAxisTextStyle={[styles.axisText, compact && styles.axisTextMobile]} xAxisLabelTextStyle={[styles.axisText, compact && styles.axisTextMobile]} showValuesAsTopLabel topLabelTextStyle={[styles.axisText, compact && styles.axisTextMobile]} isAnimated animationDuration={450} /> : null}</View>;
}

export function DashboardPage() {
  const [salesPeriod, setSalesPeriod] = useState<PeriodKey>("bulan");
  const [topPeriod, setTopPeriod] = useState<PeriodKey>("bulan");
  const { width } = useWindowDimensions();
  const compact = width < 760;
  return <View style={styles.stack}><View style={[styles.chartGrid, compact && styles.chartGridMobile]}><WhiteCard title="Grafik Penjualan" action={<PeriodTabs value={salesPeriod} onChange={setSalesPeriod} />}><SalesBarChart period={salesPeriod} /></WhiteCard><WhiteCard title="Barang Terlaris" action={<PeriodTabs value={topPeriod} onChange={setTopPeriod} />}><TopProductsChart period={topPeriod} /></WhiteCard></View></View>;
}

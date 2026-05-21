import { useEffect, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { formatDate, periodMap } from "../api";
import { styles } from "../styles";
import type { ChartPoint, PeriodKey, PressState } from "../types";
import { CrudShell, DataTable, EmptyRow, Metric, TableRow, WhiteCard } from "../components/common";
import { loadChart, useInventoryData } from "../InventoryDataContext";

function PeriodTabs({ value, onChange, disabled }: { value: PeriodKey; onChange: (value: PeriodKey) => void; disabled?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const options: Array<[PeriodKey, string]> = [["hari", "Hari"], ["minggu", "Minggu"], ["bulan", "Bulan"], ["tahun", "Tahun"]];
  return <View style={[styles.periodTabs, compact && styles.periodTabsMobile]}>{options.map(([key, label]) => <Pressable key={key} disabled={disabled} onPress={() => onChange(key)} style={({ hovered, pressed }: PressState) => [styles.periodTab, compact && styles.periodTabMobile, value === key && styles.periodTabActive, !disabled && hovered && value !== key && styles.periodTabHover, pressed && styles.pressed, disabled && styles.tablePagerButtonDisabled]}><Text style={[styles.periodTabText, compact && styles.periodTabTextMobile, value === key && styles.periodTabTextActive, disabled && { color: colors.muted }]}>{label}</Text></Pressable>)}</View>;
}

function SalesBarChart({ data, period }: { data: ChartPoint[]; period: PeriodKey }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const chartData = data.length ? data : [{ label: "-", value: 0 }];
  const maxValue = Math.max(...chartData.map((item) => item.value), 1);
  const chartHeight = compact ? 170 : 220;
  const yTicks = [maxValue, Math.ceil(maxValue * 0.75), Math.ceil(maxValue * 0.5), Math.ceil(maxValue * 0.25), 0];
  const barWidth = compact ? 22 : period === "tahun" ? 42 : 28;

  return <View style={[styles.chart, { minHeight: compact ? 230 : 285, overflow: "visible", paddingBottom: compact ? 18 : 26 }]}><View style={{ flexDirection: "row", gap: compact ? 8 : 12 }}><View style={{ height: chartHeight, justifyContent: "space-between", width: compact ? 34 : 42 }}>{yTicks.map((tick, index) => <Text key={`${tick}-${index}`} style={[styles.axisText, compact && styles.axisTextMobile, { textAlign: "right" }]}>{tick}</Text>)}</View><View style={{ borderBottomColor: colors.border, borderBottomWidth: 1, flex: 1, height: chartHeight, justifyContent: "flex-end" }}>{[0, 1, 2, 3, 4].map((line) => <View key={line} style={{ borderTopColor: colors.border, borderTopWidth: 1, borderStyle: "dashed", left: 0, opacity: 0.45, position: "absolute", right: 0, top: (chartHeight / 4) * line }} />)}<View style={{ alignItems: "flex-end", flexDirection: "row", gap: compact ? 12 : 18, height: chartHeight, paddingHorizontal: compact ? 8 : 14 }}>{chartData.map((item, index) => <View key={`${item.label}-${index}`} style={{ alignItems: "center", flex: 1, justifyContent: "flex-end" }}><View style={{ backgroundColor: colors.primary, borderRadius: 2, height: Math.max((item.value / maxValue) * (chartHeight - 8), item.value > 0 ? 3 : 0), width: barWidth }} /></View>)}</View></View></View><View style={{ flexDirection: "row", marginLeft: compact ? 42 : 54, marginTop: 10, paddingHorizontal: compact ? 8 : 14 }}>{chartData.map((item, index) => <Text key={`${item.label}-label-${index}`} numberOfLines={1} style={[styles.axisText, compact && styles.axisTextMobile, { flex: 1, textAlign: "center" }]}>{item.label}</Text>)}</View></View>;
}

function TopProductsChart({ data, period }: { data: ChartPoint[]; period: PeriodKey }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const chartData = data.slice(0, 5);
  const maxValue = Math.max(...chartData.map((item) => item.value), 1);
  const labelWidth = compact ? 120 : 180;
  const axis = [0, Math.ceil(maxValue / 2), maxValue];

  return <View style={[styles.chart, { minHeight: compact ? 190 : 240, paddingTop: compact ? 14 : 28 }]}>{chartData.map((item) => <View key={item.label} style={{ alignItems: "center", flexDirection: "row", gap: compact ? 8 : 12, minHeight: compact ? 32 : 40 }}><Text style={[styles.axisText, compact && styles.axisTextMobile, { flexShrink: 0, lineHeight: compact ? 13 : 16, width: labelWidth }]}>{item.label}</Text><View style={{ flex: 1, height: compact ? 18 : 24, justifyContent: "center" }}><View style={{ backgroundColor: colors.primary, borderRadius: 2, height: compact ? 18 : 24, minWidth: item.value > 0 ? 3 : 0, width: `${(item.value / maxValue) * 100}%` }} /></View><Text style={[styles.axisText, compact && styles.axisTextMobile, { flexShrink: 0, textAlign: "left", width: compact ? 24 : 32 }]}>{item.value}</Text></View>)}<View style={{ flexDirection: "row", justifyContent: "space-between", marginLeft: labelWidth + (compact ? 8 : 12), marginRight: compact ? 32 : 44, marginTop: compact ? 12 : 18 }}>{axis.map((tick) => <Text key={tick} style={[styles.axisText, compact && styles.axisTextMobile]}>{tick}</Text>)}</View></View>;
}

function SkeletonBlock({ style }: { style?: object }) {
  return <View style={[styles.skeletonBlock, style]} />;
}

function DashboardSkeleton({ compact }: { compact: boolean }) {
  const salesBars = [0, 1, 2, 3, 4, 5];
  const topBars = [0, 1, 2, 3, 4];

  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>{[0, 1, 2, 3].map((item) => <View key={item} style={styles.skeletonMetric}><SkeletonBlock style={styles.skeletonMetricLabel} /><SkeletonBlock style={styles.skeletonMetricValue} /></View>)}</View>
      <View style={styles.skeletonCard}>
        <SkeletonBlock style={styles.skeletonTitle} />
        <View style={styles.skeletonTableHeader} />
        {[0, 1, 2, 3, 4].map((row) => <View key={row} style={styles.skeletonTableRow}>{[0, 1, 2, 3, 4].map((cell) => <SkeletonBlock key={cell} style={styles.skeletonTableCell} />)}</View>)}
      </View>
      <View style={[styles.chartGrid, compact && styles.chartGridMobile]}>
        <View style={styles.skeletonChartCard}>
          <SkeletonBlock style={styles.skeletonChartTitle} />
          <View style={styles.skeletonTabs}>{[0, 1, 2, 3].map((tab) => <SkeletonBlock key={tab} style={styles.skeletonTab} />)}</View>
          <View style={styles.skeletonChartPlot}><View style={styles.skeletonYAxis}>{[0, 1, 2, 3, 4].map((tick) => <SkeletonBlock key={tick} style={styles.skeletonAxisTick} />)}</View><View style={styles.skeletonPlotArea}>{salesBars.map((bar) => <View key={bar} style={styles.skeletonBarSlot}><SkeletonBlock style={[styles.skeletonVerticalBar, { height: 54 + bar * 18 }]} /><SkeletonBlock style={styles.skeletonXAxisLabel} /></View>)}</View></View>
        </View>
        <View style={styles.skeletonChartCard}>
          <SkeletonBlock style={styles.skeletonChartTitle} />
          <View style={styles.skeletonTabs}>{[0, 1, 2, 3].map((tab) => <SkeletonBlock key={tab} style={styles.skeletonTab} />)}</View>
          <View style={styles.skeletonTopChart}>{topBars.map((bar) => <View key={bar} style={styles.skeletonTopRow}><SkeletonBlock style={styles.skeletonTopLabel} /><SkeletonBlock style={[styles.skeletonTopBar, { flex: 1 + bar * 0.35 }]} /><SkeletonBlock style={styles.skeletonTopValue} /></View>)}</View>
        </View>
      </View>
    </View>
  );
}

export function DashboardPage() {
  const [salesPeriod, setSalesPeriod] = useState<PeriodKey>("bulan");
  const [topPeriod, setTopPeriod] = useState<PeriodKey>("bulan");
  const [salesData, setSalesData] = useState<ChartPoint[]>([]);
  const [topData, setTopData] = useState<ChartPoint[]>([]);
  const [loadedSalesPeriods, setLoadedSalesPeriods] = useState<PeriodKey[]>([]);
  const [loadedTopPeriods, setLoadedTopPeriods] = useState<PeriodKey[]>([]);
  const [restockSearch, setRestockSearch] = useState("");
  const [restockLoading, setRestockLoading] = useState(false);
  const [salesChartLoading, setSalesChartLoading] = useState(false);
  const [topChartLoading, setTopChartLoading] = useState(false);
  const { error, loadRestockAlertsPage, loading, restockAlerts, restockMeta, summary, token } = useInventoryData();
  const { width } = useWindowDimensions();
  const compact = width < 760;

  // Auto-search saat ketik (debounce 500ms)
  // Skip initial render because data is already loaded by InventoryDataContext
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setRestockLoading(true);
      void loadRestockAlertsPage(1, restockSearch).finally(() => setRestockLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [restockSearch]);

  useEffect(() => {
    if (loading || loadedSalesPeriods.includes(salesPeriod)) return;

    setSalesChartLoading(true);
    void loadChart(token, "sales", periodMap[salesPeriod]).then((data) => {
      setSalesData(data);
      setLoadedSalesPeriods((periods) => periods.includes(salesPeriod) ? periods : [...periods, salesPeriod]);
    }).catch(() => setSalesData([])).finally(() => setSalesChartLoading(false));
  }, [loading, loadedSalesPeriods, salesPeriod, token]);

  useEffect(() => {
    if (loading || loadedTopPeriods.includes(topPeriod)) return;

    setTopChartLoading(true);
    void loadChart(token, "top", periodMap[topPeriod]).then((data) => {
      setTopData(data);
      setLoadedTopPeriods((periods) => periods.includes(topPeriod) ? periods : [...periods, topPeriod]);
    }).catch(() => setTopData([])).finally(() => setTopChartLoading(false));
  }, [loading, loadedTopPeriods, topPeriod, token]);

  const handleRestockPage = (page: number) => {
    setRestockLoading(true);
    void loadRestockAlertsPage(page, restockSearch).finally(() => setRestockLoading(false));
  };

  const handleRestockReset = () => {
    // CrudShell already clears search via onSearchChange, which triggers useEffect.
    // We just set loading here for immediate feedback; useEffect handles the API call.
    setRestockLoading(true);
  };

  const selectSalesPeriod = (period: PeriodKey) => {
    if (salesChartLoading) return;
    if (period === salesPeriod && loadedSalesPeriods.includes(period)) return;
    setSalesPeriod(period);
    setSalesChartLoading(true);
    void loadChart(token, "sales", periodMap[period]).then((data) => {
      setSalesData(data);
      setLoadedSalesPeriods((periods) => periods.includes(period) ? periods : [...periods, period]);
    }).catch(() => setSalesData([])).finally(() => setSalesChartLoading(false));
  };

  const selectTopPeriod = (period: PeriodKey) => {
    if (topChartLoading) return;
    if (period === topPeriod && loadedTopPeriods.includes(period)) return;
    setTopPeriod(period);
    setTopChartLoading(true);
    void loadChart(token, "top", periodMap[period]).then((data) => {
      setTopData(data);
      setLoadedTopPeriods((periods) => periods.includes(period) ? periods : [...periods, period]);
    }).catch(() => setTopData([])).finally(() => setTopChartLoading(false));
  };

  if (loading) return <DashboardSkeleton compact={compact} />;

  return (
    <View style={styles.stack}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.metricGrid}>
        <Metric title="Stok Tersedia" value={String(summary.totalUnits)} />
        <Metric title="Stok Menipis" value={String(summary.lowStockCount)} />
        <Metric title="Stok Habis" value={String(summary.outOfStockCount)} />
      </View>
      <CrudShell
        search="Cari produk..."
        searchValue={restockSearch}
        onSearchChange={setRestockSearch}
        onSearchReset={handleRestockReset}
        searchDisabled={restockLoading}
      >
        <WhiteCard title="Barang Habis">
          <DataTable
            columns={["Kode Produk", "Produk", "Status", "Stok", "Update"]}
            pagination={restockMeta}
            onPageChange={handleRestockPage}
            loading={restockLoading}
          >
            {restockAlerts.map((alert) => (
              <TableRow
                key={alert.id}
                cells={[
                  alert.product?.sku ?? "-",
                  alert.product?.name ?? "-",
                  alert.severity === "empty" ? "Habis" : "Menipis",
                  String(alert.currentStock),
                  formatDate(alert.updatedAt),
                ]}
              />
            ))}
            {!restockAlerts.length && !restockLoading ? <EmptyRow text="Tidak ada barang habis aktif" /> : null}
          </DataTable>
        </WhiteCard>
      </CrudShell>
      <View style={[styles.chartGrid, compact && styles.chartGridMobile]}>
        <WhiteCard title="Grafik Penjualan" action={<PeriodTabs value={salesPeriod} onChange={selectSalesPeriod} disabled={salesChartLoading} />}>
          {salesChartLoading ? (
            <View style={styles.chart}>
              <View style={styles.skeletonChartPlot}><View style={styles.skeletonYAxis}>{[0, 1, 2, 3, 4].map((tick) => <SkeletonBlock key={tick} style={styles.skeletonAxisTick} />)}</View><View style={styles.skeletonPlotArea}>{[0, 1, 2, 3, 4, 5].map((bar) => <View key={bar} style={styles.skeletonBarSlot}><SkeletonBlock style={[styles.skeletonVerticalBar, { height: 54 + bar * 18 }]} /><SkeletonBlock style={styles.skeletonXAxisLabel} /></View>)}</View></View>
            </View>
          ) : <SalesBarChart data={salesData} period={salesPeriod} />}
        </WhiteCard>
        <WhiteCard title="Barang Terlaris" action={<PeriodTabs value={topPeriod} onChange={selectTopPeriod} disabled={topChartLoading} />}>
          {topChartLoading ? (
            <View style={styles.chart}>
              <View style={styles.skeletonTopChart}>{[0, 1, 2, 3, 4].map((bar) => <View key={bar} style={styles.skeletonTopRow}><SkeletonBlock style={styles.skeletonTopLabel} /><SkeletonBlock style={[styles.skeletonTopBar, { flex: 1 + bar * 0.35 }]} /><SkeletonBlock style={styles.skeletonTopValue} /></View>)}</View>
            </View>
          ) : <TopProductsChart data={topData} period={topPeriod} />}
        </WhiteCard>
      </View>
    </View>
  );
}

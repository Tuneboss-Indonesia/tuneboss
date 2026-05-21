import { Children, cloneElement, isValidElement, useState } from "react";
import { Platform, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Archive, Calendar, Edit3, PackageCheck, Search, Trash2, type LucideIcon } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import type { PressState } from "../types";
import { styles } from "../styles";

export type TablePagination = { currentPage: number; lastPage: number; perPage: number; total: number; from?: number | null; to?: number | null };

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function DateInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  const [showPicker, setShowPicker] = useState(false);

  if (Platform.OS === "web") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          backgroundColor: "rgba(255,255,255,0.06)",
          borderColor: colors.border,
          borderRadius: 4,
          borderWidth: 1,
          color: value ? colors.white : colors.muted,
          fontFamily: "Futura PT, sans-serif",
          fontSize: 15,
          height: 48,
          outline: "none",
          padding: "0 14px",
          width: "100%",
          boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      />
    );
  }

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => !disabled && setShowPicker(true)}
        style={({ hovered, pressed }: PressState) => [
          styles.dateInput,
          { flex: 1 },
          disabled && { opacity: 0.5 },
          hovered && !disabled && { backgroundColor: "rgba(255,255,255,0.1)" },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Calendar color={value ? colors.primary : colors.muted} size={16} />
          <Text style={{ color: value ? colors.white : colors.muted, fontFamily: "Futura PT", fontSize: 15 }}>
            {value ? formatDateDisplay(value) : placeholder || "Pilih tanggal"}
          </Text>
        </View>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          onChange={(_event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const day = String(selectedDate.getDate()).padStart(2, "0");
              onChange(`${year}-${month}-${day}`);
            }
          }}
        />
      )}
    </>
  );
}

export function WhiteCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children?: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  return <View style={[styles.whiteCard, compact && styles.whiteCardMobile]}><View style={[styles.cardHeader, compact && styles.cardHeaderMobile]}><View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, compact && styles.cardTitleMobile]}>{title}</Text>{subtitle ? <Text style={[styles.cardSubtitle, compact && styles.cardSubtitleMobile]}>{subtitle}</Text> : null}</View>{action}</View>{children}</View>;
}

export function EmptyText({ text }: { text: string }) {
  return <View style={styles.emptyTall}><Text style={styles.emptyText}>{text}</Text></View>;
}

export function Metric({ title, value }: { title: string; value: string }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  return <View style={[styles.metric, compact && styles.metricMobile]}><Text style={[styles.metricTitle, compact && styles.metricTitleMobile]}>{title}</Text><Text style={[styles.metricValue, compact && styles.metricValueMobile]}>{value}</Text></View>;
}

export function CrudShell({ title, subtitle, button, onButton, search, searchValue, onSearchChange, onSearchReset, onSearchSubmit, searchDisabled, chips, chipsDisabled, activeChip, onChipPress, date, dateFrom, onDateFromChange, dateTo, onDateToChange, children, loading, buttonDisabled }: { title?: string; subtitle?: string; button?: string; onButton?: () => void; search?: string; searchValue?: string; onSearchChange?: (value: string) => void; onSearchReset?: () => void; onSearchSubmit?: () => void; searchDisabled?: boolean; chips?: string[]; chipsDisabled?: boolean; activeChip?: string; onChipPress?: (chip: string) => void; date?: boolean; dateFrom?: string; onDateFromChange?: (value: string) => void; dateTo?: string; onDateToChange?: (value: string) => void; children: React.ReactNode; loading?: boolean; buttonDisabled?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const hasSearchValue = Boolean(searchValue?.trim());
  const actionDisabled = Boolean(loading || buttonDisabled);

  return (
    <View style={styles.stack}>
      {(title || button) ? <View style={[styles.pageHead, compact && styles.pageHeadMobile]}><View style={styles.pageHeadText}>{title ? <Text style={[styles.pageHeading, compact && styles.pageHeadingMobile]}>{title}</Text> : null}{subtitle ? <Text style={[styles.pageSubheading, compact && styles.pageSubheadingMobile]}>{subtitle}</Text> : null}</View>{button ? <Pressable disabled={actionDisabled} onPress={onButton} style={({ hovered, pressed }: PressState) => [styles.primaryButton, compact && styles.primaryButtonMobile, hovered && !actionDisabled && styles.primaryButtonHover, pressed && styles.pressed, actionDisabled && styles.tablePagerButtonDisabled]}><Text style={[styles.primaryButtonText, compact && styles.primaryButtonTextMobile, actionDisabled && { color: colors.muted }]}>{button}</Text></Pressable> : null}</View> : null}
      {search ? (
        loading ? (
          <View style={[styles.searchPanel, compact && styles.searchPanelMobile]}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, height: 48, width: "100%" }} />
            {chips ? (
              <View style={styles.chipRow}>
                {chips.map((chip) => (
                  <View key={chip} style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 24, height: 40, width: 80 }} />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.searchPanel, compact && styles.searchPanelMobile]}>
            <View style={[styles.searchRow, compact && styles.searchRowMobile]}>
              <View style={[styles.searchInputWrap, compact && styles.searchInputWrapMobile]}>
                <Search color={colors.primary} size={compact ? 19 : 22} />
                <TextInput editable={!searchDisabled} value={searchValue} onChangeText={onSearchChange} onSubmitEditing={onSearchSubmit} placeholder={search} placeholderTextColor={colors.muted} style={[styles.searchInput, compact && styles.searchInputMobile]} />
              </View>
              {date && !dateFrom && !dateTo ? <Text style={[styles.dateInput, compact && styles.dateInputMobile]}>dd/mm/yyyy</Text> : null}
              {dateFrom !== undefined && onDateFromChange ? (
                <DateInput value={dateFrom} onChange={onDateFromChange} placeholder="Dari tanggal" disabled={loading} />
              ) : null}
              {dateTo !== undefined && onDateToChange ? (
                <DateInput value={dateTo} onChange={onDateToChange} placeholder="Sampai tanggal" disabled={loading} />
              ) : null}
              {onSearchSubmit ? <Pressable disabled={searchDisabled} onPress={onSearchSubmit} style={({ hovered, pressed }: PressState) => [styles.searchButton, compact && styles.searchButtonMobile, hovered && !searchDisabled && styles.searchButtonHover, pressed && styles.pressed, searchDisabled && styles.tablePagerButtonDisabled]}><Text style={styles.searchButtonText}>Cari</Text></Pressable> : null}
              {hasSearchValue ? <Pressable disabled={searchDisabled} onPress={() => { onSearchChange?.(""); onSearchReset?.(); }} style={({ hovered, pressed }: PressState) => [styles.searchButton, compact && styles.searchButtonMobile, hovered && !searchDisabled && styles.searchButtonHover, pressed && styles.pressed, searchDisabled && styles.tablePagerButtonDisabled]}><Text style={styles.searchButtonText}>Reset</Text></Pressable> : null}
            </View>
            {chips ? <View style={styles.chipRow}>{chips.map((chip) => <Chip key={chip} label={chip} active={activeChip === chip} disabled={chipsDisabled} onPress={() => onChipPress?.(chip)} />)}</View> : null}
          </View>
        )
      ) : null}
      {children}
    </View>
  );
}

export function Chip({ label, active, disabled, onPress }: { label: string; active?: boolean; disabled?: boolean; onPress?: () => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const Icon = label === "Tersedia" || label === "Aman" ? PackageCheck : Archive;
  return <Pressable disabled={disabled} onPress={onPress} style={({ hovered, pressed }: PressState) => [styles.chip, compact && styles.chipMobile, active && styles.chipActive, hovered && !active && !disabled && styles.chipHover, pressed && styles.pressed, disabled && styles.tablePagerButtonDisabled]}><Icon color={disabled ? colors.muted : colors.primary} size={compact ? 13 : 15} /><Text style={[styles.chipText, compact && styles.chipTextMobile, disabled && { color: colors.muted }]}>{label}</Text></Pressable>;
}

export function DataTable({ columns, children, loading, pagination, onPageChange }: { columns: string[]; children: React.ReactNode; loading?: boolean; pagination?: TablePagination; onPageChange?: (page: number) => void }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 760;
  const loadingRows = [0, 1, 2, 3, 4].map((row) => <View key={row} style={styles.skeletonTableRow}>{columns.map((column) => <View key={column} style={styles.skeletonTableCell} />)}</View>);
  const loadingHeader = <View style={styles.tableHeader}>{columns.map((column) => <View key={column} style={[styles.skeletonTableCell, { height: 20, backgroundColor: "rgba(237,108,5,0.4)" }]} />)}</View>;
  const enhancedChildren = loading ? loadingRows : Children.map(children, (child) => isValidElement(child) ? cloneElement(child as React.ReactElement<{ columns?: string[]; compact?: boolean }>, { columns, compact: isCompact }) : child);
  const table = isCompact ? <View style={styles.mobileTableList}>{enhancedChildren}</View> : <View style={styles.table}>{loading ? loadingHeader : <View style={styles.tableHeader}>{columns.map((column) => <Text key={column} style={styles.th}>{column}</Text>)}</View>}{enhancedChildren}</View>;
  return <View style={styles.tableWrap}>{table}{pagination && onPageChange ? <TablePager disabled={loading} pagination={pagination} onPageChange={onPageChange} /> : null}</View>;
}

function TablePager({ disabled, pagination, onPageChange }: { disabled?: boolean; pagination: TablePagination; onPageChange: (page: number) => void }) {
  if (disabled) {
    return <View style={styles.tablePager}><View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, height: 20, width: 120 }} /></View>;
  }
  const canPrev = pagination.currentPage > 1;
  const canNext = pagination.currentPage < pagination.lastPage;
  return <View style={styles.tablePager}><Text style={styles.tablePagerText}>{pagination.total ? `${pagination.from ?? 1}-${pagination.to ?? 0} dari ${pagination.total}` : "0 data"}</Text><View style={styles.tablePagerActions}><Pressable disabled={!canPrev} onPress={() => onPageChange(pagination.currentPage - 1)} style={({ hovered, pressed }: PressState) => [styles.tablePagerButton, hovered && canPrev && styles.secondaryButtonHover, pressed && styles.pressed, !canPrev && styles.tablePagerButtonDisabled]}><Text style={styles.tablePagerButtonText}>Prev</Text></Pressable><Text style={styles.tablePagerText}>Page {pagination.currentPage}/{Math.max(pagination.lastPage, 1)}</Text><Pressable disabled={!canNext} onPress={() => onPageChange(pagination.currentPage + 1)} style={({ hovered, pressed }: PressState) => [styles.tablePagerButton, hovered && canNext && styles.secondaryButtonHover, pressed && styles.pressed, !canNext && styles.tablePagerButtonDisabled]}><Text style={styles.tablePagerButtonText}>Next</Text></Pressable></View></View>;
}

export function TableRow({ cells, columns, compact, actions }: { cells: string[]; columns?: string[]; compact?: boolean; actions?: React.ReactNode }) {
  if (compact) return <View style={styles.mobileTableCard}>{cells.map((cell, index) => <View key={`${cell}-${index}`} style={styles.mobileTablePair}><Text style={styles.mobileTableLabel}>{columns?.[index] ?? `Data ${index + 1}`}</Text><Text style={styles.mobileTableValue}>{cell}</Text></View>)}{actions ? <View style={styles.mobileActions}>{actions}</View> : null}</View>;
  return <View style={styles.tableRow}>{cells.map((cell, index) => <Text key={`${cell}-${index}`} style={styles.td}>{cell}</Text>)}{actions ? <View style={styles.tdActions}>{actions}</View> : null}</View>;
}

export function EmptyRow({ text }: { text: string; columns?: string[]; compact?: boolean }) {
  return <View style={styles.emptyRow}><Text style={styles.emptyText}>{text}</Text></View>;
}

export function IconButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label?: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={({ hovered, pressed }: PressState) => [styles.iconButton, hovered && styles.iconButtonHover, pressed && styles.pressed]}><Icon color={colors.muted} size={18} /></Pressable>;
}

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <View style={styles.rowActions}><IconButton icon={Edit3} label="Edit" onPress={onEdit} /><IconButton icon={Trash2} label="Hapus" onPress={onDelete} /></View>;
}

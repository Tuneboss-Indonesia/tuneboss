import { Children, cloneElement, isValidElement, useState } from "react";
import { AlertTriangle } from "lucide-react-native";
import { Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Archive, Calendar, Edit3, PackageCheck, Search, Trash2, type LucideIcon } from "lucide-react-native";
import { colors, fonts } from "../../../theme/tokens";
import type { PressState } from "../types";
import { styles } from "../styles";

export type TablePagination = { currentPage: number; lastPage: number; perPage: number; total: number; from?: number | null; to?: number | null };

const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthLabel(month: Date) {
  try {
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(month);
  } catch {
    return `${String(month.getMonth() + 1).padStart(2, "0")}/${month.getFullYear()}`;
  }
}

function DateInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const selectedDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: totalDays }, (_, index) => index + 1);

  return (
    <View style={[open && { zIndex: 80 }]}> 
      <Pressable disabled={disabled} onPress={() => !disabled && setOpen((current) => !current)} style={({ hovered, pressed }: PressState) => [styles.filterBox, { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 52, paddingBottom: 0, paddingTop: 0 }, disabled && styles.tablePagerButtonDisabled, hovered && !disabled && styles.secondaryButtonHover, pressed && styles.pressed]}>
        <Calendar color={value ? colors.primary : colors.muted} size={16} />
        <Text style={[value ? styles.modalSelectText : styles.scanResultMeta, { lineHeight: 20 }]}>{value || placeholder || "Pilih tanggal"}</Text>
      </Pressable>
      {open ? (
        <View style={[styles.calendarPopover, { top: 60 }, compact && styles.calendarPopoverMobile]}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={styles.calendarNav}><Text style={styles.secondaryButtonText}>‹</Text></Pressable>
            <Text style={styles.calendarTitle}>{formatMonthLabel(month)}</Text>
            <Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={styles.calendarNav}><Text style={styles.secondaryButtonText}>›</Text></Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {dayNames.map((day) => <Text key={day} style={styles.calendarDayName}>{day}</Text>)}
            {blanks.map((_, index) => <View key={`blank-${index}`} style={styles.calendarDay} />)}
            {days.map((day) => {
              const current = dateValue(new Date(month.getFullYear(), month.getMonth(), day));
              return <Pressable key={day} onPress={() => { onChange(current); setOpen(false); }} style={[styles.calendarDay, current === value && styles.calendarDayActive]}><Text style={[styles.calendarDayText, current === value && styles.calendarDayTextActive]}>{day}</Text></Pressable>;
            })}
          </View>
          <View style={styles.calendarActions}>
            <Pressable onPress={() => { onChange(""); setOpen(false); }} style={styles.cancelButton}><Text style={styles.cancelText}>Clear</Text></Pressable>
            <Pressable onPress={() => { onChange(dateValue(new Date())); setOpen(false); }} style={styles.saveButton}><Text style={styles.saveText}>Hari ini</Text></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function WhiteCard({ title, subtitle, action, children, fill }: { title: string; subtitle?: string; action?: React.ReactNode; children?: React.ReactNode; fill?: boolean }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  return <View style={[styles.whiteCard, fill && styles.whiteCardFill, compact && styles.whiteCardMobile]}><View style={[styles.cardHeader, compact && styles.cardHeaderMobile]}><View style={styles.cardTitleBlock}><Text style={[styles.cardTitle, compact && styles.cardTitleMobile]}>{title}</Text>{subtitle ? <Text style={[styles.cardSubtitle, compact && styles.cardSubtitleMobile]}>{subtitle}</Text> : null}</View>{action}</View>{children}</View>;
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
  const hasDateRange = dateFrom !== undefined || dateTo !== undefined;

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
            <View style={[styles.searchRow, hasDateRange && styles.searchRowWithDates, compact && styles.searchRowMobile]}>
              <View style={[styles.searchInputWrap, hasDateRange && !compact && styles.searchInputWrapWithDates, compact && styles.searchInputWrapMobile]}>
                <Search color={colors.primary} size={compact ? 19 : 22} />
                <TextInput editable={!searchDisabled} value={searchValue} onChangeText={onSearchChange} onSubmitEditing={onSearchSubmit} placeholder={search} placeholderTextColor={colors.muted} style={[styles.searchInput, compact && styles.searchInputMobile]} />
              </View>
              {date && !dateFrom && !dateTo ? <Text style={[styles.dateInput, compact && styles.dateInputMobile]}>dd/mm/yyyy</Text> : null}
              {dateFrom !== undefined && onDateFromChange ? (
                <View style={[styles.searchDateWrap, compact && styles.searchDateWrapMobile]}>
                  <DateInput value={dateFrom} onChange={onDateFromChange} placeholder="Dari tanggal" disabled={loading || searchDisabled} />
                </View>
              ) : null}
              {dateTo !== undefined && onDateToChange ? (
                <View style={[styles.searchDateWrap, compact && styles.searchDateWrapMobile]}>
                  <DateInput value={dateTo} onChange={onDateToChange} placeholder="Sampai tanggal" disabled={loading || searchDisabled} />
                </View>
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

function tableColumnFlex(column?: string): number {
  switch (column) {
    case "Barcode":
      return 1.8;
    case "Stok":
      return 0.45;
    case "Aksi":
      return 1.35;
    case "Status":
    case "Gambar":
      return 0.75;
    default:
      return 1;
  }
}

export function DataTable({ columns, children, loading, pagination, onPageChange }: { columns: string[]; children: React.ReactNode; loading?: boolean; pagination?: TablePagination; onPageChange?: (page: number) => void }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const loadingRows = [0, 1, 2, 3, 4].map((row) => <View key={row} style={styles.skeletonTableRow}>{columns.map((column) => <View key={column} style={[styles.skeletonTableCell, { flex: tableColumnFlex(column) }]} />)}</View>);
  const loadingHeader = <View style={styles.tableHeader}>{columns.map((column) => <View key={column} style={[styles.skeletonTableCell, { backgroundColor: "rgba(237,108,5,0.4)", flex: tableColumnFlex(column), height: 20 }]} />)}</View>;
  const enhancedChildren = loading ? loadingRows : Children.map(children, (child) => isValidElement(child) ? cloneElement(child as React.ReactElement<{ columns?: string[]; compact?: boolean }>, { columns, compact: isCompact }) : child);
  const table = isCompact ? <View style={styles.mobileTableList}>{enhancedChildren}</View> : <View style={styles.table}>{loading ? loadingHeader : <View style={styles.tableHeader}>{columns.map((column) => <Text key={column} style={[styles.th, { flex: tableColumnFlex(column) }]}>{column}</Text>)}</View>}{enhancedChildren}</View>;
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

function TableCellContent({ column, compact, value }: { column?: string; compact?: boolean; value: React.ReactNode }) {
  const columnStyle = compact ? null : { flex: tableColumnFlex(column) };
  if (typeof value === "string" || typeof value === "number") return <Text style={[compact ? styles.mobileTableValue : styles.td, columnStyle]}>{value}</Text>;
  return <View style={[compact ? styles.mobileTableValueContent : styles.tdContent, columnStyle]}>{value}</View>;
}

export function TableRow({ cells, columns, compact, actions }: { cells: React.ReactNode[]; columns?: string[]; compact?: boolean; actions?: React.ReactNode }) {
  const visibleCells = columns && columns.length > cells.length && !actions ? [...cells, ...Array.from({ length: columns.length - cells.length }, () => "-")] : cells;
  if (compact) return <View style={styles.mobileTableCard}>{visibleCells.map((cell, index) => <View key={index} style={styles.mobileTablePair}><Text style={styles.mobileTableLabel}>{columns?.[index] ?? `Data ${index + 1}`}</Text><TableCellContent compact value={cell} /></View>)}{actions ? <View style={styles.mobileActions}>{actions}</View> : null}</View>;
  return <View style={styles.tableRow}>{visibleCells.map((cell, index) => <TableCellContent key={index} column={columns?.[index]} value={cell} />)}{actions ? <View style={[styles.tdActions, { flex: tableColumnFlex(columns?.[cells.length]) }]}>{actions}</View> : null}</View>;
}

export function EmptyRow({ text }: { text: string; columns?: string[]; compact?: boolean }) {
  return <View style={styles.emptyRow}><Text style={styles.emptyText}>{text}</Text></View>;
}

export function IconButton({ disabled, icon: Icon, label, onPress }: { disabled?: boolean; icon: LucideIcon; label?: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ hovered, pressed }: PressState) => [styles.iconButton, hovered && !disabled && styles.iconButtonHover, pressed && styles.pressed, disabled && styles.tablePagerButtonDisabled]}><Icon color={colors.muted} size={18} /></Pressable>;
}

export function RowActions({ deleteDisabled, onEdit, onDelete }: { deleteDisabled?: boolean; onEdit: () => void; onDelete: () => void }) {
  return <View style={styles.rowActions}><IconButton icon={Edit3} label="Edit" onPress={onEdit} /><IconButton disabled={deleteDisabled} icon={Trash2} label="Hapus" onPress={onDelete} /></View>;
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <View style={styles.errorScreen}><View style={styles.errorIcon}><AlertTriangle color={colors.accent} size={40} /></View><Text style={styles.errorTitle}>Terjadi Kesalahan</Text><Text style={styles.errorDesc}>{message}</Text>{onRetry ? <Pressable onPress={onRetry} style={({ hovered, pressed }: PressState) => [styles.primaryButton, hovered && styles.primaryButtonHover, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>Coba Lagi</Text></Pressable> : null}</View>;
}

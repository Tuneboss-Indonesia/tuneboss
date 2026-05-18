import { Children, cloneElement, isValidElement } from "react";
import { Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Archive, Edit3, PackageCheck, Search, Trash2, type LucideIcon } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import type { PressState } from "../types";
import { styles } from "../styles";

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

export function CrudShell({ title, subtitle, button, onButton, search, searchValue, onSearchChange, onSearchSubmit, chips, activeChip, onChipPress, date, children }: { title?: string; subtitle?: string; button?: string; onButton?: () => void; search?: string; searchValue?: string; onSearchChange?: (value: string) => void; onSearchSubmit?: () => void; chips?: string[]; activeChip?: string; onChipPress?: (chip: string) => void; date?: boolean; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const hasSearchValue = Boolean(searchValue?.trim());

  return (
    <View style={styles.stack}>
      {(title || button) ? <View style={[styles.pageHead, compact && styles.pageHeadMobile]}><View style={styles.pageHeadText}>{title ? <Text style={[styles.pageHeading, compact && styles.pageHeadingMobile]}>{title}</Text> : null}{subtitle ? <Text style={[styles.pageSubheading, compact && styles.pageSubheadingMobile]}>{subtitle}</Text> : null}</View>{button ? <Pressable onPress={onButton} style={[styles.primaryButton, compact && styles.primaryButtonMobile]}><Text style={[styles.primaryButtonText, compact && styles.primaryButtonTextMobile]}>{button}</Text></Pressable> : null}</View> : null}
      {search ? <View style={[styles.searchPanel, compact && styles.searchPanelMobile]}><View style={[styles.searchRow, compact && styles.searchRowMobile]}><View style={[styles.searchInputWrap, compact && styles.searchInputWrapMobile]}><Search color={colors.primary} size={compact ? 19 : 22} /><TextInput value={searchValue} onChangeText={onSearchChange} onSubmitEditing={onSearchSubmit} placeholder={search} placeholderTextColor={colors.muted} style={[styles.searchInput, compact && styles.searchInputMobile]} /></View>{date ? <Text style={[styles.dateInput, compact && styles.dateInputMobile]}>dd/mm/yyyy</Text> : null}{hasSearchValue ? <Pressable onPress={() => onSearchChange?.("")} style={[styles.searchButton, compact && styles.searchButtonMobile]}><Text style={styles.searchButtonText}>Reset</Text></Pressable> : null}</View>{chips ? <View style={styles.chipRow}>{chips.map((chip) => <Chip key={chip} label={chip} active={activeChip === chip} onPress={() => onChipPress?.(chip)} />)}</View> : null}</View> : null}
      {children}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const Icon = label === "Tersedia" || label === "Aman" ? PackageCheck : Archive;
  return <Pressable onPress={onPress} style={[styles.chip, compact && styles.chipMobile, active && styles.chipActive]}><Icon color={colors.primary} size={compact ? 13 : 15} /><Text style={[styles.chipText, compact && styles.chipTextMobile]}>{label}</Text></Pressable>;
}

export function DataTable({ columns, children }: { columns: string[]; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 760;
  const enhancedChildren = Children.map(children, (child) => isValidElement(child) ? cloneElement(child as React.ReactElement<{ columns?: string[]; compact?: boolean }>, { columns, compact: isCompact }) : child);
  if (isCompact) return <View style={styles.mobileTableList}>{enhancedChildren}</View>;
  return <View style={styles.table}><View style={styles.tableHeader}>{columns.map((column) => <Text key={column} style={styles.th}>{column}</Text>)}</View>{enhancedChildren}</View>;
}

export function TableRow({ cells, columns, compact, actions }: { cells: string[]; columns?: string[]; compact?: boolean; actions?: React.ReactNode }) {
  if (compact) return <View style={styles.mobileTableCard}>{cells.map((cell, index) => <View key={`${cell}-${index}`} style={styles.mobileTablePair}><Text style={styles.mobileTableLabel}>{columns?.[index] ?? `Data ${index + 1}`}</Text><Text style={styles.mobileTableValue}>{cell}</Text></View>)}{actions ? <View style={styles.mobileActions}>{actions}</View> : null}</View>;
  return <View style={styles.tableRow}>{cells.map((cell, index) => <Text key={`${cell}-${index}`} style={styles.td}>{cell}</Text>)}{actions ? <View style={styles.tdActions}>{actions}</View> : null}</View>;
}

export function EmptyRow({ text }: { text: string; columns?: string[]; compact?: boolean }) {
  return <View style={styles.emptyRow}><Text style={styles.emptyText}>{text}</Text></View>;
}

export function IconButton({ icon: Icon, onPress }: { icon: LucideIcon; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }: PressState) => [styles.iconButton, pressed && styles.pressed]}><Icon color={colors.muted} size={18} /></Pressable>;
}

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <View style={styles.rowActions}><IconButton icon={Edit3} onPress={onEdit} /><IconButton icon={Trash2} onPress={onDelete} /></View>;
}

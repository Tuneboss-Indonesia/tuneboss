import { useEffect, useRef, useState } from "react";
import { Alert, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { apiRequest, formatDate } from "../api";
import { logoUri } from "../data";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, RowActions, TableRow } from "../components/common";
import type { StockItem, StockMovement } from "../../../types/dashboard";
import { colors, fonts } from "../../../theme/tokens";
import { styles } from "../styles";
import type { PressState } from "../types";

const paymentStatuses = ["Lunas", "DP", "Unpaid", "PayLater"] as const;

function MovementTableRow({ columns, compact, item, onDelete, onEdit, onInvoice }: { columns?: string[]; compact?: boolean; item: StockMovement; onDelete: () => void; onEdit: () => void; onInvoice?: () => void }) {
  const serials = item.serialNumbers?.join(", ") || "-";
  const cells = item.type === "inbound" ? [formatDate(item.timestamp), item.productName, String(item.quantity), serials, item.productCategory ?? "-", item.note || "-"] : [formatDate(item.timestamp), item.productName, String(item.quantity), serials, item.customerName ?? "-", item.paymentStatus ?? "-", item.saleAddress ?? item.party ?? "-", item.note || "-"];
  const canModify = item.type === "inbound" || item.type === "outbound";
  const actions = canModify ? <View style={styles.rowActions}>{onInvoice ? <Pressable onPress={onInvoice} style={styles.cancelButton}><Text style={styles.cancelText}>Invoice</Text></Pressable> : null}<RowActions onEdit={onEdit} onDelete={onDelete} /></View> : null;
  return <TableRow columns={columns} compact={compact} cells={cells} actions={actions} />;
}

export function MovementPage({ kind, onOpenModal }: { kind: "inbound" | "outbound"; onOpenModal: () => void }) {
  const isIn = kind === "inbound";
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editing, setEditing] = useState<StockMovement | null>(null);
  const [invoice, setInvoice] = useState<StockMovement[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StockMovement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const skipAutoSearchRef = useRef(true);
  const { loading, loadMovementsPage, movementMeta, movements, stockItems, token } = useInventoryData();
  const types = isIn ? ["inbound"] : ["outbound"];
  const movementTypeFilter = isIn ? "inbound" : "outbound";
  const filterLoading = loading || refreshing || tableLoading;
  const rows = movements.filter((item) => types.includes(item.type) && `${item.productName} ${item.sku} ${item.serialNumbers?.join(" ") ?? ""} ${item.productCategory ?? ""} ${item.customerName ?? ""} ${item.paymentStatus ?? ""} ${item.party} ${item.operator} ${item.note}`.toLowerCase().includes(query.toLowerCase()));

  const effectiveDateRange = () => {
    if (dateFrom && !dateTo) return { from: dateFrom, to: dateFrom };
    if (!dateFrom && dateTo) return { from: dateTo, to: dateTo };
    if (dateFrom && dateTo && dateTo < dateFrom) return { from: dateTo, to: dateFrom };
    return { from: dateFrom, to: dateTo };
  };

  const loadFilteredMovements = async (page = 1) => {
    const { from, to } = effectiveDateRange();
    setTableLoading(true);
    try {
      await loadMovementsPage(page, movementTypeFilter, from, to);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (skipAutoSearchRef.current) {
      skipAutoSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void loadFilteredMovements(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, dateFrom, dateTo]);

  const handlePageChange = (page: number) => {
    skipAutoSearchRef.current = true;
    void loadFilteredMovements(page);
  };

  const reload = async () => {
    const { from, to } = effectiveDateRange();
    setRefreshing(true);
    try {
      await loadMovementsPage(movementMeta.currentPage || 1, movementTypeFilter, from, to);
    } finally {
      setRefreshing(false);
    }
  };

  const saveEdit = async (form: { customerName: string; customerPhone: string; nominalAmount: string; note: string; party: string; paymentMethod: string; paymentStatus: string; productId: string; quantity: string }) => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiRequest(`/stock/movements/${editing.id}`, {
        body: JSON.stringify({
          customerName: editing.type === "outbound" ? form.customerName.trim() || null : null,
          customerPhone: editing.type === "outbound" ? form.customerPhone.trim() || null : null,
          nominalAmount: editing.type === "outbound" ? Number(form.nominalAmount || 0) || null : null,
          note: form.note.trim() || null,
          party: editing.type === "outbound" ? form.party.trim() || null : null,
          paymentMethod: editing.type === "outbound" ? form.paymentMethod.trim() || null : null,
          paymentStatus: editing.type === "outbound" ? form.paymentStatus || null : null,
          productId: form.productId,
          quantity: Number(form.quantity || 0),
        }),
        method: "PATCH",
        token,
      });
      setEditing(null);
      skipAutoSearchRef.current = true;
      await reload();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Riwayat stok gagal diedit.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMovement = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/stock/movements/${pendingDelete.id}`, { method: "DELETE", token });
      setPendingDelete(null);
      skipAutoSearchRef.current = true;
      await reload();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Riwayat stok gagal dihapus.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <CrudShell title={isIn ? "Riwayat Produk Masuk" : "Riwayat Produk Keluar"} button={isIn ? "Tambah Stok" : "Kurangi Stok"} onButton={onOpenModal} search={isIn ? "Cari produk, no seri..." : "Cari produk keluar..."} searchValue={query} onSearchChange={setQuery} searchDisabled={filterLoading} buttonDisabled={filterLoading} dateFrom={dateFrom} onDateFromChange={setDateFrom} dateTo={dateTo} onDateToChange={setDateTo} loading={loading}>
        <DataTable columns={isIn ? ["Tanggal", "Produk", "Jumlah", "No Seri", "Kategori", "Catatan", "Aksi"] : ["Tanggal", "Produk", "Jumlah", "No Seri", "Pembeli/Dealer", "Status Bayar", "Alamat", "Catatan", "Aksi"]} pagination={movementMeta} onPageChange={handlePageChange} loading={filterLoading}>
          {rows.length ? rows.map((item) => <MovementTableRow key={item.id} item={item} onEdit={() => setEditing(item)} onDelete={() => setPendingDelete(item)} onInvoice={item.type === "outbound" ? () => setInvoice(invoiceGroup(item, rows)) : undefined} />) : null}
          {!rows.length && !filterLoading ? <EmptyRow text="Tidak ada data ditemukan" /> : null}
        </DataTable>
      </CrudShell>
      {invoice ? <InvoiceModal items={invoice} onClose={() => setInvoice(null)} /> : null}
      {editing ? <MovementEditModal item={editing} stockItems={stockItems} saving={saving} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}
      {pendingDelete ? <ConfirmModal title="Hapus Riwayat" message={`Yakin ingin menghapus riwayat "${pendingDelete.productName}"? Stok akan dikoreksi otomatis.`} confirmText="Hapus" loading={deleting} onCancel={() => setPendingDelete(null)} onConfirm={deleteMovement} /> : null}
    </>
  );
}

function invoiceDateKey(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp.slice(0, 10) : date.toISOString().slice(0, 10);
}

function invoiceGroup(item: StockMovement, rows: StockMovement[]) {
  const key = [item.customerName ?? "", item.saleAddress ?? item.party ?? "", item.customerPhone ?? "", item.paymentStatus ?? "", item.paymentMethod ?? "", invoiceDateKey(item.timestamp)].join("|").toLowerCase();
  return rows.filter((row) => row.type === "outbound" && [row.customerName ?? "", row.saleAddress ?? row.party ?? "", row.customerPhone ?? "", row.paymentStatus ?? "", row.paymentMethod ?? "", invoiceDateKey(row.timestamp)].join("|").toLowerCase() === key);
}

function invoiceNumber(item: StockMovement) {
  const date = new Date(item.timestamp);
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const month = String(Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1).padStart(2, "0");
  return item.saleInvoice ?? `INV/TB/${year}/${month}/${item.id.slice(0, 4).toUpperCase()}`;
}

function InvoiceModal({ items, onClose }: { items: StockMovement[]; onClose: () => void }) {
  const item = items[0];
  const nominal = items.reduce((total, row) => total + Number(row.nominalAmount ?? 0), 0);
  const nominalText = nominal > 0 ? new Intl.NumberFormat("id-ID", { currency: "IDR", style: "currency" }).format(nominal) : "Rp -";
  const print = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") printInvoiceHtml(items);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxWidth: 920 }]}> 
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
            <View style={{ backgroundColor: colors.white, gap: 18, padding: 28 }}>
              <View style={{ alignItems: "center", borderBottomColor: colors.primary, borderBottomWidth: 2, flexDirection: "row", gap: 22, paddingBottom: 16 }}>
                <Image source={logoUri} style={{ height: 88, width: 230 }} resizeMode="contain" />
                <View style={{ borderLeftColor: "#222", borderLeftWidth: 1, flex: 1, paddingLeft: 18 }}>
                  <Text style={{ color: colors.black, fontFamily: fonts.bodyMedium, fontSize: 22 }}>TUNEBOSS INDONESIA</Text>
                  <Text style={{ color: colors.black, fontFamily: fonts.body, fontSize: 13 }}>Jl. Ringroad Selatan No.72, Banguntapan</Text>
                  <Text style={{ color: colors.black, fontFamily: fonts.body, fontSize: 13 }}>Bantul, Daerah Istimewa Yogyakarta 55198</Text>
                  <Text style={{ color: colors.black, fontFamily: fonts.body, fontSize: 13 }}>0817-5792-805</Text>
                </View>
                <Text style={{ borderBottomColor: colors.primary, borderBottomWidth: 2, color: colors.black, fontFamily: fonts.display, fontSize: 50, letterSpacing: 4 }}>INVOICE</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 28 }}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 14 }}>DITERBITKAN KEPADA</Text>
                  <InvoiceLine label="Nama Dealer / Customer" value={item.customerName ?? "-"} />
                  <InvoiceLine label="Alamat" value={item.saleAddress ?? item.party ?? "-"} />
                  <InvoiceLine label="No. Telp / WhatsApp" value={item.customerPhone ?? "-"} />
                </View>
                <View style={{ flex: 0.9, gap: 0 }}>
                  <InvoiceInfo label="NOMOR INVOICE" value={invoiceNumber(item)} />
                  <InvoiceInfo label="TANGGAL" value={formatDate(item.timestamp)} />
                  <InvoiceInfo label="STATUS" value="Dealer" />
                  <InvoiceInfo label="METODE PEMBAYARAN" value={item.paymentMethod ?? "-"} />
                </View>
              </View>
              <View style={{ borderColor: "#222", borderWidth: 1 }}>
                <View style={{ backgroundColor: colors.primary, flexDirection: "row" }}>
                  {["NO", "DESKRIPSI BARANG", "NO SERI", "NOMINAL", "STATUS"].map((header, index) => <Text key={header} style={{ borderRightColor: "#222", borderRightWidth: index === 4 ? 0 : 1, color: colors.white, flex: index === 0 ? 0.35 : index === 2 ? 1.6 : 1, fontFamily: fonts.bodyMedium, padding: 10, textAlign: "center" }}>{header}</Text>)}
                </View>
                {items.map((row, rowIndex) => {
                  const serials = row.serialNumbers?.join(", ") || row.sku;
                  const rowNominal = Number(row.nominalAmount ?? 0);
                  const rowNominalText = rowNominal > 0 ? new Intl.NumberFormat("id-ID", { currency: "IDR", style: "currency" }).format(rowNominal) : "Rp -";
                  return <View key={row.id} style={{ borderTopColor: "#222", borderTopWidth: rowIndex ? 1 : 0, flexDirection: "row", minHeight: 48 }}>{[String(rowIndex + 1), row.productName, serials, rowNominalText, row.paymentStatus ?? "-"].map((cell, index) => <Text key={index} style={{ borderRightColor: "#222", borderRightWidth: index === 4 ? 0 : 1, color: colors.black, flex: index === 0 ? 0.35 : index === 2 ? 1.6 : 1, fontFamily: fonts.bodyMedium, padding: 10, textAlign: "center" }}>{cell}</Text>)}</View>;
                })}
                {Array.from({ length: Math.max(0, 7 - items.length) }).map((_, index) => <View key={index} style={{ borderTopColor: "#222", borderTopWidth: 1, height: 42 }} />)}
                <View style={{ borderTopColor: "#222", borderTopWidth: 1, flexDirection: "row" }}><Text style={{ color: colors.black, flex: 1.35, fontFamily: fonts.bodyMedium, padding: 10 }}>TOTAL</Text><Text style={{ borderLeftColor: "#222", borderLeftWidth: 1, color: colors.black, flex: 1.6, fontFamily: fonts.bodyMedium, padding: 10 }}>{items.reduce((total, row) => total + row.quantity, 0)} Unit</Text><Text style={{ borderLeftColor: "#222", borderLeftWidth: 1, color: colors.black, flex: 2, fontFamily: fonts.bodyMedium, padding: 10, textAlign: "center" }}>{nominalText}</Text></View>
              </View>
              <View style={{ alignItems: "flex-end", marginTop: 48, paddingRight: 70 }}>
                <Text style={{ color: colors.black, fontFamily: fonts.body, marginBottom: 70 }}>Hormat Kami,</Text>
                <View style={{ backgroundColor: colors.black, height: 2, width: 170 }} />
                <Text style={{ color: colors.black, fontFamily: fonts.bodyMedium, marginTop: 8 }}>Tuneboss Indonesia</Text>
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Tutup</Text></Pressable>
            <Pressable onPress={print} style={styles.saveButton}><Text style={styles.saveText}>Print / Save PDF</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InvoiceLine({ label, value }: { label: string; value: string }) {
  return <View style={{ flexDirection: "row", gap: 8 }}><Text style={{ color: colors.black, flex: 0.65, fontFamily: fonts.bodyMedium, fontSize: 13 }}>{label}</Text><Text style={{ color: colors.black, fontFamily: fonts.bodyMedium, fontSize: 13 }}>:</Text><Text style={{ borderBottomColor: "#222", borderBottomWidth: 1, color: colors.black, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13 }}>{value}</Text></View>;
}

function InvoiceInfo({ label, value }: { label: string; value: string }) {
  return <View style={{ flexDirection: "row" }}><Text style={{ backgroundColor: colors.black, color: colors.white, flex: 0.9, fontFamily: fonts.bodyMedium, fontSize: 12, padding: 10 }}>{label}</Text><Text style={{ borderBottomColor: colors.primary, borderBottomWidth: 1, color: colors.black, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, padding: 10 }}>: {value}</Text></View>;
}

function printInvoiceHtml(items: StockMovement[]) {
  const item = items[0];
  const totalQty = items.reduce((total, row) => total + row.quantity, 0);
  const totalNominal = items.reduce((total, row) => total + Number(row.nominalAmount ?? 0), 0);
  const money = (value: number) => value > 0 ? new Intl.NumberFormat("id-ID", { currency: "IDR", style: "currency" }).format(value) : "Rp -";
  const logo = typeof logoUri === "string" ? logoUri : typeof logoUri === "object" && logoUri && "uri" in logoUri ? String(logoUri.uri) : "";
  const rows = items.map((row, index) => {
    const serials = row.serialNumbers?.join(", ") || row.sku;
    return `<tr><td>${index + 1}</td><td>${escapeHtml(row.productName)}</td><td>${escapeHtml(serials)}</td><td>${escapeHtml(money(Number(row.nominalAmount ?? 0)))}</td><td>${escapeHtml(row.paymentStatus ?? "-")}</td></tr>`;
  }).join("") + Array.from({ length: Math.max(0, 7 - items.length) }).map(() => "<tr class=blank><td></td><td></td><td></td><td></td><td></td></tr>").join("");
  const popup = window.open("", "_blank", "width=900,height=1200");
  if (!popup) return;

  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(invoiceNumber(item))}</title><style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f3f3; color: #111; font-family: Arial, sans-serif; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 18mm; }
    .head { align-items: center; border-bottom: 3px solid #ed6c05; display: flex; gap: 18px; padding-bottom: 14px; }
    .logo { height: 86px; object-fit: contain; width: 230px; }
    .company { border-left: 1px solid #111; flex: 1; padding-left: 16px; }
    .company h1 { font-size: 22px; letter-spacing: .5px; margin: 0 0 5px; }
    .company p { font-size: 12px; line-height: 1.35; margin: 0; }
    .title { border-bottom: 3px solid #ed6c05; font-size: 46px; font-weight: 800; letter-spacing: 5px; margin: 0; }
    .meta { display: grid; grid-template-columns: 1.05fr .95fr; gap: 24px; margin: 24px 0; }
    .section-title { color: #ed6c05; font-size: 13px; font-weight: 800; letter-spacing: .7px; margin: 0 0 10px; }
    .line { display: grid; grid-template-columns: 155px 10px 1fr; gap: 8px; font-size: 12px; margin: 7px 0; }
    .line span:last-child { border-bottom: 1px solid #111; min-height: 18px; }
    .info { display: grid; grid-template-columns: 150px 1fr; font-size: 11px; }
    .info b { background: #111; color: #fff; padding: 9px; }
    .info span { border-bottom: 1px solid #ed6c05; padding: 9px; }
    table { border-collapse: collapse; font-size: 12px; width: 100%; }
    th { background: #ed6c05; color: #fff; font-weight: 800; }
    th, td { border: 1px solid #111; padding: 10px; text-align: center; vertical-align: middle; }
    th:nth-child(1), td:nth-child(1) { width: 42px; }
    th:nth-child(3), td:nth-child(3) { width: 185px; }
    tr.blank td { height: 39px; }
    .total { display: grid; grid-template-columns: 1fr 185px 240px; border: 1px solid #111; border-top: 0; font-size: 12px; font-weight: 800; }
    .total div { padding: 10px; }
    .total div + div { border-left: 1px solid #111; text-align: center; }
    .sign { margin-top: 48px; margin-left: auto; text-align: center; width: 210px; }
    .sign p:first-child { margin-bottom: 70px; }
    .sign .line-sign { border-top: 2px solid #111; padding-top: 8px; }
    @media print { body { background: #fff; } .page { margin: 0; padding: 0; width: auto; min-height: auto; } }
  </style></head><body><main class=page>
    <header class=head>${logo ? `<img class=logo src="${escapeHtml(logo)}" />` : ""}<section class=company><h1>TUNEBOSS INDONESIA</h1><p>Jl. Ringroad Selatan No.72, Banguntapan</p><p>Bantul, Daerah Istimewa Yogyakarta 55198</p><p>0817-5792-805</p></section><h2 class=title>INVOICE</h2></header>
    <section class=meta><div><p class=section-title>DITERBITKAN KEPADA</p><div class=line><b>Nama Dealer / Customer</b><span>:</span><span>${escapeHtml(item.customerName ?? "-")}</span></div><div class=line><b>Alamat</b><span>:</span><span>${escapeHtml(item.saleAddress ?? item.party ?? "-")}</span></div><div class=line><b>No. Telp / WhatsApp</b><span>:</span><span>${escapeHtml(item.customerPhone ?? "-")}</span></div></div><div><div class=info><b>NOMOR INVOICE</b><span>: ${escapeHtml(invoiceNumber(item))}</span></div><div class=info><b>TANGGAL</b><span>: ${escapeHtml(formatDate(item.timestamp))}</span></div><div class=info><b>STATUS</b><span>: Dealer</span></div><div class=info><b>METODE PEMBAYARAN</b><span>: ${escapeHtml(item.paymentMethod ?? "-")}</span></div></div></section>
    <table><thead><tr><th>NO</th><th>DESKRIPSI BARANG</th><th>NO SERI</th><th>NOMINAL</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table>
    <section class=total><div>TOTAL</div><div>${totalQty} Unit</div><div>${escapeHtml(money(totalNominal))}</div></section>
    <section class=sign><p>Hormat Kami,</p><p class=line-sign>Tuneboss Indonesia</p></section>
  </main><script>window.onload = () => { window.focus(); window.print(); };</script></body></html>`);
  popup.document.close();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] ?? char));
}

function MovementEditModal({ item, onClose, onSave, saving, stockItems }: { item: StockMovement; onClose: () => void; onSave: (form: { customerName: string; customerPhone: string; nominalAmount: string; note: string; party: string; paymentMethod: string; paymentStatus: string; productId: string; quantity: string }) => Promise<void>; saving: boolean; stockItems: StockItem[] }) {
  const [productId, setProductId] = useState(item.productId);
  const [productOpen, setProductOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [party, setParty] = useState(item.party ?? "");
  const [customerName, setCustomerName] = useState(item.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(item.customerPhone ?? "");
  const [paymentStatus, setPaymentStatus] = useState(item.paymentStatus ?? "Unpaid");
  const [paymentMethod, setPaymentMethod] = useState(item.paymentMethod ?? "");
  const [nominalAmount, setNominalAmount] = useState(item.nominalAmount ? String(Number(item.nominalAmount)) : "");
  const [paymentStatusOpen, setPaymentStatusOpen] = useState(false);
  const [note, setNote] = useState(item.note ?? "");
  const selectedProduct = stockItems.find((product) => product.id === productId);
  const fallbackCurrentStock = productId === item.productId ? item.afterQuantity ?? 0 : 0;
  const currentStock = selectedProduct?.stock ?? fallbackCurrentStock;
  const quantityNumber = Number(quantity || 0);
  const availableStock = currentStock + (item.type === "outbound" && productId === item.productId ? item.quantity : 0);
  const stockExceeded = item.type === "outbound" && quantityNumber > availableStock;
  const quantityError = stockExceeded ? `Stok tersisa ${availableStock}, jumlah tidak boleh melebihi stok.` : "";
  const hasChanges = productId !== item.productId || quantity !== String(item.quantity) || party !== (item.party ?? "") || customerName !== (item.customerName ?? "") || customerPhone !== (item.customerPhone ?? "") || paymentStatus !== (item.paymentStatus ?? "Unpaid") || paymentMethod !== (item.paymentMethod ?? "") || nominalAmount !== (item.nominalAmount ? String(Number(item.nominalAmount)) : "") || note !== (item.note ?? "");
  const disabled = saving || !hasChanges || !productId || !quantity.trim() || quantityNumber < 1 || stockExceeded;
  const productOptions = item.type === "outbound" ? stockItems.filter((product) => product.stock > 0 || product.id === item.productId) : stockItems;
  const hasCurrentProductOption = productOptions.some((product) => product.id === item.productId);
  const visibleProductOptions = hasCurrentProductOption ? productOptions : [{
    id: item.productId,
    barcode: "",
    category: "-",
    lastUpdated: item.timestamp,
    location: "-",
    minStock: 0,
    name: item.productName,
    sku: item.sku,
    status: fallbackCurrentStock <= 0 ? "empty" : "safe",
    stock: fallbackCurrentStock,
  }, ...productOptions] satisfies StockItem[];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.modalTitle}>Edit Riwayat</Text>
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>Produk</Text>
              <Pressable onPress={() => setProductOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}>
                <Text style={styles.modalSelectText}>{selectedProduct?.name || item.productName || "Pilih produk"}</Text>
                <ChevronDown color={colors.muted} size={18} />
              </Pressable>
              {productOpen ? (
                <ScrollView nestedScrollEnabled style={[styles.modalSelectOptions, styles.modalSelectOptionsScroll]} showsVerticalScrollIndicator={false}>
                  {visibleProductOptions.map((product) => (
                    <Pressable key={product.id} onPress={() => { setProductId(product.id); setProductOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, productId === product.id && styles.modalSelectOptionActive, hovered && productId !== product.id && styles.modalSelectOptionHover, pressed && styles.pressed]}>
                      <Text style={[styles.modalSelectOptionText, productId === product.id && styles.modalSelectOptionTextActive]}>{product.name} ({product.sku}){item.type === "outbound" ? ` - Stok: ${product.stock}` : ""}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
            {item.type === "inbound" ? <TextInput editable={false} style={styles.modalInput} placeholder="Kategori" placeholderTextColor={colors.muted} value={selectedProduct?.category ?? item.productCategory ?? ""} /> : null}
            <TextInput style={styles.modalInput} placeholder="Jumlah" placeholderTextColor={colors.muted} value={quantity} onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
            {quantityError ? <Text style={styles.errorText}>{quantityError}</Text> : null}
            {item.type === "outbound" ? <TextInput onChangeText={setCustomerName} style={styles.modalInput} placeholder="Nama pembeli/dealer" placeholderTextColor={colors.muted} value={customerName} /> : null}
            {item.type === "outbound" ? <TextInput onChangeText={setCustomerPhone} style={styles.modalInput} placeholder="No. Telp / WhatsApp" placeholderTextColor={colors.muted} value={customerPhone} /> : null}
            {item.type === "outbound" ? (
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>Status pembayaran</Text>
                <Pressable onPress={() => setPaymentStatusOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{paymentStatus}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                {paymentStatusOpen ? <View style={styles.modalSelectOptions}>{paymentStatuses.map((status) => <Pressable key={status} onPress={() => { setPaymentStatus(status); setPaymentStatusOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, paymentStatus === status && styles.modalSelectOptionActive, hovered && paymentStatus !== status && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, paymentStatus === status && styles.modalSelectOptionTextActive]}>{status}</Text></Pressable>)}</View> : null}
              </View>
            ) : null}
            {item.type === "outbound" ? <TextInput onChangeText={setParty} style={styles.modalInput} placeholder="Alamat" placeholderTextColor={colors.muted} value={party} /> : null}
            {item.type === "outbound" ? <TextInput onChangeText={setPaymentMethod} style={styles.modalInput} placeholder="Metode Pembayaran" placeholderTextColor={colors.muted} value={paymentMethod} /> : null}
            {item.type === "outbound" ? <TextInput onChangeText={(value) => setNominalAmount(value.replace(/\D/g, ""))} style={styles.modalInput} placeholder="Nominal" placeholderTextColor={colors.muted} value={nominalAmount} keyboardType="number-pad" inputMode="numeric" /> : null}
            <TextInput onChangeText={setNote} style={styles.modalInput} placeholder="Catatan (Opsional)" placeholderTextColor={colors.muted} value={note} />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={disabled} onPress={() => onSave({ customerName, customerPhone, nominalAmount, note, party, paymentMethod, paymentStatus, productId, quantity })} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !disabled && styles.saveButtonHover, pressed && styles.pressed, disabled && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({ title, message, confirmText, onCancel, onConfirm, loading }: { title: string; message: string; confirmText: string; onCancel: () => void; onConfirm: () => void; loading?: boolean }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{title}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 }}>{message}</Text><View style={styles.modalActions}><Pressable disabled={loading} onPress={onCancel} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && !loading && styles.cancelButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled]}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable disabled={loading} onPress={onConfirm} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled, { backgroundColor: "#b91c1c" }]}><Text style={styles.saveText}>{loading ? "Menghapus..." : confirmText}</Text></Pressable></View></View></View></Modal>;
}

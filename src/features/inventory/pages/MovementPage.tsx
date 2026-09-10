import { useEffect, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { apiRequest, formatDate } from "../api";
import { invoiceLogoUri, logoUri } from "../data";
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
  const [operationError, setOperationError] = useState("");
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
      setOperationError(error instanceof Error ? error.message : "Riwayat stok gagal diedit.");
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
      setPendingDelete(null);
      setOperationError(error instanceof Error ? error.message : "Riwayat stok gagal dihapus.");
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
      {operationError ? <ConfirmModal title="Gagal" message={operationError} confirmText="OK" hideCancel onCancel={() => setOperationError("")} onConfirm={() => setOperationError("")} /> : null}
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

const invoiceFont = Platform.OS === "web" ? "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : "System";

export function generateInvoicePrintHtml(items: StockMovement[], item: StockMovement, logoSrc: string): string {
  const nominal = items.reduce((total, row) => total + Number(row.nominalAmount ?? 0), 0);
  const nominalText = nominal > 0 ? new Intl.NumberFormat("id-ID", { currency: "IDR", style: "currency" }).format(nominal) : "Rp -";
  const totalUnits = items.reduce((total, row) => total + row.quantity, 0);
  const invNum = invoiceNumber(item);
  const dateStr = formatDate(item.timestamp);

  const rowsHtml = items.map((row, index) => {
    const serials = row.serialNumbers?.join(", ") || row.sku || "-";
    const rowNom = Number(row.nominalAmount ?? 0);
    const rowNomText = rowNom > 0 ? new Intl.NumberFormat("id-ID", { currency: "IDR", style: "currency" }).format(rowNom) : "Rp -";
    return `
      <tr style="height: 38px;">
        <td style="text-align: center; border-top: 1px solid #222; border-right: 1px solid #222; padding: 6px 8px;">${index + 1}</td>
        <td style="text-align: center; border-top: 1px solid #222; border-right: 1px solid #222; padding: 6px 8px;">${row.productName || "-"}</td>
        <td style="text-align: center; border-top: 1px solid #222; border-right: 1px solid #222; padding: 6px 8px;">${serials}</td>
        <td style="text-align: center; border-top: 1px solid #222; border-right: 1px solid #222; padding: 6px 8px;">${rowNomText}</td>
        <td style="text-align: center; border-top: 1px solid #222; padding: 6px 8px;">${row.paymentStatus ?? "-"}</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Invoice - ${invNum}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    @media print {
      html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .invoice-sheet {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 auto !important;
      }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #070707 !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.35;
    }
    .invoice-sheet {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      background: #ffffff;
      padding: 4px 6px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #ed6c05;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .logo-img {
      height: 78px;
      width: auto;
      max-width: 230px;
      object-fit: contain;
      display: block;
    }
    .store-info {
      border-left: 1px solid #222;
      padding-left: 16px;
    }
    .store-title {
      font-size: 20px;
      font-weight: 800;
      color: #070707;
      margin: 0 0 2px 0;
      letter-spacing: 0.5px;
    }
    .store-line {
      font-size: 11.5px;
      color: #333;
      margin: 1px 0;
    }
    .invoice-title {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 4px;
      color: #070707;
      text-align: right;
      border-bottom: 3px solid #ed6c05;
      display: inline-block;
      padding-bottom: 2px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .meta-table td {
      vertical-align: top;
    }
    .section-label {
      color: #ed6c05;
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 6px;
    }
    .info-row {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .info-row td {
      padding: 2px 0;
      font-size: 11.5px;
    }
    .info-label {
      width: 155px;
      font-weight: 500;
      color: #222;
    }
    .info-colon {
      width: 12px;
      font-weight: 600;
    }
    .info-val {
      border-bottom: 1px solid #222;
      font-weight: 600;
      color: #070707;
    }
    .right-box {
      width: 100%;
      border-collapse: collapse;
    }
    .right-box td {
      padding: 6px 10px;
      font-size: 11px;
    }
    .box-label {
      background-color: #070707 !important;
      color: #ffffff !important;
      font-weight: 700;
      width: 160px;
      letter-spacing: 0.5px;
    }
    .box-val {
      border-bottom: 1px solid #ed6c05;
      font-weight: 600;
      color: #070707;
      padding-left: 8px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #222;
      margin-bottom: 14px;
    }
    .items-header th {
      background-color: #ed6c05 !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 11px;
      padding: 8px;
      text-align: center;
      border-right: 1px solid #222;
    }
    .items-header th:last-child {
      border-right: none;
    }
    .total-row td {
      border-top: 1px solid #222;
      padding: 8px 10px;
      font-weight: 700;
      font-size: 11.5px;
    }
    .sign-area {
      text-align: right;
      margin-top: 24px;
      padding-right: 48px;
    }
    .sign-line {
      width: 160px;
      height: 2px;
      background-color: #070707 !important;
      display: inline-block;
      margin-top: 54px;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  <div class="invoice-sheet">
    <table class="header-table">
      <tr>
        <td style="width: 230px;">
          ${logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="TuneBoss Logo" />` : `<div style="font-size: 22px; font-weight: 900; color: #ed6c05;">TUNEBOSS</div>`}
        </td>
        <td class="store-info">
          <div class="store-title">TUNEBOSS INDONESIA</div>
          <div class="store-line">Jl. Ringroad Selatan No.72, Banguntapan</div>
          <div class="store-line">Bantul, Daerah Istimewa Yogyakarta 55198</div>
          <div class="store-line">0817-5792-805</div>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <div class="invoice-title">INVOICE</div>
        </td>
      </tr>
    </table>

    <table class="meta-table">
      <tr>
        <td style="width: 52%; padding-right: 20px;">
          <div class="section-label">DITERBITKAN KEPADA</div>
          <table class="info-row">
            <tr>
              <td class="info-label">Nama Dealer / Customer</td>
              <td class="info-colon">:</td>
              <td class="info-val">${item.customerName || "-"}</td>
            </tr>
            <tr>
              <td class="info-label">Alamat</td>
              <td class="info-colon">:</td>
              <td class="info-val">${item.saleAddress || item.party || "-"}</td>
            </tr>
            <tr>
              <td class="info-label">No. Telp / WhatsApp</td>
              <td class="info-colon">:</td>
              <td class="info-val">${item.customerPhone || "-"}</td>
            </tr>
          </table>
        </td>
        <td style="width: 48%;">
          <table class="right-box">
            <tr>
              <td class="box-label">NOMOR INVOICE</td>
              <td class="box-val">: ${invNum}</td>
            </tr>
            <tr>
              <td class="box-label">TANGGAL</td>
              <td class="box-val">: ${dateStr}</td>
            </tr>
            <tr>
              <td class="box-label">STATUS</td>
              <td class="box-val">: Dealer</td>
            </tr>
            <tr>
              <td class="box-label">METODE PEMBAYARAN</td>
              <td class="box-val">: ${item.paymentMethod || "-"}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr class="items-header">
          <th style="width: 6%;">NO</th>
          <th style="width: 32%;">DESKRIPSI BARANG</th>
          <th style="width: 28%;">NO SERI</th>
          <th style="width: 20%;">NOMINAL</th>
          <th style="width: 14%;">STATUS</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="total-row">
          <td colspan="2" style="border-right: 1px solid #222;">TOTAL</td>
          <td style="text-align: center; border-right: 1px solid #222;">${totalUnits} Unit</td>
          <td colspan="2" style="text-align: center;">${nominalText}</td>
        </tr>
      </tbody>
    </table>

    <div class="sign-area">
      <div style="font-size: 11.5px; color: #222;">Hormat Kami,</div>
      <div class="sign-line"></div>
      <div style="font-size: 12px; font-weight: 700; color: #070707;">Tuneboss Indonesia</div>
    </div>
  </div>
</body>
</html>`;
}

function InvoiceModal({ items, onClose }: { items: StockMovement[]; onClose: () => void }) {
  const item = items[0];
  const nominal = items.reduce((total, row) => total + Number(row.nominalAmount ?? 0), 0);
  const nominalText = nominal > 0 ? new Intl.NumberFormat("id-ID", { currency: "IDR", style: "currency" }).format(nominal) : "Rp -";

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const fontId = "tuneboss-inter-font";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const print = () => {
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") return;

    const existingImg = document.querySelector("#tuneboss-printable-invoice img") as HTMLImageElement | null;
    let logoSrc = existingImg?.src || "";
    if (!logoSrc) {
      try {
        const rawLogo = typeof invoiceLogoUri === "string" ? invoiceLogoUri : (invoiceLogoUri as { uri?: string; default?: string })?.uri || (invoiceLogoUri as { uri?: string; default?: string })?.default || "";
        logoSrc = rawLogo ? new URL(rawLogo, window.location.href).href : "";
      } catch {
        logoSrc = "";
      }
    }

    const html = generateInvoicePrintHtml(items, item, logoSrc);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }
    };

    const img = iframe.contentWindow?.document.querySelector("img");
    if (img) {
      if (img.complete) {
        setTimeout(triggerPrint, 120);
      } else {
        img.onload = () => setTimeout(triggerPrint, 120);
        img.onerror = () => setTimeout(triggerPrint, 120);
      }
    } else {
      setTimeout(triggerPrint, 120);
    }
  };

  const invoiceColumns = [
    { flex: 0.45, key: "no", label: "NO" },
    { flex: 1.8, key: "desc", label: "DESKRIPSI BARANG" },
    { flex: 1.7, key: "serial", label: "NO SERI" },
    { flex: 1.4, key: "nominal", label: "NOMINAL" },
    { flex: 1.15, key: "status", label: "STATUS" },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxWidth: 920 }]}> 
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
            <View nativeID="tuneboss-printable-invoice" style={{ backgroundColor: colors.white, gap: 18, padding: 28 }}>
              <View style={{ alignItems: "center", borderBottomColor: colors.primary, borderBottomWidth: 2, flexDirection: "row", gap: 20, paddingBottom: 16 }}>
                <Image source={invoiceLogoUri} style={{ height: 78, width: 190 }} resizeMode="contain" />
                <View style={{ borderLeftColor: "#222", borderLeftWidth: 1, flex: 1, paddingLeft: 18 }}>
                  <Text style={{ color: colors.black, fontFamily: invoiceFont, fontSize: 22, fontWeight: "800", letterSpacing: 0.5 }}>TUNEBOSS INDONESIA</Text>
                  <Text style={{ color: colors.black, fontFamily: invoiceFont, fontSize: 13, fontWeight: "400" }}>Jl. Ringroad Selatan No.72, Banguntapan</Text>
                  <Text style={{ color: colors.black, fontFamily: invoiceFont, fontSize: 13, fontWeight: "400" }}>Bantul, Daerah Istimewa Yogyakarta 55198</Text>
                  <Text style={{ color: colors.black, fontFamily: invoiceFont, fontSize: 13, fontWeight: "500" }}>0817-5792-805</Text>
                </View>
                <Text style={{ borderBottomColor: colors.primary, borderBottomWidth: 3, color: colors.black, fontFamily: invoiceFont, fontSize: 44, fontWeight: "900", letterSpacing: 4 }}>INVOICE</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 28 }}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={{ color: colors.primary, fontFamily: invoiceFont, fontSize: 14, fontWeight: "700" }}>DITERBITKAN KEPADA</Text>
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
                  {invoiceColumns.map((col, index) => (
                    <Text key={col.key} style={{ borderRightColor: "#222", borderRightWidth: index === invoiceColumns.length - 1 ? 0 : 1, color: colors.white, flex: col.flex, fontFamily: invoiceFont, fontSize: 12, fontWeight: "700", padding: 10, textAlign: "center" }}>{col.label}</Text>
                  ))}
                </View>
                {items.map((row, rowIndex) => {
                  const serials = row.serialNumbers?.join(", ") || row.sku;
                  const rowNominal = Number(row.nominalAmount ?? 0);
                  const rowNominalText = rowNominal > 0 ? new Intl.NumberFormat("id-ID", { currency: "IDR", style: "currency" }).format(rowNominal) : "Rp -";
                  return (
                    <View key={row.id} style={{ borderTopColor: "#222", borderTopWidth: rowIndex ? 1 : 0, flexDirection: "row", minHeight: 48 }}>
                      {[String(rowIndex + 1), row.productName, serials, rowNominalText, row.paymentStatus ?? "-"].map((cell, index) => (
                        <Text key={index} style={{ borderRightColor: "#222", borderRightWidth: index === 4 ? 0 : 1, color: colors.black, flex: invoiceColumns[index].flex, fontFamily: invoiceFont, fontSize: 12, fontWeight: "500", paddingHorizontal: 6, paddingVertical: 10, textAlign: "center" }}>{cell}</Text>
                      ))}
                    </View>
                  );
                })}
                <View style={{ borderTopColor: "#222", borderTopWidth: 1, flexDirection: "row" }}>
                  <Text style={{ color: colors.black, flex: 2.25, fontFamily: invoiceFont, fontSize: 12, fontWeight: "700", padding: 10 }}>TOTAL</Text>
                  <Text style={{ borderLeftColor: "#222", borderLeftWidth: 1, color: colors.black, flex: 1.7, fontFamily: invoiceFont, fontSize: 12, fontWeight: "600", padding: 10 }}>{items.reduce((total, row) => total + row.quantity, 0)} Unit</Text>
                  <Text style={{ borderLeftColor: "#222", borderLeftWidth: 1, color: colors.black, flex: 2.55, fontFamily: invoiceFont, fontSize: 12, fontWeight: "700", padding: 10, textAlign: "center" }}>{nominalText}</Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end", marginTop: 48, paddingRight: 70 }}>
                <Text style={{ color: colors.black, fontFamily: invoiceFont, fontSize: 13, marginBottom: 70 }}>Hormat Kami,</Text>
                <View style={{ backgroundColor: colors.black, height: 2, width: 170 }} />
                <Text style={{ color: colors.black, fontFamily: invoiceFont, fontSize: 13, fontWeight: "700", marginTop: 8 }}>Tuneboss Indonesia</Text>
              </View>
            </View>
          </ScrollView>
          <View nativeID="tuneboss-no-print" style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Tutup</Text></Pressable>
            <Pressable onPress={print} style={styles.saveButton}><Text style={styles.saveText}>Print</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InvoiceLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ color: colors.black, flex: 0.65, fontFamily: invoiceFont, fontSize: 13, fontWeight: "500" }}>{label}</Text>
      <Text style={{ color: colors.black, fontFamily: invoiceFont, fontSize: 13, fontWeight: "600" }}>:</Text>
      <Text style={{ borderBottomColor: "#222", borderBottomWidth: 1, color: colors.black, flex: 1, fontFamily: invoiceFont, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

function InvoiceInfo({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row" }}>
      <Text style={{ backgroundColor: colors.black, color: colors.white, flex: 0.95, fontFamily: invoiceFont, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, padding: 9 }}>{label}</Text>
      <Text style={{ borderBottomColor: colors.primary, borderBottomWidth: 1, color: colors.black, flex: 1.05, fontFamily: invoiceFont, fontSize: 12, fontWeight: "600", padding: 9 }}>: {value}</Text>
    </View>
  );
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

function ConfirmModal({ title, message, confirmText, onCancel, onConfirm, hideCancel, loading }: { title: string; message: string; confirmText: string; onCancel: () => void; onConfirm: () => void; hideCancel?: boolean; loading?: boolean }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{title}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 }}>{message}</Text><View style={styles.modalActions}>{!hideCancel ? <Pressable disabled={loading} onPress={onCancel} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && !loading && styles.cancelButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled]}><Text style={styles.cancelText}>Batal</Text></Pressable> : null}<Pressable disabled={loading} onPress={onConfirm} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled, !hideCancel && { backgroundColor: "#b91c1c" }]}><Text style={styles.saveText}>{loading ? "Menghapus..." : confirmText}</Text></Pressable></View></View></View></Modal>;
}

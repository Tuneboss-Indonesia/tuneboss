import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { apiRequest, formatDate } from "../api";
import { CrudShell, DataTable, EmptyRow, RowActions, TableRow } from "../components/common";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import type { PressState } from "../types";
import type { StockMovement } from "../../../types/dashboard";

type DealerRow = { address: string; id: string; lastTransaction?: string; name: string; phone: string; source: "master" | "history" };

export function DealerPage() {
  const { token } = useInventoryData();
  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<DealerRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DealerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadDealers = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const master = await apiRequest<Array<{ address?: string | null; id: string; name: string; phone?: string | null }>>("/dealers", { token });
      
      // Ambil riwayat produk keluar untuk mengecek tanggal transaksi terakhir
      let historyData: StockMovement[] = [];
      try {
        const history = await apiRequest<{ data: StockMovement[] }>("/stock/movements?type=outbound&page=1&per_page=100", { token });
        historyData = history.data || [];
      } catch {
        historyData = [];
      }

      // Buat peta tanggal transaksi terakhir per nama dealer/customer
      const lastTxMap = new Map<string, string>();
      historyData.forEach((item) => {
        const cName = item.customerName?.trim().toLowerCase();
        if (cName && (!lastTxMap.has(cName) || new Date(item.timestamp) > new Date(lastTxMap.get(cName)!))) {
          lastTxMap.set(cName, item.timestamp);
        }
      });

      if (master.length) {
        setDealers(master.map((dealer) => {
          const dName = dealer.name.trim().toLowerCase();
          const lastTx = lastTxMap.get(dName);
          return {
            address: dealer.address ?? "-",
            id: dealer.id,
            lastTransaction: lastTx,
            name: dealer.name,
            phone: dealer.phone ?? "-",
            source: "master",
          };
        }));
        return;
      }

      const unique = new Map<string, DealerRow>();
      historyData.forEach((item) => {
        const name = item.customerName?.trim();
        if (!name) return;
        const address = item.saleAddress ?? item.party ?? "-";
        const phone = item.customerPhone ?? "-";
        const key = `${name.toLowerCase()}|${address.toLowerCase()}|${phone.toLowerCase()}`;
        if (!unique.has(key)) {
          unique.set(key, { address, id: key, lastTransaction: item.timestamp, name, phone, source: "history" });
        } else if (new Date(item.timestamp) > new Date(unique.get(key)!.lastTransaction!)) {
          unique.get(key)!.lastTransaction = item.timestamp;
        }
      });
      setDealers([...unique.values()]);
    } catch (error) {
      setLoadError(`Daftar dealer gagal dimuat. ${error instanceof Error ? error.message : "Silakan coba lagi."}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDealers(); }, [token]);

  const rows = dealers.filter((dealer) => `${dealer.name} ${dealer.address} ${dealer.phone}`.toLowerCase().includes(query.toLowerCase()));

  const deleteDealer = (dealer: DealerRow) => {
    setDeleteError("");
    setPendingDelete(dealer);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiRequest(`/dealers/${pendingDelete.id}`, { method: "DELETE", token });
      setDealers((current) => current.filter((dealer) => dealer.id !== pendingDelete.id));
      setPendingDelete(null);
      await loadDealers();
    } catch (error) {
      setDeleteError(`Dealer gagal dihapus. ${error instanceof Error ? error.message : "Silakan coba lagi."}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <CrudShell title="Dealer" subtitle="Data dealer yang sudah bekerja sama" button="Tambah Dealer" onButton={() => { setEditing(null); setModalOpen(true); }} search="Cari dealer..." searchValue={query} onSearchChange={setQuery} loading={loading}>
        {loadError ? <View><Text accessibilityRole="alert" style={styles.errorText}>{loadError}</Text><Pressable onPress={() => void loadDealers()}><Text style={styles.saveText}>Coba lagi</Text></Pressable></View> : null}
        <DataTable columns={["Nama", "Alamat", "No. Telp", "Transaksi Terakhir", "Aksi"]} loading={loading}>
          {rows.map((dealer) => <TableRow key={dealer.id} cells={[dealer.name, dealer.address, dealer.phone, dealer.lastTransaction ? formatDate(dealer.lastTransaction) : "-"]} actions={dealer.source === "master" ? <RowActions onEdit={() => { setEditing(dealer); setModalOpen(true); }} onDelete={() => deleteDealer(dealer)} /> : null} />)}
          {!rows.length && !loading && !loadError ? <EmptyRow text="Belum ada dealer" /> : null}
        </DataTable>
      </CrudShell>
      {pendingDelete ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => { if (!deleting) setPendingDelete(null); }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalBodyContent}>
                <Text style={styles.modalTitle}>Hapus Dealer</Text>
                <Text style={styles.modalLabel}>Yakin ingin menghapus {pendingDelete.name}? Tindakan ini tidak bisa dibatalkan.</Text>
                {deleteError ? <Text accessibilityRole="alert" style={styles.errorText}>{deleteError}</Text> : null}
              </View>
              <View style={styles.modalActions}>
                <Pressable accessibilityRole="button" disabled={deleting} onPress={() => setPendingDelete(null)} style={[styles.cancelButton, deleting && styles.tablePagerButtonDisabled]}><Text style={styles.cancelText}>Batal</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={deleting} onPress={() => void confirmDelete()} style={[styles.saveButton, deleting && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{deleting ? "Menghapus..." : "Hapus Dealer"}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      {modalOpen ? <DealerModal dealer={editing} token={token} onClose={() => setModalOpen(false)} onSaved={async () => { setModalOpen(false); setQuery(""); await loadDealers(); }} /> : null}
    </>
  );
}

function DealerModal({ dealer, onClose, onSaved, token }: { dealer: DealerRow | null; onClose: () => void; onSaved: () => Promise<void>; token: string }) {
  const [name, setName] = useState(dealer?.name ?? "");
  const [address, setAddress] = useState(dealer?.address === "-" ? "" : dealer?.address ?? "");
  const [phone, setPhone] = useState(dealer?.phone === "-" ? "" : dealer?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const disabled = saving || !name.trim();

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await apiRequest(dealer ? `/dealers/${dealer.id}` : "/dealers", {
        body: JSON.stringify({ address: address.trim() || null, name: name.trim(), phone: phone.trim() || null }),
        method: dealer ? "PATCH" : "POST",
        token,
      });
      await onSaved();
    } catch (error) {
      setSaveError(`Dealer gagal disimpan. ${error instanceof Error ? error.message : "Silakan coba lagi."}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.modalTitle}>{dealer ? "Edit Dealer" : "Tambah Dealer"}</Text>
            {saveError ? <Text accessibilityRole="alert" style={styles.errorText}>{saveError}</Text> : null}
            <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Nama dealer" placeholderTextColor="#9aa4b5" value={name} />
            <TextInput onChangeText={setAddress} style={styles.modalInput} placeholder="Alamat" placeholderTextColor="#9aa4b5" value={address} />
            <TextInput onChangeText={setPhone} style={styles.modalInput} placeholder="No. Telp" placeholderTextColor="#9aa4b5" value={phone} />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable disabled={saving} onPress={onClose} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && !saving && styles.cancelButtonHover, pressed && styles.pressed, saving && styles.tablePagerButtonDisabled]}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={disabled} onPress={() => void save()} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !disabled && styles.saveButtonHover, pressed && styles.pressed, disabled && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

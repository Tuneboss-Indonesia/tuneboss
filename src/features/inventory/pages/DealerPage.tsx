import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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

  const loadDealers = async () => {
    setLoading(true);
    try {
      const master = await apiRequest<{ data: Array<{ address?: string | null; id: string; name: string; phone?: string | null }> }>("/dealers", { token });
      if (master.data.length) {
        setDealers(master.data.map((dealer) => ({ address: dealer.address ?? "-", id: dealer.id, name: dealer.name, phone: dealer.phone ?? "-", source: "master" })));
        return;
      }

      const history = await apiRequest<{ data: StockMovement[] }>("/stock/movements?type=outbound&page=1&per_page=100", { token });
      const unique = new Map<string, DealerRow>();
      history.data.forEach((item) => {
        const name = item.customerName?.trim();
        if (!name) return;
        const address = item.saleAddress ?? item.party ?? "-";
        const phone = item.customerPhone ?? "-";
        const key = `${name.toLowerCase()}|${address.toLowerCase()}|${phone.toLowerCase()}`;
        if (!unique.has(key)) unique.set(key, { address, id: key, lastTransaction: item.timestamp, name, phone, source: "history" });
      });
      setDealers([...unique.values()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDealers(); }, [token]);

  const rows = dealers.filter((dealer) => `${dealer.name} ${dealer.address} ${dealer.phone}`.toLowerCase().includes(query.toLowerCase()));

  const deleteDealer = (dealer: DealerRow) => {
    Alert.alert("Hapus Dealer", `Yakin ingin menghapus ${dealer.name}?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => void apiRequest(`/dealers/${dealer.id}`, { method: "DELETE", token }).then(loadDealers).catch((error) => Alert.alert("Gagal", error instanceof Error ? error.message : "Dealer gagal dihapus.")) },
    ]);
  };

  return (
    <>
      <CrudShell title="Dealer" subtitle="Data dealer yang sudah bekerja sama" button="Tambah Dealer" onButton={() => { setEditing(null); setModalOpen(true); }} search="Cari dealer..." searchValue={query} onSearchChange={setQuery} loading={loading}>
        <DataTable columns={["Nama", "Alamat", "No. Telp", "Transaksi Terakhir", "Aksi"]} loading={loading}>
          {rows.map((dealer) => <TableRow key={dealer.id} cells={[dealer.name, dealer.address, dealer.phone, dealer.lastTransaction ? formatDate(dealer.lastTransaction) : "-"]} actions={dealer.source === "master" ? <RowActions onEdit={() => { setEditing(dealer); setModalOpen(true); }} onDelete={() => deleteDealer(dealer)} /> : null} />)}
          {!rows.length && !loading ? <EmptyRow text="Belum ada dealer" /> : null}
        </DataTable>
      </CrudShell>
      {modalOpen ? <DealerModal dealer={editing} token={token} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); void loadDealers(); }} /> : null}
    </>
  );
}

function DealerModal({ dealer, onClose, onSaved, token }: { dealer: DealerRow | null; onClose: () => void; onSaved: () => void; token: string }) {
  const [name, setName] = useState(dealer?.name ?? "");
  const [address, setAddress] = useState(dealer?.address === "-" ? "" : dealer?.address ?? "");
  const [phone, setPhone] = useState(dealer?.phone === "-" ? "" : dealer?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const disabled = saving || !name.trim();

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest(dealer ? `/dealers/${dealer.id}` : "/dealers", {
        body: JSON.stringify({ address: address.trim() || null, name: name.trim(), phone: phone.trim() || null }),
        method: dealer ? "PATCH" : "POST",
        token,
      });
      onSaved();
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Dealer gagal disimpan.");
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

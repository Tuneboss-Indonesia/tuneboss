import { Modal, Pressable, Text, View } from "react-native";
import { Tag } from "lucide-react-native";
import { useState } from "react";
import { colors } from "../../../theme/tokens";
import { apiRequest } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import type { CategoryItem, ModalMode, PressState } from "../types";
import { CrudShell, EmptyText, IconButton } from "../components/common";
import { Edit3, Trash2 } from "lucide-react-native";

function CategoryCard({ name, desc, count, onEdit, onDelete }: { name: string; desc: string; count: number; onEdit: () => void; onDelete: () => void }) {
  return <View style={styles.categoryCard}><View style={styles.categoryIcon}><Tag color={colors.primary} size={22} /></View><View style={styles.categoryContent}><Text style={styles.categoryTitle}>{name}</Text><Text style={styles.categoryCount}>{count} barang</Text><Text style={styles.categoryDesc}>{desc}</Text></View><View style={styles.inlineActions}><IconButton icon={Edit3} onPress={onEdit} /><IconButton icon={Trash2} onPress={onDelete} /></View></View>;
}

function CategorySkeleton() {
  return (
    <View style={styles.categoryGrid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.categoryCard, { opacity: 0.5 }]}>
          <View style={styles.categoryIcon} />
          <View style={styles.categoryContent}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4, height: 22, width: "60%" }} />
            <View style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, height: 16, width: "30%", marginTop: 8 }} />
            <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, height: 15, width: "80%", marginTop: 12 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ConfirmModal({ title, message, confirmText, onCancel, onConfirm, hideCancel, loading }: { title: string; message: string; confirmText: string; onCancel?: () => void; onConfirm: () => void; hideCancel?: boolean; loading?: boolean }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={{ color: colors.muted, fontFamily: "Futura PT", fontSize: 18, marginTop: 12, textAlign: "center" }}>{message}</Text>
          <View style={styles.modalActions}>
            {!hideCancel ? <Pressable onPress={onCancel} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable> : null}
            <Pressable onPress={onConfirm} disabled={loading} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled, { backgroundColor: "#b91c1c" }]}><Text style={styles.saveText}>{loading ? "Menghapus..." : confirmText}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function KategoriPage({ onOpenModal }: { onOpenModal: (mode: ModalMode, item?: CategoryItem) => void }) {
  const [query, setQuery] = useState("");
  const { categories, loading, refresh, token } = useInventoryData();
  const [deleting, setDeleting] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CategoryItem | null>(null);
  const [blockedMsg, setBlockedMsg] = useState("");
  const items = categories;
  const filtered = items.filter((item) => `${item.name} ${item.desc}`.toLowerCase().includes(query.toLowerCase()));

  const handleDelete = (item: CategoryItem) => {
    if (item.count > 0) {
      setBlockedMsg(`Kategori "${item.name}" tidak bisa dihapus karena masih memiliki ${item.count} barang.`);
      return;
    }
    setPendingDelete(item);
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(pendingDelete.id);
    try {
      await apiRequest(`/categories/${pendingDelete.id}`, { method: "DELETE", token });
      await refresh();
    } catch (error) {
      setBlockedMsg(error instanceof Error ? error.message : "Gagal menghapus kategori.");
    } finally {
      setDeleting("");
      setPendingDelete(null);
    }
  };
  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiRequest(`/categories/${editing.id}`, { body: JSON.stringify({ description: editing.desc, name: editing.name }), method: "PATCH", token });
      await refreshCategories();
      setEditing(null);
    } catch (error) {
      Alert.alert("Gagal", error instanceof Error ? error.message : "Kategori gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CrudShell title="Kategori Produk" button="Tambah Kategori" onButton={() => onOpenModal("add")} search="Cari kategori..." searchValue={query} onSearchChange={setQuery} loading><CategorySkeleton /></CrudShell>;

  return (
    <>
      <CrudShell title="Kategori Produk" button="Tambah Kategori" onButton={() => onOpenModal("add")} search="Cari kategori..." searchValue={query} onSearchChange={setQuery}>
        <View style={styles.categoryGrid}>
          {filtered.map((item) => (
            <View key={item.id} style={styles.categoryGridItem}>
              <CategoryCard name={item.name} desc={item.desc} count={item.count} onEdit={() => onOpenModal("edit", item)} onDelete={() => handleDelete(item)} />
            </View>
          ))}
        </View>
        {!filtered.length ? <EmptyText text="Kategori tidak ditemukan" /> : null}
      </CrudShell>
      {blockedMsg ? <ConfirmModal title="Gagal" message={blockedMsg} confirmText="OK" onConfirm={() => setBlockedMsg("")} hideCancel /> : null}
      {pendingDelete ? <ConfirmModal title="Hapus Kategori" message={`Yakin ingin menghapus kategori "${pendingDelete.name}"?`} confirmText="Hapus" onCancel={() => setPendingDelete(null)} onConfirm={executeDelete} loading={Boolean(deleting)} /> : null}
    </>
  );
}

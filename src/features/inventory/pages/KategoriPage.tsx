import { Text, View } from "react-native";
import { Tag } from "lucide-react-native";
import { useState } from "react";
import { colors } from "../../../theme/tokens";
import { apiRequest } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { styles } from "../styles";
import type { ModalMode } from "../types";
import { CrudShell, EmptyText, IconButton } from "../components/common";
import { Edit3, Trash2 } from "lucide-react-native";

function CategoryCard({ name, desc, count, onEdit, onDelete }: { name: string; desc: string; count: number; onEdit: () => void; onDelete: () => void }) {
  return <View style={styles.categoryCard}><View style={styles.categoryIcon}><Tag color={colors.primary} size={22} /></View><View style={styles.categoryContent}><Text style={styles.categoryTitle}>{name}</Text><Text style={styles.categoryCount}>{count} barang</Text><Text style={styles.categoryDesc}>{desc}</Text></View><View style={styles.inlineActions}><IconButton icon={Edit3} onPress={onEdit} /><IconButton icon={Trash2} onPress={onDelete} /></View></View>;
}

export function KategoriPage({ onOpenModal }: { onOpenModal: (mode: ModalMode) => void }) {
  const [query, setQuery] = useState("");
  const { categories, refresh, token } = useInventoryData();
  const [deleting, setDeleting] = useState("");
  const items = categories;
  const filtered = items.filter((item) => `${item.name} ${item.desc}`.toLowerCase().includes(query.toLowerCase()));
  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await apiRequest(`/categories/${id}`, { method: "DELETE", token });
      await refresh();
    } finally {
      setDeleting("");
    }
  };

  return <CrudShell title="Kategori Barang" button="Tambah Kategori" onButton={() => onOpenModal("add")} search="Cari kategori..." searchValue={query} onSearchChange={setQuery} onSearchSubmit={() => undefined}><View style={styles.categoryGrid}>{filtered.map((item) => <View key={item.id} style={styles.categoryGridItem}><CategoryCard name={item.name} desc={item.desc} count={item.count} onEdit={() => onOpenModal("edit")} onDelete={() => { if (!deleting) void handleDelete(item.id); }} /></View>)}</View>{!filtered.length ? <EmptyText text="Kategori tidak ditemukan" /> : null}</CrudShell>;
}

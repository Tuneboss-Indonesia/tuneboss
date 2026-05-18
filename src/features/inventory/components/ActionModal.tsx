import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { categories } from "../data";
import type { ModalKind, ModalMode } from "../types";
import { styles } from "../styles";
import { colors } from "../../../theme/tokens";

export function ActionModal({ kind, mode, onClose }: { kind: ModalKind; mode: ModalMode; onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name ?? "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const actionLabel = mode === "edit" ? "Edit" : "Tambah";
  const title = kind === "kategori" ? `${actionLabel} Kategori` : kind === "stok" ? `${actionLabel} Barang` : kind === "masuk" ? "Tambah Stok Masuk" : kind === "keluar" ? "Kurangi Stok" : "";
  const fields = kind === "kategori"
    ? ["Nama kategori barang", "Deskripsi kategori"]
    : ["Nama / kode barang", "Jumlah / keterangan"];

  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {kind === "stok" ? <>
            <TextInput style={styles.modalInput} placeholder="Kode Barang" placeholderTextColor="#9aa4b5" />
            <TextInput style={styles.modalInput} placeholder="Nama Barang" placeholderTextColor="#9aa4b5" />
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>Kategori</Text>
              <Pressable onPress={() => setCategoryOpen((open) => !open)} style={styles.modalSelect}><Text style={styles.modalSelectText}>{selectedCategory || "Pilih kategori"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
              {categoryOpen ? <View style={styles.modalSelectOptions}>{categories.map((category) => <Pressable key={category.id} onPress={() => { setSelectedCategory(category.name); setCategoryOpen(false); }} style={[styles.modalSelectOption, selectedCategory === category.name && styles.modalSelectOptionActive]}><Text style={[styles.modalSelectOptionText, selectedCategory === category.name && styles.modalSelectOptionTextActive]}>{category.name}</Text></Pressable>)}</View> : null}
            </View>
            <TextInput style={styles.modalInput} placeholder="Harga Jual" placeholderTextColor="#9aa4b5" value={price} onChangeText={(value) => setPrice(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
            <TextInput style={styles.modalInput} placeholder="Stok" placeholderTextColor="#9aa4b5" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" inputMode="numeric" />
          </> : fields.map((field) => <TextInput key={field} style={styles.modalInput} placeholder={field} placeholderTextColor="#9aa4b5" keyboardType={field === "Jumlah / keterangan" ? "numeric" : "default"} />)}
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable onPress={onClose} style={styles.saveButton}><Text style={styles.saveText}>Simpan</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

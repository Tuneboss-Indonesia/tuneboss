import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ChevronDown, Eye, EyeOff } from "lucide-react-native";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, RowActions, TableRow, WhiteCard, type TablePagination } from "../components/common";
import { colors, fonts } from "../../../theme/tokens";
import { styles } from "../styles";
import type { PressState } from "../types";

const emptyMeta: TablePagination = { currentPage: 1, from: null, lastPage: 1, perPage: 15, to: null, total: 0 };
type Paginated<T> = { data: T[]; meta?: TablePagination };
type UserRow = { id: string; name: string; email: string; role: "admin" | "staff"; isActive: boolean; createdAt?: string | null };
type AuditRow = { id: string; action: string; entity: string; entity_id?: string | null; user?: { name?: string | null; role?: string | null } | null; created_at?: string | null; createdAt?: string | null };

function AdminSkeleton() {
  return (
    <View style={styles.stack}>
      <WhiteCard title="Users">
        <View style={styles.table}>
          <View style={styles.tableHeader}>{["Nama", "Email", "Role", "Status", "Dibuat"].map((col) => <Text key={col} style={styles.th}>{col}</Text>)}</View>
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} style={styles.skeletonTableRow}>
              {[0, 1, 2, 3, 4].map((cell) => <View key={cell} style={styles.skeletonTableCell} />)}
            </View>
          ))}
        </View>
      </WhiteCard>
      <WhiteCard title="Audit Logs">
        <View style={styles.table}>
          <View style={styles.tableHeader}>{["Waktu", "User", "Role", "Action", "Entity"].map((col) => <Text key={col} style={styles.th}>{col}</Text>)}</View>
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} style={styles.skeletonTableRow}>
              {[0, 1, 2, 3, 4].map((cell) => <View key={cell} style={styles.skeletonTableCell} />)}
            </View>
          ))}
        </View>
      </WhiteCard>
    </View>
  );
}

export function AdminPage({ currentUserId }: { currentUserId?: string }) {
  const { token } = useInventoryData();
  const [query, setQuery] = useState("");
  const [auditQuery, setAuditQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
  const [userMeta, setUserMeta] = useState<TablePagination>(emptyMeta);
  const [auditMeta, setAuditMeta] = useState<TablePagination>(emptyMeta);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const skipAutoSearchRef = useRef(true);
  const skipAuditSearchRef = useRef(true);
  const userTableLoading = loading || userLoading;
  const auditTableLoading = loading || auditLoading;

  const loadUsers = async (page = userMeta.currentPage, search = query) => {
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (search.trim()) params.set("search", search.trim());
    const userData = await apiRequest<Paginated<UserRow>>(`/users?${params.toString()}`, { token });
    setUsers(userData.data);
    setUserMeta(userData.meta ?? emptyMeta);
  };

  const loadAudits = async (page = auditMeta.currentPage, search = auditQuery) => {
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (search.trim()) params.set("search", search.trim());
    const auditData = await apiRequest<Paginated<AuditRow>>(`/audit-logs?${params.toString()}`, { token });
    setAudits(auditData.data);
    setAuditMeta(auditData.meta ?? emptyMeta);
  };

  const reloadUsers = async (page = userMeta.currentPage, search = query) => {
    setUserLoading(true);
    try {
      await loadUsers(page, search);
    } finally {
      setUserLoading(false);
    }
  };

  const reloadAudits = async (page = auditMeta.currentPage, search = auditQuery) => {
    setAuditLoading(true);
    try {
      await loadAudits(page, search);
    } finally {
      setAuditLoading(false);
    }
  };

  const reloadAdmin = async (userPage = userMeta.currentPage, auditPage = auditMeta.currentPage, userSearch = query, auditSearch = auditQuery) => {
    setUserLoading(true);
    setAuditLoading(true);
    try {
      await Promise.all([loadUsers(userPage, userSearch), loadAudits(auditPage, auditSearch)]);
    } finally {
      setUserLoading(false);
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        await Promise.all([loadUsers(1, ""), loadAudits(1, "")]);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Data admin gagal dimuat.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token]);

  useEffect(() => {
    if (skipAutoSearchRef.current) {
      skipAutoSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void reloadUsers(1, query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (skipAuditSearchRef.current) {
      skipAuditSearchRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void reloadAudits(1, auditQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [auditQuery]);

  const openAdd = () => {
    setEditingUser(null);
    setModalMode("add");
  };

  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setModalMode("edit");
  };

  const saveUser = async (form: { email: string; isActive: boolean; name: string; password: string; role: UserRow["role"] }) => {
    setSaving(true);
    try {
      if (modalMode === "edit" && editingUser) {
        await apiRequest(`/users/${editingUser.id}`, {
          body: JSON.stringify({ email: form.email.trim(), is_active: form.isActive, name: form.name.trim(), role: form.role }),
          method: "PATCH",
          token,
        });
      } else {
        await apiRequest("/users", {
          body: JSON.stringify({ email: form.email.trim(), is_active: true, name: form.name.trim(), password: form.password, role: form.role }),
          method: "POST",
          token,
        });
      }
      setModalMode(null);
      setEditingUser(null);
      skipAutoSearchRef.current = true;
      skipAuditSearchRef.current = true;
      await reloadAdmin(1, 1, query, auditQuery);
    } catch (requestError) {
      Alert.alert("Gagal", requestError instanceof Error ? requestError.message : "Akun gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/users/${pendingDelete.id}`, { method: "DELETE", token });
      setPendingDelete(null);
      skipAutoSearchRef.current = true;
      skipAuditSearchRef.current = true;
      await reloadAdmin();
    } catch (requestError) {
      Alert.alert("Gagal", requestError instanceof Error ? requestError.message : "Akun gagal dihapus.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.stack}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? <AdminSkeleton /> : (
        <CrudShell title="Admin" button="Tambah Akun" onButton={openAdd} buttonDisabled={userTableLoading} search="Cari user..." searchValue={query} onSearchChange={setQuery} searchDisabled={userTableLoading} loading={loading}>
          <WhiteCard title="Users">
            <DataTable columns={["Nama", "Email", "Role", "Status", "Dibuat", "Aksi"]} pagination={userMeta} onPageChange={(page) => reloadUsers(page, query)} loading={userTableLoading}>
              {users.map((user) => <TableRow key={user.id} cells={[user.name, user.email, user.role, user.isActive ? "Aktif" : "Nonaktif", formatDate(user.createdAt)]} actions={<RowActions deleteDisabled={user.id === currentUserId} onEdit={() => openEdit(user)} onDelete={() => setPendingDelete(user)} />} />)}
              {!users.length && !userTableLoading ? <EmptyRow text="User tidak ditemukan" /> : null}
            </DataTable>
          </WhiteCard>
          <CrudShell search="Cari audit log..." searchValue={auditQuery} onSearchChange={setAuditQuery} searchDisabled={auditTableLoading} loading={false}>
            <WhiteCard title="Audit Logs">
              <DataTable columns={["Waktu", "User", "Role", "Action", "Entity"]} pagination={auditMeta} onPageChange={(page) => reloadAudits(page, auditQuery)} loading={auditTableLoading}>
                {audits.map((audit) => <TableRow key={audit.id} cells={[formatDate(audit.createdAt ?? audit.created_at), audit.user?.name ?? "System", audit.user?.role ?? "-", audit.action, audit.entity]} />)}
                {!audits.length && !auditTableLoading ? <EmptyRow text="Audit log kosong" /> : null}
              </DataTable>
            </WhiteCard>
          </CrudShell>
        </CrudShell>
      )}
      {modalMode ? <UserModal mode={modalMode} user={editingUser} saving={saving} onClose={() => { setModalMode(null); setEditingUser(null); }} onSave={saveUser} /> : null}
      {pendingDelete ? <ConfirmModal title="Hapus Akun" message={`Yakin ingin menghapus permanen akun "${pendingDelete.name}" dari database?`} confirmText="Hapus" loading={deleting} onCancel={() => setPendingDelete(null)} onConfirm={deleteUser} /> : null}
    </View>
  );
}

function UserModal({ mode, onClose, onSave, saving, user }: { mode: "add" | "edit"; onClose: () => void; onSave: (form: { email: string; isActive: boolean; name: string; password: string; role: UserRow["role"] }) => Promise<void>; saving: boolean; user: UserRow | null }) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [role, setRole] = useState<UserRow["role"]>(user?.role ?? "staff");
  const [isActive, setIsActive] = useState(mode === "add" ? true : user?.isActive ?? true);
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const hasChanges = mode === "add" || name !== (user?.name ?? "") || email !== (user?.email ?? "") || role !== (user?.role ?? "staff") || isActive !== (user?.isActive ?? true);
  const disabled = saving || !name.trim() || !email.trim() || (mode === "add" && password.length < 8) || !hasChanges;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
            <Text style={styles.modalTitle}>{mode === "add" ? "Tambah Akun" : "Edit Akun"}</Text>
            <TextInput onChangeText={setName} style={styles.modalInput} placeholder="Nama" placeholderTextColor={colors.muted} value={name} />
            <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} style={styles.modalInput} placeholder="Email" placeholderTextColor={colors.muted} value={email} />
            {mode === "add" ? (
              <View style={styles.passwordInputWrap}>
                <TextInput onChangeText={setPassword} secureTextEntry={!passwordVisible} style={[styles.modalInput, styles.passwordInput]} placeholder="Password minimal 8 karakter" placeholderTextColor={colors.muted} value={password} />
                <Pressable accessibilityLabel={passwordVisible ? "Samarkan password" : "Lihat password"} onPress={() => setPasswordVisible((visible) => !visible)} style={({ pressed }: PressState) => [styles.passwordToggle, pressed && styles.pressed]}>
                  {({ hovered }: PressState) => passwordVisible ? <EyeOff color={hovered ? colors.primary : colors.muted} size={21} /> : <Eye color={hovered ? colors.primary : colors.muted} size={21} />}
                </Pressable>
              </View>
            ) : null}
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalLabel}>Role</Text>
              <Pressable onPress={() => setRoleOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{role}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
              {roleOpen ? <View style={styles.modalSelectOptions}>{(["admin", "staff"] as const).map((option) => <Pressable key={option} onPress={() => { setRole(option); setRoleOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, role === option && styles.modalSelectOptionActive, hovered && role !== option && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, role === option && styles.modalSelectOptionTextActive]}>{option}</Text></Pressable>)}</View> : null}
            </View>
            {mode === "edit" ? (
              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalLabel}>Status</Text>
                <Pressable onPress={() => setStatusOpen((open) => !open)} style={({ hovered, pressed }: PressState) => [styles.modalSelect, hovered && styles.modalSelectHover, pressed && styles.pressed]}><Text style={styles.modalSelectText}>{isActive ? "Aktif" : "Nonaktif"}</Text><ChevronDown color={colors.muted} size={18} /></Pressable>
                {statusOpen ? <View style={styles.modalSelectOptions}>{[[true, "Aktif"], [false, "Nonaktif"]].map(([value, label]) => <Pressable key={String(value)} onPress={() => { setIsActive(Boolean(value)); setStatusOpen(false); }} style={({ hovered, pressed }: PressState) => [styles.modalSelectOption, isActive === value && styles.modalSelectOptionActive, hovered && isActive !== value && styles.modalSelectOptionHover, pressed && styles.pressed]}><Text style={[styles.modalSelectOptionText, isActive === value && styles.modalSelectOptionTextActive]}>{label}</Text></Pressable>)}</View> : null}
              </View>
            ) : null}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && styles.cancelButtonHover, pressed && styles.pressed]}><Text style={styles.cancelText}>Batal</Text></Pressable>
            <Pressable disabled={disabled} onPress={() => onSave({ email, isActive, name, password, role })} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !disabled && styles.saveButtonHover, pressed && styles.pressed, disabled && styles.tablePagerButtonDisabled]}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmModal({ title, message, confirmText, onCancel, onConfirm, loading }: { title: string; message: string; confirmText: string; onCancel: () => void; onConfirm: () => void; loading?: boolean }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{title}</Text><Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 }}>{message}</Text><View style={styles.modalActions}><Pressable disabled={loading} onPress={onCancel} style={({ hovered, pressed }: PressState) => [styles.cancelButton, hovered && !loading && styles.cancelButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled]}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable disabled={loading} onPress={onConfirm} style={({ hovered, pressed }: PressState) => [styles.saveButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed, loading && styles.tablePagerButtonDisabled, { backgroundColor: "#b91c1c" }]}><Text style={styles.saveText}>{loading ? "Menghapus..." : confirmText}</Text></Pressable></View></View></View></Modal>;
}

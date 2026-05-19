import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { apiRequest, downloadCsv, formatDate } from "../api";
import { CrudShell, DataTable, EmptyRow, RowActions, TableRow, WhiteCard } from "../components/common";
import { styles } from "../styles";
import { colors } from "../../../theme/tokens";
import { useInventoryData } from "../InventoryDataContext";

type Paginated<T> = { data: T[] };
type UserRow = { id: string; name: string; email: string; role: "admin" | "staff"; isActive: boolean; createdAt?: string | null };
type PartyRow = { address?: string | null; email?: string | null; id: string; isActive?: boolean; name: string; phone?: string | null };
type AuditRow = { id: string; action: string; entity: string; entity_id?: string | null; user?: { name?: string | null } | null; created_at?: string | null; createdAt?: string | null };
type ModalState = { kind: "user" | "supplier" | "customer"; mode: "add" | "edit"; row?: UserRow | PartyRow } | null;

const emptyParty = { address: "", email: "", name: "", phone: "" };
const emptyUser = { email: "", isActive: true, name: "", password: "", role: "staff" as "admin" | "staff" };

export function AdminPage() {
  const { refresh, token } = useInventoryData();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [suppliers, setSuppliers] = useState<PartyRow[]>([]);
  const [customers, setCustomers] = useState<PartyRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [partyForm, setPartyForm] = useState(emptyParty);
  const [userForm, setUserForm] = useState(emptyUser);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError("");
    try {
      const [userData, supplierData, customerData, auditData] = await Promise.all([
        apiRequest<Paginated<UserRow>>("/users?per_page=100", { token }),
        apiRequest<Paginated<PartyRow>>("/suppliers?per_page=100", { token }),
        apiRequest<Paginated<PartyRow>>("/customers?per_page=100", { token }),
        apiRequest<Paginated<AuditRow>>("/audit-logs?per_page=50", { token }),
      ]);
      setUsers(userData.data);
      setSuppliers(supplierData.data);
      setCustomers(customerData.data);
      setAudits(auditData.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Data admin gagal dimuat.");
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const filteredUsers = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase()));
  const filteredSuppliers = suppliers.filter((item) => `${item.name} ${item.phone ?? ""} ${item.email ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const filteredCustomers = customers.filter((item) => `${item.name} ${item.phone ?? ""} ${item.email ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  const openUser = (mode: "add" | "edit", row?: UserRow) => {
    setUserForm(row ? { email: row.email, isActive: row.isActive, name: row.name, password: "", role: row.role } : emptyUser);
    setModal({ kind: "user", mode, row });
  };

  const openParty = (kind: "supplier" | "customer", mode: "add" | "edit", row?: PartyRow) => {
    setPartyForm(row ? { address: row.address ?? "", email: row.email ?? "", name: row.name, phone: row.phone ?? "" } : emptyParty);
    setModal({ kind, mode, row });
  };

  const saveModal = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.kind === "user") {
        const body = modal.mode === "add"
          ? { email: userForm.email, name: userForm.name, password: userForm.password, role: userForm.role }
          : { email: userForm.email, is_active: userForm.isActive, name: userForm.name, role: userForm.role };
        await apiRequest(modal.mode === "add" ? "/users" : `/users/${modal.row?.id}`, { body: JSON.stringify(body), method: modal.mode === "add" ? "POST" : "PATCH", token });
      } else {
        const path = modal.kind === "supplier" ? "/suppliers" : "/customers";
        await apiRequest(modal.mode === "add" ? path : `${path}/${modal.row?.id}`, { body: JSON.stringify({ address: partyForm.address || null, email: partyForm.email || null, name: partyForm.name, phone: partyForm.phone || null }), method: modal.mode === "add" ? "POST" : "PATCH", token });
      }
      setModal(null);
      await Promise.all([load(), refresh()]);
    } catch (requestError) {
      Alert.alert("Gagal", requestError instanceof Error ? requestError.message : "Data gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (kind: "user" | "supplier" | "customer", id: string) => {
    try {
      const path = kind === "user" ? `/users/${id}/deactivate` : kind === "supplier" ? `/suppliers/${id}` : `/customers/${id}`;
      await apiRequest(path, { method: kind === "user" ? "PATCH" : "DELETE", token });
      await Promise.all([load(), refresh()]);
    } catch (requestError) {
      Alert.alert("Gagal", requestError instanceof Error ? requestError.message : "Data gagal dinonaktifkan.");
    }
  };

  const exportAudit = async () => {
    try {
      await downloadCsv("/audit-logs/export", token, "audit-logs.csv");
    } catch (requestError) {
      Alert.alert("Gagal", requestError instanceof Error ? requestError.message : "Export audit gagal.");
    }
  };

  return <View style={styles.stack}>{error ? <Text style={styles.errorText}>{error}</Text> : null}<CrudShell title="Admin" subtitle="Master data, user management, dan audit log dari backend" search="Cari user/supplier/customer..." searchValue={query} onSearchChange={setQuery}><WhiteCard title="Users" action={<Pressable onPress={() => openUser("add")} style={styles.saveButton}><Text style={styles.saveText}>Tambah User</Text></Pressable>}><DataTable columns={["Nama", "Email", "Role", "Status", "Dibuat", "Aksi"]}>{filteredUsers.map((user) => <TableRow key={user.id} cells={[user.name, user.email, user.role, user.isActive ? "Aktif" : "Nonaktif", formatDate(user.createdAt)]} actions={<RowActions onEdit={() => openUser("edit", user)} onDelete={() => void deactivate("user", user.id)} />} />)}{!filteredUsers.length ? <EmptyRow text="User tidak ditemukan" /> : null}</DataTable></WhiteCard><WhiteCard title="Suppliers" action={<Pressable onPress={() => openParty("supplier", "add")} style={styles.saveButton}><Text style={styles.saveText}>Tambah Supplier</Text></Pressable>}><DataTable columns={["Nama", "Phone", "Email", "Status", "Aksi"]}>{filteredSuppliers.map((item) => <TableRow key={item.id} cells={[item.name, item.phone ?? "-", item.email ?? "-", item.isActive === false ? "Nonaktif" : "Aktif"]} actions={<RowActions onEdit={() => openParty("supplier", "edit", item)} onDelete={() => void deactivate("supplier", item.id)} />} />)}{!filteredSuppliers.length ? <EmptyRow text="Supplier tidak ditemukan" /> : null}</DataTable></WhiteCard><WhiteCard title="Customers" action={<Pressable onPress={() => openParty("customer", "add")} style={styles.saveButton}><Text style={styles.saveText}>Tambah Customer</Text></Pressable>}><DataTable columns={["Nama", "Phone", "Email", "Status", "Aksi"]}>{filteredCustomers.map((item) => <TableRow key={item.id} cells={[item.name, item.phone ?? "-", item.email ?? "-", item.isActive === false ? "Nonaktif" : "Aktif"]} actions={<RowActions onEdit={() => openParty("customer", "edit", item)} onDelete={() => void deactivate("customer", item.id)} />} />)}{!filteredCustomers.length ? <EmptyRow text="Customer tidak ditemukan" /> : null}</DataTable></WhiteCard><WhiteCard title="Audit Logs" action={<Pressable onPress={() => void exportAudit()} style={styles.saveButton}><Text style={styles.saveText}>Export CSV</Text></Pressable>}><DataTable columns={["Waktu", "User", "Action", "Entity", "ID"]}>{audits.map((audit) => <TableRow key={audit.id} cells={[formatDate(audit.createdAt ?? audit.created_at), audit.user?.name ?? "System", audit.action, audit.entity, audit.entity_id ?? "-"]} />)}{!audits.length ? <EmptyRow text="Audit log kosong" /> : null}</DataTable></WhiteCard></CrudShell><Modal visible={Boolean(modal)} transparent animationType="fade" onRequestClose={() => setModal(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{modal?.mode === "add" ? "Tambah" : "Edit"} {modal?.kind === "user" ? "User" : modal?.kind === "supplier" ? "Supplier" : "Customer"}</Text>{modal?.kind === "user" ? <><TextInput onChangeText={(name) => setUserForm((current) => ({ ...current, name }))} style={styles.modalInput} placeholder="Nama" placeholderTextColor={colors.muted} value={userForm.name} /><TextInput onChangeText={(email) => setUserForm((current) => ({ ...current, email }))} style={styles.modalInput} placeholder="Email" placeholderTextColor={colors.muted} value={userForm.email} />{modal.mode === "add" ? <TextInput onChangeText={(password) => setUserForm((current) => ({ ...current, password }))} style={styles.modalInput} placeholder="Password minimal 8 karakter" placeholderTextColor={colors.muted} value={userForm.password} secureTextEntry /> : null}<View style={styles.chipRow}><Pressable onPress={() => setUserForm((current) => ({ ...current, role: "staff" }))} style={[styles.chip, userForm.role === "staff" && styles.chipActive]}><Text style={styles.chipText}>Staff</Text></Pressable><Pressable onPress={() => setUserForm((current) => ({ ...current, role: "admin" }))} style={[styles.chip, userForm.role === "admin" && styles.chipActive]}><Text style={styles.chipText}>Admin</Text></Pressable>{modal.mode === "edit" ? <Pressable onPress={() => setUserForm((current) => ({ ...current, isActive: !current.isActive }))} style={[styles.chip, userForm.isActive && styles.chipActive]}><Text style={styles.chipText}>{userForm.isActive ? "Aktif" : "Nonaktif"}</Text></Pressable> : null}</View></> : <><TextInput onChangeText={(name) => setPartyForm((current) => ({ ...current, name }))} style={styles.modalInput} placeholder="Nama" placeholderTextColor={colors.muted} value={partyForm.name} /><TextInput onChangeText={(phone) => setPartyForm((current) => ({ ...current, phone }))} style={styles.modalInput} placeholder="Phone" placeholderTextColor={colors.muted} value={partyForm.phone} /><TextInput onChangeText={(email) => setPartyForm((current) => ({ ...current, email }))} style={styles.modalInput} placeholder="Email" placeholderTextColor={colors.muted} value={partyForm.email} /><TextInput onChangeText={(address) => setPartyForm((current) => ({ ...current, address }))} style={styles.modalInput} placeholder="Alamat" placeholderTextColor={colors.muted} value={partyForm.address} /></>}<View style={styles.modalActions}><Pressable onPress={() => setModal(null)} style={styles.cancelButton}><Text style={styles.cancelText}>Batal</Text></Pressable><Pressable disabled={saving} onPress={() => void saveModal()} style={styles.saveButton}><Text style={styles.saveText}>{saving ? "Menyimpan..." : "Simpan"}</Text></Pressable></View></View></View></Modal></View>;
}

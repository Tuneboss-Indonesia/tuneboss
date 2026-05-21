import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, TableRow, WhiteCard, type TablePagination } from "../components/common";
import { styles } from "../styles";
import { colors } from "../../../theme/tokens";
import { useInventoryData } from "../InventoryDataContext";

const emptyMeta: TablePagination = { currentPage: 1, from: null, lastPage: 1, perPage: 15, to: null, total: 0 };
type Paginated<T> = { data: T[]; meta?: TablePagination };
type UserRow = { id: string; name: string; email: string; role: "admin" | "staff"; isActive: boolean; createdAt?: string | null };
type PartyRow = { address?: string | null; email?: string | null; id: string; isActive?: boolean; name: string; phone?: string | null };
type AuditRow = { id: string; action: string; entity: string; entity_id?: string | null; user?: { name?: string | null } | null; created_at?: string | null; createdAt?: string | null };
type ModalState = { kind: "user" | "supplier" | "customer"; mode: "add" | "edit"; row?: UserRow | PartyRow } | null;

const emptyParty = { address: "", email: "", name: "", phone: "" };
const emptyUser = { email: "", isActive: true, name: "", password: "", role: "staff" as "admin" | "staff" };

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
          <View style={styles.tableHeader}>{["Waktu", "User", "Action", "Entity", "ID"].map((col) => <Text key={col} style={styles.th}>{col}</Text>)}</View>
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

export function AdminPage() {
  const { refresh, token } = useInventoryData();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [suppliers, setSuppliers] = useState<PartyRow[]>([]);
  const [customers, setCustomers] = useState<PartyRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [userMeta, setUserMeta] = useState<TablePagination>(emptyMeta);
  const [auditMeta, setAuditMeta] = useState<TablePagination>(emptyMeta);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = async (page = userMeta.currentPage) => {
    const userData = await apiRequest<Paginated<UserRow>>(`/users?per_page=15&page=${page}`, { token });
    setUsers(userData.data);
    setUserMeta(userData.meta ?? emptyMeta);
  };

  const loadAudits = async (page = auditMeta.currentPage) => {
    const auditData = await apiRequest<Paginated<AuditRow>>(`/audit-logs?per_page=15&page=${page}`, { token });
    setAudits(auditData.data);
    setAuditMeta(auditData.meta ?? emptyMeta);
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        await Promise.all([loadUsers(1), loadAudits(1)]);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Data admin gagal dimuat.");
      } finally {
        setLoading(false);
      }
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

  return (
    <View style={styles.stack}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? <AdminSkeleton /> : (
        <CrudShell title="Admin" subtitle="User management dan audit log dari backend" search="Cari user..." searchValue={query} onSearchChange={setQuery} loading={loading}>
          <WhiteCard title="Users">
            <DataTable columns={["Nama", "Email", "Role", "Status", "Dibuat"]} pagination={userMeta} onPageChange={loadUsers}>
              {filteredUsers.map((user) => <TableRow key={user.id} cells={[user.name, user.email, user.role, user.isActive ? "Aktif" : "Nonaktif", formatDate(user.createdAt)]} />)}
              {!filteredUsers.length ? <EmptyRow text="User tidak ditemukan" /> : null}
            </DataTable>
          </WhiteCard>
          <WhiteCard title="Audit Logs">
            <DataTable columns={["Waktu", "User", "Action", "Entity", "ID"]} pagination={auditMeta} onPageChange={loadAudits}>
              {audits.map((audit) => <TableRow key={audit.id} cells={[formatDate(audit.createdAt ?? audit.created_at), audit.user?.name ?? "System", audit.action, audit.entity, audit.entity_id ?? "-"]} />)}
              {!audits.length ? <EmptyRow text="Audit log kosong" /> : null}
            </DataTable>
          </WhiteCard>
        </CrudShell>
      )}
    </View>
  );
}

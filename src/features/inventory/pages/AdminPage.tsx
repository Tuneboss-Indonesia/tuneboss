import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, TableRow, WhiteCard, type TablePagination } from "../components/common";
import { styles } from "../styles";

const emptyMeta: TablePagination = { currentPage: 1, from: null, lastPage: 1, perPage: 15, to: null, total: 0 };
type Paginated<T> = { data: T[]; meta?: TablePagination };
type UserRow = { id: string; name: string; email: string; role: "admin" | "staff"; isActive: boolean; createdAt?: string | null };
type AuditRow = { id: string; action: string; entity: string; entity_id?: string | null; user?: { name?: string | null } | null; created_at?: string | null; createdAt?: string | null };

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
  const { token } = useInventoryData();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
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

    void load();
  }, [token]);

  const filteredUsers = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase()));

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

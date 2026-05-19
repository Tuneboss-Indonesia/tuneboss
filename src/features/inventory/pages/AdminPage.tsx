import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { apiRequest, formatDate } from "../api";
import { useInventoryData } from "../InventoryDataContext";
import { CrudShell, DataTable, EmptyRow, TableRow, WhiteCard } from "../components/common";
import { styles } from "../styles";

type Paginated<T> = { data: T[] };
type UserRow = { id: string; name: string; email: string; role: "admin" | "staff"; isActive: boolean; createdAt?: string | null };
type AuditRow = { id: string; action: string; entity: string; entity_id?: string | null; user?: { name?: string | null } | null; created_at?: string | null; createdAt?: string | null };

export function AdminPage() {
  const { token } = useInventoryData();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setError("");
      try {
        const [userData, auditData] = await Promise.all([
          apiRequest<Paginated<UserRow>>("/users?per_page=100", { token }),
          apiRequest<Paginated<AuditRow>>("/audit-logs?per_page=50", { token }),
        ]);
        setUsers(userData.data);
        setAudits(auditData.data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Data admin gagal dimuat.");
      }
    }

    void load();
  }, [token]);

  const filteredUsers = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase()));

  return <View style={styles.stack}>{error ? <Text style={styles.errorText}>{error}</Text> : null}<CrudShell title="Admin" subtitle="User management dan audit log dari backend" search="Cari user..." searchValue={query} onSearchChange={setQuery}><WhiteCard title="Users"><DataTable columns={["Nama", "Email", "Role", "Status", "Dibuat"]}>{filteredUsers.map((user) => <TableRow key={user.id} cells={[user.name, user.email, user.role, user.isActive ? "Aktif" : "Nonaktif", formatDate(user.createdAt)]} />)}{!filteredUsers.length ? <EmptyRow text="User tidak ditemukan" /> : null}</DataTable></WhiteCard><WhiteCard title="Audit Logs"><DataTable columns={["Waktu", "User", "Action", "Entity", "ID"]}>{audits.map((audit) => <TableRow key={audit.id} cells={[formatDate(audit.createdAt ?? audit.created_at), audit.user?.name ?? "System", audit.action, audit.entity, audit.entity_id ?? "-"]} />)}{!audits.length ? <EmptyRow text="Audit log kosong" /> : null}</DataTable></WhiteCard></CrudShell></View>;
}

import { useEffect, useState } from "react";
import { apiRequest, formatDate } from "../api";
import { CrudShell, DataTable, EmptyRow, TableRow } from "../components/common";
import { useInventoryData } from "../InventoryDataContext";
import type { StockMovement } from "../../../types/dashboard";

type DealerRow = { address: string; lastTransaction: string; name: string };

export function DealerPage() {
  const { token } = useInventoryData();
  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDealers() {
      setLoading(true);
      try {
        const data = await apiRequest<{ data: StockMovement[] }>("/stock/movements?type=outbound&page=1&per_page=100", { token });
        if (cancelled) return;
        const unique = new Map<string, DealerRow>();
        data.data.forEach((item) => {
          const name = item.customerName?.trim();
          if (!name) return;
          const address = item.saleAddress ?? item.party ?? "-";
          const key = `${name.toLowerCase()}|${address.toLowerCase()}`;
          if (!unique.has(key)) unique.set(key, { address, lastTransaction: item.timestamp, name });
        });
        setDealers([...unique.values()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDealers();
    return () => { cancelled = true; };
  }, [token]);

  const rows = dealers.filter((dealer) => `${dealer.name} ${dealer.address}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <CrudShell title="Dealer" subtitle="Daftar dealer dari riwayat Produk Keluar" search="Cari dealer..." searchValue={query} onSearchChange={setQuery} loading={loading}>
      <DataTable columns={["Nama", "Alamat", "Transaksi Terakhir"]} loading={loading}>
        {rows.map((dealer) => <TableRow key={`${dealer.name}-${dealer.address}`} cells={[dealer.name, dealer.address, formatDate(dealer.lastTransaction)]} />)}
        {!rows.length && !loading ? <EmptyRow text="Belum ada dealer" /> : null}
      </DataTable>
    </CrudShell>
  );
}

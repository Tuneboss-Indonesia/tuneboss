import { useEffect, useState } from "react";
import { apiRequest, formatDate } from "../api";
import { CrudShell, DataTable, EmptyRow, TableRow } from "../components/common";
import { useInventoryData } from "../InventoryDataContext";
import type { StockMovement } from "../../../types/dashboard";

type DealerRow = { address: string; lastTransaction: string; name: string; phone: string };

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
          const phone = item.customerPhone ?? "-";
          const key = `${name.toLowerCase()}|${address.toLowerCase()}|${phone.toLowerCase()}`;
          if (!unique.has(key)) unique.set(key, { address, lastTransaction: item.timestamp, name, phone });
        });
        setDealers([...unique.values()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDealers();
    return () => { cancelled = true; };
  }, [token]);

  const rows = dealers.filter((dealer) => `${dealer.name} ${dealer.address} ${dealer.phone}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <CrudShell title="Dealer" subtitle="Daftar dealer dari riwayat Produk Keluar" search="Cari dealer..." searchValue={query} onSearchChange={setQuery} loading={loading}>
      <DataTable columns={["Nama", "Alamat", "No. Telp", "Transaksi Terakhir"]} loading={loading}>
        {rows.map((dealer) => <TableRow key={`${dealer.name}-${dealer.address}-${dealer.phone}`} cells={[dealer.name, dealer.address, dealer.phone, formatDate(dealer.lastTransaction)]} />)}
        {!rows.length && !loading ? <EmptyRow text="Belum ada dealer" /> : null}
      </DataTable>
    </CrudShell>
  );
}

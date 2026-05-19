# Flowchart TuneBoss Inventory Backend

Flowchart ini mengikuti PRD backend TuneBoss Inventory dengan target Laravel API + MariaDB/MySQL dan frontend Expo/React Native.

## Arsitektur Integrasi

```mermaid
flowchart LR
  Mobile[Expo React Native App] -->|HTTPS JSON API| API[Laravel API]
  Web[Expo Web / Dashboard Browser] -->|HTTPS JSON API| API
  API --> DB[(MariaDB/MySQL)]
  API --> Storage[Laravel Storage / Logs]
```

## Flow Login

```mermaid
flowchart TD
  A[User membuka aplikasi] --> B[Input email dan password]
  B --> C[POST /auth/login]
  C --> D{Validasi request valid?}
  D -- Tidak --> E[Return 422 validation error]
  D -- Ya --> F{User aktif dan password benar?}
  F -- Tidak --> G[Return 401 invalid credentials]
  F -- Ya --> H[Generate token/JWT]
  H --> I[Simpan audit log login success]
  I --> J[Return token dan data user]
  J --> K[Frontend simpan token]
  K --> L[Request API berikutnya pakai Authorization Bearer]
```

## Flow Dashboard

```mermaid
flowchart TD
  A[Frontend membuka dashboard] --> B[GET /dashboard/summary]
  A --> C[GET /dashboard/priority-products]
  A --> D[GET /dashboard/recent-activities]
  B --> E[Hitung total SKU, total unit, low stock, empty stock]
  C --> F[Ambil produk aktif dengan stok <= min_stock]
  D --> G[Ambil stock_movements terbaru]
  E --> H[Return JSON sesuai contract frontend]
  F --> H
  G --> H
```

## Flow CRUD Kategori

```mermaid
flowchart TD
  A[Admin buka halaman kategori] --> B[GET /categories]
  B --> C[Tampilkan list kategori]
  C --> D{Aksi admin}
  D -- Tambah --> E[POST /categories]
  D -- Edit --> F[PATCH /categories/:id]
  D -- Hapus --> G[DELETE /categories/:id]
  E --> H[Validasi nama unik]
  F --> H
  G --> I{Kategori dipakai produk?}
  I -- Ya --> J[Return error kategori masih dipakai]
  I -- Tidak --> K[Hapus kategori]
  H --> L[Simpan perubahan]
  L --> M[Simpan audit log]
  K --> M
  M --> N[Return JSON success]
```

## Flow CRUD Produk

```mermaid
flowchart TD
  A[Admin buka halaman produk] --> B[GET /products dengan search/filter/pagination]
  B --> C[Tampilkan produk]
  C --> D{Aksi admin}
  D -- Tambah --> E[POST /products]
  D -- Edit --> F[PATCH /products/:id]
  D -- Nonaktif --> G[DELETE /products/:id]
  E --> H[Validasi SKU unik dan barcode unik jika diisi]
  F --> H
  H --> I[Database transaction]
  I --> J[Simpan/update products]
  J --> K{Produk baru?}
  K -- Ya --> L[Buat product_stocks quantity 0]
  K -- Tidak --> M[Lewati init stok]
  L --> N[Simpan audit log]
  M --> N
  G --> O[Set products.is_active false]
  O --> N
  N --> P[Return JSON success]
```

## Flow Lookup Barcode/SKU

```mermaid
flowchart TD
  A[Staff scan barcode atau input SKU] --> B[GET /products/lookup?code=...]
  B --> C[Cari produk aktif by sku atau barcode]
  C --> D{Produk ditemukan?}
  D -- Tidak --> E[Return 404 product not found]
  D -- Ya --> F[Join category dan product_stocks]
  F --> G[Hitung status safe/low/empty]
  G --> H[Return product detail JSON]
```

## Flow Stok Masuk

```mermaid
flowchart TD
  A[Staff input barang masuk] --> B[POST /stock/inbound]
  B --> C[Validasi product_id dan quantity > 0]
  C --> D{Produk aktif?}
  D -- Tidak --> E[Return error]
  D -- Ya --> F[Mulai database transaction]
  F --> G[Lock product_stocks row]
  G --> H[before_quantity = stok saat ini]
  H --> I[after_quantity = before + quantity]
  I --> J[Update product_stocks]
  J --> K[Insert stock_movements type inbound]
  K --> L[Insert audit_logs]
  L --> M[Commit transaction]
  M --> N[Return JSON success]
```

## Flow Stok Keluar

```mermaid
flowchart TD
  A[Staff input barang keluar] --> B[POST /stock/outbound]
  B --> C[Validasi product_id dan quantity > 0]
  C --> D[Mulai database transaction]
  D --> E[Lock product_stocks row]
  E --> F{Stok cukup?}
  F -- Tidak --> G[Rollback dan return error stok tidak cukup]
  F -- Ya --> H[before_quantity = stok saat ini]
  H --> I[after_quantity = before - quantity]
  I --> J[Update product_stocks]
  J --> K[Insert stock_movements type outbound]
  K --> L[Insert audit_logs]
  L --> M[Commit transaction]
  M --> N[Return JSON success]
```

## Flow Koreksi Stok

```mermaid
flowchart TD
  A[Admin input koreksi stok] --> B[POST /stock/adjustment]
  B --> C[Validasi product_id dan target quantity >= 0]
  C --> D[Mulai database transaction]
  D --> E[Lock product_stocks row]
  E --> F[before_quantity = stok saat ini]
  F --> G[after_quantity = target quantity]
  G --> H[quantity movement = after - before]
  H --> I[Update product_stocks]
  I --> J[Insert stock_movements type adjustment]
  J --> K[Insert audit_logs]
  K --> L[Commit transaction]
  L --> M[Return JSON success]
```

## Flow Penjualan

```mermaid
flowchart TD
  A[Staff input transaksi penjualan] --> B[POST /sales]
  B --> C[Validasi item produk dan quantity]
  C --> D[Mulai database transaction]
  D --> E[Generate invoice_number]
  E --> F[Lock semua product_stocks item]
  F --> G{Semua stok cukup?}
  G -- Tidak --> H[Rollback dan return error stok tidak cukup]
  G -- Ya --> I[Insert sales]
  I --> J[Loop setiap item]
  J --> K[Insert sale_items]
  K --> L[Kurangi product_stocks]
  L --> M[Insert stock_movements type sale]
  M --> N{Masih ada item?}
  N -- Ya --> J
  N -- Tidak --> O[Insert audit_logs]
  O --> P[Commit transaction]
  P --> Q[Return invoice detail JSON]
```

## Flow Laporan

```mermaid
flowchart TD
  A[Admin/staff buka laporan] --> B{Jenis laporan}
  B -- Stok --> C[GET /reports/stock]
  B -- Penjualan --> D[GET /reports/sales]
  B -- Barang Masuk --> E[GET /reports/inbound]
  B -- Barang Keluar --> F[GET /reports/outbound]
  C --> G[Query products + product_stocks + categories]
  D --> H[Query sales + sale_items dengan filter tanggal]
  E --> I[Query stock_movements type inbound]
  F --> J[Query stock_movements type outbound atau sale]
  G --> K[Return paginated JSON]
  H --> K
  I --> K
  J --> K
```

## Flow Role Access

```mermaid
flowchart TD
  A[Request masuk ke Laravel API] --> B{Endpoint login?}
  B -- Ya --> C[Proses tanpa auth guard]
  B -- Tidak --> D[Auth middleware cek token]
  D --> E{Token valid?}
  E -- Tidak --> F[Return 401 unauthorized]
  E -- Ya --> G{Endpoint admin-only?}
  G -- Tidak --> H[Proses request]
  G -- Ya --> I{User role admin?}
  I -- Tidak --> J[Return 403 forbidden]
  I -- Ya --> H
```

## Mapping Flow Ke Frontend Saat Ini

- Dashboard frontend mengambil data dari `GET /dashboard/summary`, `GET /dashboard/priority-products`, dan `GET /dashboard/recent-activities` untuk menggantikan dummy data di `src/data/dashboard.data.ts`.
- Halaman kategori memakai endpoint `/categories`.
- Halaman stok/data barang memakai endpoint `/products` dan `/products/lookup`.
- Halaman scan memakai endpoint `/products/lookup?code=...`.
- Halaman barang masuk memakai endpoint `POST /stock/inbound`.
- Halaman barang keluar memakai endpoint `POST /stock/outbound`.
- Halaman penjualan memakai endpoint `POST /sales` dan `GET /sales`.
- Halaman laporan memakai endpoint `/reports/stock`, `/reports/sales`, `/reports/inbound`, dan `/reports/outbound`.

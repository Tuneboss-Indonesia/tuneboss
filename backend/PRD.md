# PRD Backend TuneBoss Inventory

## TL;DR

Backend TuneBoss Inventory adalah REST API self-hosted untuk mendukung aplikasi React Native/Expo inventory internal TuneBoss.ID. Backend menggunakan NestJS, PostgreSQL, dan Prisma. Fokus fase awal adalah autentikasi, master data produk/kategori, pergerakan stok, dashboard summary, scan barcode lookup, dan laporan dasar.

## 1. Konteks Produk

TuneBoss membutuhkan sistem inventory internal untuk memonitor stok ECU, kabel, aksesoris, dan barang operasional lain. Frontend saat ini sudah berbasis React Native/Expo dengan data dummy. Backend ini akan menggantikan dummy data menjadi data real dari database.

Backend harus bisa berjalan di VPS milik sendiri, tidak bergantung pada Supabase/Firebase sebagai layanan utama.

## 2. Goals

- Menyediakan API real untuk aplikasi inventory TuneBoss.
- Menyimpan data produk, kategori, stok, transaksi stok, dan penjualan.
- Memberikan dashboard summary yang cepat dibaca admin.
- Mendukung scan barcode/SKU dari aplikasi mobile.
- Menyimpan audit trail perubahan stok.
- Siap dikembangkan untuk laporan, export, multi-gudang, dan notifikasi restock.

## 3. Non-Goals Fase Awal

- Belum perlu multi-gudang kompleks.
- Belum perlu native desktop app.
- Belum perlu realtime websocket.
- Belum perlu export PDF/CSV di fase pertama.
- Belum perlu integrasi payment gateway.
- Belum perlu integrasi marketplace.

## 4. Target Pengguna

### Admin

- Login ke aplikasi.
- Mengelola kategori dan produk.
- Melihat dashboard stok.
- Melihat laporan stok dan penjualan.
- Melakukan koreksi stok.
- Mengelola user staff.

### Pegawai Gudang

- Login ke aplikasi.
- Melihat produk dan stok.
- Scan barcode/SKU.
- Input barang masuk.
- Input barang keluar.
- Melihat riwayat movement yang relevan.

## 5. Platform Dan Stack

### Backend

- NestJS.
- Prisma ORM.
- PostgreSQL.
- JWT authentication.
- REST API.

### Deployment

- VPS Ubuntu.
- Docker Compose atau PM2.
- Nginx reverse proxy.
- HTTPS dengan Let's Encrypt.
- Backup PostgreSQL berkala.

### Client

- React Native/Expo Android dan iOS.
- React Native Web untuk dashboard browser.

## 6. Scope Fase 1

### Auth

- Login dengan email/username dan password.
- Endpoint `me` untuk mengambil profil user aktif.
- JWT access token.
- Role `admin` dan `staff`.

### Kategori

- List kategori.
- Tambah kategori.
- Edit kategori.
- Hapus kategori jika tidak dipakai produk.

### Produk

- List produk dengan search/filter.
- Tambah produk.
- Edit produk.
- Nonaktif produk.
- Lookup produk berdasarkan SKU/barcode.
- Simpan minimum stok untuk alert restock.

### Stok

- Input barang masuk.
- Input barang keluar.
- Koreksi stok.
- Riwayat pergerakan stok.
- Perhitungan current stock.

### Dashboard

- Total SKU.
- Total unit.
- Jumlah stok rendah.
- Jumlah stok habis.
- Stock health percentage.
- Produk prioritas.
- Aktivitas terbaru.
- Grafik penjualan per periode.
- Barang terlaris per periode.

### Penjualan

- Membuat transaksi penjualan sederhana.
- Menyimpan item penjualan.
- Mengurangi stok otomatis.
- Melihat riwayat transaksi.

### Laporan

- Laporan stok.
- Laporan penjualan.
- Laporan barang masuk.
- Laporan barang keluar.
- Filter tanggal.

## 7. Scope Fase Lanjut

### Fase 2

- Refresh token.
- Role permission lebih detail.
- Supplier dan customer.
- Batch/expired date.
- Export CSV.
- Upload foto produk.

### Fase 3

- Multi-gudang.
- Transfer antar gudang.
- Notifikasi stok rendah.
- Audit report.
- Export PDF.

### Fase 4

- Realtime update dashboard.
- Integrasi marketplace/POS.
- Background jobs.
- Advanced analytics.

## 8. Data Model Awal

### User

```ts
type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "staff";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Category

```ts
type Category = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Product

```ts
type Product = {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string;
  salePrice: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### ProductStock

```ts
type ProductStock = {
  id: string;
  productId: string;
  quantity: number;
  updatedAt: string;
}
```

### StockMovement

```ts
type StockMovement = {
  id: string;
  productId: string;
  type: "inbound" | "outbound" | "adjustment" | "sale";
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  operatorId: string;
  party?: string;
  note?: string;
  createdAt: string;
}
```

### Sale

```ts
type Sale = {
  id: string;
  invoiceNumber: string;
  cashierId: string;
  totalAmount: number;
  createdAt: string;
}
```

### SaleItem

```ts
type SaleItem = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
}
```

### AuditLog

```ts
type AuditLog = {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

## 9. API Contract Awal

### Auth

#### POST /auth/login

Request:

```json
{
  "email": "admin@tuneboss.id",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "user-id",
    "name": "Admin Gudang",
    "email": "admin@tuneboss.id",
    "role": "admin"
  }
}
```

#### GET /auth/me

Mengembalikan user aktif berdasarkan JWT.

### Dashboard

#### GET /dashboard/summary

Response:

```json
{
  "totalSku": 128,
  "totalUnits": 2460,
  "lowStockCount": 14,
  "outOfStockCount": 3,
  "stockHealth": {
    "healthy": 82,
    "low": 12,
    "empty": 6
  }
}
```

#### GET /dashboard/priority-products

Response:

```json
[
  {
    "id": "product-id",
    "name": "TuneBoss ECU Yamaha NMAX",
    "sku": "TB-ECU-NMAX",
    "barcode": "899-TB-001-NMAX",
    "stock": 4,
    "minStock": 12,
    "status": "low"
  }
]
```

#### GET /dashboard/recent-activities

Response:

```json
[
  {
    "id": "movement-id",
    "type": "inbound",
    "productName": "TuneBoss ECU Yamaha NMAX",
    "quantity": 24,
    "operator": "Raka",
    "timestamp": "2026-05-18T09:42:00.000Z"
  }
]
```

### Product Lookup

#### GET /products/lookup?code=899-TB-001-NMAX

Response:

```json
{
  "id": "product-id",
  "name": "TuneBoss ECU Yamaha NMAX",
  "sku": "TB-ECU-NMAX",
  "barcode": "899-TB-001-NMAX",
  "category": "ECU",
  "stock": 4,
  "minStock": 12,
  "status": "low"
}
```

### Stock Inbound

#### POST /stock/inbound

Request:

```json
{
  "productId": "product-id",
  "quantity": 24,
  "party": "Supplier Malaysia",
  "note": "Batch restock ECU NMAX"
}
```

### Stock Outbound

#### POST /stock/outbound

Request:

```json
{
  "productId": "product-id",
  "quantity": 3,
  "party": "Dealer Bandung",
  "note": "Penjualan dealer"
}
```

## 10. Business Rules

- SKU wajib unik.
- Barcode wajib unik jika diisi.
- Stok tidak boleh negatif, kecuali admin mengaktifkan mode override di fase lanjut.
- Barang keluar harus gagal jika stok tidak cukup.
- Setiap perubahan stok wajib membuat `stock_movements`.
- Setiap perubahan penting wajib membuat `audit_logs`.
- Produk dengan stok `0` berstatus `empty`.
- Produk dengan stok di bawah `minStock` berstatus `low`.
- Produk dengan stok sama atau di atas `minStock` berstatus `safe`.
- Hapus data master sebaiknya soft delete/nonaktif jika sudah dipakai transaksi.

## 11. Security Requirements

- Semua endpoint selain login wajib pakai JWT.
- Password wajib di-hash dengan Argon2 atau bcrypt.
- Validasi semua input request.
- Batasi CORS hanya untuk origin yang diizinkan.
- Jangan expose stack trace di production.
- Jangan commit `.env`.
- Gunakan HTTPS di production.
- Admin-only endpoint wajib memakai role guard.

## 12. Performance Requirements

- Dashboard summary target response di bawah 500ms untuk data normal.
- Endpoint list wajib mendukung pagination.
- Search produk minimal mendukung filter nama, SKU, barcode, dan kategori.
- Index database wajib disiapkan untuk SKU, barcode, tanggal movement, dan invoice number.

## 13. Acceptance Criteria Fase 1

- User bisa login dan mendapatkan JWT.
- Frontend React Native bisa mengambil dashboard summary dari API.
- Admin bisa CRUD kategori dan produk.
- Staff bisa lookup produk dari barcode/SKU.
- Staff bisa input barang masuk dan barang keluar.
- Sistem menolak barang keluar jika stok tidak cukup.
- Riwayat stock movement tersimpan dan bisa ditampilkan.
- Laporan stok, penjualan, barang masuk, dan barang keluar tersedia minimal dalam bentuk JSON.
- Semua data dummy utama di frontend bisa diganti dengan API response tanpa perubahan desain besar.

## 14. Definition Of Done

Backend fase 1 dianggap selesai jika aplikasi React Native TuneBoss dapat login, menampilkan dashboard stok real, mencari produk via SKU/barcode, mengelola produk/kategori, mencatat stok masuk/keluar, dan menampilkan laporan dasar dari PostgreSQL melalui NestJS API.

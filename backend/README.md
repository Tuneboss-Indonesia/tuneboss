# TuneBoss Inventory Backend

Backend API untuk aplikasi inventory internal TuneBoss.ID. Backend ini dirancang menggunakan NestJS, PostgreSQL, dan Prisma agar bisa di-host di VPS sendiri dan mudah diintegrasikan dengan aplikasi React Native/Expo.

## Tujuan

- Menyediakan REST API untuk aplikasi inventory TuneBoss.
- Mengelola autentikasi admin dan pegawai gudang.
- Mengelola data kategori, produk, stok, transaksi stok, penjualan, dan laporan.
- Menyimpan audit trail semua perubahan stok.
- Menjadi backend self-hosted yang siap dideploy ke VPS.

## Stack

- NestJS sebagai backend framework.
- PostgreSQL sebagai database utama.
- Prisma sebagai ORM dan migration tool.
- JWT untuk autentikasi API.
- Argon2 atau bcrypt untuk hashing password.
- class-validator/class-transformer untuk validasi request.
- Docker Compose untuk development dan deployment awal.
- Nginx sebagai reverse proxy di VPS.

## Arsitektur

```text
React Native / Expo App
        |
        | HTTPS REST API
        v
NestJS Backend
        |
        v
PostgreSQL Database
```

## Struktur Modul Yang Disarankan

```text
backend/
  src/
    app.module.ts
    main.ts
    auth/
    users/
    roles/
    categories/
    products/
    stock/
    sales/
    reports/
    audit-logs/
    common/
  prisma/
    schema.prisma
    migrations/
  docker-compose.yml
  .env.example
```

## Modul Utama

### Auth

- Login admin/pegawai.
- Refresh token opsional.
- Proteksi endpoint dengan JWT.
- Role sederhana: `admin` dan `staff`.

### Users

- CRUD user internal.
- Aktivasi/nonaktif user.
- Assign role.

### Categories

- CRUD kategori barang.
- Contoh kategori awal: ECU, Kabel, Aksesoris, Lainnya.

### Products

- CRUD produk.
- Menyimpan SKU, barcode, nama, kategori, harga, stok minimum, dan status aktif.
- Lookup produk berdasarkan SKU atau barcode untuk fitur scan.

### Stock

- Barang masuk.
- Barang keluar.
- Koreksi stok.
- Riwayat pergerakan stok.
- Perhitungan stok saat ini.

### Sales

- Transaksi penjualan sederhana.
- Item penjualan.
- Penjualan otomatis membuat stock movement keluar.

### Reports

- Ringkasan dashboard.
- Laporan stok.
- Laporan barang masuk.
- Laporan barang keluar.
- Laporan penjualan.
- Filter tanggal dan kategori.

### Audit Logs

- Mencatat aksi penting user.
- Contoh: tambah produk, edit stok, hapus kategori, login gagal.

## Prinsip Data Stok

Stok tidak hanya disimpan sebagai angka di tabel produk. Semua perubahan stok harus dicatat sebagai ledger di tabel `stock_movements`.

Contoh tipe movement:

- `inbound`: barang masuk.
- `outbound`: barang keluar.
- `adjustment`: koreksi stok.
- `sale`: stok keluar karena transaksi penjualan.

Current stock dapat disimpan sebagai snapshot di `product_stocks`, tetapi sumber kebenaran perubahan tetap `stock_movements`.

## Entity Awal

Entity minimal:

- `users`
- `roles`
- `categories`
- `products`
- `product_stocks`
- `stock_movements`
- `sales`
- `sale_items`
- `audit_logs`

Entity opsional fase lanjut:

- `warehouses`
- `stock_batches`
- `suppliers`
- `customers`
- `notifications`

## Endpoint Awal

### Auth

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Dashboard

```text
GET /dashboard/summary
GET /dashboard/priority-products
GET /dashboard/recent-activities
GET /dashboard/sales-chart?period=day|week|month|year
GET /dashboard/top-products?period=day|week|month|year
```

### Categories

```text
GET    /categories
POST   /categories
GET    /categories/:id
PATCH  /categories/:id
DELETE /categories/:id
```

### Products

```text
GET    /products
POST   /products
GET    /products/:id
PATCH  /products/:id
DELETE /products/:id
GET    /products/lookup?code=SKU_OR_BARCODE
```

### Stock Movements

```text
GET  /stock/movements
POST /stock/inbound
POST /stock/outbound
POST /stock/adjustment
```

### Sales

```text
GET  /sales
POST /sales
GET  /sales/:id
```

### Reports

```text
GET /reports/stock
GET /reports/sales
GET /reports/inbound
GET /reports/outbound
```

## Environment Variables

Contoh `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://tuneboss:tuneboss_password@localhost:5432/tuneboss_inventory
JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:8081,http://localhost:19006
```

## Development Flow

Setelah project NestJS dibuat:

```bash
npm install
npx prisma migrate dev
npm run start:dev
```

Untuk typecheck/test:

```bash
npm run lint
npm run test
```

## Integrasi Dengan React Native

React Native/Expo akan memanggil API melalui base URL.

Contoh environment frontend:

```env
EXPO_PUBLIC_API_URL=https://api.tuneboss.internal
```

Contoh request:

```ts
const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/dashboard/summary`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Deployment VPS

Rekomendasi deployment awal:

- VPS Ubuntu.
- PostgreSQL via Docker atau native package.
- NestJS berjalan via Docker atau PM2.
- Nginx reverse proxy.
- HTTPS dengan Let's Encrypt.
- Backup database harian.

Contoh domain:

```text
api.tuneboss.id
```

## Catatan Keamanan

- Jangan commit `.env`.
- Gunakan HTTPS di production.
- Password wajib di-hash.
- Semua endpoint selain login harus pakai JWT.
- Validasi semua request body/query.
- Gunakan role guard untuk endpoint admin.
- Catat perubahan stok ke audit log.

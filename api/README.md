# TuneBoss Inventory Backend

Backend API untuk aplikasi inventory internal TuneBoss ID. Backend menggunakan Laravel dan MariaDB/MySQL dan diintegrasikan dengan aplikasi React Native/Expo.

## Tujuan

- REST API untuk aplikasi inventory TuneBoss.
- Autentikasi admin dan pegawai gudang via Laravel Sanctum.
- Kelola kategori, produk, stok (ledger), penjualan, dan laporan.
- Audit trail semua perubahan stok dan data penting.

## Stack

- Laravel 12.
- MariaDB/MySQL.
- Laravel Sanctum (token-based auth).
- Form Request Laravel untuk validasi.
- PHPUnit + MySQL untuk testing parity.

## Arsitektur

```text
React Native / Expo App (Web / Android / iOS)
        |
        | HTTPS REST API
        v
Laravel API  →  MariaDB/MySQL
```

## Struktur

```text
backend/
  app/
    Http/
      Controllers/
      Requests/
      Middleware/
    Models/
    Services/
  database/
    migrations/
    seeders/
  routes/
    api.php
  config/
  public/
  .env.example
  .env.production.example
```

## Modul

### Auth
- Login/refresh/logout.
- Role: `admin` dan `staff`.
- Proteksi endpoint dengan token Sanctum.

### Users
- CRUD user internal.
- Aktivasi/nonaktif user.

### Categories
- CRUD kategori barang.
- Contoh: ECU, Lainnya.

### Products
- CRUD produk dengan SKU, barcode, nama, kategori, harga, stok minimum, status aktif.
- Upload/hapus foto produk.
- Lookup via SKU atau barcode (scan).

### Stock
- Barang masuk (`inbound`), barang keluar (`outbound`).
- Riwayat pergerakan stok (ledger).
- Sale movement otomatis saat transaksi penjualan.

### Sales
- Item stok penjualan.
- Validasi stok sebelum konfirmasi.

### Reports
- Ringkasan dashboard: total stok, stok rendah, stok habis.
- Grafik penjualan (harian/mingguan/bulanan/tahunan).
- Produk terlaris.
- Laporan stok, barang masuk, barang keluar, penjualan.
- Filter tanggal dan kategori.
- Export Excel.

### Restock Alerts
- Alert otomatis saat stok habis atau di bawah minimum.
- Filter produk aktif.

### Audit Logs
- Mencatat aksi penting user: tambah produk, edit stok, hapus kategori, login gagal, dsb.

## Prinsip Data Stok

Stok tidak hanya disimpan sebagai angka di tabel produk. Semua perubahan stok dicatat sebagai **ledger** di tabel `stock_movements`:

- `inbound`: barang masuk.
- `outbound`: barang keluar.

## Entity

### Utama
- `users`, `categories`, `products`, `product_stocks`, `stock_movements`
- `sales`, `sale_items`, `audit_logs`, `restock_alerts`
- `suppliers`, `customers`

## Endpoint

### Auth
```text
POST   /auth/login
POST   /auth/logout
GET    /auth/me
```

### Dashboard
```text
GET    /dashboard/summary
GET    /dashboard/priority-products
GET    /dashboard/recent-activities
GET    /dashboard/sales-chart?period=day|week|month|year
GET    /dashboard/top-products?period=day|week|month|year
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
POST   /products/:id/image
DELETE /products/:id/image
```

### Stock Movements
```text
GET    /stock/movements
POST   /stock/inbound
POST   /stock/outbound
```

### Sales
```text
POST   /sales
GET    /sales
GET    /sales/:id
```

### Reports
```text
GET    /reports/stock
GET    /reports/sales
GET    /reports/inbound
GET    /reports/outbound
```

### Restock Alerts
```text
GET    /restock-alerts
```

### Audit Logs
```text
GET    /audit-logs
```

### System
```text
GET    /health
GET    /app/bootstrap
```

## Environment Variables

```env
APP_NAME="TuneBoss Inventory API"
APP_ENV=production
APP_KEY=base64:change_me
APP_DEBUG=false
APP_URL=URL

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tuneboss_inventory
DB_USERNAME=tuneboss_user
DB_PASSWORD=change_me

SANCTUM_STATEFUL_DOMAINS=
CORS_ALLOWED_ORIGINS=https://tuneboss.co.id,http://localhost:8081,http://localhost:19006
```

## Development

```bash
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

## Deploy cPanel Subdomain

Folder ini disiapkan untuk subdomain `api.sertiku.id`.

- Upload isi folder `api/` ke hosting.
- Arahkan document root subdomain ke `api/public`.
- Salin `.env.production.example` menjadi `.env`.
- Isi database cPanel di `.env`.
- Jalankan command produksi:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

Frontend Vercel harus memakai:

```env
EXPO_PUBLIC_API_URL=https://api.sertiku.id/api
```

Akun seed:
- Admin: `admin@tuneboss.co.id` / `password`
- Staff: `staff@tuneboss.co.id` / `password`
Test:
```bash
php artisan test
composer test:mysql
```

# TuneBoss Inventory Backend

Backend API untuk aplikasi inventory internal TuneBoss.ID. Backend ini dirancang menggunakan Laravel dan MariaDB/MySQL agar mudah dijalankan di shared hosting dan mudah diintegrasikan dengan aplikasi React Native/Expo.

## Tujuan

- Menyediakan REST API untuk aplikasi inventory TuneBoss.
- Mengelola autentikasi admin dan pegawai gudang.
- Mengelola data kategori, produk, stok, transaksi stok, penjualan, dan laporan.
- Menyimpan audit trail semua perubahan stok.
- Menjadi backend yang siap dideploy ke shared hosting dengan HTTPS.

## Stack

- Laravel sebagai backend framework.
- MariaDB/MySQL sebagai database utama.
- Eloquent ORM dan migration bawaan Laravel.
- Laravel Sanctum atau JWT untuk autentikasi API.
- Argon2 atau bcrypt untuk hashing password.
- Form Request Laravel untuk validasi request.
- Shared hosting/cPanel untuk deployment awal.
- Cron job hosting untuk scheduled task ringan jika tersedia.

## Arsitektur

```text
React Native / Expo App
        |
        | HTTPS REST API
        v
Laravel API
        |
        v
MariaDB/MySQL Database
```

## Struktur Project

Gunakan struktur bawaan Laravel semaksimal mungkin. Jangan mengubah struktur default Laravel atau membuat arsitektur custom besar sebelum ada kebutuhan nyata.

```text
backend/
  app/
    Http/
      Controllers/
      Requests/
      Middleware/
    Models/
  database/
    migrations/
    seeders/
  routes/
    api.php
  config/
  public/
  .env.example
```

Jika logic mulai membesar, service class boleh ditambahkan secara minimal di `app/Services`, tetapi bukan kebutuhan awal.

## Modul Utama

### Auth

- Login admin/pegawai.
- Refresh token opsional.
- Proteksi endpoint dengan Sanctum token atau JWT.
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
APP_NAME="TuneBoss Inventory API"
APP_ENV=production
APP_KEY=base64:change_me
APP_DEBUG=false
APP_URL=https://api.tuneboss.id

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tuneboss_inventory
DB_USERNAME=tuneboss_user
DB_PASSWORD=change_me

SANCTUM_STATEFUL_DOMAINS=
CORS_ALLOWED_ORIGINS=https://inventory.tuneboss.id,http://localhost:8081,http://localhost:19006
```

## Development Flow

Setelah project Laravel dibuat:

```bash
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Untuk test:

```bash
php artisan test
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

## Deployment Shared Hosting

Rekomendasi deployment awal:

- Shared hosting dengan PHP 8.2+ dan MariaDB/MySQL.
- Document root diarahkan ke folder `backend/public`.
- Jalankan migration dari SSH jika tersedia, atau import SQL migration hasil build awal.
- Pastikan `.env` production tidak berada di public web root.
- HTTPS aktif dari hosting/cPanel.
- Backup database harian dari fitur hosting atau cron job.

Contoh domain:

```text
api.tuneboss.id
```

## Catatan Keamanan

- Jangan commit `.env`.
- Gunakan HTTPS di production.
- Password wajib di-hash.
- Semua endpoint selain login harus pakai token/JWT.
- Validasi semua request body/query.
- Gunakan role guard untuk endpoint admin.
- Catat perubahan stok ke audit log.

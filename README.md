# TuneBoss Inventory

TuneBoss Inventory adalah aplikasi inventory internal untuk TuneBoss.ID. Project ini terdiri dari dashboard Expo/React Native untuk admin/staff gudang dan backend Laravel REST API untuk autentikasi, master data, stok, penjualan, laporan, audit log, dan operasional deployment.

Visual frontend mengikuti karakter TuneBoss: background gelap, aksen orange, typography display uppercase, layout responsif untuk mobile dan web dashboard.

## Stack

- Frontend: Expo, React Native, React Native Web, TypeScript.
- Backend: Laravel 12, Laravel Sanctum, MariaDB/MySQL.
- Target frontend: Android, iOS, dan browser desktop via Expo Web.
- Target backend: shared hosting/cPanel dengan PHP 8.2+, MariaDB/MySQL, HTTPS.

## Fitur Utama

- Login admin/staff memakai token Sanctum.
- Dashboard inventory: total SKU, total stok, stok rendah, stok habis, grafik penjualan, produk terlaris, restock alerts.
- Master kategori dan produk.
- Produk TuneBoss ECU berdasarkan brand motor: Yamaha, Honda, Suzuki, Kawasaki.
- Tambah/edit/nonaktif produk.
- Upload/hapus foto produk di web admin.
- Lookup produk via SKU/barcode untuk scan.
- Barang masuk, barang keluar, koreksi stok, dan riwayat movement.
- Supplier dan customer/dealer.
- Penjualan dengan cart preview backend, validasi stok, dan void transaksi admin.
- Restock alerts otomatis saat stok habis/menipis.
- Laporan stok, penjualan, barang masuk, barang keluar, dan export CSV/PDF.
- Audit logs admin-only dan export CSV.
- Command backup database untuk MySQL/MariaDB.

## Struktur Project

```text
.
├── App.tsx
├── src/
│   ├── features/inventory/
│   │   ├── AdminApp.tsx
│   │   ├── AuthScreen.tsx
│   │   ├── InventoryDataContext.tsx
│   │   ├── api.ts
│   │   ├── components/
│   │   └── pages/
│   ├── data/
│   ├── theme/
│   └── types/
├── backend/
│   ├── app/
│   ├── database/
│   ├── routes/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── ERD.md
│   ├── FLOWCHART.md
│   └── README.md
├── package.json
└── PRD + Design.md
```

## Prasyarat Lokal

- Node.js dan npm.
- PHP 8.2+.
- Composer.
- MariaDB/MySQL.
- Expo CLI via `npx expo`.

## Setup Backend

Masuk ke folder backend:

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan db:seed --class=TuneBossProductSeeder
php artisan serve --host=127.0.0.1 --port=8000
```

Default database di `.env.example` memakai MySQL/MariaDB. Sesuaikan nilai berikut dengan environment lokal:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tuneboss_inventory
DB_USERNAME=root
DB_PASSWORD=
```

Seeder membuat akun awal:

- Admin: `admin@tuneboss.id` / `password`
- Staff: `staff@tuneboss.id` / `password`

Ganti password untuk environment production.

## Setup Frontend

Install dependency dari root project:

```bash
npm install
```

Jalankan web dashboard:

```bash
npm run web
```

Jalankan Expo mobile development:

```bash
npm run start
```

Frontend default membaca API dari:

```text
http://localhost:8000
```

Untuk override API URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

## Command Penting

Frontend:

```bash
npm run typecheck
npm run web
npm run android
npm run ios
```

Backend:

```bash
php artisan route:list --except-vendor
php artisan test
composer test:mysql
vendor/bin/pint --dirty
composer validate --strict
php artisan inventory:backup
```

## API Ringkas

API tidak memakai prefix `/api`. Contoh endpoint utama:

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /health`
- `GET /app/bootstrap`
- `GET /dashboard/summary`
- `GET /products`
- `GET /products/lookup?code=SKU_OR_BARCODE`
- `POST /products/{id}/image`
- `GET /restock-alerts`
- `POST /stock/inbound`
- `POST /stock/outbound`
- `POST /sales/preview`
- `POST /sales`
- `GET /reports/stock/export`
- `GET /reports/stock/export.pdf`
- `GET /audit-logs/export`

Dokumentasi lengkap ada di `backend/API.md`.

## Role Access

Public endpoint:

- `POST /auth/login`
- `GET /health`

Admin-only:

- User management.
- Audit logs.
- Create/update/delete kategori dan produk.
- Upload/delete gambar produk.
- Stock adjustment.
- Void sales.
- Supplier/customer create/update/delete.
- Resolve restock alert.

Staff:

- Melihat dashboard, produk, kategori, report.
- Input barang masuk/keluar.
- Membuat penjualan.
- Acknowledge restock alert.

## Data Catalog TuneBoss

Seeder `TuneBossProductSeeder` mengisi katalog ECU berdasarkan brand motor:

- Yamaha: 20 produk.
- Honda: 18 produk.
- Suzuki: 4 produk.
- Kawasaki: 2 produk.

Default katalog awal:

- Harga jual: `0`.
- Stok awal: `0`.
- Minimum stok: `1`.
- Barcode: kosong.

Data harga, stok awal, dan barcode dapat diedit dari UI admin atau API.

## Testing

Backend SQLite test:

```bash
cd backend
php artisan test
```

Backend MySQL parity test:

```bash
cd backend
composer test:mysql
```

Frontend typecheck:

```bash
npm run typecheck
```

## Deployment

Panduan deploy backend ke shared hosting/cPanel ada di:

- `backend/DEPLOYMENT.md`
- `backend/.env.production.example`

Ringkasan production backend:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Setiap update production wajib menjalankan `php artisan migrate --force` sebelum aplikasi dipakai user. Setelah deploy, cek `GET /health` dan pastikan response berisi `database: ok`.

Frontend production harus dibuild dengan API URL production:

```env
EXPO_PUBLIC_API_URL=https://api.tuneboss.id
```

Jangan gunakan default `http://localhost:8000` untuk build production atau mobile device.

Document root domain/subdomain API harus mengarah ke `backend/public`.

## Dokumen Pendukung

- `PRD + Design.md`: PRD dan design system frontend.
- `backend/PRD.md`: PRD backend.
- `backend/API.md`: kontrak endpoint API.
- `backend/FRONTEND_INTEGRATION.md`: mapping API ke frontend.
- `backend/ERD.md` dan `backend/ERD.png`: rancangan database.
- `backend/FLOWCHART.md` dan `backend/FLOWCHART.png`: alur sistem.
- `backend/TABLES.md`: detail tabel database.
- `backend/DEPLOYMENT.md`: panduan deployment.

## Status Project

Project sudah melewati fase dummy dashboard dan saat ini memiliki integrasi API nyata untuk inventory internal. Fokus lanjutan yang disarankan adalah import katalog CSV, harga modal/valuasi stok, bulk stock opname, dan enhancement restock rules.

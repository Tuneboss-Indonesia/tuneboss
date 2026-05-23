# TuneBoss Inventory

TuneBoss Inventory adalah aplikasi inventory internal untuk TuneBoss ID. Project terdiri dari dashboard Expo/React Native untuk admin/staff gudang dan backend Laravel REST API untuk autentikasi, stok, penjualan, laporan, audit log.

Visual frontend: background gelap, aksen oranye, typography display uppercase, layout responsif untuk mobile dan web dashboard.

## Stack

- Frontend: Expo, React Native, React Native Web, TypeScript.
- Backend: Laravel 12, Laravel Sanctum, MariaDB/MySQL.
- Target frontend: Android, iOS, dan browser desktop/mobile via Expo Web (PWA-ready).

## Fitur Utama

- Login admin/staff memakai token Sanctum.
- Dashboard: total SKU, total stok, stok rendah, stok habis, grafik penjualan, produk terlaris, restock alerts.
- Kategori dan produk (termasuk upload foto produk).
- Lookup produk via SKU/barcode untuk scan.
- Barang masuk, barang keluar, koreksi stok, dan riwayat movement.
- Penjualan dengan cart preview backend, validasi stok, edit/hapus transaksi admin, dan void transaksi admin.
- Restock alerts otomatis saat stok habis/menipis.
- Laporan stok, penjualan, barang masuk, barang keluar.
- Export Excel multi-sheet (Stok, Penjualan, Masuk, Keluar dalam 1 file).
- Export laporan CSV/PDF dari backend.
- PWA: installable di Android/iOS, service worker, manifest, offline detection.
- Back to top floating button.
- Error boundary dengan retry, error screen, dan offline banner.
- Audit logs admin-only dan export CSV.
- Command backup database untuk MySQL/MariaDB.

## Struktur Project

```text
.
├── App.tsx
├── app.json
├── public/
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── assets/
│   └── logo.png
├── src/
│   ├── features/inventory/
│   │   ├── AdminApp.tsx
│   │   ├── AuthScreen.tsx
│   │   ├── InventoryDataContext.tsx
│   │   ├── api.ts
│   │   ├── styles.ts
│   │   ├── types.ts
│   │   ├── data.ts
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ActionModal.tsx
│   │   │   ├── BrandFooter.tsx
│   │   │   └── common.tsx
│   │   └── pages/
│   │       ├── DashboardPage.tsx
│   │       ├── StokPage.tsx
│   │       ├── KategoriPage.tsx
│   │       ├── PenjualanPage.tsx
│   │       ├── MovementPage.tsx
│   │       ├── ScanPage.tsx
│   │       └── LaporanPage.tsx
│   ├── theme/
│   └── types/
├── backend/
│   ├── app/
│   ├── database/
│   ├── routes/
├── package.json
```

## Prasyarat Lokal

- Node.js dan npm.
- PHP 8.2+.
- Composer.
- MariaDB/MySQL.
- Expo CLI via `npx expo`.

## Setup Backend

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

Default database di `.env.example` memakai MySQL/MariaDB:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tuneboss_inventory
DB_USERNAME=root
DB_PASSWORD=
```

Seeder membuat akun awal:
- Admin: `admin@tuneboss.co.id` / `password`
- Staff: `staff@tuneboss.co.id` / `password`

Ganti password untuk environment production.

## Setup Frontend

```bash
npm install
npm run web        # Web dashboard di http://localhost:8081
npm run start      # Expo mobile development
```

Frontend default membaca API dari `http://localhost:8000/api`. Untuk override:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

## PWA — Build & Deploy Web

```bash
npx expo export:web
```

Hasil di folder `web-build/`.

Service worker dan manifest sudah terkonfigurasi di `public/sw.js` dan `public/manifest.json`.

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

API memakai prefix `/api`. Contoh endpoint:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/health`
- `GET /api/app/bootstrap`
- `GET /api/dashboard/summary`
- `GET /api/products`
- `GET /api/products/lookup?code=SKU_OR_BARCODE`
- `POST /api/products/{id}/image`
- `GET /api/restock-alerts`
- `POST /api/stock/inbound`
- `POST /api/stock/outbound`
- `POST /api/sales/preview`
- `POST /api/sales`
- `GET /api/reports/stock/export`
- `GET /api/reports/stock/export.pdf`
- `GET /api/audit-logs/export`

Dokumentasi endpoint dapat dilihat dari route Laravel dan README backend.

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
- Edit/hapus/void sales.
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

Document root domain/subdomain API harus mengarah ke `backend/public` atau gunakan container sesuai konfigurasi Docker yang tersedia.

## Dokumen Pendukung

- `backend/README.md`: ringkasan backend dan endpoint.
- `laporan/`: dokumen kontrak dan laporan progress project.

## Status Project

Project sudah melewati fase dummy dashboard dan saat ini memiliki integrasi API nyata untuk inventory internal. Fokus lanjutan yang disarankan adalah import katalog CSV, harga modal/valuasi stok, bulk stock opname, dan enhancement restock rules.

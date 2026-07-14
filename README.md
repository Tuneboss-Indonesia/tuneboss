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
- Barang masuk, barang keluar, dan riwayat movement.
- Laporan stok, penjualan, barang masuk, barang keluar.
- Export Excel multi-sheet (Stok, Penjualan, Masuk, Keluar dalam 1 file).
- PWA: installable di Android/iOS, service worker, manifest, offline detection.
- Back to top floating button.
- Error boundary dengan retry, error screen, dan offline banner.
- Audit logs admin-only.

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
- `GET /dashboard/summary`
- `GET /products`
- `GET /products/lookup?code=SKU_OR_BARCODE`
- `POST /products/{id}/image`
- `GET /restock-alerts`
- `POST /stock/inbound`
- `POST /api/stock/outbound`
- `POST /api/sales`
- `GET /api/reports/stock/export`

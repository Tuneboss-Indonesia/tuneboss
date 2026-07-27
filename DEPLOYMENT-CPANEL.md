# Deploy ke cPanel via SSH/rsync

Panduan ini menjelaskan cara deploy project TuneBoss ke cPanel dengan workflow GitHub Actions yang memisahkan:

- frontend web ke domain utama
- `backend` ke subdomain backend
- `api` ke subdomain API

Workflow yang dipakai ada di:

- `.github/workflows/deploy-cpanel.yml`

## Gambaran Arsitektur

Repo ini terdiri dari 3 bagian yang dideploy terpisah:

1. `public_html` untuk hasil `expo export:web`
2. `backend` untuk Laravel backend
3. `api` untuk Laravel API

Skema yang disarankan:

- `https://domain-utama.com` -> frontend web
- `https://backend.domain-utama.com` -> Laravel backend
- `https://api.domain-utama.com` -> Laravel API

## Prasyarat

Pastikan hosting cPanel kamu memenuhi hal berikut:

- SSH access aktif
- `rsync` tersedia di server
- user SSH punya akses tulis ke folder tujuan
- PHP version server sesuai kebutuhan project
- Composer tersedia di server atau dependency sudah dibundel dari GitHub Actions

Kalau SSH tidak tersedia, workflow ini tidak akan cocok dan perlu fallback ke FTP/FTPS.

## Secret GitHub

Tambahkan secret berikut di repository GitHub:

- `CPANEL_SSH_HOST`
- `CPANEL_SSH_USER`
- `CPANEL_SSH_KEY`
- `CPANEL_SSH_PORT` optional, default `22`
- `CPANEL_PUBLIC_DIR`
- `CPANEL_BACKEND_DIR`
- `CPANEL_API_DIR`

### Contoh isi

```text
CPANEL_SSH_HOST=server123.example.com
CPANEL_SSH_USER=cpaneluser
CPANEL_SSH_PORT=22
CPANEL_PUBLIC_DIR=/home/cpaneluser/public_html
CPANEL_BACKEND_DIR=/home/cpaneluser/backend.domain-utama.com
CPANEL_API_DIR=/home/cpaneluser/api.domain-utama.com
```

## Struktur Folder di Server

Rekomendasi target folder:

```text
/home/cpaneluser/public_html
/home/cpaneluser/backend.domain-utama.com
/home/cpaneluser/api.domain-utama.com
```

Untuk Laravel, yang paling penting adalah folder `public` harus menjadi document root subdomain.

Contoh yang ideal:

- backend subdomain document root -> `/home/cpaneluser/backend.domain-utama.com/public`
- api subdomain document root -> `/home/cpaneluser/api.domain-utama.com/public`

Kalau cPanel kamu hanya mengizinkan document root langsung ke folder root app, pastikan konfigurasi server tetap aman dan `public/index.php` tetap menjadi entry point yang benar.

## Alur Deploy

Saat ada push ke branch `main`, workflow akan:

1. checkout source code
2. setup Node.js
3. setup PHP 8.2
4. install dependency frontend
5. typecheck frontend
6. export web build ke `web-build`
7. install dependency `backend`
8. install dependency `api`
9. menyiapkan folder `deploy/`
10. sync hasil build ke server memakai SSH/rsync

## File Yang Tersinkron

### Frontend

Yang dikirim ke `CPANEL_PUBLIC_DIR` adalah isi dari:

- `web-build/`

### Backend

Yang dikirim ke `CPANEL_BACKEND_DIR` adalah isi dari:

- folder `backend/`

### API

Yang dikirim ke `CPANEL_API_DIR` adalah isi dari:

- folder `api/`

## Hal Yang Tidak Ikut Dikirim

Workflow saat ini mengecualikan:

- `.env`
- `.env.*`
- `node_modules`
- `.git`
- `tests`
- `storage/logs`
- `storage/framework/cache`
- `storage/framework/sessions`
- `storage/framework/views`
- `bootstrap/cache`
- file `*.map`

Artinya, environment production harus disiapkan di server.

## Setup Awal di Server

Lakukan sekali saja sebelum deploy pertama:

### 1. Buat subdomain

Buat subdomain untuk:

- backend
- api

Pastikan document root masing-masing subdomain mengarah ke folder yang benar.

### 2. Siapkan folder target

Contoh:

```bash
mkdir -p /home/cpaneluser/backend.domain-utama.com
mkdir -p /home/cpaneluser/api.domain-utama.com
mkdir -p /home/cpaneluser/public_html
```

### 3. Buat file `.env`

Untuk `backend` dan `api`, buat file `.env` di server secara manual.

Contoh minimal backend:

```env
APP_NAME=TuneBoss
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://backend.domain-utama.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
```

Contoh minimal api:

```env
APP_NAME=TuneBoss API
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://api.domain-utama.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
```

### 4. Generate APP_KEY

Kalau belum ada key:

```bash
php artisan key:generate
```

Jalankan di folder masing-masing app.

### 5. Permission Laravel

Pastikan folder berikut writable:

- `storage`
- `bootstrap/cache`

Contoh:

```bash
chmod -R ug+rw storage bootstrap/cache
```

Sesuaikan dengan user dan group server kamu.

## Cara Kerja rsync

Workflow memakai `rsync -az --delete`.

Artinya:

- file baru dikirim
- file berubah diperbarui
- file yang sudah dihapus di repo akan dihapus dari server tujuan

Ini bagus untuk deploy bersih, tetapi hati-hati:

- jangan simpan file penting langsung di folder yang disync kalau file itu tidak diabaikan
- `.env` harus disiapkan manual dan tidak ikut sync

## Hal Yang Perlu Dicek Sebelum Aktifkan Workflow

Checklist:

- SSH login dari laptop ke server berhasil
- `rsync` bisa dijalankan di server
- path `CPANEL_PUBLIC_DIR` benar
- path `CPANEL_BACKEND_DIR` benar
- path `CPANEL_API_DIR` benar
- `.env` backend sudah ada
- `.env` api sudah ada
- permission `storage` dan `bootstrap/cache` sudah benar
- subdomain sudah diarahkan ke folder yang benar

## Cara Testing

### Test lokal

Jalankan:

```bash
npm run typecheck
```

Backend:

```bash
cd backend
composer install
php artisan test
```

API:

```bash
cd api
composer install
php artisan test
```

### Test deploy

Setelah push ke `main`, buka tab Actions dan cek:

- job selesai tanpa error
- rsync ke tiga target sukses
- domain utama tampil
- backend subdomain bisa dibuka
- api subdomain bisa dibuka

## Troubleshooting

### 1. SSH gagal login

Penyebab umum:

- private key salah
- username salah
- port salah
- host key belum sesuai

### 2. rsync tidak ditemukan

Berarti hosting tidak menyediakan `rsync` atau path command tidak tersedia.

Solusi:

- aktifkan SSH shell yang benar
- minta provider mengaktifkan `rsync`
- kalau tidak bisa, fallback ke FTP/FTPS

### 3. Laravel error `APP_KEY` kosong

Isi `.env` di server lalu generate key.

### 4. 500 error setelah deploy

Periksa:

- permission `storage`
- `bootstrap/cache`
- `.env`
- config database
- log error Laravel

### 5. Subdomain menampilkan file list atau 403

Biasanya document root belum mengarah ke folder `public`.

Perbaiki setting subdomain di cPanel.

## Catatan Penting

- Workflow ini mengasumsikan hosting cPanel kamu benar-benar mendukung SSH.
- Kalau backend dan API memakai root Laravel penuh, jangan arahkan subdomain ke folder yang salah.
- Kalau kamu ingin deploy yang lebih aman, simpan `.env` di server dan jangan pernah sync file itu dari GitHub Actions.

## Ringkasan Singkat

Gunakan workflow ini kalau:

- hosting cPanel support SSH
- kamu mau deploy otomatis dari GitHub
- frontend, backend, dan API dipisah ke target masing-masing

Kalau salah satu syarat itu tidak terpenuhi, workflow perlu disesuaikan.

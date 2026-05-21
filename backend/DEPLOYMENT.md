# Deployment Shared Hosting

Panduan ini untuk deploy Laravel API TuneBoss Inventory ke shared hosting/cPanel dengan MariaDB/MySQL.

## Requirement Hosting

- PHP 8.2 atau lebih baru.
- Extension PHP: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `ctype`, `json`, `fileinfo`.
- MariaDB/MySQL.
- Composer via SSH lebih disarankan.
- Document root bisa diarahkan ke folder `public`.
- HTTPS aktif.

## Struktur Upload

Upload isi folder `backend/` ke folder project hosting, misalnya:

```text
/home/user/tuneboss-api/
  app/
  bootstrap/
  config/
  database/
  public/
  routes/
  storage/
  vendor/
  .env
  artisan
  composer.json
```

Document root domain/subdomain API harus diarahkan ke:

```text
/home/user/tuneboss-api/public
```

Contoh subdomain:

```text
api.tuneboss.id
```

## Environment Production

Buat file `.env` di server. Jangan upload `.env` ke Git.

```env
APP_NAME="TuneBoss Inventory API"
APP_ENV=production
APP_KEY=base64:ISI_DARI_php_artisan_key_generate
APP_DEBUG=false
APP_URL=https://api.tuneboss.id
APP_VERSION=1.0.0

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tuneboss_inventory
DB_USERNAME=tuneboss_user
DB_PASSWORD=password_database

CORS_ALLOWED_ORIGINS=https://inventory.tuneboss.id,http://localhost:8081,http://localhost:19006

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
LOG_CHANNEL=stack
LOG_LEVEL=warning
```

## Perintah Deployment

Jalankan dari folder backend di server:

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

`php artisan migrate --force` wajib dijalankan setiap deploy/update. Jika dilewati, endpoint baru bisa gagal karena tabel/kolom production tertinggal, misalnya workflow restock membutuhkan tabel `restock_orders`.

Jika server tidak menyediakan Composer, jalankan `composer install --no-dev --optimize-autoloader` di lokal, lalu upload folder `vendor/` bersama source backend.

### Verifikasi Setelah Deploy

Jalankan smoke check berikut setelah command deployment selesai:

```bash
php artisan migrate:status
php artisan route:list --path=reports
curl -I https://api.tuneboss.id/health
```

Ekspektasi `/health`:

```json
{"status":"ok","database":"ok","service":"tuneboss-inventory-api"}
```

Login dari frontend lalu cek endpoint berikut dari browser/network tab atau API client:

```text
GET /app/bootstrap
GET /dashboard/realtime
GET /reports/stock?per_page=1
GET /reports/stock/export.pdf?per_page=1
```

Report PDF harus mengembalikan `Content-Type: application/pdf` dan file yang diawali `%PDF-1.4`.

## Seeder Awal

Untuk data awal development/staging:

```bash
php artisan db:seed --force
```

Seeder membuat akun:

- Admin: `admin@tuneboss.id` / `password`
- Staff: `staff@tuneboss.id` / `password`

Ganti password setelah login pertama atau jangan jalankan seeder di production final tanpa mengganti credential.

## Update Aplikasi

Saat ada update source:

```bash
php artisan down
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan up
```

Jika `php artisan down` tidak cocok untuk shared hosting yang traffic-nya kecil, minimal jalankan update saat jam sepi dan tetap pastikan `migrate --force` selesai sebelum user memakai aplikasi.

### Rollback Darurat

Jika deploy gagal setelah source baru diupload:

1. Restore source backend versi sebelumnya dari backup hosting/Git artifact.
2. Restore database dari backup terakhir jika migration sudah mengubah struktur/data secara breaking.
3. Jalankan `php artisan optimize:clear` lalu cache ulang config/route/view.
4. Cek `/health` dan login frontend.

## Permission

Pastikan folder berikut writable oleh PHP:

```text
storage/
bootstrap/cache/
```

Jika tersedia SSH:

```bash
chmod -R 775 storage bootstrap/cache
```

Folder `public/storage` harus mengarah ke `storage/app/public` setelah `php artisan storage:link`. Ini diperlukan untuk akses gambar produk yang diupload dari web/mobile.

Jika shared hosting tidak mengizinkan symlink, buat mapping manual melalui File Manager/cPanel atau gunakan document root yang mengizinkan `public/storage` membaca isi `storage/app/public`.

## Frontend Production URL

Frontend Expo/Web harus dibuild dengan API URL production:

```env
EXPO_PUBLIC_API_URL=https://api.tuneboss.id
```

Untuk Expo web:

```bash
npm install
EXPO_PUBLIC_API_URL=https://api.tuneboss.id npm run web
```

Jika membuat static web build, pastikan environment variable di-set sebelum build agar bundle tidak memakai default `http://localhost:8000`.

Untuk mobile native, gunakan URL yang bisa dijangkau perangkat. Jangan gunakan `localhost` kecuali backend berjalan di perangkat yang sama.

## Backup Database

Minimal backup harian dari cPanel. Jika tersedia cron job dan `mysqldump`:

```bash
mysqldump -u tuneboss_user -p tuneboss_inventory > backup-$(date +%F).sql
```

Simpan backup di luar `public/`.

### Backup via Artisan

Jika `mysqldump` tersedia di hosting, gunakan command bawaan aplikasi:

```bash
php artisan inventory:backup
```

Default output ada di:

```text
storage/app/backups/
```

Custom folder backup:

```bash
php artisan inventory:backup --path=/home/user/backups/tuneboss
```

Pastikan folder backup tidak berada di bawah document root `public/`.

### Backup Manual cPanel

1. Buka cPanel dan masuk ke `Backup` atau `Backup Wizard`.
2. Download backup database MariaDB/MySQL aplikasi.
3. Simpan file `.sql` atau `.sql.gz` di storage terpisah, bukan di folder website.
4. Uji restore secara berkala di database staging/lokal.

### Backup Manual SSH

```bash
mkdir -p ~/backups/tuneboss
mysqldump --single-transaction --quick -u tuneboss_user -p tuneboss_inventory > ~/backups/tuneboss/tuneboss_inventory-$(date +%F).sql
```

Jika ingin kompres:

```bash
gzip ~/backups/tuneboss/tuneboss_inventory-$(date +%F).sql
```

### Restore Database

Restore ke database kosong atau staging terlebih dahulu sebelum production:

```bash
mysql -u tuneboss_user -p tuneboss_inventory < backup.sql
```

Untuk file `.gz`:

```bash
gunzip -c backup.sql.gz | mysql -u tuneboss_user -p tuneboss_inventory
```

Setelah restore, jalankan:

```bash
php artisan migrate --force
php artisan config:cache
```

### Backup Lokal Laragon

```bash
mysqldump -h 127.0.0.1 -P 3306 -u root tuneboss_inventory > storage/app/tuneboss_inventory-local.sql
```

Restore lokal:

```bash
mysql -h 127.0.0.1 -P 3306 -u root tuneboss_inventory < storage/app/tuneboss_inventory-local.sql
```

Jangan commit file backup database ke Git.

## Checklist Production

- `APP_ENV=production`.
- `APP_DEBUG=false`.
- `APP_KEY` sudah dibuat.
- `APP_URL` mengarah ke domain API HTTPS.
- `APP_VERSION` diisi sesuai release/deploy.
- HTTPS aktif.
- Document root ke `public/`.
- `.env` tidak bisa diakses dari browser.
- `composer install --no-dev --optimize-autoloader` sudah dijalankan.
- `php artisan migrate --force` sudah dijalankan dan `php artisan migrate:status` tidak menunjukkan pending migration.
- `php artisan storage:link` sudah dijalankan dan upload gambar produk bisa dibuka.
- `php artisan config:cache`, `route:cache`, dan `view:cache` sudah dijalankan setelah `.env` final.
- CORS origin hanya domain yang dipakai.
- Akun default sudah diganti password.
- Backup database aktif.
- `/health` mengembalikan `database: ok`.
- Frontend production memakai `EXPO_PUBLIC_API_URL` domain API, bukan `localhost`.
- Export PDF/CSV report berhasil di browser production.

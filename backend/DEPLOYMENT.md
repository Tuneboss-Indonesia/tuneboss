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
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Jika server tidak menyediakan Composer, jalankan `composer install --no-dev --optimize-autoloader` di lokal, lalu upload folder `vendor/` bersama source backend.

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
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

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

## Backup Database

Minimal backup harian dari cPanel. Jika tersedia cron job dan `mysqldump`:

```bash
mysqldump -u tuneboss_user -p tuneboss_inventory > backup-$(date +%F).sql
```

Simpan backup di luar `public/`.

## Checklist Production

- `APP_ENV=production`.
- `APP_DEBUG=false`.
- `APP_KEY` sudah dibuat.
- HTTPS aktif.
- Document root ke `public/`.
- `.env` tidak bisa diakses dari browser.
- Database sudah migrate.
- CORS origin hanya domain yang dipakai.
- Akun default sudah diganti password.
- Backup database aktif.

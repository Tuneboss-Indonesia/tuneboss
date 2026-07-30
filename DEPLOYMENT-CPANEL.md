# Deploy Inventory ke cPanel

Deployment produksi berjalan otomatis setelah perubahan di-merge ke branch
`master` repository organisasi.

## Endpoint sementara

- Frontend: `http://tuneboss-landing.dasrams.biz.id/inventory/`
- API: `http://tuneboss-landing.dasrams.biz.id/api-inventory/api`
- Health API: `http://tuneboss-landing.dasrams.biz.id/api-inventory/api/health`

## GitHub Actions secrets

Secrets hanya disimpan di `Tuneboss-Indonesia/tuneboss`:

- `CPANEL_SSH_HOST`
- `CPANEL_SSH_USER`
- `CPANEL_SSH_KEY`
- `CPANEL_SSH_PORT`
- `CPANEL_FRONTEND_DIR`
- `CPANEL_API_APP_DIR`
- `CPANEL_API_PUBLIC_DIR`

Password cPanel dan database tidak disimpan di GitHub.

## Target server

- Frontend: `/home/tunm2447/public_html/inventory`
- Laravel API: `/home/tunm2447/api.tuneboss.id`
- Document root API: `/home/tunm2447/public_html/api.tuneboss.id/public`
- Path publik API: `/home/tunm2447/public_html/api-inventory` (symlink)
- PHP: 8.2
- Database: MySQL cPanel

Workflow mempertahankan `.env` dan `storage` Laravel, menjalankan migrasi
database, membangun cache produksi, serta membuat ulang tautan public storage.

## Alur deployment

1. Push perubahan lokal ke fork.
2. Buat pull request ke repository organisasi.
3. Merge PR ke branch `master`.
4. GitHub Actions membangun frontend dan API, mengunggah artefak, lalu
   menjalankan migrasi secara otomatis.

HTTPS dapat diaktifkan setelah delegasi DNS `dasrams.biz.id` sehat dan AutoSSL
berhasil menerbitkan sertifikat.

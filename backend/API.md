# TuneBoss Inventory API

Dokumen ini merangkum endpoint Laravel API untuk frontend Expo/React Native TuneBoss Inventory.

## Base URL

Development:

```text
http://localhost:8000
```

Production contoh:

```text
https://api.tuneboss.id
```

## Auth Header

Semua endpoint selain `POST /auth/login` dan `GET /health` wajib memakai Bearer token.

```http
Authorization: Bearer <accessToken>
Accept: application/json
```

## Error Response

Error JSON memakai format konsisten:

```json
{
  "message": "Validation failed.",
  "code": "validation_failed",
  "errors": {
    "field": ["Pesan error"]
  }
}
```

Kode umum:

- `validation_failed` untuk request tidak valid.
- `unauthenticated` untuk token kosong/tidak valid.
- `forbidden` untuk role tidak cukup.
- `not_found` untuk resource tidak ditemukan.
- `insufficient_stock` untuk stok tidak cukup.
- `too_many_requests` untuk rate limit.

## Response List

Endpoint list memakai pagination:

```json
{
  "data": [],
  "links": {
    "first": "...",
    "last": "...",
    "prev": null,
    "next": null
  },
  "meta": {
    "currentPage": 1,
    "from": 1,
    "lastPage": 1,
    "perPage": 15,
    "to": 10,
    "total": 10
  }
}
```

## Auth

### POST /auth/login

Request:

```json
{
  "email": "admin@tuneboss.id",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "token",
  "user": {
    "id": "uuid",
    "name": "Admin Gudang",
    "email": "admin@tuneboss.id",
    "role": "admin"
  }
}
```

### GET /auth/me

Mengembalikan user aktif.

### POST /auth/refresh

Merotasi access token aktif sebelum expired. Request wajib memakai Bearer token yang masih valid. Token lama langsung dihapus dan response mengembalikan `accessToken`, `tokenType`, `expiresAt`, dan `user` baru.

### PATCH /auth/profile

Request:

```json
{
  "name": "Admin Gudang",
  "email": "admin@tuneboss.id"
}
```

### PATCH /auth/password

Request:

```json
{
  "currentPassword": "password",
  "password": "password-baru"
}
```

### POST /auth/logout

Menghapus token aktif.

### POST /auth/logout-all

Menghapus semua token user aktif di semua device. Token login memiliki `expiresAt` sesuai `SANCTUM_TOKEN_EXPIRATION_MINUTES`.

## App

### GET /health

Public health check.

Response includes `version` from `APP_VERSION`.

Response:

```json
{
  "status": "ok",
  "database": "ok",
  "service": "tuneboss-inventory-api",
  "timestamp": "2026-05-19T00:00:00.000000Z"
}
```

### GET /app/bootstrap

Mengembalikan user, permissions, kategori, dan summary ringan untuk initial load frontend.

## Dashboard

- `GET /dashboard/summary`
- `GET /dashboard/priority-products`
- `GET /dashboard/recent-activities`
- `GET /dashboard/sales-chart?period=day|week|month|year`
- `GET /dashboard/top-products?period=day|week|month|year`
- `GET /dashboard/realtime`

`/dashboard/realtime` adalah endpoint polling ringan untuk shared hosting. Response berisi `serverTime`, `pollAfterSeconds`, `lastActivityAt`, `summary`, `priorityProducts`, dan `recentActivities`.

## Categories

- `GET /categories`
- `POST /categories` admin-only
- `GET /categories/{id}`
- `PATCH /categories/{id}` admin-only
- `DELETE /categories/{id}` admin-only

Request create/update:

```json
{
  "name": "ECU",
  "description": "Produk ECU TuneBoss"
}
```

## Products

- `GET /products?search=&category_id=&active=&per_page=15`
- `POST /products` admin-only
- `GET /products/{id}`
- `PATCH /products/{id}` admin-only
- `POST /products/{id}/image` admin-only, multipart `image`
- `DELETE /products/{id}/image` admin-only
- `DELETE /products/{id}` admin-only, menonaktifkan produk
- `GET /products/lookup?code=SKU_OR_BARCODE`

Request create/update:

```json
{
  "category_id": "uuid",
  "name": "USB Tuning Cable",
  "sku": "TB-USB-CABLE",
  "barcode": "899-TB-004-USB",
  "min_stock": 15,
  "is_active": true
}
```

Upload image:

```http
POST /products/{id}/image
Content-Type: multipart/form-data
Authorization: Bearer <accessToken>
```

Field:

- `image`: `jpg`, `jpeg`, `png`, atau `webp`, maksimal 2 MB.

Response product menyertakan `imagePath` dan `imageUrl`.

## Restock Alerts

- `GET /restock-alerts?status=&severity=&product_id=&active_only=1&per_page=15`
- `POST /restock-alerts/{id}/acknowledge`
- `POST /restock-alerts/{id}/resolve` admin-only

Alert dibuat otomatis saat endpoint list dibaca untuk produk aktif dengan stok `empty` atau `low`. Jika stok sudah aman, alert aktif otomatis berubah ke `resolved`.

Request acknowledge/resolve:

```json
{
  "note": "Akan diproses pembelian"
}
```

Response:

```json
{
  "id": "uuid",
  "productId": "uuid",
  "status": "open",
  "severity": "low",
  "currentStock": 4,
  "threshold": 12,
  "product": {
    "name": "TuneBoss ECU Yamaha NMAX",
    "sku": "TB-ECU-NMAX"
  }
}
```

## Stock

- `GET /stock/movements?product_id=&operator_id=&type=&from=&to=&per_page=15`
- `POST /stock/inbound`
- `POST /stock/outbound`
- `POST /stock/adjustment` admin-only

Request inbound/outbound:

```json
{
  "productId": "uuid",
  "quantity": 5,
  "party": "Supplier",
  "note": "Restock"
}
```

Request adjustment:

```json
{
  "productId": "uuid",
  "quantity": 10,
  "note": "Stock opname"
}
```

## Sales

- `GET /sales?search=&status=&cashier_id=&from=&to=&per_page=15`
- `POST /sales/preview`
- `POST /sales`
- `GET /sales/{id}`
- `POST /sales/{id}/void` admin-only

Request create sale:

```json
{
  "address": "Alamat atau customer opsional",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1
    }
  ]
}
```

Request preview memakai body yang sama dengan create sale, tetapi tidak membuat transaksi dan tidak mengurangi stok.

Response preview:

```json
{
  "items": [
    {
      "productId": "uuid",
      "name": "USB Tuning Cable",
      "sku": "TB-USB-CABLE",
      "quantity": 2,
      "availableStock": 18,
      "afterStock": 16
    }
  ],
  "totalItems": 2,
  "canSubmit": true
}
```

Request void sale:

```json
{
  "reason": "Salah input"
}
```

## Reports

- `GET /reports/summary?from=&to=`
- `GET /reports/stock?category_id=&product_id=&status=&per_page=15`
- `GET /reports/stock/export?category_id=&product_id=&status=` CSV
- `GET /reports/stock/export.pdf?category_id=&product_id=&status=` PDF
- `GET /reports/sales?search=&status=&cashier_id=&from=&to=&per_page=15`
- `GET /reports/sales/export?search=&status=&cashier_id=&from=&to=` CSV
- `GET /reports/sales/export.pdf?search=&status=&cashier_id=&from=&to=` PDF
- `GET /reports/inbound?product_id=&operator_id=&from=&to=&per_page=15`
- `GET /reports/inbound/export?product_id=&operator_id=&from=&to=` CSV
- `GET /reports/inbound/export.pdf?product_id=&operator_id=&from=&to=` PDF
- `GET /reports/outbound?product_id=&operator_id=&from=&to=&per_page=15`
- `GET /reports/outbound/export?product_id=&operator_id=&from=&to=` CSV
- `GET /reports/outbound/export.pdf?product_id=&operator_id=&from=&to=` PDF

Endpoint export memakai filter yang sama dengan endpoint list. CSV mengembalikan `text/csv`; PDF mengembalikan `application/pdf` dan dibatasi ringkas untuk preview/cetak. Gunakan CSV untuk data penuh.

## Users Admin-Only

- `GET /users?search=&role=&active=&per_page=15`
- `POST /users`
- `GET /users/{id}`
- `PATCH /users/{id}`
- `PATCH /users/{id}/password`
- `PATCH /users/{id}/deactivate`
- `DELETE /users/{id}` hapus permanen jika user belum terkunci riwayat transaksi

## Audit Logs Admin-Only

- `GET /audit-logs?action=&entity=&user_id=&from=&to=&per_page=15`
- `GET /audit-logs/export?action=&entity=&user_id=&from=&to=` CSV

Audit log `metadata` menyimpan detail penting seperti `before`, `after`, `reason`, item penjualan, dan perubahan quantity stok untuk membantu investigasi operasional.

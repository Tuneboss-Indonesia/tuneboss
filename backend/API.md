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
  "sale_price": 250000,
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

## Stock

- `GET /stock/movements?product_id=&operator_id=&supplier_id=&customer_id=&type=&from=&to=&per_page=15`
- `POST /stock/inbound`
- `POST /stock/outbound`
- `POST /stock/adjustment` admin-only

Request inbound/outbound:

```json
{
  "productId": "uuid",
  "quantity": 5,
  "supplier_id": "uuid-optional",
  "customer_id": "uuid-optional",
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

- `GET /sales?search=&status=&cashier_id=&customer_id=&from=&to=&per_page=15`
- `POST /sales/preview`
- `POST /sales`
- `GET /sales/{id}`
- `POST /sales/{id}/void` admin-only

Request create sale:

```json
{
  "customer_id": "uuid-optional",
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
  "customerId": "uuid-optional",
  "items": [
    {
      "productId": "uuid",
      "name": "USB Tuning Cable",
      "sku": "TB-USB-CABLE",
      "quantity": 2,
      "availableStock": 18,
      "afterStock": 16,
      "price": 250000,
      "subtotal": 500000
    }
  ],
  "totalItems": 2,
  "totalAmount": 500000,
  "canSubmit": true
}
```

## Suppliers

- `GET /suppliers?search=&active=&per_page=15`
- `POST /suppliers` admin-only
- `GET /suppliers/{id}`
- `PATCH /suppliers/{id}` admin-only
- `DELETE /suppliers/{id}` admin-only, menonaktifkan supplier

Request create/update:

```json
{
  "name": "Supplier Malaysia",
  "phone": "08123456789",
  "email": "supplier@example.com",
  "address": "Malaysia",
  "is_active": true
}
```

## Customers

- `GET /customers?search=&active=&per_page=15`
- `POST /customers` admin-only
- `GET /customers/{id}`
- `PATCH /customers/{id}` admin-only
- `DELETE /customers/{id}` admin-only, menonaktifkan customer

Request create/update:

```json
{
  "name": "Dealer Bandung",
  "phone": "08123456789",
  "email": "dealer@example.com",
  "address": "Bandung",
  "is_active": true
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
- `GET /reports/sales?search=&status=&cashier_id=&customer_id=&from=&to=&per_page=15`
- `GET /reports/sales/export?search=&status=&cashier_id=&customer_id=&from=&to=` CSV
- `GET /reports/inbound?product_id=&operator_id=&supplier_id=&from=&to=&per_page=15`
- `GET /reports/inbound/export?product_id=&operator_id=&supplier_id=&from=&to=` CSV
- `GET /reports/outbound?product_id=&operator_id=&customer_id=&from=&to=&per_page=15`
- `GET /reports/outbound/export?product_id=&operator_id=&customer_id=&from=&to=` CSV

Endpoint export memakai filter yang sama dengan endpoint list, tetapi mengembalikan file `text/csv` tanpa pagination.

## Users Admin-Only

- `GET /users?search=&role=&active=&per_page=15`
- `POST /users`
- `GET /users/{id}`
- `PATCH /users/{id}`
- `PATCH /users/{id}/password`
- `PATCH /users/{id}/deactivate`

## Audit Logs Admin-Only

- `GET /audit-logs?action=&entity=&user_id=&from=&to=&per_page=15`

Audit log `metadata` menyimpan detail penting seperti `before`, `after`, `reason`, item penjualan, dan perubahan quantity stok untuk membantu investigasi operasional.

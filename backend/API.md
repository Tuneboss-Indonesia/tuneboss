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
- `POST /sales`
- `GET /sales/{id}`
- `POST /sales/{id}/void` admin-only

Request create sale:

```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1
    }
  ]
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
- `GET /reports/sales?search=&status=&cashier_id=&from=&to=&per_page=15`
- `GET /reports/inbound?product_id=&operator_id=&from=&to=&per_page=15`
- `GET /reports/outbound?product_id=&operator_id=&from=&to=&per_page=15`

## Users Admin-Only

- `GET /users?search=&role=&active=&per_page=15`
- `POST /users`
- `GET /users/{id}`
- `PATCH /users/{id}`
- `PATCH /users/{id}/password`
- `PATCH /users/{id}/deactivate`

## Audit Logs Admin-Only

- `GET /audit-logs?action=&entity=&user_id=&from=&to=&per_page=15`

## Error Response

Validation error memakai format Laravel standar:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field": ["Pesan error"]
  }
}
```

Unauthorized:

```json
{
  "message": "Unauthenticated."
}
```

Forbidden:

```json
{
  "message": "Forbidden"
}
```

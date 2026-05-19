# Frontend Integration

Panduan ringkas untuk menghubungkan Expo/React Native TuneBoss Inventory ke Laravel API.

## Base URL

Gunakan environment frontend:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Untuk Android emulator, jika API berjalan di mesin host, biasanya gunakan `http://10.0.2.2:8000`. Untuk device fisik, gunakan IP LAN mesin host, misalnya `http://192.168.1.10:8000`.

## Auth Flow

1. Login ke `POST /auth/login` dengan email dan password.
2. Simpan `accessToken` di secure storage.
3. Kirim header `Authorization: Bearer <accessToken>` dan `Accept: application/json` untuk semua endpoint private.
4. Jika response `code` adalah `unauthenticated`, hapus token lokal dan arahkan user ke login.
5. Gunakan `POST /auth/logout-all` untuk keluar dari semua device.

Token response berisi `expiresAt`; frontend bisa menyimpan nilai ini untuk pre-emptive logout sebelum request berikutnya.

## Response Mapping

Backend sudah memakai camelCase untuk field utama frontend.

```ts
type ProductDto = {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string | null;
  salePrice: number;
  minStock: number;
  stock: number;
  status: 'empty' | 'low' | 'safe';
  isActive: boolean;
};
```

```ts
type SaleDto = {
  id: string;
  invoiceNumber: string;
  cashierId: string;
  cashier: string | null;
  totalAmount: number;
  status: 'completed' | 'void';
  voidReason: string | null;
  createdAt: string;
};
```

```ts
type ApiError = {
  message: string;
  code: 'validation_failed' | 'unauthenticated' | 'forbidden' | 'not_found' | 'insufficient_stock' | 'too_many_requests' | string;
  errors?: Record<string, string[]>;
};
```

## Pagination

Endpoint list mengembalikan:

```ts
type Paginated<T> = {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: { currentPage: number; lastPage: number; perPage: number; total: number };
};
```

Gunakan `per_page` untuk mengontrol jumlah data per request.

## Reports CSV

Endpoint CSV:

- `GET /reports/stock/export`
- `GET /reports/sales/export`
- `GET /reports/inbound/export`
- `GET /reports/outbound/export`

Endpoint ini memakai filter yang sama dengan endpoint report list. Di mobile, download dapat ditangani dengan `expo-file-system` atau dibuka lewat browser/WebView sesuai kebutuhan UI.

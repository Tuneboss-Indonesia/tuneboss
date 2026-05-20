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
6. Gunakan `POST /auth/refresh` sebelum `expiresAt` untuk merotasi token tanpa login ulang. Endpoint ini membutuhkan access token yang masih valid.

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
  imagePath: string | null;
  imageUrl: string | null;
  salePrice: number;
  minStock: number;
  stock: number;
  status: 'empty' | 'low' | 'safe';
  isActive: boolean;
};
```

## Product Images

Upload foto produk memakai multipart request ke `POST /products/{id}/image` dengan field `image`. Gunakan `imageUrl` dari response product untuk menampilkan gambar di frontend. Hapus foto dengan `DELETE /products/{id}/image`.

## Restock Alerts

Gunakan `GET /restock-alerts?active_only=1` untuk badge/dashboard produk yang perlu restock. Staff bisa acknowledge alert dengan `POST /restock-alerts/{id}/acknowledge`; admin bisa resolve dengan `POST /restock-alerts/{id}/resolve`.

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

Endpoint PDF:

- `GET /reports/stock/export.pdf`
- `GET /reports/sales/export.pdf`
- `GET /reports/inbound/export.pdf`
- `GET /reports/outbound/export.pdf`

PDF memakai filter yang sama dan cocok untuk preview/cetak ringkas. Untuk export data penuh tetap gunakan CSV.

## Realtime Dashboard

Shared hosting/cPanel biasanya tidak cocok untuk websocket panjang. Gunakan polling ke `GET /dashboard/realtime`; response menyertakan `pollAfterSeconds`, `lastActivityAt`, `summary`, `priorityProducts`, dan `recentActivities`.

## Sale Preview

Sebelum submit transaksi, frontend sebaiknya memanggil `POST /sales/preview` dengan body yang sama seperti `POST /sales`. Endpoint ini menghitung harga dari backend, menggabungkan item produk yang sama, mengecek stok cukup, dan tidak mengubah stok.

Jika stok tidak cukup, response memakai `code: "insufficient_stock"` dan menyertakan `productId`, `availableStock`, dan `requestedQuantity`.

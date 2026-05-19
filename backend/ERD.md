# ERD TuneBoss Inventory Backend

ERD ini mengikuti PRD backend TuneBoss Inventory dengan stack Laravel + MariaDB/MySQL. Struktur dibuat untuk kebutuhan fase awal: autentikasi, kategori, produk, stok masuk/keluar, penjualan sederhana, dashboard, laporan JSON, dan audit log.

## Mermaid ERD

```mermaid
erDiagram
  users {
    uuid id PK
    string name
    string email UK
    string password
    enum role "admin|staff"
    boolean is_active
    timestamp email_verified_at
    timestamp created_at
    timestamp updated_at
  }

  categories {
    uuid id PK
    string name UK
    text description
    timestamp created_at
    timestamp updated_at
  }

  products {
    uuid id PK
    uuid category_id FK
    string name
    string sku UK
    string barcode UK
    decimal sale_price
    integer min_stock
    boolean is_active
    timestamp created_at
    timestamp updated_at
  }

  product_stocks {
    uuid id PK
    uuid product_id FK,UK
    integer quantity
    timestamp created_at
    timestamp updated_at
  }

  stock_movements {
    uuid id PK
    uuid product_id FK
    uuid operator_id FK
    uuid sale_id FK
    enum type "inbound|outbound|adjustment|sale"
    integer quantity
    integer before_quantity
    integer after_quantity
    string party
    text note
    timestamp created_at
    timestamp updated_at
  }

  sales {
    uuid id PK
    string invoice_number UK
    uuid cashier_id FK
    decimal total_amount
    timestamp created_at
    timestamp updated_at
  }

  sale_items {
    uuid id PK
    uuid sale_id FK
    uuid product_id FK
    integer quantity
    decimal price
    decimal subtotal
    timestamp created_at
    timestamp updated_at
  }

  audit_logs {
    uuid id PK
    uuid user_id FK
    string action
    string entity
    uuid entity_id
    json metadata
    timestamp created_at
    timestamp updated_at
  }

  categories ||--o{ products : has
  products ||--|| product_stocks : has
  products ||--o{ stock_movements : records
  users ||--o{ stock_movements : operates
  users ||--o{ sales : cashiers
  sales ||--o{ sale_items : contains
  products ||--o{ sale_items : sold_as
  sales ||--o{ stock_movements : creates
  users ||--o{ audit_logs : performs
```

## Catatan Relasi

- `users.role` cukup menggunakan enum `admin` dan `staff` untuk fase awal, belum perlu tabel `roles` terpisah.
- `products.category_id` wajib ada agar produk bisa difilter berdasarkan kategori.
- `product_stocks.product_id` dibuat unique karena satu produk hanya punya satu snapshot stok saat ini pada fase awal.
- `stock_movements` adalah ledger perubahan stok dan wajib dibuat setiap ada inbound, outbound, adjustment, atau sale.
- `product_stocks.quantity` adalah snapshot untuk dashboard dan lookup cepat, bukan pengganti ledger.
- `sales` menyimpan transaksi penjualan, sedangkan detail barang ada di `sale_items`.
- `sales` dapat menghasilkan beberapa `stock_movements` type `sale`, satu movement per produk yang terjual.
- `audit_logs` menyimpan aktivitas penting seperti login gagal, tambah produk, edit stok, hapus kategori, dan koreksi stok.

## Index Yang Disarankan

- `users.email` unique.
- `categories.name` unique.
- `products.sku` unique.
- `products.barcode` unique nullable.
- `products.category_id` index.
- `products.is_active` index.
- `product_stocks.product_id` unique.
- `stock_movements.product_id` index.
- `stock_movements.operator_id` index.
- `stock_movements.type` index.
- `stock_movements.created_at` index.
- `sales.invoice_number` unique.
- `sales.cashier_id` index.
- `sales.created_at` index.
- `sale_items.sale_id` index.
- `sale_items.product_id` index.
- `audit_logs.user_id` index.
- `audit_logs.entity` index.
- `audit_logs.created_at` index.

## Business Rules Database

- SKU wajib unik.
- Barcode wajib unik jika diisi.
- Stok tidak boleh negatif.
- Outbound dan sale wajib gagal jika stok tidak cukup.
- Semua update stok wajib dilakukan dalam database transaction.
- Produk yang sudah dipakai transaksi sebaiknya dinonaktifkan, bukan dihapus permanen.
- Kategori tidak boleh dihapus jika masih dipakai produk.

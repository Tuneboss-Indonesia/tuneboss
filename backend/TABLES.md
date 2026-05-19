# Tabel Database TuneBoss Inventory

Spesifikasi tabel ini mengikuti PRD backend TuneBoss Inventory untuk implementasi Laravel + MariaDB/MySQL. Nama kolom memakai gaya Laravel snake_case dan timestamp bawaan `created_at`/`updated_at`.

## users

Menyimpan akun admin dan staff.

| Kolom | Tipe | Key | Nullable | Default | Keterangan |
| --- | --- | --- | --- | --- | --- |
| id | uuid | PK | no | generated | ID user |
| name | varchar(150) |  | no |  | Nama user |
| email | varchar(150) | unique | no |  | Email login |
| password | varchar(255) |  | no |  | Hash password Laravel |
| role | enum(admin, staff) | index | no | staff | Role akses |
| is_active | boolean | index | no | true | Status user aktif |
| email_verified_at | timestamp |  | yes | null | Bawaan Laravel jika diperlukan |
| remember_token | varchar(100) |  | yes | null | Bawaan Laravel jika diperlukan |
| created_at | timestamp |  | yes | null | Timestamp Laravel |
| updated_at | timestamp |  | yes | null | Timestamp Laravel |

## categories

Menyimpan kategori produk seperti ECU, Kabel, Aksesoris, dan Lainnya.

| Kolom | Tipe | Key | Nullable | Default | Keterangan |
| --- | --- | --- | --- | --- | --- |
| id | uuid | PK | no | generated | ID kategori |
| name | varchar(120) | unique | no |  | Nama kategori |
| description | text |  | yes | null | Deskripsi kategori |
| created_at | timestamp |  | yes | null | Timestamp Laravel |
| updated_at | timestamp |  | yes | null | Timestamp Laravel |

## products

Menyimpan master data produk/barang.

| Kolom | Tipe | Key | Nullable | Default | Keterangan |
| --- | --- | --- | --- | --- | --- |
| id | uuid | PK | no | generated | ID produk |
| category_id | uuid | FK,index | no |  | Relasi ke `categories.id` |
| name | varchar(180) | index | no |  | Nama produk |
| sku | varchar(80) | unique | no |  | SKU unik |
| barcode | varchar(120) | unique | yes | null | Barcode unik jika diisi |
| sale_price | decimal(14,2) |  | no | 0 | Harga jual |
| min_stock | int unsigned | index | no | 0 | Minimum stok untuk alert |
| is_active | boolean | index | no | true | Status aktif produk |
| created_at | timestamp |  | yes | null | Timestamp Laravel |
| updated_at | timestamp |  | yes | null | Timestamp Laravel |

## product_stocks

Snapshot stok saat ini per produk. Tabel ini dipakai agar dashboard dan lookup cepat.

| Kolom | Tipe | Key | Nullable | Default | Keterangan |
| --- | --- | --- | --- | --- | --- |
| id | uuid | PK | no | generated | ID stok |
| product_id | uuid | FK,unique | no |  | Relasi ke `products.id` |
| quantity | int | index | no | 0 | Stok saat ini |
| created_at | timestamp |  | yes | null | Timestamp Laravel |
| updated_at | timestamp |  | yes | null | Timestamp Laravel |

## stock_movements

Ledger semua perubahan stok.

| Kolom | Tipe | Key | Nullable | Default | Keterangan |
| --- | --- | --- | --- | --- | --- |
| id | uuid | PK | no | generated | ID movement |
| product_id | uuid | FK,index | no |  | Produk yang berubah stoknya |
| operator_id | uuid | FK,index | no |  | User yang melakukan aksi |
| sale_id | uuid | FK,index | yes | null | Terisi jika movement berasal dari penjualan |
| type | enum(inbound, outbound, adjustment, sale) | index | no |  | Jenis movement |
| quantity | int |  | no |  | Jumlah movement |
| before_quantity | int |  | no |  | Stok sebelum transaksi |
| after_quantity | int |  | no |  | Stok sesudah transaksi |
| party | varchar(180) |  | yes | null | Supplier, dealer, customer, atau pihak terkait |
| note | text |  | yes | null | Catatan transaksi |
| created_at | timestamp | index | yes | null | Timestamp Laravel |
| updated_at | timestamp |  | yes | null | Timestamp Laravel |

## sales

Header transaksi penjualan.

| Kolom | Tipe | Key | Nullable | Default | Keterangan |
| --- | --- | --- | --- | --- | --- |
| id | uuid | PK | no | generated | ID penjualan |
| invoice_number | varchar(80) | unique | no |  | Nomor invoice |
| cashier_id | uuid | FK,index | no |  | User kasir/operator |
| total_amount | decimal(14,2) |  | no | 0 | Total transaksi |
| created_at | timestamp | index | yes | null | Timestamp Laravel |
| updated_at | timestamp |  | yes | null | Timestamp Laravel |

## sale_items

Detail item pada transaksi penjualan.

| Kolom | Tipe | Key | Nullable | Default | Keterangan |
| --- | --- | --- | --- | --- | --- |
| id | uuid | PK | no | generated | ID item penjualan |
| sale_id | uuid | FK,index | no |  | Relasi ke `sales.id` |
| product_id | uuid | FK,index | no |  | Produk yang terjual |
| quantity | int unsigned |  | no |  | Jumlah terjual |
| price | decimal(14,2) |  | no |  | Harga saat transaksi |
| subtotal | decimal(14,2) |  | no |  | `quantity * price` |
| created_at | timestamp |  | yes | null | Timestamp Laravel |
| updated_at | timestamp |  | yes | null | Timestamp Laravel |

## audit_logs

Mencatat aktivitas penting user.

| Kolom | Tipe | Key | Nullable | Default | Keterangan |
| --- | --- | --- | --- | --- | --- |
| id | uuid | PK | no | generated | ID audit log |
| user_id | uuid | FK,index | yes | null | User pelaku aksi, nullable untuk event sistem |
| action | varchar(120) | index | no |  | Nama aksi, contoh `product.created` |
| entity | varchar(120) | index | no |  | Nama entity, contoh `products` |
| entity_id | uuid | index | yes | null | ID record terkait |
| metadata | json |  | yes | null | Detail tambahan |
| created_at | timestamp | index | yes | null | Timestamp Laravel |
| updated_at | timestamp |  | yes | null | Timestamp Laravel |

## Foreign Key

| Dari | Ke | On Delete | Keterangan |
| --- | --- | --- | --- |
| products.category_id | categories.id | restrict | Kategori tidak boleh dihapus jika dipakai produk |
| product_stocks.product_id | products.id | cascade | Snapshot stok ikut hilang jika produk dihapus permanen |
| stock_movements.product_id | products.id | restrict | Riwayat stok tidak boleh kehilangan produk |
| stock_movements.operator_id | users.id | restrict | Movement harus punya operator |
| stock_movements.sale_id | sales.id | set null | Movement tetap ada jika sale dihapus administratif |
| sales.cashier_id | users.id | restrict | Sale harus punya kasir/operator |
| sale_items.sale_id | sales.id | cascade | Item ikut sale |
| sale_items.product_id | products.id | restrict | Item penjualan tidak boleh kehilangan produk |
| audit_logs.user_id | users.id | set null | Audit tetap tersimpan walau user dihapus administratif |

## Rule Penting

- Semua proses stok masuk, stok keluar, koreksi stok, dan penjualan wajib memakai database transaction.
- `product_stocks.quantity` tidak boleh negatif.
- `stock_movements.before_quantity` dan `stock_movements.after_quantity` wajib diisi dari nilai stok aktual saat transaksi.
- Produk yang sudah punya movement atau sale sebaiknya dinonaktifkan dengan `is_active = false`, bukan dihapus permanen.
- List endpoint wajib memakai pagination agar tetap aman di shared hosting.

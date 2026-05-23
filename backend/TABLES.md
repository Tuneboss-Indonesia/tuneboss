# Database Tables

Dokumen ini mengikuti data yang dipakai frontend aktif. Tabel/kolom legacy yang sudah tidak dipakai FE dikeluarkan dari skema aktif.

## users

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| name | string | Ditampilkan di Admin |
| email | string | Login dan Admin |
| password | string | Auth |
| role | string | `admin` atau `staff` |
| is_active | boolean | Status akun |
| created_at / updated_at | timestamp | Timestamp |

## personal_access_tokens

Tabel token Sanctum untuk login API.

## categories

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| name | string | Nama kategori |
| description | text nullable | Deskripsi kategori |
| created_at / updated_at | timestamp | Timestamp |

## products

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| category_id | uuid FK | Relasi kategori |
| name | string | Nama produk |
| sku | string unique | Kode produk |
| barcode | string nullable | Barcode/SKU scan |
| image_path | string nullable | Gambar produk |
| min_stock | integer | Batas stok menipis |
| is_active | boolean | Status produk |
| created_at / updated_at | timestamp | Timestamp |

## product_stocks

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| product_id | uuid FK unique | Produk |
| quantity | integer | Stok tersisa |
| created_at / updated_at | timestamp | Timestamp |

## sales

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| invoice_number | string unique | Dipakai laporan penjualan |
| cashier_id | uuid FK nullable | User pembuat transaksi |
| address | text nullable | Alamat/customer teks bebas |
| status | string | `completed` / `void` |
| voided_by | uuid FK nullable | User pembatal |
| voided_at | timestamp nullable | Waktu void |
| void_reason | text nullable | Alasan void |
| created_at / updated_at | timestamp | Timestamp |

## sale_items

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| sale_id | uuid FK | Transaksi |
| product_id | uuid FK | Produk |
| quantity | integer | Jumlah produk terjual |
| created_at / updated_at | timestamp | Timestamp |

## stock_movements

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| product_id | uuid FK | Produk |
| operator_id | uuid FK nullable | User yang input |
| sale_id | uuid FK nullable | Relasi ke penjualan jika stok keluar dari transaksi |
| type | string | `inbound`, `outbound`, `sale`, `adjustment` |
| quantity | integer | Jumlah pergerakan |
| before_quantity | integer | Stok sebelum |
| after_quantity | integer | Stok sesudah |
| party | string nullable | Supplier/alamat/tujuan teks bebas |
| note | text nullable | Catatan |
| created_at / updated_at | timestamp | Timestamp |

## restock_alerts

Dipakai Dashboard untuk menampilkan produk habis/menipis.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| product_id | uuid FK | Produk |
| status | string | `open`, `acknowledged`, `resolved` |
| severity | string | `low`, `empty` |
| current_stock | integer | Stok saat alert |
| threshold | integer | Batas alert |
| acknowledged_by / resolved_by | uuid FK nullable | User admin |
| acknowledged_at / resolved_at | timestamp nullable | Timestamp |
| note | text nullable | Catatan |
| created_at / updated_at | timestamp | Timestamp |

## audit_logs

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid FK nullable | User pelaku |
| action | string | Nama aksi |
| entity | string | Nama tabel/entity |
| entity_id | string nullable | ID entity |
| metadata | json nullable | Detail perubahan |
| ip_address | string nullable | IP |
| user_agent | string nullable | User agent |
| created_at | timestamp | Timestamp |

## Dihapus dari Skema Aktif

- `suppliers` dan `customers`: FE memakai input teks bebas, bukan master data.
- `restock_orders`: tidak ada menu/fitur FE aktif.
- `sales.customer_id`, `sales.total_amount`: FE memakai alamat dan kuantitas.
- `sale_items.price`, `sale_items.subtotal`: FE tidak memakai harga/subtotal.
- `stock_movements.supplier_id`, `stock_movements.customer_id`: diganti `party` teks bebas.

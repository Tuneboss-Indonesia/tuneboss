# TuneBoss.ID Inventory Dashboard — PRD + Design System

## TL;DR

Dashboard internal TuneBoss.ID untuk monitoring stok gudang berbasis React Native. Versi pertama membangun dashboard mobile app untuk Android/iOS dan web dashboard untuk desktop browser dengan data dummy, tanpa API/backend dulu. Visual wajib mengikuti hasil clone `tuneboss.com` di `C:\Users\62857\tuneboss-clone`: background hitam pekat, aksen orange TuneBoss, font bergaya Futura PT/SQR721BE, kartu gelap, CTA uppercase, glow orange, dan bottom navigation untuk mobile.

---

## 1. Konteks Produk

### Misi

Membuat dashboard stok internal yang cepat dibaca oleh admin dan pegawai gudang, konsisten dengan brand TuneBoss, dan siap disambungkan ke API pada fase berikutnya.

### Scope V1

* Dashboard React Native untuk stok gudang.
* Target utama: app installable Android dan iOS.
* Target sekunder: desktop web dashboard yang bisa dibuka di browser.
* Semua data masih dummy/local static.
* Fokus utama: layout, visual system, komponen, responsive behavior, dan empty/loading/error state.
* Fitur scan, stok masuk, stok keluar, riwayat detail, login, dan API masuk fase setelah dashboard disetujui.

### Referensi Clone

* Source clone: `C:\Users\62857\tuneboss-clone`
* File utama: `index.html`, `styles/globals.css`, `styles/components.css`, `scripts/interactions.js`
* Referensi visual utama: hero dark performance ECU, process cards, orange line/accent, phone-card, CTA section, mobile dock.

---

## 2. Goals dan Non-Goals

### Goals Dashboard V1

* Admin bisa melihat ringkasan kondisi stok dalam 5 detik pertama.
* Pegawai bisa cepat melihat produk yang stoknya rendah atau perlu tindakan.
* UI terasa seperti produk resmi TuneBoss, bukan template dashboard umum.
* Struktur komponen siap diganti dari dummy data ke API tanpa perubahan desain besar.

### Non-Goals Dashboard V1

* Belum ada autentikasi real.
* Belum ada koneksi database/API.
* Belum ada scan barcode real.
* Belum ada export CSV/PDF.
* Belum ada multi-gudang.
* Belum ada role permission real.
* Belum ada desktop app installable seperti `.exe` atau `.dmg`; desktop cukup web browser.

---

## 2.1 Platform dan Stack

### Platform Target

* Android app via Expo/React Native.
* iOS app via Expo/React Native.
* Desktop web via Expo Web/React Native Web.
* Native desktop app tidak masuk scope awal.

### Recommended Stack

* Expo sebagai runtime dan tooling utama.
* React Native untuk komponen mobile.
* React Native Web untuk desktop browser.
* TypeScript untuk data contract dan komponen.
* Dummy data lokal dulu di `src/data/dashboard.data.ts`.
* Token design di `src/theme/tokens.ts` agar mobile dan web konsisten.

### Build/Run Target

* Development mobile: `npm run start`, lalu buka di Expo Go atau emulator.
* Android: `npm run android` atau build native Expo/EAS pada fase release.
* iOS: `npm run ios` atau build native Expo/EAS pada fase release.
* Desktop web: `npm run web`.

---

## 3. Target Pengguna

### Admin

* Melihat total SKU, total unit, stok rendah, stok habis, dan aktivitas terbaru.
* Mengambil keputusan cepat untuk restock atau cek pergerakan barang.

### Pegawai Gudang

* Melihat tugas operasional hari ini.
* Mengetahui item yang butuh dicek fisik.
* Mengakses shortcut ke stok masuk, stok keluar, dan scan pada fase berikutnya.

---

## 4. Dashboard Information Architecture

### Mobile Layout Order

1. Header compact dengan logo TuneBoss, status pengguna, dan tanggal.
2. Hero summary: headline dashboard, subtitle operasional, CTA utama `Scan Barang` dummy/disabled.
3. KPI cards: total SKU, total stok, stok rendah, stok habis.
4. Quick actions: Stok Masuk, Stok Keluar, Scan Barang, Lihat Riwayat.
5. Stock health section: progress/summary kondisi stok.
6. Produk prioritas: list produk stok rendah/habis.
7. Aktivitas terbaru: timeline dummy stok masuk/keluar.
8. Bottom navigation mobile: Dashboard, Produk, Scan, Riwayat.

### Desktop/Tablet Layout Order

* Header sticky di atas dengan action kanan.
* Hero summary melebar di kiri, KPI grid di kanan/di bawah sesuai lebar layar.
* Quick actions dan stock health dalam grid dua kolom.
* Produk prioritas dan aktivitas terbaru berdampingan.

---

## 5. Functional Requirements Dashboard V1

### Header

* Menampilkan logo TuneBoss.
* Menampilkan label halaman `Inventory Dashboard`.
* Menampilkan status dummy user: `Admin Gudang`.
* Menampilkan tanggal hari ini dari dummy/static text.
* Pada mobile header tetap compact, tidak setinggi landing page clone.

### Hero Summary

* Headline memakai gaya display uppercase ala clone.
* Copy utama: `STOCK CONTROL` atau `INVENTORY PERFORMANCE`.
* Subcopy menjelaskan kondisi operasional harian.
* CTA utama `Scan Barang` tampil sebagai primary orange.
* CTA sekunder `Lihat Produk` tampil outline orange.
* Jika fitur belum aktif, CTA boleh membuka toast/dummy message: `Fitur scan akan aktif setelah integrasi API`.

### KPI Cards

* Card 1: `Total SKU` dengan nilai dummy.
* Card 2: `Total Unit` dengan nilai dummy.
* Card 3: `Stok Rendah` dengan nilai dummy dan status warning.
* Card 4: `Stok Habis` dengan nilai dummy dan status critical.
* Setiap card punya label kecil uppercase, angka besar, helper text, dan accent line orange.

### Quick Actions

* `Stok Masuk`: disabled/dummy action.
* `Stok Keluar`: disabled/dummy action.
* `Scan Barang`: disabled/dummy action.
* `Lihat Riwayat`: disabled/dummy action.
* Semua action wajib punya state default, hover, active, focus-visible, disabled, dan loading placeholder.

### Stock Health

* Menampilkan ringkasan persentase sehat/stok rendah/habis dengan dummy value.
* Visual bisa berupa stacked bar horizontal atau segmented progress card.
* Warna tetap token: orange untuk warning/action, white untuk text, grey/muted untuk secondary.
* Hindari warna hijau/merah terang kecuali nanti ditambahkan ke token.

### Produk Prioritas

* List 5 produk dummy.
* Field minimal: nama produk, SKU/barcode, stok saat ini, minimum stok, status.
* Status copy: `Aman`, `Perlu Restock`, `Habis`.
* Card produk memakai border kiri orange untuk item yang perlu tindakan.

### Aktivitas Terbaru

* List 5 aktivitas dummy.
* Field minimal: tipe aktivitas, produk, jumlah, operator, waktu.
* Tipe dummy: `Stok Masuk`, `Stok Keluar`, `Koreksi Stok`.
* Timeline memakai titik/line orange halus seperti line-field clone.

### Empty, Loading, Error

* Empty state: `Belum ada data stok untuk ditampilkan`.
* Loading state: skeleton card gelap dengan pulse orange soft.
* Error state: `Data dummy gagal dimuat` dengan tombol `Coba Lagi`.
* Semua state disiapkan meski data masih dummy.

---

## 6. Dummy Data Contract

Data dummy wajib dibuat dalam struktur yang mudah diganti API.

```ts
type DashboardSummary = {
  totalSku: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
  stockHealth: {
    healthy: number
    low: number
    empty: number
  }
}

type PriorityProduct = {
  id: string
  name: string
  sku: string
  barcode: string
  stock: number
  minStock: number
  status: "safe" | "low" | "empty"
}

type RecentActivity = {
  id: string
  type: "inbound" | "outbound" | "adjustment"
  productName: string
  quantity: number
  operator: string
  timestamp: string
}
```

### Sample Dummy Values

* Total SKU: `128`
* Total Unit: `2,460`
* Stok Rendah: `14`
* Stok Habis: `3`
* Stock Health: `82% sehat`, `12% rendah`, `6% habis`
* Produk dummy: TuneBoss ECU Yamaha, TuneBoss ECU Honda, TuneBoss Wiring Harness, USB Tuning Cable, Sticker Seal Pack.

---

## 7. Design System dari Clone TuneBoss

### Token Warna

Token ini diambil dari `styles/globals.css` clone.

```css
:root {
  --color-black: #070707;
  --color-panel: #111111;
  --color-panel-soft: #181818;
  --color-white: #f7f7f2;
  --color-muted: #98a2b3;
  --color-grey: #5c5c5c;
  --color-primary: #ed6c05;
  --color-primary-soft: #ff8b2e;
  --color-accent: #fdbd8c;
}
```

### Token Typography

```css
:root {
  --font-body: "Futura PT", Arial, sans-serif;
  --font-display: "SQR721BE", Impact, sans-serif;
}
```

* Body text memakai `Futura PT`.
* Heading hero dan angka besar boleh memakai `SQR721BE` agar terasa seperti landing TuneBoss.
* Heading dashboard wajib uppercase, compact, dan performance-oriented.
* Body line-height mengikuti clone: `1.6`.

### Token Radius, Layout, Motion

```css
:root {
  --radius-sm: 3px;
  --radius-md: 8px;
  --max-width: 1312px;
  --motion-fast: 250ms ease;
  --motion-medium: 450ms ease;
  --motion-loader: 1800ms ease-in-out;
}
```

### Surface Rules

* Page background: `#070707`.
* Main cards: `#111111` atau gradient `linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015))`.
* Raised cards: `#181818`.
* Border subtle: `rgba(255,255,255,.08)`.
* Accent border: `rgba(237,108,5,.7)`.
* Glow: orange blur dengan opacity rendah, maksimal untuk hero/summary saja.

### Button Rules

* Primary button: orange background `#ed6c05`, white text, uppercase, min-height minimal `50px`.
* Outline button: transparent background, border orange, orange text.
* Hover: translateY(-2px), outline berubah orange solid.
* Focus-visible: outline 2px orange soft dan offset 2px.
* Disabled: opacity 0.45, cursor not-allowed, tidak ada transform.

### Card Rules

* KPI dan list cards memakai background gelap.
* Accent visual utama adalah border kiri orange atau top mini-line orange.
* Tidak memakai shadow besar kecuali hero/product visual.
* Angka KPI boleh sangat besar dan display font.
* Card harus tetap readable di layar 360px.

### Mobile Dock Rules

Mengikuti pola `mobile-dock` di clone.

* Fixed bottom pada mobile.
* Background `rgba(7,7,7,.92)`.
* Border top `rgba(255,255,255,.08)`.
* 4 item: Dashboard, Produk, Scan, Riwayat.
* Item aktif memakai orange.
* Body mobile diberi padding-bottom minimal `76px`.

---

## 8. Dashboard Visual Direction

### Look and Feel

* Gelap, teknikal, performance-oriented, mirip landing ECU TuneBoss.
* Gunakan headline besar ala motorsport, bukan dashboard SaaS generik.
* Gunakan orange sebagai arah pandang utama: CTA, active nav, accent line, status perlu tindakan.
* Gunakan panel grid dan line accent untuk nuansa mesin/ECU.

### Hero Dashboard Concept

* Background dark gradient dengan subtle orange glow kanan bawah.
* Headline: `INVENTORY PERFORMANCE`.
* Eyebrow: `TuneBoss Warehouse`.
* Summary copy: `Pantau stok ECU, kabel, dan aksesoris operasional dari satu dashboard mobile.`
* Di sisi kanan/di bawah dapat ada mini card `Today's Movement` dengan inbound/outbound dummy.

### Component Copy

* `Total SKU`
* `Total Unit`
* `Stok Rendah`
* `Stok Habis`
* `Barang Perlu Dicek`
* `Aktivitas Terbaru`
* `Scan Barang`
* `Lihat Produk`
* `Stok Masuk`
* `Stok Keluar`

---

## 9. Responsive Requirements

### Mobile 360px-520px

* Single-column layout.
* KPI cards 2 kolom jika cukup, 1 kolom jika label/angka pecah.
* Bottom dock aktif.
* Header tinggi maksimal 76px.
* CTA full width atau stacked.

### Tablet 768px-900px

* KPI grid 2 kolom.
* Quick actions 2 kolom.
* Produk prioritas dan aktivitas tetap bisa 1 kolom bila sempit.

### Desktop 1024px+

* Container maksimal `1312px`.
* KPI grid 4 kolom.
* Stock health dan quick actions 2 kolom.
* Produk prioritas dan aktivitas terbaru 2 kolom.
* Bottom dock tidak tampil.

---

## 10. Accessibility Requirements

* Semua tombol dan nav bisa diakses keyboard.
* `focus-visible` wajib jelas dan tidak dihapus.
* Tap target minimal 44px, ideal 50-52px seperti clone.
* Kontras text utama di atas background gelap minimal WCAG AA.
* Label tidak hanya ikon, harus ada teks.
* Status stok tidak bergantung warna saja, wajib ada teks `Aman`, `Perlu Restock`, atau `Habis`.
* Loading, empty, dan error state harus diumumkan dengan copy jelas.

---

## 11. Acceptance Criteria Dashboard V1

### Product Acceptance

* Dashboard bisa dibuka tanpa API.
* Data dummy tampil stabil dan realistis.
* Admin bisa langsung memahami kondisi stok dari KPI dan produk prioritas.
* Semua action yang belum aktif memberi feedback dummy, bukan dead click.

### Design Acceptance

* Warna, font, button, card, dan mobile dock mengikuti clone TuneBoss.
* Tidak memakai style dashboard generic seperti blue SaaS/default admin template.
* Background dan panel tetap hitam/gelap.
* Orange TuneBoss hanya dipakai sebagai aksen dan CTA, tidak memenuhi seluruh layar.

### Technical Acceptance

* Dummy data dipisahkan dari komponen UI.
* Komponen dashboard siap menerima data dari API dengan shape yang sama.
* Responsive pada mobile, tablet, dan desktop.
* Tidak ada horizontal overflow pada 360px.
* Loading, empty, error, disabled, hover, active, dan focus-visible state tersedia.

---

## 12. Implementation Notes

### Recommended Component Breakdown

* `DashboardPage`
* `DashboardHeader`
* `DashboardHero`
* `KpiCard`
* `QuickActionGrid`
* `StockHealthCard`
* `PriorityProductList`
* `RecentActivityList`
* `MobileDock`
* `DashboardStateView` untuk empty/loading/error.

### API-Ready Data Flow

* Saat ini import dummy data dari file lokal.
* Nanti ganti source data ke API/service layer tanpa mengubah komponen presentational.
* Hindari hardcode angka langsung di JSX/view kecuali placeholder state.

### Suggested File Naming

* `dashboard.data.ts` untuk dummy data.
* `dashboard.types.ts` untuk type/contract.
* `dashboard.css` atau module/style sesuai stack project.

---

## 13. Future Phase

### Fase 2

* Integrasi API stok.
* Login admin/pegawai.
* Halaman produk dan detail produk.
* Riwayat transaksi real.

### Fase 3

* Scan barcode kamera HP/tablet.
* Input scanner USB/Bluetooth sebagai keyboard input.
* Stok masuk/keluar real.
* Koreksi stok dengan audit trail.

### Fase 4

* Export laporan CSV/PDF.
* Notifikasi restock.
* Multi-gudang jika dibutuhkan.

---

## 14. QA Checklist

* Dashboard tampil dengan data dummy tanpa koneksi internet/API.
* Layout mobile 360px tidak overflow.
* Desktop mengikuti max-width 1312px.
* Font body Futura PT dan display SQR721BE tersedia/fallback aman.
* Warna utama sesuai token clone.
* Button primary, outline, disabled, hover, active, focus-visible sudah ada.
* Card KPI dan list readable di dark background.
* Mobile dock fixed bottom dan tidak menutup konten.
* Empty/loading/error state dapat dipreview.
* Copy semua CTA jelas dan bahasa Indonesia konsisten.

---

## 15. Definition of Done

Dashboard V1 dianggap selesai jika halaman sudah menampilkan summary stok, KPI, quick actions, stock health, produk prioritas, aktivitas terbaru, dan mobile dock dengan data dummy serta visual yang konsisten dengan clone `tuneboss.com`. Implementasi belum perlu API, tetapi struktur data dan komponen harus siap untuk integrasi API berikutnya.

# ServerWatch --- Phase 2: UI Foundation & Dashboard Layout

**Project:** ServerWatch\
**Phase:** 2 --- UI Foundation & Dashboard Layout\
**Status:** Ready for implementation\
**Stack:** Next.js App Router, TypeScript, Tailwind CSS, Recharts,
Lucide React\
**Design reference:** Cost Control Dashboard Portal --- GGP (screenshot
supplied by user)

------------------------------------------------------------------------

## 1. Tujuan Phase 2

Membangun fondasi antarmuka ServerWatch dengan identitas visual yang
mengikuti **Cost Control Dashboard Portal GGP**.

Fokus fase ini adalah: - Menerapkan palet warna hijau, putih, abu-abu
lembut, dan aksen kuning. - Membuat layout dashboard yang konsisten dan
responsif. - Menyiapkan sidebar, topbar, kartu metrik, status indikator,
tabel, dan area grafik. - Membuat halaman UI menggunakan data dummy
terlebih dahulu. - Menjaga struktur komponen agar mudah diintegrasikan
dengan API Prometheus pada Phase 3.

**Catatan:** Phase 2 berfokus pada UI dan data dummy. Jangan
menghubungkan query Prometheus atau mengubah konfigurasi monitoring pada
fase ini.

------------------------------------------------------------------------

## 2. Referensi Visual dan Arah Desain

Gunakan screenshot Cost Control Dashboard Portal GGP sebagai referensi
utama.

Karakter visual yang harus dipertahankan: - Tampilan dashboard bersih,
terang, dan profesional. - Warna hijau sebagai identitas utama dan warna
aksi. - Background halaman abu-abu kehijauan yang sangat muda. - Card
berwarna putih dengan border tipis dan sudut membulat. - Teks utama
berwarna gelap dengan kontras yang jelas. - Aksen kuning untuk label
informasi atau penanda perhatian. - Ikon sederhana dengan warna hijau di
dalam wadah hijau muda. - Tombol utama berwarna hijau dengan teks putih.

Jangan mengubah desain menjadi dark dashboard. Mode yang digunakan pada
Phase 2 adalah **light theme**.

------------------------------------------------------------------------

## 3. Color Palette

Nilai HEX berikut merupakan palet implementasi yang diturunkan secara
visual dari screenshot referensi. Jadikan sebagai design token terpusat
agar mudah disesuaikan jika nantinya tersedia brand guideline resmi.

  Token              HEX         Penggunaan
  ------------------ ----------- --------------------------------------
  `primary`          `#16843F`   Tombol utama, link aktif, ikon utama
  `primary-hover`    `#116D34`   Hover tombol dan elemen aktif
  `primary-dark`     `#123321`   Heading dan teks penting
  `primary-soft`     `#EAF3EC`   Background ikon, badge hijau
  `page-bg`          `#F5F8F6`   Background utama halaman
  `surface`          `#FFFFFF`   Card, panel, tabel
  `border`           `#DCE6DF`   Border card dan pemisah
  `text-primary`     `#17251D`   Teks utama
  `text-secondary`   `#64736A`   Deskripsi dan teks sekunder
  `accent-yellow`    `#FFE27A`   Badge informasi dan label perhatian
  `success`          `#16843F`   Status normal/berhasil
  `warning`          `#D99A18`   Status peringatan
  `danger`           `#D64545`   Status kritis/error
  `info`             `#3478B8`   Informasi netral

### 3.1 Aturan penggunaan warna

1.  Hijau `#16843F` adalah warna identitas utama ServerWatch.
2.  Gunakan hijau untuk tombol utama, navigasi aktif, ikon, dan
    indikator positif.
3.  Jangan menggunakan hijau pada semua elemen sekaligus; sisakan ruang
    putih agar dashboard tetap ringan.
4.  Kuning hanya untuk badge, label, atau kondisi yang memerlukan
    perhatian. Jangan menjadikannya warna tombol utama.
5.  Merah hanya untuk kondisi kritis, bukan dekorasi.
6.  Background utama harus tetap terang dan lembut.
7.  Pastikan teks tetap terbaca dengan kontras yang cukup.

------------------------------------------------------------------------

## 4. Typography

Gunakan font sans-serif yang modern dan mudah dibaca.

Rekomendasi: - `Inter` sebagai font utama jika sudah tersedia atau dapat
ditambahkan dengan aman. - Fallback: `Arial`, `sans-serif`.

Hierarki: - Page title: 24--28 px, bold/semibold. - Section title:
16--20 px, semibold. - Metric value: 26--32 px, bold. - Body: 14 px. -
Caption/helper text: 12--13 px.

Gunakan warna `text-primary` untuk judul dan `text-secondary` untuk
deskripsi.

------------------------------------------------------------------------

## 5. Layout Aplikasi

Gunakan pola dashboard desktop dengan sidebar dan topbar.

### 5.1 Sidebar

Sidebar berada di sisi kiri dan memiliki: - Logo/icon ServerWatch. -
Nama aplikasi: **ServerWatch**. - Subtitle singkat: **Infrastructure
Monitoring**. - Menu navigasi: - Overview - Server Performance -
Applications - Bagian bawah sidebar: - Status koneksi monitoring. -
Versi aplikasi (opsional).

Ketentuan: - Background putih. - Border kanan menggunakan warna
`border`. - Menu aktif menggunakan background `primary-soft`, teks dan
ikon `primary`. - Menu nonaktif menggunakan `text-secondary`. - Sediakan
tampilan collapsed untuk layar yang lebih kecil jika memungkinkan.

### 5.2 Topbar

Topbar berisi: - Judul halaman atau breadcrumb. - Status koneksi ke
monitoring service. - Waktu pembaruan data terakhir. - Tombol refresh
manual.

Gunakan background putih, border bawah tipis, dan tinggi yang
proporsional.

### 5.3 Main Content

-   Background `page-bg`.
-   Padding desktop sekitar 24 px.
-   Jarak antar-section konsisten.
-   Gunakan grid responsif.
-   Card menggunakan background putih, border tipis, radius 12--16 px,
    dan shadow sangat halus.
-   Hindari shadow yang terlalu gelap atau efek glassmorphism.

------------------------------------------------------------------------

## 6. Halaman dan Komponen UI

### 6.1 Overview

Halaman utama untuk melihat kondisi umum VPS.

Susunan konten:

**A. Page Header** - Judul: `Server Overview` - Deskripsi:
`Ringkasan kondisi infrastruktur dan aplikasi pada server.` - Label
status sistem, misalnya `All Systems Operational` untuk data dummy.

**B. Metric Cards**

Tampilkan empat kartu utama: 1. CPU Usage 2. Memory Usage 3. Disk Usage
4. Network Traffic

Setiap kartu berisi: - Ikon. - Nama metrik. - Nilai utama dan satuan. -
Keterangan singkat. - Status warna jika relevan.

Gunakan nilai dummy yang diberi penanda agar tidak disalahartikan
sebagai data server aktual.

**C. Performance Trend** - Grafik penggunaan CPU. - Grafik penggunaan
RAM. - Rentang waktu contoh: 1 jam. - Gunakan Recharts. - Tooltip dan
label sumbu harus mudah dibaca. - Gunakan hijau sebagai warna seri
utama; warna lain hanya sebagai pembeda seri.

**D. Application Summary** - Jumlah aplikasi/container yang terpantau. -
Jumlah aplikasi berstatus running. - Jumlah aplikasi yang mengalami
masalah. - Tautan menuju halaman Applications.

### 6.2 Server Performance

Halaman detail performa VPS.

Bagian yang disiapkan: - CPU utilization. - Memory usage dan memory
available. - Disk usage untuk filesystem utama. - Network receive dan
transmit. - Grafik tren performa.

Jangan membuat klaim status berdasarkan nilai dummy. Beri label
`Sample Data` atau `Demo` selama belum terhubung ke API.

### 6.3 Applications

Halaman daftar aplikasi/container yang dipantau.

Kolom tabel: - Application / Container Name - Type - CPU - Memory -
Status - Last Updated - Action

Ketentuan: - Gunakan tabel yang bersih dan mudah dipindai. - Status
ditampilkan sebagai badge. - Sediakan pencarian sederhana jika tidak
membuat implementasi terlalu kompleks. - Klik baris atau tombol detail
untuk menuju halaman Application Detail.

Untuk Phase 2, data aplikasi boleh menggunakan beberapa contoh container
yang tidak merepresentasikan status aktual server.

### 6.4 Application Detail

Halaman detail satu aplikasi/container.

Bagian: - Nama aplikasi/container. - Status. - Ringkasan CPU dan
memory. - Grafik penggunaan CPU. - Grafik penggunaan memory. - Informasi
metadata sederhana.

Gunakan data dummy dan siapkan struktur komponen agar nanti mudah
menerima data API.

------------------------------------------------------------------------

## 7. Status Indicator dan Badge

Gunakan aturan visual berikut:

  Status              Warna     Makna
  ------------------- --------- ------------------------------
  Running / Healthy   Hijau     Berjalan normal
  Warning             Kuning    Memerlukan perhatian
  Critical / Down     Merah     Gangguan atau tidak berjalan
  Unknown             Abu-abu   Status belum diketahui

Jangan menentukan status hanya dari warna. Selalu sertakan teks status
agar mudah dipahami dan aksesibel.

Untuk badge informasi umum, gunakan aksen kuning seperti pada label
modul di Cost Control Portal.

------------------------------------------------------------------------

## 8. Struktur Komponen yang Disarankan

Pertahankan struktur proyek dari Phase 1. Jika proyek menggunakan
direktori `src`, struktur yang disarankan:

``` text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── server-performance/
│   │   └── page.tsx
│   ├── applications/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── app-sidebar.tsx
│   │   ├── app-topbar.tsx
│   │   └── dashboard-shell.tsx
│   ├── dashboard/
│   │   ├── page-header.tsx
│   │   ├── metric-card.tsx
│   │   ├── status-badge.tsx
│   │   ├── performance-chart.tsx
│   │   └── application-table.tsx
│   └── ui/
│       ├── card.tsx
│       └── section-heading.tsx
├── lib/
│   ├── utils.ts
│   └── mock-data.ts
└── types/
    └── monitoring.ts
```

Sesuaikan dengan struktur aktual hasil Phase 1. Jangan membuat ulang
proyek Next.js jika proyek sudah berhasil dibuat.

------------------------------------------------------------------------

## 9. Design Tokens di Tailwind/CSS

Tempatkan token warna pada satu sumber konfigurasi, misalnya
`src/app/globals.css` menggunakan CSS variables.

Contoh:

``` css
:root {
  --color-primary: #16843F;
  --color-primary-hover: #116D34;
  --color-primary-dark: #123321;
  --color-primary-soft: #EAF3EC;

  --color-page-bg: #F5F8F6;
  --color-surface: #FFFFFF;
  --color-border: #DCE6DF;

  --color-text-primary: #17251D;
  --color-text-secondary: #64736A;

  --color-accent-yellow: #FFE27A;
  --color-success: #16843F;
  --color-warning: #D99A18;
  --color-danger: #D64545;
  --color-info: #3478B8;
}

body {
  background: var(--color-page-bg);
  color: var(--color-text-primary);
}
```

Jika konfigurasi Tailwind proyek sudah menggunakan pendekatan theme
tertentu, integrasikan token ke konfigurasi yang ada. Hindari
menambahkan konfigurasi yang saling bertentangan.

------------------------------------------------------------------------

## 10. Data Dummy

Buat data dummy terpisah di `lib/mock-data.ts`.

Ketentuan: - Beri nama variabel yang jelas, misalnya `mockServerMetrics`
dan `mockApplications`. - Tambahkan komentar bahwa data hanya untuk
kebutuhan UI. - Gunakan timestamp contoh yang konsisten untuk grafik. -
Jangan menampilkan data dummy seolah-olah data real-time. - Jangan
menaruh URL Prometheus atau credential pada kode frontend.

Contoh tipe data:

``` ts
export type MetricStatus = "healthy" | "warning" | "critical" | "unknown";

export interface ServerMetric {
  label: string;
  value: number;
  unit: string;
  status: MetricStatus;
}

export interface MonitoredApplication {
  id: string;
  name: string;
  type: "docker";
  cpuUsage: number;
  memoryUsage: number;
  status: MetricStatus;
}
```

------------------------------------------------------------------------

## 11. Responsiveness

Pastikan layout mendukung: - Desktop: sidebar tetap terlihat dan konten
menggunakan grid beberapa kolom. - Tablet: grid menyesuaikan lebar
layar. - Mobile: sidebar menjadi drawer/menu ringkas dan kartu tersusun
satu kolom.

Tabel harus tetap dapat digunakan di layar kecil, misalnya dengan
horizontal scrolling pada area tabel.

Jangan mengorbankan keterbacaan hanya untuk memuat semua informasi dalam
satu layar.

------------------------------------------------------------------------

## 12. Aturan Implementasi dan Batasan

1.  Gunakan Next.js App Router dan TypeScript sesuai setup Phase 1.
2.  Gunakan Tailwind CSS untuk styling.
3.  Gunakan Recharts hanya untuk grafik yang dibutuhkan.
4.  Gunakan Lucide React untuk ikon.
5.  Buat komponen reusable; hindari satu file halaman yang terlalu
    besar.
6.  Jangan menambahkan database pada Phase 2.
7.  Jangan menghubungkan frontend langsung ke Prometheus.
8.  Jangan menampilkan credential, token, atau environment variable pada
    browser.
9.  Jangan mengubah Docker Compose monitoring, Prometheus, Node
    Exporter, cAdvisor, PM2, Nginx, atau Cloudflare Tunnel pada fase
    ini.
10. Jangan melakukan restart service VPS yang sudah berjalan.
11. Jangan menginstal exporter PM2 pada fase ini.
12. Hindari animasi berat, polling cepat, dan efek visual yang tidak
    diperlukan.

------------------------------------------------------------------------

## 13. Tahapan Pengerjaan

### Step 1 --- Design Foundation

-   [ ] Buat CSS variables untuk color palette.
-   [ ] Atur typography dan global styles.
-   [ ] Buat reusable card, badge, dan button.
-   [ ] Pastikan tampilan light theme.

### Step 2 --- Dashboard Shell

-   [ ] Buat sidebar.
-   [ ] Buat topbar.
-   [ ] Buat responsive dashboard shell.
-   [ ] Buat navigasi antarhalaman.

### Step 3 --- Overview

-   [ ] Buat page header.
-   [ ] Buat empat metric cards.
-   [ ] Buat grafik CPU dan RAM.
-   [ ] Buat application summary.
-   [ ] Tambahkan label demo/sample data.

### Step 4 --- Monitoring Pages

-   [ ] Buat halaman Server Performance.
-   [ ] Buat halaman Applications.
-   [ ] Buat halaman Application Detail.
-   [ ] Hubungkan navigasi antarhalaman menggunakan data dummy.

### Step 5 --- Quality Check

-   [ ] Periksa tampilan desktop.
-   [ ] Periksa tampilan tablet.
-   [ ] Periksa tampilan mobile.
-   [ ] Pastikan tidak ada overflow yang tidak diinginkan.
-   [ ] Jalankan `npx tsc --noEmit`.
-   [ ] Jalankan `npm run build`.
-   [ ] Perbaiki error sebelum melanjutkan.

------------------------------------------------------------------------

## 14. Acceptance Criteria

Phase 2 dinyatakan selesai apabila:

-   [ ] Identitas visual mengikuti referensi Cost Control Dashboard
    Portal GGP.
-   [ ] Warna utama hijau, background terang, card putih, dan aksen
    kuning diterapkan konsisten.
-   [ ] Sidebar dan topbar berfungsi.
-   [ ] Halaman Overview selesai.
-   [ ] Halaman Server Performance selesai.
-   [ ] Halaman Applications selesai.
-   [ ] Halaman Application Detail selesai.
-   [ ] Semua halaman dapat dinavigasikan.
-   [ ] Grafik dapat menampilkan data dummy.
-   [ ] Status memiliki label teks, bukan warna saja.
-   [ ] Layout responsif.
-   [ ] TypeScript dan production build berhasil.
-   [ ] Tidak ada perubahan pada monitoring stack atau aplikasi produksi
    yang sudah berjalan.

------------------------------------------------------------------------

## 15. Output Phase 2

Hasil akhir yang diharapkan: 1. Fondasi UI ServerWatch dengan tema
visual GGP. 2. Design tokens dan reusable UI components. 3. Dashboard
shell dengan sidebar dan topbar. 4. Empat halaman utama dengan data
dummy. 5. Grafik dan tabel yang siap menerima data API. 6. Build Next.js
berhasil.

------------------------------------------------------------------------

## 16. Persiapan Phase 3

Phase 3 akan berfokus pada integrasi backend dengan Prometheus API.

Persiapan yang perlu dipertahankan: - Data dummy dipisahkan dari
komponen UI. - Tipe data monitoring disimpan di folder `types`. -
Komponen grafik menerima data melalui props. - Frontend tidak mengakses
Prometheus secara langsung. - Integrasi dilakukan melalui Next.js Route
Handlers/server-side code. - URL Prometheus disimpan di environment
variable server-side.

**Jangan mulai integrasi Prometheus sebelum UI Phase 2 selesai dan lolos
pemeriksaan build.**

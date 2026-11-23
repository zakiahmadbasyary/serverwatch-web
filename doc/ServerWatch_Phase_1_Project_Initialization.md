# ServerWatch --- Phase 1: Project Initialization

**Project:** ServerWatch\
**Phase:** 1 --- Project Initialization\
**Document Version:** 1.0\
**Status:** Implementation Guide\
**Target:** Local development environment

------------------------------------------------------------------------

## 1. Tujuan

Phase 1 bertujuan menyiapkan fondasi project ServerWatch sebelum masuk
ke pengembangan UI/UX dan integrasi Prometheus.

Pada fase ini, pekerjaan dibatasi pada:

1.  Membuat project Next.js.
2.  Menggunakan TypeScript dan Tailwind CSS.
3.  Memasang library visualisasi dan ikon yang diperlukan.
4.  Menyiapkan struktur folder awal.
5.  Memastikan aplikasi dapat dijalankan di lingkungan lokal.

**Belum termasuk:** integrasi Prometheus, monitoring Docker/PM2,
autentikasi, database, dan deployment ke VPS.

## 2. Technology Stack

  -----------------------------------------------------------------------
  Kebutuhan               Teknologi               Keterangan
  ----------------------- ----------------------- -----------------------
  Framework               Next.js                 Framework utama
                                                  aplikasi web

  UI library              React                   Membangun komponen
                                                  antarmuka

  Language                TypeScript              Type safety

  Styling                 Tailwind CSS            Styling antarmuka

  Chart                   Recharts                Visualisasi grafik
                                                  monitoring pada fase
                                                  berikutnya

  Icon                    Lucide React            Ikon navigasi dan
                                                  dashboard

  Package manager         npm                     Mengelola dependency
  -----------------------------------------------------------------------

Gunakan versi dependency yang kompatibel dan tercatat pada
`package-lock.json`. Jangan memasang library tambahan yang belum
diperlukan.

## 3. Prasyarat

Pastikan perangkat pengembangan sudah memiliki:

-   Node.js versi LTS yang kompatibel dengan versi Next.js yang dipilih.
-   npm.
-   Visual Studio Code atau editor kode sejenis.
-   Terminal PowerShell, Command Prompt, atau terminal bawaan editor.

Periksa instalasi:

``` bash
node -v
npm -v
```

Jika kedua perintah menampilkan versi, lingkungan dasar siap digunakan.

## 4. Membuat Project Next.js

Jalankan perintah berikut dari direktori tempat project akan disimpan:

``` bash
npx create-next-app@latest serverwatch-web
```

Gunakan konfigurasi berikut ketika wizard menampilkan pertanyaan:

  Pertanyaan                                            Pilihan
  ----------------------------------------------------- -------------------
  Would you like to use TypeScript?                     Yes
  Which linter would you like to use?                   ESLint
  Would you like to use React Compiler?                 No
  Would you like to use Tailwind CSS?                   Yes
  Would you like your code inside a `src/` directory?   Yes
  Would you like to use App Router?                     Yes
  Would you like to customize the import alias?         No, gunakan `@/*`

> Catatan: teks pertanyaan pada wizard dapat sedikit berbeda tergantung
> versi `create-next-app`. Pilih opsi yang setara dengan tabel di atas.

Masuk ke direktori project:

``` bash
cd serverwatch-web
```

## 5. Memasang Dependency

Pasang Recharts dan Lucide React:

``` bash
npm install recharts lucide-react
```

Kegunaan:

-   **Recharts:** membuat grafik time-series dan visualisasi metrik CPU,
    RAM, disk, serta network pada fase UI dan integrasi data.
-   **Lucide React:** menyediakan ikon untuk sidebar, kartu statistik,
    navigasi, dan elemen antarmuka.

Tidak perlu memasang database, Redis, library autentikasi, atau exporter
pada fase ini.

## 6. Struktur Folder Awal

Gunakan struktur awal berikut. Folder dan file yang belum digunakan
dapat dibuat ketika memasuki fase terkait.

``` text
serverwatch-web/
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── overview/
│   │   │   ├── server/
│   │   │   └── applications/
│   │   ├── dashboard/
│   │   ├── applications/
│   │   ├── server/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── charts/
│   │   └── applications/
│   ├── services/
│   │   └── prometheus/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── .gitignore
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

### Tanggung jawab folder

  -----------------------------------------------------------------------
  Folder                              Tanggung jawab
  ----------------------------------- -----------------------------------
  `app/`                              Routing halaman dan API Route
                                      Handlers

  `app/api/`                          Endpoint backend untuk data
                                      monitoring

  `components/layout/`                Sidebar, header, dan layout

  `components/dashboard/`             Kartu statistik dan komponen
                                      overview

  `components/charts/`                Komponen grafik

  `components/applications/`          Tabel dan komponen aplikasi

  `services/prometheus/`              Client dan query Prometheus pada
                                      fase integrasi

  `hooks/`                            Custom React hooks

  `lib/`                              Utility dan konfigurasi bersama

  `types/`                            Definisi tipe TypeScript
  -----------------------------------------------------------------------

Jangan membuat file implementasi Prometheus pada fase ini. Struktur
folder hanya disiapkan untuk mempermudah pengembangan berikutnya.

## 7. Menjalankan Aplikasi

Jalankan development server:

``` bash
npm run dev
```

Buka browser:

``` text
http://localhost:3000
```

Pastikan halaman awal Next.js tampil tanpa error.

Untuk menghentikan development server, tekan `Ctrl + C` pada terminal
yang menjalankannya.

## 8. Pemeriksaan Build

Setelah aplikasi berhasil dijalankan, periksa TypeScript dan proses
build:

``` bash
npx tsc --noEmit
npm run build
```

Kedua perintah harus selesai tanpa error.

Jika ada error, perbaiki terlebih dahulu sebelum melanjutkan ke Phase 2.

## 9. Konfigurasi Git

Inisialisasi repository lokal:

``` bash
git init
git add .
git commit -m "chore: initialize ServerWatch project"
```

Pastikan file berikut tidak masuk repository:

-   `.env`
-   `.env.local`
-   Credential atau token.
-   File hasil build dan folder dependency yang sudah diatur dalam
    `.gitignore`.

Jangan menambahkan URL Prometheus internal, password, atau secret ke
kode frontend.

## 10. Batasan Resource dan Keamanan

Phase 1 dikerjakan di komputer lokal, bukan langsung di VPS perusahaan.

Prinsip yang harus dipertahankan:

1.  Tidak mengubah container monitoring yang sudah berjalan.
2.  Tidak mengubah konfigurasi PM2 atau aplikasi perusahaan.
3.  Tidak memasang Prometheus atau cAdvisor ulang.
4.  Tidak membuat database baru.
5.  Tidak melakukan deployment ke VPS pada fase ini.
6.  Tidak menambahkan dependency yang belum dibutuhkan.

Penghematan resource pada fase ini dilakukan dengan menjaga dependency
tetap minimal dan menunda proses monitoring aktual sampai fase
integrasi.

## 11. Checklist Penyelesaian Phase 1

-   [ ] Node.js dan npm tersedia.
-   [ ] Project `serverwatch-web` berhasil dibuat.
-   [ ] TypeScript aktif.
-   [ ] Tailwind CSS aktif.
-   [ ] App Router dan direktori `src/` digunakan.
-   [ ] Recharts berhasil dipasang.
-   [ ] Lucide React berhasil dipasang.
-   [ ] Struktur folder awal tersedia.
-   [ ] `npm run dev` berhasil dijalankan.
-   [ ] Halaman `http://localhost:3000` dapat dibuka.
-   [ ] `npx tsc --noEmit` berhasil.
-   [ ] `npm run build` berhasil.
-   [ ] Git repository lokal sudah diinisialisasi.

## 12. Output Phase 1

Phase 1 dinyatakan selesai apabila tersedia:

1.  Project Next.js bernama `serverwatch-web`.
2.  Konfigurasi TypeScript dan Tailwind CSS.
3.  Dependency Recharts dan Lucide React.
4.  Struktur folder awal.
5.  Aplikasi dapat berjalan di lokal.
6.  Type checking dan production build berhasil.

**Hasil akhir:** fondasi project ServerWatch siap digunakan untuk Phase
2 --- UI/UX Development.

------------------------------------------------------------------------

## 13. Langkah Berikutnya

Setelah checklist Phase 1 terpenuhi, lanjutkan ke Phase 2 dengan fokus
pada:

-   Desain dashboard overview.
-   Sidebar dan navigasi.
-   Kartu CPU, RAM, disk, dan network.
-   Grafik performa menggunakan dummy data.
-   Tabel aplikasi Docker dan PM2 menggunakan dummy data.
-   Responsive layout.

Pada Phase 2, seluruh data masih berupa dummy data. Integrasi Prometheus
baru dilakukan pada Phase 3.

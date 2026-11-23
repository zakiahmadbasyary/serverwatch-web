# ServerWatch --- Phase 3: Backend Integration & Prometheus API

**Project:** ServerWatch\
**Phase:** 3 --- Backend Integration & Prometheus API\
**Status:** Implementation guide\
**Stack:** Next.js App Router, TypeScript, Prometheus, Node Exporter,
cAdvisor\
**Deployment target:** VPS GGP, with public dashboard access through
Cloudflare Tunnel and protected access

------------------------------------------------------------------------

## 1. Tujuan Phase 3

Phase 3 bertujuan menghubungkan UI ServerWatch dari Phase 2 dengan data
monitoring aktual yang dikumpulkan Prometheus.

Pada Phase 2, dashboard menggunakan data dummy dari `mock-data.ts`. Pada
fase ini, data CPU, memory, disk, dan network mulai diambil dari
Prometheus melalui backend Next.js.

Fokus utama: - Menyiapkan komunikasi backend Next.js ke Prometheus. -
Membuat API untuk health check dan metrik VPS. - Mengambil data instant
dan historical melalui Prometheus HTTP API. - Mengintegrasikan hasil API
ke komponen dashboard. - Menangani loading, error, timeout, dan kondisi
data kosong. - Menjaga Prometheus dan exporter tetap berada di jaringan
internal.

**Batasan:** Phase 3 berfokus pada metrik VPS dari Node Exporter dan
metrik container dari cAdvisor yang sudah tersedia. Integrasi PM2 secara
khusus dilakukan pada fase berikutnya.

## 2. Konteks Infrastruktur GGP

Gunakan informasi berikut sebagai referensi, bukan nilai aktual yang
harus dipaksakan ke dalam kode.

### 2.1 Spesifikasi VPS

-   OS: Ubuntu Server.
-   CPU: 2 vCPU.
-   RAM: sekitar 7.8 GiB.
-   Disk: sekitar 96 GB.
-   Penggunaan disk yang pernah dilaporkan: sekitar 41 GB.
-   Sisa disk yang pernah dilaporkan: sekitar 55 GB.

Nilai tersebut merupakan hasil pemeriksaan sebelumnya dan dapat berubah.
Data aktual pada dashboard harus berasal dari Prometheus.

### 2.2 Monitoring stack yang sudah tersedia

-   `serverwatch-prometheus`
-   `serverwatch-node-exporter`
-   `serverwatch-cadvisor`
-   `serverwatch-grafana`

Konfigurasi Prometheus yang sudah dibuat: - Scrape interval: 30 detik. -
Evaluation interval: 30 detik. - Retensi waktu: 15 hari. - Batas ukuran
TSDB: 2 GB.

Prometheus dan Grafana sebelumnya dibind ke loopback host. Jangan
mengubah binding atau membuka port monitoring ke internet tanpa
kebutuhan yang disetujui.

## 3. Arsitektur yang Diharapkan

``` text
IT Team / Browser
       |
       v
Cloudflare Tunnel + Cloudflare Access
       |
       v
ServerWatch Next.js Application
       |
       v
Next.js Route Handlers (Backend API)
       |
       v
Prometheus HTTP API
       |
       +----------------------+
       |                      |
       v                      v
Node Exporter              cAdvisor
CPU, RAM, disk,            Docker container
network VPS                CPU, RAM, network
```

Ketentuan: - Browser tidak boleh mengakses Prometheus secara langsung. -
URL Prometheus hanya digunakan pada server-side code. - Backend Next.js
menjadi perantara seluruh query metrik. - Gunakan jaringan internal
Docker saat ServerWatch dijalankan sebagai container di VPS. - Untuk
development lokal, gunakan akses aman seperti SSH tunnel jika
diperlukan. - Jangan mengasumsikan nama Docker network sebelum
memeriksanya.

## 4. Tanggung Jawab Pengguna dan AI Agent

### 4.1 Tugas pengguna / pengelola VPS

1.  Memastikan Phase 2 selesai.
2.  Menjalankan pemeriksaan TypeScript dan production build.
3.  Memeriksa status container monitoring.
4.  Memeriksa readiness Prometheus.
5.  Memeriksa status scrape targets Node Exporter dan cAdvisor.
6.  Memberikan hasil pemeriksaan kepada AI Agent atau pendamping teknis.
7.  Menjalankan perintah VPS yang sudah dipahami dan disetujui.
8.  Menjaga credential, token, IP sensitif, dan environment variable
    agar tidak ikut dibagikan.

### 4.2 Tugas AI Agent

1.  Memeriksa struktur proyek dan interface TypeScript yang sudah ada.
2.  Membuat konfigurasi koneksi Prometheus di server-side.
3.  Membuat helper query Prometheus.
4.  Membuat endpoint health check.
5.  Membuat endpoint metrik CPU, memory, disk, dan network.
6.  Membuat dukungan query historical/range.
7.  Mengintegrasikan API dengan UI Phase 2.
8.  Membuat loading, error, empty, dan disconnected states.
9.  Menjaga kompatibilitas komponen dan tipe data.
10. Menjalankan TypeScript check dan production build.
11. Menyediakan ringkasan file yang dibuat/diubah dan hasil pengujian.

## 5. Persiapan Sebelum Coding

### 5.1 Validasi proyek lokal

Di direktori proyek ServerWatch, jalankan:

``` bash
npx tsc --noEmit
npm run build
```

Pastikan kedua perintah berhasil sebelum memulai perubahan Phase 3.

### 5.2 Validasi container monitoring di VPS

``` bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Pastikan container monitoring yang dibutuhkan tersedia.

### 5.3 Periksa Prometheus readiness

``` bash
docker exec serverwatch-prometheus \
  wget -qO- http://localhost:9090/-/ready
```

Hasil yang diharapkan:

``` text
Prometheus Server is Ready.
```

Jika image tidak menyediakan `wget`, gunakan pemeriksaan dari host:

``` bash
curl -sS http://127.0.0.1:9090/-/ready
```

### 5.4 Periksa scrape targets

``` bash
curl -sS http://127.0.0.1:9090/api/v1/targets
```

Periksa status target: - `serverwatch-node` - `serverwatch-cadvisor`

Target yang sehat seharusnya memiliki status `up`.

Jika target belum `up`, periksa konfigurasi dan log terkait. Jangan
langsung mengubah atau me-restart seluruh monitoring stack.

### 5.5 Periksa Docker network

Sebelum deployment ServerWatch sebagai container, periksa network:

``` bash
docker network ls
```

Periksa network yang digunakan Prometheus:

``` bash
docker inspect serverwatch-prometheus \
  --format '{{json .NetworkSettings.Networks}}'
```

Gunakan network aktual tersebut saat menyiapkan koneksi ServerWatch.
Jangan menebak nama network.

## 6. Backend Foundation

### 6.1 Environment variable

Buat environment variable server-side:

``` env
PROMETHEUS_URL=http://127.0.0.1:9090
```

Nilai di atas sesuai untuk proses Next.js yang berjalan langsung pada
host yang sama dengan Prometheus. Untuk development lokal di laptop,
nilai yang sama juga digunakan, tetapi `127.0.0.1:9090` laptop harus
diteruskan ke Prometheus VPS melalui SSH Tunnel (lihat bagian 6.1.1).

Jika Next.js berjalan dalam container di VPS, gunakan alamat
service/container Prometheus melalui Docker network yang sama, misalnya:

``` env
PROMETHEUS_URL=http://serverwatch-prometheus:9090
```

Alamat container hanya valid jika DNS/network Docker memungkinkan
koneksi tersebut. Verifikasi sebelum digunakan.

Ketentuan keamanan:

- Jangan gunakan prefix `NEXT_PUBLIC_` untuk `PROMETHEUS_URL`.
- Jangan mengirim URL internal atau credential ke browser.
- Jangan menaruh secret di repository.
- Sertakan `.env.example` dengan placeholder yang aman.
- Pastikan `.env.local` dan file environment rahasia masuk `.gitignore`.

### 6.1.1 Development lokal melalui SSH Tunnel (Windows)

**Kondisi yang digunakan saat ini:** ServerWatch dijalankan di laptop
Windows, sedangkan Prometheus berjalan di VPS GGP dan hanya di-bind ke
loopback VPS. Karena itu, laptop tidak boleh mengakses port Prometheus
secara langsung melalui IP publik. Gunakan SSH local port forwarding.

Alur koneksi:

``` text
Browser
  |
  v
Next.js di laptop (localhost:3000)
  |
  v
PROMETHEUS_URL=http://127.0.0.1:9090
  |
  v
SSH Tunnel (port lokal laptop 9090)
  |
  v
127.0.0.1:9090 di VPS GGP
  |
  v
Prometheus
```

**A. Pastikan Prometheus siap di VPS**

Masuk ke VPS melalui SSH dan jalankan:

``` bash
curl -sS http://127.0.0.1:9090/-/ready
```

Hasil yang diharapkan:

``` text
Prometheus Server is Ready.
```

Jika perintah gagal, periksa status container dan readiness Prometheus
di VPS terlebih dahulu. Jangan membuka port 9090 ke internet.

**B. Buka SSH Tunnel dari laptop**

Buka PowerShell pertama di laptop. Jalankan perintah berikut dan ganti
`IP_VPS` dengan alamat IP publik VPS:

``` powershell
ssh -N -L 9090:127.0.0.1:9090 root@IP_VPS
```

Keterangan:

- `-L 9090:127.0.0.1:9090` meneruskan port 9090 laptop ke port 9090
  loopback pada VPS melalui koneksi SSH.
- `-N` tidak membuka shell remote; sesi hanya mempertahankan tunnel.
- Terminal dapat terlihat diam setelah autentikasi berhasil. Ini normal.
- Biarkan jendela PowerShell tersebut tetap terbuka selama development
  membutuhkan koneksi Prometheus.
- Jika port 9090 laptop sudah digunakan, pilih port lokal lain, misalnya
  `9091`, lalu sesuaikan URL pada `.env.local` menjadi
  `http://127.0.0.1:9091`.

**C. Uji tunnel dari PowerShell kedua**

Jangan menutup PowerShell pertama. Buka PowerShell baru, lalu jalankan:

``` powershell
curl.exe http://127.0.0.1:9090/-/ready
```

Hasil yang diharapkan:

``` text
Prometheus Server is Ready.
```

Jika muncul `Could not connect to server`, pastikan sesi SSH pertama
masih aktif, periksa IP dan autentikasi SSH, lalu periksa apakah port
lokal 9090 sedang digunakan. Untuk melihat listener pada Windows:

``` powershell
netstat -ano | findstr :9090
```

Jika SSH menampilkan error saat membuat forwarding, periksa pesan error
tersebut. Jangan mengubah binding Prometheus menjadi `0.0.0.0` sebagai
solusi.

**D. Atur environment variable lokal**

Di root project ServerWatch (sejajar dengan `package.json`), buat atau
perbarui `.env.local`:

``` env
PROMETHEUS_URL=http://127.0.0.1:9090
```

Pastikan `.env.local` tercantum di `.gitignore`. Jangan menambahkan
prefix `NEXT_PUBLIC_`.

**E. Jalankan Next.js dan uji endpoint health**

Jika Next.js sedang berjalan, hentikan proses development lalu jalankan
ulang agar environment variable terbaca:

``` bash
npm run dev
```

Buka endpoint berikut di browser:

``` text
http://localhost:3000/api/health
```

Endpoint health harus melakukan query sederhana ke Prometheus, misalnya
`up`, dan mengembalikan status koneksi tanpa membocorkan URL internal,
stack trace, atau konfigurasi sensitif. Contoh respons sukses:

``` json
{
  "success": true,
  "message": "ServerWatch berhasil terhubung ke Prometheus",
  "prometheusStatus": [
    {
      "metric": {},
      "value": [0, "1"]
    }
  ],
  "checkedAt": "2026-11-23T00:00:00.000Z"
}
```

Timestamp di atas hanya contoh format, bukan waktu hasil pemeriksaan.
Nilai `1` menunjukkan target `up` yang dikembalikan query; validasi
bahwa hasil query tidak kosong dan status Prometheus sukses sebelum
menyatakan koneksi sehat.

**F. Checklist koneksi development lokal**

- [ ] Prometheus readiness berhasil dari VPS.
- [ ] SSH Tunnel aktif dari laptop.
- [ ] `curl.exe http://127.0.0.1:9090/-/ready` berhasil dari laptop.
- [ ] `.env.local` berisi `PROMETHEUS_URL=http://127.0.0.1:9090`.
- [ ] `.env.local` tidak masuk repository.
- [ ] Next.js dijalankan ulang setelah perubahan environment.
- [ ] `GET /api/health` berhasil dari browser atau API client.

Catatan: SSH Tunnel adalah koneksi development dari laptop. Tunnel harus
aktif selama Next.js lokal memerlukan Prometheus. Saat ServerWatch
nantinya dijalankan di VPS, gunakan koneksi internal host atau Docker
network sesuai lokasi proses Next.js; jangan bergantung pada SSH Tunnel
laptop untuk deployment produksi.

### 6.2 Prometheus client helper

Buat helper server-side untuk: - Membaca `PROMETHEUS_URL`. - Menjalankan
instant query ke `/api/v1/query`. - Menjalankan range query ke
`/api/v1/query_range`. - Memvalidasi respons Prometheus. - Menangani
timeout dan error HTTP. - Mengembalikan bentuk data yang konsisten ke
Route Handlers.

Gunakan timeout yang wajar dan hindari request tanpa batas waktu.

Jangan membuat helper yang hanya bisa dipanggil dari browser.

### 6.3 Penanganan error

Backend harus membedakan: - Prometheus tidak dapat dijangkau. - Query
Prometheus gagal. - Respons Prometheus tidak valid. - Tidak ada data
untuk query. - Request timeout. - Konfigurasi environment variable belum
tersedia.

Jangan mengembalikan stack trace atau informasi internal sensitif ke
browser.

## 7. API Endpoints

Gunakan Next.js App Router Route Handlers. Endpoint berikut merupakan
rancangan awal dan dapat disesuaikan dengan struktur proyek.

  Endpoint                        Fungsi
  ------------------------------- -----------------------------------------
  `GET /api/health`               Memeriksa koneksi backend ke Prometheus
  `GET /api/metrics/overview`     Ringkasan CPU, memory, disk, network
  `GET /api/metrics/cpu`          Metrik CPU
  `GET /api/metrics/memory`       Metrik memory
  `GET /api/metrics/disk`         Metrik filesystem
  `GET /api/metrics/network`      Metrik network
  `GET /api/metrics/containers`   Metrik container dari cAdvisor

Untuk historical data, endpoint dapat menerima parameter: - `start` -
`end` - `step`

Validasi parameter agar: - Format waktu valid. - `start` tidak lebih
besar dari `end`. - Rentang waktu tidak melebihi batas yang ditentukan
aplikasi. - `step` tidak terlalu kecil sehingga menghasilkan query
berlebihan.

Gunakan satuan dan format respons yang konsisten.

## 8. PromQL Dasar

Query berikut adalah titik awal. AI Agent harus memvalidasi hasil query
dan label aktual dari Prometheus sebelum menggunakannya di aplikasi.

### 8.1 CPU Usage

``` promql
100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))
```

Hasil berupa persentase penggunaan CPU keseluruhan.

### 8.2 Memory Usage

Persentase memory yang digunakan:

``` promql
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)
```

Memory terpakai dalam byte:

``` promql
node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes
```

### 8.3 Disk Usage

Penggunaan filesystem root:

``` promql
100 * (
  1 -
  node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"}
  /
  node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"}
)
```

Pastikan hanya filesystem yang sesuai yang dipilih. Hindari menghitung
filesystem virtual, tmpfs, overlay, atau mount yang tidak relevan.

### 8.4 Network Receive

``` promql
rate(node_network_receive_bytes_total{device!="lo"}[5m])
```

### 8.5 Network Transmit

``` promql
rate(node_network_transmit_bytes_total{device!="lo"}[5m])
```

Periksa interface aktual dan hindari menjumlahkan interface
virtual/container jika tujuan metrik adalah traffic interface utama VPS.

### 8.6 Docker CPU

Contoh query awal:

``` promql
sum by (name) (
  rate(container_cpu_usage_seconds_total{name!=""}[5m])
) * 100
```

Validasi label dan cgroup yang tersedia. Hindari menghitung parent dan
child container secara bersamaan atau memasukkan container kosong.

### 8.7 Docker Memory

``` promql
container_memory_working_set_bytes{name!=""}
```

Pastikan label yang dipakai dapat mengidentifikasi container secara
konsisten.

## 9. Integrasi Frontend

Setelah API berhasil diuji, integrasikan dengan komponen UI Phase 2.

Urutan integrasi: 1. Health status koneksi Prometheus. 2. Overview
metric cards. 3. CPU chart. 4. Memory chart. 5. Disk usage. 6. Network
traffic. 7. Container summary.

Ketentuan: - Ganti data dummy hanya pada komponen yang API-nya sudah
siap. - Jangan menghapus seluruh mock data sebelum integrasi selesai. -
Komponen grafik menerima data melalui props. - Format angka dan satuan
harus konsisten. - Tambahkan loading state. - Tambahkan error state. -
Tambahkan empty state. - Tampilkan waktu pembaruan terakhir. - Jangan
menampilkan angka dummy seolah-olah data aktual.

Jika koneksi Prometheus gagal, dashboard harus menampilkan status
disconnected atau unavailable, bukan diam-diam kembali menggunakan data
dummy.

## 10. Historical Data dan Refresh

Konfigurasi Prometheus yang sudah ada: - Scrape interval: 30 detik. -
Retention time: 15 hari. - Retention size: 2 GB.

Rekomendasi aplikasi: - Refresh dashboard sekitar 30 detik. - Cache
hasil query sekitar 10--15 detik jika sesuai. - Gunakan query range
untuk grafik historis. - Batasi jumlah titik data yang dikembalikan. -
Hindari polling setiap detik. - Jangan menyimpan ulang semua metrik ke
PostgreSQL.

Rentang waktu UI yang dapat disiapkan: - 1 jam. - 6 jam. - 12 jam. - 24
jam. - 7 hari. - 15 hari.

Perhatikan bahwa retensi 15 hari dan batas 2 GB bekerja bersamaan. Data
dapat terhapus lebih awal jika batas ukuran tercapai.

## 11. Keamanan dan Batasan Infrastruktur

PENTING: 1. Jangan membuka port Prometheus `9090` ke publik. 2. Jangan
membuka port Node Exporter `9100` ke publik. 3. Jangan membuka port
cAdvisor `8080` ke publik. 4. Jangan membuka port Grafana `3100` ke
publik sebagai bagian dari integrasi ini. 5. Browser hanya mengakses
ServerWatch. 6. Prometheus hanya diakses melalui backend. 7. Gunakan
Cloudflare Tunnel untuk akses publik aplikasi ServerWatch. 8. Gunakan
Cloudflare Access untuk membatasi pengguna IT Team. 9. Pastikan backend
API juga dilindungi autentikasi/otorisasi aplikasi; jangan mengandalkan
asumsi bahwa seluruh API otomatis terlindungi oleh tampilan frontend.
10. Jangan menampilkan credential, token, IP internal, atau environment
variable sensitif. 11. Jangan mengubah konfigurasi aplikasi produksi
yang tidak terkait. 12. Jangan me-restart seluruh PM2 atau container.
13. Jangan memasang PM2 exporter pada Phase 3. 14. Jangan menambahkan
database history. 15. Jangan mengubah konfigurasi Prometheus tanpa
alasan dan persetujuan.

## 12. Tahapan Implementasi

### Tahap 1 --- Preflight

-   [ ] Validasi build Phase 2.
-   [ ] Periksa container monitoring.
-   [ ] Periksa Prometheus readiness.
-   [ ] Periksa target Node Exporter.
-   [ ] Periksa target cAdvisor.
-   [ ] Identifikasi Docker network aktual.

### Tahap 2 --- Backend Foundation

-   [ ] Buat environment variable.
-   [ ] Buat Prometheus client helper.
-   [ ] Buat instant query helper.
-   [ ] Buat range query helper.
-   [ ] Implementasikan timeout.
-   [ ] Implementasikan error handling.
-   [ ] Pastikan helper hanya berjalan server-side.

### Tahap 3 --- Health Check

-   [ ] Buat `/api/health`.
-   [ ] Uji koneksi Prometheus.
-   [ ] Uji kondisi Prometheus tidak tersedia.
-   [ ] Pastikan respons tidak membocorkan detail sensitif.

### Tahap 4 --- Metrics API

-   [ ] Buat overview API.
-   [ ] Buat CPU API.
-   [ ] Buat memory API.
-   [ ] Buat disk API.
-   [ ] Buat network API.
-   [ ] Buat container API.
-   [ ] Validasi hasil query dengan Prometheus.

### Tahap 5 --- Frontend Integration

-   [ ] Hubungkan metric cards.
-   [ ] Hubungkan grafik CPU.
-   [ ] Hubungkan grafik memory.
-   [ ] Hubungkan informasi disk.
-   [ ] Hubungkan network traffic.
-   [ ] Hubungkan container summary.
-   [ ] Implementasikan loading/error/empty state.
-   [ ] Tampilkan last updated.

### Tahap 6 --- Testing

-   [ ] Jalankan `npx tsc --noEmit`.
-   [ ] Jalankan `npm run build`.
-   [ ] Uji seluruh endpoint.
-   [ ] Cocokkan angka dengan Prometheus.
-   [ ] Uji refresh.
-   [ ] Uji historical range.
-   [ ] Uji kondisi Prometheus terputus.
-   [ ] Pastikan tidak ada data dummy yang tersaji sebagai data aktual.
-   [ ] Pastikan port monitoring tidak terbuka ke publik.

## 13. Acceptance Criteria

Phase 3 dinyatakan selesai jika: - \[ \] Next.js backend berhasil
terhubung ke Prometheus. - \[ \] Health check dapat mendeteksi status
Prometheus. - \[ \] API CPU, memory, disk, dan network berhasil
memberikan data aktual. - \[ \] Data dashboard sesuai dengan hasil query
Prometheus. - \[ \] Grafik dapat menampilkan data historis. - \[ \]
Refresh berjalan dengan interval yang wajar. - \[ \] Error dan
disconnected state ditangani. - \[ \] URL Prometheus tidak terekspos ke
browser. - \[ \] Prometheus dan exporter tetap internal. - \[ \]
TypeScript check berhasil. - \[ \] Production build berhasil. - \[ \]
Monitoring stack dan aplikasi produksi yang tidak terkait tidak
terganggu.

## 14. Output Phase 3

Hasil akhir yang diharapkan: 1. Prometheus client/helper pada backend
Next.js. 2. Health check API. 3. Metrics API untuk CPU, memory, disk,
network, dan container. 4. Dukungan historical query. 5. Dashboard yang
menampilkan metrik VPS aktual. 6. Loading, error, empty, dan
disconnected states. 7. Dokumentasi environment variable dan cara
menjalankan aplikasi. 8. Hasil pengujian TypeScript, build, dan
endpoint.

## 15. Di Luar Scope Phase 3

Fitur berikut belum dikerjakan pada fase ini: - Integrasi PM2
exporter. - Monitoring detail semua proses PM2. - Alerting dan
notifikasi Telegram/WhatsApp. - Penyimpanan history ke PostgreSQL. -
Deployment publik final. - Pengaturan role pengguna secara lengkap.

Fitur-fitur tersebut akan dipertimbangkan pada Phase 4, Phase 5, dan
Phase 6.

## 16. Instruksi untuk AI Coding Agent

Sebelum melakukan perubahan: 1. Baca struktur proyek yang sudah ada. 2.
Periksa `src/types/monitoring.ts`. 3. Periksa `src/lib/mock-data.ts`. 4.
Periksa seluruh komponen yang memakai mock data. 5. Periksa versi
Next.js dan pola App Router yang digunakan. 6. Periksa package yang
sudah terpasang. 7. Jangan membuat ulang proyek atau mengganti stack.

Saat implementasi: - Kerjakan secara bertahap. - Pertahankan desain
Phase 2. - Pertahankan kompatibilitas komponen. - Hindari dependency
tambahan jika tidak diperlukan. - Jangan mengubah infrastruktur VPS. -
Jangan mengarang hasil query atau status target. - Jangan menghapus mock
data sebelum pengganti aktual siap.

Setelah setiap tahap: - Jelaskan file yang dibuat/diubah. - Jelaskan
endpoint dan cara mengujinya. - Laporkan asumsi yang digunakan. -
Laporkan hasil pemeriksaan TypeScript dan build. - Berhenti dan minta
konfirmasi jika diperlukan perubahan pada konfigurasi produksi atau
Docker network.

**Prioritas utama: integrasi aman, data akurat, dan tidak mengganggu
aplikasi produksi GGP.**

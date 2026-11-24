# ServerWatch — Phase 4: Application Monitoring

**Project:** ServerWatch  
**Phase:** 4 — Application Monitoring  
**Status:** Implementation guide  
**Stack:** Next.js App Router, TypeScript, Prometheus, PM2 Prometheus Module, cAdvisor  
**Environment:** Development lokal di laptop melalui SSH Tunnel; target akhir VPS GGP

---

## 1. Tujuan Phase 4

Phase 4 memperluas ServerWatch dari pemantauan resource VPS menjadi pemantauan aplikasi dan container yang berjalan di VPS GGP.

Phase 3 sudah menghubungkan Next.js dengan Prometheus untuk membaca metrik host dan container. Pada Phase 4, sumber metrik ditambah dengan **PM2 Prometheus Module** agar Prometheus dapat mengumpulkan status dan statistik proses PM2.

Fokus fase ini:

1. Menginventarisasi aplikasi PM2 dan container Docker yang benar-benar aktif.
2. Menambahkan exporter PM2 sebagai sumber metrik baru untuk Prometheus.
3. Memastikan Prometheus berhasil melakukan scrape metrik PM2.
4. Menyediakan API server-side Next.js untuk data aplikasi PM2 dan container Docker.
5. Menghubungkan halaman Applications dan Application Detail dengan data aktual.
6. Memvalidasi data melalui Prometheus dan Grafana.
7. Menjaga perubahan tetap aman bagi workload produksi.

**Batasan Phase 4:** monitoring bersifat read-only. Tidak membuat fitur restart, stop, delete, deploy, atau perubahan konfigurasi aplikasi dari UI ServerWatch. Alerting dan notifikasi menjadi Phase 5. Deployment publik dan pengamanan akses menyeluruh menjadi Phase 6.

---

## 2. Konteks Infrastruktur GGP

Gunakan informasi berikut sebagai konteks awal. Jangan menganggap daftar dan angka ini pasti masih sama pada saat implementasi.

### 2.1 Infrastruktur VPS

- OS: Ubuntu Server.
- CPU: sekitar 2 vCPU.
- RAM: sekitar 7.8 GiB.
- Disk: sekitar 96 GB.
- Workload: aplikasi Next.js/Node.js via PM2, beberapa container Docker, PostgreSQL, Nginx, dan Cloudflare Tunnel.
- Monitoring stack yang sudah tersedia:
  - `serverwatch-prometheus`
  - `serverwatch-node-exporter`
  - `serverwatch-cadvisor`
  - `serverwatch-grafana`

Prometheus sebelumnya menggunakan scrape interval 30 detik dan retensi 15 hari / batas ukuran 2 GB. Verifikasi konfigurasi aktual sebelum mengubahnya.

### 2.2 Contoh inventaris PM2 yang pernah dilaporkan

Daftar berikut adalah kandidat awal untuk dicocokkan dengan `pm2 list` terbaru, bukan daftar final:

- `cost-control-admin`
- `cost-control-dashboard-hpp`
- `cost-control-dashboard-capex`
- `cost-control-portal`
- `cost-control-wip`
- `dashboard-harga-material`
- `dashboard-opex`
- `dashboard-sulam`
- `k3-inspeksi-ggf`
- `monitoring-schedule`
- `portal-dashboard-k3`
- `portal-irigasi`
- `portal-pg1`
- `rekap-kecelakaan`
- `weed-control`

Jangan menganggap aplikasi di daftar lama masih aktif atau seluruhnya dikelola oleh satu PM2 daemon. Inventaris terbaru harus menjadi sumber kebenaran.

### 2.3 Contoh container Docker yang pernah dilaporkan

- `inspeksi_5r_app`
- `custom-lokasi-pengurangan`
- `custom-lokasi-portal`
- `custom-lokasi-postgres-pengurangan`
- `inspeksi_5r_postgres`

Nama tersebut juga harus diverifikasi dengan kondisi aktual `docker ps`.

---

## 3. Arsitektur yang Dipilih

### 3.1 Arsitektur konseptual

```text
                         IT Team / Browser
                                |
                                v
                       ServerWatch Next.js
                                |
                                v
                      Next.js Route Handlers
                                |
                                v
                        Prometheus HTTP API
                                |
              +-----------------+------------------+
              |                 |                  |
              v                 v                  v
        Node Exporter        cAdvisor        PM2 Prometheus
        Host metrics       Docker metrics       Module
                                                PM2 metrics
```

Peran masing-masing komponen:

| Komponen | Tanggung jawab |
|---|---|
| PM2 daemon | Mengelola proses aplikasi Node.js/PM2 yang sudah ada |
| PM2 Prometheus Module | Membaca statistik PM2 dan menyediakan endpoint metrik Prometheus |
| Node Exporter | Menyediakan metrik resource host |
| cAdvisor | Menyediakan metrik container Docker |
| Prometheus | Scrape, menyimpan, dan menyediakan query metrik |
| Next.js backend | Mengambil data dari Prometheus dan membentuk response API |
| ServerWatch UI | Menampilkan daftar aplikasi, status, resource, dan detail |

### 3.2 Alur data PM2

```text
PM2 daemon yang sama dengan aplikasi produksi
             |
             v
PM2 Prometheus Module
             |
             v
Endpoint metrics pada VPS (port default 9988)
             |
             v
Prometheus scrape job: serverwatch-pm2
             |
             v
Prometheus HTTP API
             |
             v
Next.js API
             |
             v
Applications / Application Detail
```

### 3.3 Prinsip jaringan

- Browser tidak boleh mengakses Prometheus atau exporter secara langsung.
- `PROMETHEUS_URL` hanya digunakan di server-side Next.js.
- Jangan membuka port Prometheus `9090`, Node Exporter `9100`, cAdvisor `8080`, Grafana `3100`, atau PM2 exporter `9988` ke internet.
- Jangan menerbitkan port exporter ke publik melalui Docker `ports`, Nginx, atau Cloudflare Tunnel.
- Prometheus harus dapat mencapai exporter melalui jalur internal VPS/Docker yang telah diverifikasi.
- Nama Docker network dan gateway tidak boleh ditebak.
- Jangan mengubah binding Prometheus yang sudah ada tanpa alasan dan persetujuan.

### 3.4 Catatan penting: Prometheus berjalan di Docker

PM2 module berjalan pada host VPS dan Prometheus berjalan di container. Karena itu, `127.0.0.1:9988` dari dalam container Prometheus menunjuk ke container Prometheus itu sendiri, bukan host VPS.

Sebelum menambahkan target scrape, tentukan jalur jaringan yang aman:

1. Identifikasi Docker network yang digunakan Prometheus.
2. Identifikasi gateway host untuk network tersebut.
3. Pilih alamat interface host yang dapat dijangkau dari Prometheus container.
4. Konfigurasikan exporter agar listen hanya pada alamat interface internal yang diperlukan, jika didukung dan sesuai hasil pemeriksaan.
5. Pastikan firewall tidak mengizinkan port exporter dari jaringan publik.
6. Uji konektivitas dari container Prometheus.

Jangan langsung menggunakan `localhost:9988` pada target Prometheus jika Prometheus berada di container. Jangan pula langsung menggunakan `0.0.0.0` tanpa pembatasan jaringan.

Jika tidak ada jalur internal yang aman dan sederhana, hentikan implementasi pada tahap perencanaan dan ajukan opsi jaringan kepada pengelola VPS. Jangan mengubah mode network Prometheus atau mengekspos port secara publik sebagai jalan pintas.

---

## 4. Pilihan Exporter PM2

### 4.1 Komponen yang digunakan

Gunakan modul:

**`pm2-prom-module` — VeXell**

Repository dan dokumentasi:
- https://github.com/VeXell/pm2-prom-module

Dokumentasi repository menjelaskan bahwa modul ini:
- Dipasang sebagai PM2 module menggunakan `pm2 install pm2-prom-module`.
- Menyediakan endpoint metrik Prometheus, secara default pada port `9988`.
- Memiliki opsi konfigurasi `port`, `hostname`, `service_name`, `aggregate_app_metrics`, `app_check_interval`, dan `prefix`.
- Menyediakan metrik status aplikasi, jumlah instance, penggunaan memory, CPU, restart, uptime, serta beberapa metrik Node.js bila tersedia.

**Catatan keamanan:** dokumentasi menyebut default `hostname` adalah `0.0.0.0`. Jangan mempertahankan default tersebut tanpa evaluasi. Atur listener ke alamat internal yang sesuai dengan jalur jaringan Prometheus yang telah diverifikasi. Jangan mengekspos exporter ke internet.

### 4.2 Mengapa menggunakan exporter ini

- Integrasi langsung dengan PM2.
- Metrik dikumpulkan pada satu endpoint Prometheus.
- Dapat menampilkan status proses, CPU, memory, uptime, restart count, dan jumlah instance.
- Prometheus tetap menjadi satu-satunya sumber query yang digunakan backend ServerWatch.

### 4.3 Hal yang wajib diperiksa sebelum pemasangan

- User Linux yang memiliki PM2 daemon dan aplikasi produksi.
- `PM2_HOME` yang digunakan oleh daemon tersebut.
- Versi PM2 dan Node.js yang berjalan.
- Versi paket dan dependency exporter yang akan dipasang.
- Apakah modul kompatibel dengan versi PM2 yang digunakan.
- Port exporter belum digunakan.
- Rute jaringan Prometheus container ke host sudah dipastikan.
- Ada prosedur rollback/uninstall yang jelas.

**Jangan menjalankan `pm2 install` menggunakan user Linux yang berbeda dari pemilik PM2 daemon aplikasi produksi.** PM2 memiliki daemon dan process list berdasarkan user/PM2_HOME. Jika dipasang pada user yang salah, exporter bisa melihat daftar proses yang kosong atau daemon yang berbeda.

---

## 5. Persiapan dan Audit Sebelum Perubahan VPS

Bagian ini dilakukan terlebih dahulu. Tahap audit tidak boleh mengubah workload produksi.

### 5.1 Periksa user dan proses PM2

Di VPS, jalankan pemeriksaan read-only:

```bash
whoami
ps -eo user,pid,cmd | grep -E '[P]M2|[p]m2'
```

Masuk menggunakan user pemilik PM2 daemon yang benar, lalu:

```bash
pm2 list
pm2 report
```

`pm2 report` dapat berisi informasi lingkungan. Jangan mengirim atau mempublikasikan output mentahnya tanpa memeriksa dan menyamarkan credential, token, alamat internal, serta environment variable sensitif.

Untuk memeriksa direktori PM2:

```bash
echo "$PM2_HOME"
```

Jika kosong, PM2 biasanya menggunakan direktori default user tersebut. Jangan menebak `PM2_HOME` aplikasi lain.

### 5.2 Simpan baseline sebelum perubahan

Catat kondisi sebelum pemasangan:

```bash
pm2 list
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker stats --no-stream
```

Catat jumlah proses online, stopped, errored, restart count, dan kondisi container. Jangan menyimpan environment atau credential ke dokumen baseline.

### 5.3 Periksa port exporter

```bash
sudo ss -lntp | grep ':9988'
```

Jika port sudah digunakan, jangan menghentikan proses yang menggunakan port tersebut. Pilih port lain setelah memeriksa konfigurasi dan dokumentasi exporter.

### 5.4 Periksa Prometheus dan network

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker network ls
docker inspect serverwatch-prometheus \
  --format '{{json .NetworkSettings.Networks}}'
```

Periksa konfigurasi Prometheus saat ini:

```bash
sudo cat /opt/serverwatch/prometheus/prometheus.yml
```

Pastikan file yang diperiksa memang konfigurasi aktif yang dimount ke container Prometheus. Jangan menimpa konfigurasi lama.

Untuk melihat gateway dan subnet network, gunakan nama network aktual dari hasil inspect:

```bash
docker network inspect NAMA_NETWORK
```

Jangan menyalin placeholder `NAMA_NETWORK` sebagai nilai literal.

### 5.5 Persetujuan sebelum perubahan

Setelah audit, rangkum kepada pengelola VPS:

- User PM2 yang benar.
- Versi PM2/Node.js.
- Status proses baseline.
- Port yang akan digunakan.
- Alamat interface internal untuk exporter.
- Jalur Prometheus container menuju exporter.
- File konfigurasi yang akan diubah.
- Rencana rollback.

Lanjutkan pemasangan hanya setelah hasil audit dan rencana perubahan disetujui.

---

## 6. Instalasi dan Konfigurasi PM2 Exporter

### 6.1 Instalasi

Jalankan menggunakan user Linux yang sama dengan PM2 daemon aplikasi produksi.

Perintah instalasi yang didokumentasikan proyek:

```bash
pm2 install pm2-prom-module
```

Jangan menjalankan perintah ini sebelum audit pada Bagian 5 selesai dan kompatibilitas paket telah diperiksa.

### 6.2 Konfigurasi exporter

Dokumentasi modul menyediakan konfigurasi melalui `pm2 set`. Contoh opsi yang tersedia:

```bash
pm2 set pm2-prom-module:port 9988
pm2 set pm2-prom-module:hostname ALAMAT_INTERFACE_INTERNAL
pm2 set pm2-prom-module:service_name ggp-vps
pm2 set pm2-prom-module:aggregate_app_metrics true
pm2 set pm2-prom-module:app_check_interval 5000
```

`ALAMAT_INTERFACE_INTERNAL` adalah placeholder. Ganti hanya setelah alamat yang dapat dijangkau Prometheus container telah diverifikasi. Jangan menggunakan `0.0.0.0` sebagai pilihan otomatis.

Nilai interval `5000` berarti pemeriksaan aplikasi setiap 5 detik. Nilai ini adalah titik awal yang dapat dievaluasi; jangan memilih interval terlalu agresif pada VPS dengan resource terbatas.

### 6.3 Periksa status module

```bash
pm2 list
pm2 describe pm2-prom-module
```

Pastikan modul exporter berjalan dan tidak membuat aplikasi produksi berubah status atau mengalami restart yang tidak direncanakan.

### 6.4 Uji endpoint exporter dari host

Gunakan alamat listener aktual:

```bash
curl -sS http://ALAMAT_INTERFACE_INTERNAL:9988/metrics | head
```

Hasil yang diharapkan berupa exposition format Prometheus, misalnya baris `# HELP`, `# TYPE`, dan nama metrik.

Jangan mengasumsikan semua nama metrik tanpa memeriksa output aktual. Simpan daftar metrik yang benar-benar tersedia untuk menyusun query dan API.

### 6.5 Periksa status aplikasi PM2

Cari metrik status aplikasi pada endpoint `/metrics`. Dokumentasi modul menjelaskan metrik status:

- `pm2_app_status`
- `pm2_app_instances`
- `pm2_app_average_memory`
- `pm2_app_total_memory`

Dokumentasi juga menjelaskan status numerik:
- `0` = unknown
- `1` = running
- `2` = pending
- `3` = stopped
- `4` = errored

Nama metrik CPU dan metrik tambahan harus diverifikasi dari output exporter yang terpasang. Jangan membuat query berdasarkan nama metrik yang belum terbukti tersedia.

---

## 7. Integrasi Prometheus

### 7.1 Tambahkan scrape job

Tambahkan job PM2 ke file konfigurasi Prometheus yang sudah ada. Jangan mengganti seluruh isi file.

Contoh struktur:

```yaml
scrape_configs:
  # Job yang sudah ada tetap dipertahankan.
  - job_name: "serverwatch-node"
    static_configs:
      - targets:
          - "node-exporter:9100"

  - job_name: "serverwatch-cadvisor"
    static_configs:
      - targets:
          - "cadvisor:8080"

  # Target harus memakai alamat host internal yang sudah diuji
  # dari dalam container Prometheus.
  - job_name: "serverwatch-pm2"
    scrape_interval: 30s
    scrape_timeout: 10s
    metrics_path: /metrics
    static_configs:
      - targets:
          - "ALAMAT_INTERNAL_HOST:9988"
```

`ALAMAT_INTERNAL_HOST` adalah placeholder. Gunakan alamat yang benar-benar dapat diakses dari container Prometheus dan yang menjadi alamat listener exporter.

Jangan menganggap alamat `127.0.0.1:9988` dapat digunakan oleh Prometheus container.

### 7.2 Validasi konfigurasi sebelum reload

Jika tersedia pada image Prometheus, validasi file dengan `promtool`:

```bash
docker exec serverwatch-prometheus \
  promtool check config /etc/prometheus/prometheus.yml
```

Path konfigurasi harus disesuaikan dengan mount aktual container. Jika `promtool` tidak tersedia, jangan melakukan reload sebelum ada cara validasi konfigurasi yang aman.

### 7.3 Terapkan perubahan dengan aman

Sebelum reload:
1. Simpan salinan konfigurasi lama.
2. Pastikan diff hanya menambahkan job PM2.
3. Pastikan konfigurasi lolos validasi.
4. Terapkan reload sesuai mekanisme yang sudah digunakan pada stack ini.
5. Jangan menjalankan `docker compose down`.
6. Jangan restart seluruh stack jika reload Prometheus sudah cukup.

Jika reload tidak didukung atau memerlukan restart, hentikan dan minta persetujuan sebelum melakukannya karena Prometheus adalah komponen monitoring produksi.

### 7.4 Verifikasi target

Dari host VPS:

```bash
curl -sS http://127.0.0.1:9090/api/v1/targets
```

Periksa job `serverwatch-pm2`. Status target yang diharapkan adalah `up`.

Jika `down`:
- Periksa `lastError`.
- Uji endpoint exporter dari host.
- Uji konektivitas dari dalam container Prometheus.
- Periksa alamat listener dan gateway network.
- Periksa firewall.
- Jangan membuka port exporter ke internet.

---

## 8. Metrik PM2 dan Definisi Data

### 8.1 Data yang ingin ditampilkan

| Field ServerWatch | Definisi | Sumber |
|---|---|---|
| Application name | Nama proses PM2 | Label metrik exporter |
| PM2 ID | ID proses PM2 | Label metrik exporter, bila tersedia |
| Status | Running/pending/stopped/errored | `pm2_app_status` |
| CPU usage | Penggunaan CPU proses | Metrik CPU exporter yang terverifikasi |
| Memory usage | Memory proses/aplikasi | `pm2_app_average_memory` atau `pm2_app_total_memory` |
| Instance count | Jumlah instance proses | `pm2_app_instances` |
| Restart count | Jumlah restart | Metrik restart exporter yang terverifikasi |
| Uptime | Lama proses berjalan | Metrik uptime exporter yang terverifikasi |
| Scrape health | Apakah Prometheus berhasil scrape exporter | `up{job="serverwatch-pm2"}` |

### 8.2 Definisi status aplikasi

Gunakan mapping:

| Nilai | Status UI |
|---:|---|
| 0 | Unknown |
| 1 | Online |
| 2 | Pending |
| 3 | Stopped |
| 4 | Errored |

Jangan menyamakan `up` scrape target Prometheus dengan status aplikasi PM2:
- `up{job="serverwatch-pm2"} = 1` berarti Prometheus berhasil mengambil metrik exporter.
- `pm2_app_status = 1` berarti aplikasi PM2 terkait berstatus running menurut exporter.

Kedua status harus ditampilkan/ditangani secara terpisah.

### 8.3 Unit

- CPU: persen (%), setelah rumus dan satuan metrik exporter diverifikasi.
- Memory: byte dari exporter, dikonversi ke MiB/GiB pada API/UI.
- Uptime: detik, diformat menjadi hari/jam/menit.
- Restart count: bilangan bulat.
- Instance count: bilangan bulat.

Jangan menganggap nilai CPU exporter otomatis dalam persen sebelum memeriksa dokumentasi dan hasil aktual. Hindari menghitung persentase dengan rumus yang tidak sesuai semantik metrik sumber.

### 8.4 Agregasi multi-instance

Exporter dapat menyediakan metrik agregat dan/atau metrik per instance. Untuk halaman daftar aplikasi:
- Gunakan metrik agregat per aplikasi jika tersedia dan maknanya jelas.
- Untuk halaman detail, tampilkan metrik per instance jika label instance tersedia.
- Jangan menjumlahkan metrik rata-rata atau menghitung ulang agregat secara keliru.
- Pastikan label aplikasi dan instance digunakan secara konsisten.
- Hindari duplikasi data saat beberapa instance memiliki nama aplikasi yang sama.

---

## 9. Query Prometheus

Nama metrik yang disebutkan pada bagian ini harus terlebih dahulu diverifikasi pada endpoint exporter dan Prometheus. Gunakan Prometheus UI atau Grafana Explore untuk memeriksa label dan nilai aktual.

### 9.1 Health exporter

```promql
up{job="serverwatch-pm2"}
```

### 9.2 Status aplikasi

```promql
pm2_app_status
```

### 9.3 Jumlah aplikasi yang tersedia

```promql
pm2_available_apps
```

### 9.4 Jumlah instance per aplikasi

```promql
pm2_app_instances
```

### 9.5 Memory agregat per aplikasi

```promql
pm2_app_total_memory
```

### 9.6 Rata-rata memory per aplikasi

```promql
pm2_app_average_memory
```

### 9.7 CPU, uptime, restart

Cari nama metrik yang sesuai dari endpoint `/metrics` dan metric browser Prometheus. Setelah nama dan satuan terverifikasi, susun query yang sesuai. Jangan mengarang nama metrik atau asumsi satuan.

### 9.8 Pemeriksaan metric discovery

Gunakan endpoint metadata Prometheus:

```bash
curl -sS "http://127.0.0.1:9090/api/v1/label/__name__/values"
```

Untuk melihat series dengan nama metrik tertentu:

```bash
curl -sS "http://127.0.0.1:9090/api/v1/series?match[]=pm2_app_status"
```

Pada shell, URL query dapat perlu diberi tanda kutip seperti contoh di atas.

---

## 10. Monitoring Docker melalui cAdvisor

Docker monitoring tetap menggunakan cAdvisor yang sudah terpasang. Jangan memasang exporter Docker kedua sebelum ada kebutuhan yang terbukti.

Data yang ingin ditampilkan:

- Container name.
- Container ID (opsional, untuk identifikasi teknis).
- Status container.
- CPU usage.
- Memory usage.
- Network receive/transmit.
- Block read/write.
- Restart count jika tersedia dari sumber yang sesuai.

**Catatan:** cAdvisor menyediakan metrik resource container, tetapi status lifecycle dan restart count tidak selalu tersedia sebagai metrik cAdvisor. Jangan menyatakan semua informasi status berasal dari cAdvisor.

Untuk status lifecycle container, pilih sumber yang aman dan sudah disetujui pada tahap implementasi, misalnya Docker Engine API melalui backend lokal yang dibatasi aksesnya. Jika belum ada sumber status yang aman, tampilkan status sebagai `Unknown` atau `Resource metrics available`, bukan mengarang status `Running`.

Jangan memberikan akses Docker socket ke container Next.js hanya untuk menampilkan daftar container tanpa analisis keamanan dan persetujuan eksplisit. Docker socket memberikan hak kontrol yang sangat tinggi terhadap Docker host.

### 10.1 Query cAdvisor awal

Metrik berikut umum digunakan, tetapi tetap verifikasi keberadaannya di Prometheus:

```promql
container_cpu_usage_seconds_total
```

```promql
container_memory_working_set_bytes
```

```promql
container_network_receive_bytes_total
```

```promql
container_network_transmit_bytes_total
```

Untuk penggunaan CPU rate:

```promql
rate(container_cpu_usage_seconds_total[5m])
```

Pilih dan dokumentasikan filter label container yang benar dari series aktual. Hindari memasukkan container kosong, pause container, atau cgroup yang tidak relevan ke daftar aplikasi.

---

## 11. Backend Next.js API

Semua query dilakukan server-side melalui Prometheus HTTP API. Browser hanya mengakses endpoint Next.js.

### 11.1 Environment

Gunakan environment Phase 3:

```env
PROMETHEUS_URL=http://127.0.0.1:9090
```

Untuk development lokal di laptop, SSH Tunnel Prometheus harus tetap aktif. Untuk deployment Next.js di VPS, gunakan alamat host atau Docker network sesuai topologi yang telah diverifikasi.

Jangan gunakan `NEXT_PUBLIC_PROMETHEUS_URL`.

### 11.2 Struktur endpoint yang disarankan

```text
GET /api/applications
GET /api/applications/pm2
GET /api/applications/docker
GET /api/applications/[id]
GET /api/applications/health
```

Tujuan endpoint:

| Endpoint | Fungsi |
|---|---|
| `/api/applications` | Menggabungkan daftar aplikasi PM2 dan container Docker |
| `/api/applications/pm2` | Mengambil data proses PM2 dari Prometheus |
| `/api/applications/docker` | Mengambil metrik container dari Prometheus/cAdvisor |
| `/api/applications/[id]` | Detail satu aplikasi/container |
| `/api/applications/health` | Health scrape job PM2 dan cAdvisor |

Sesuaikan route dengan pola folder proyek yang sudah ada. Hindari membuat route duplikat jika Phase 3 sudah memiliki endpoint container.

### 11.3 Format response yang disarankan

Daftar PM2:

```json
{
  "success": true,
  "source": "prometheus",
  "type": "pm2",
  "updatedAt": "2026-11-23T00:00:00.000Z",
  "data": [
    {
      "id": "0",
      "name": "cost-control-portal",
      "status": "online",
      "cpuPercent": null,
      "memoryBytes": null,
      "memoryMiB": null,
      "instances": null,
      "restartCount": null,
      "uptimeSeconds": null,
      "metricsAvailable": []
    }
  ]
}
```

Angka `null` menunjukkan field belum tersedia atau belum terverifikasi. Jangan mengisi nilai dummy pada response produksi.

Detail aplikasi:

```json
{
  "success": true,
  "source": "prometheus",
  "data": {
    "id": "0",
    "name": "cost-control-portal",
    "status": "online",
    "cpuPercent": null,
    "memoryBytes": null,
    "instances": null,
    "restartCount": null,
    "uptimeSeconds": null,
    "history": []
  }
}
```

### 11.4 Ketentuan implementasi backend

- Gunakan helper Prometheus dari Phase 3.
- Gunakan query instant untuk status dan nilai terkini.
- Gunakan query range untuk grafik historis.
- Validasi `id` atau nama aplikasi sebelum menyusun query.
- Jangan menggabungkan input pengguna langsung ke PromQL.
- Terapkan timeout dan error handling.
- Jangan mengirim stack trace atau konfigurasi internal ke browser.
- Bedakan `no data`, `target down`, `query error`, dan `application stopped`.
- Gunakan cache pendek yang sesuai dengan scrape interval.
- Semua response memiliki timestamp pengambilan data.
- Hindari menganggap data kosong berarti aplikasi mati.

---

## 12. Frontend ServerWatch

Gunakan desain visual Phase 2 yang sudah disepakati: tema hijau, putih, abu-abu lembut, dan aksen kuning.

### 12.1 Halaman Applications

Tampilkan ringkasan:

- Total PM2 applications.
- PM2 online.
- PM2 stopped/errored.
- Total Docker containers yang terdeteksi.
- Container dengan metrik tersedia.
- Status scrape PM2 dan cAdvisor.

Tampilkan filter:
- All.
- PM2.
- Docker.
- Online.
- Stopped.
- Errored.
- Unknown.

Jangan mencampur status exporter scrape dengan status aplikasi.

### 12.2 Tabel Applications

Kolom yang disarankan:

| Kolom | Keterangan |
|---|---|
| Application | Nama aplikasi/container |
| Type | PM2 / Docker |
| Status | Status dari sumber yang valid |
| CPU | Penggunaan CPU |
| Memory | Penggunaan memory |
| Uptime | Lama berjalan, jika tersedia |
| Restarts | Jumlah restart, jika tersedia |
| Last Updated | Waktu data diperbarui |
| Action | Open detail |

Field yang tidak tersedia ditampilkan sebagai `—` atau `N/A`, bukan angka nol.

### 12.3 Application Detail

Untuk PM2:
- Nama dan PM2 ID.
- Status proses.
- CPU usage.
- Memory usage.
- Jumlah instance.
- Restart count.
- Uptime.
- Grafik CPU dan memory historis.
- Breakdown per instance jika metrik tersedia.

Untuk Docker:
- Container name.
- Container ID.
- Status lifecycle hanya jika ada sumber yang valid.
- CPU dan memory.
- Network I/O.
- Block I/O.
- Grafik historis.

### 12.4 State UI

Sediakan:
- Loading.
- Empty.
- Error.
- Exporter unavailable.
- Prometheus scrape down.
- Partial metrics.
- Last updated.
- No historical data.

Jangan menampilkan indikator `Healthy` hanya karena endpoint API merespons. Health harus mencerminkan kondisi sumber data dan status aplikasi secara tepat.

---

## 13. Historical Metrics dan Refresh

- Scrape PM2 awal: 30 detik, konsisten dengan baseline Prometheus Phase 3.
- Refresh UI: sekitar 30 detik, atau sesuai pola refresh yang sudah digunakan.
- Query historis: gunakan range query Prometheus.
- Rentang awal grafik: 1 jam, 6 jam, dan 24 jam.
- Jangan mengirim query terlalu sering dari setiap komponen secara terpisah.
- Gunakan satu fetch per resource/interval dan distribusikan data ke komponen yang membutuhkan.
- Tampilkan timestamp metrik dan status stale jika data terlalu lama.

Interval exporter internal `app_check_interval` dan scrape interval Prometheus adalah dua hal berbeda:
- `app_check_interval`: seberapa sering module memperbarui data proses PM2.
- `scrape_interval`: seberapa sering Prometheus mengambil endpoint exporter.

Sesuaikan keduanya agar tidak terlalu sering untuk kapasitas VPS.

---

## 14. Keamanan dan Stabilitas Produksi

Ini adalah persyaratan wajib:

1. Jangan menjalankan perintah stop/restart/delete aplikasi produksi selama instalasi exporter.
2. Jangan menjalankan PM2 exporter pada user yang berbeda dari daemon aplikasi yang ingin dipantau.
3. Jangan mengubah nama, port, working directory, atau environment aplikasi PM2 yang sudah ada.
4. Jangan mengubah konfigurasi Docker, Nginx, Cloudflare Tunnel, atau database pada fase ini kecuali diperlukan dan disetujui secara terpisah.
5. Jangan membuka port exporter ke internet.
6. Batasi akses exporter hanya untuk Prometheus melalui jaringan internal/firewall.
7. Jangan mount Docker socket ke Next.js.
8. Jangan menampilkan environment variable, command line sensitif, credential, atau secret aplikasi pada UI.
9. Jangan meminta atau membagikan output mentah `pm2 jlist`, `pm2 env`, `pm2 report`, atau environment proses tanpa redaksi karena dapat mengandung informasi sensitif.
10. Jangan menambahkan exporter sebagai bagian dari aplikasi bisnis.
11. Pantau resource overhead exporter dan Prometheus setelah pemasangan.
12. Siapkan rollback dan catat kondisi sebelum/sesudah perubahan.

### 14.1 Rollback exporter

Jika exporter menyebabkan masalah:

1. Periksa status module dan log.
2. Pastikan masalah memang berasal dari module.
3. Hapus scrape job PM2 dari konfigurasi Prometheus, tanpa menghapus job Node Exporter/cAdvisor.
4. Validasi konfigurasi Prometheus.
5. Terapkan reload/restart Prometheus hanya melalui prosedur yang disetujui.
6. Uninstall module dengan user PM2 yang benar jika diperlukan:

```bash
pm2 uninstall pm2-prom-module
```

7. Verifikasi kembali aplikasi PM2 produksi tetap berjalan.
8. Bandingkan dengan baseline sebelum perubahan.

Jangan menjalankan `pm2 delete all`, `pm2 kill`, atau `docker compose down`.

---

## 15. Tahapan Implementasi

### Tahap A — Audit

- [ ] Periksa user pemilik PM2 daemon.
- [ ] Catat `PM2_HOME` yang relevan.
- [ ] Periksa versi PM2 dan Node.js.
- [ ] Inventarisasi proses PM2 tanpa membagikan data sensitif.
- [ ] Inventarisasi container Docker.
- [ ] Simpan baseline status dan resource.
- [ ] Periksa port exporter.
- [ ] Periksa Docker network dan gateway Prometheus.
- [ ] Tentukan alamat listener exporter yang internal.
- [ ] Buat rencana rollback.

### Tahap B — Exporter

- [ ] Verifikasi dokumentasi dan kompatibilitas `pm2-prom-module`.
- [ ] Minta persetujuan perubahan VPS.
- [ ] Instal module pada user PM2 yang benar.
- [ ] Konfigurasi port dan listener internal.
- [ ] Uji endpoint `/metrics`.
- [ ] Verifikasi nama metrik, label, dan unit.
- [ ] Pastikan aplikasi produksi tetap berjalan normal.

### Tahap C — Prometheus

- [ ] Tambahkan scrape job `serverwatch-pm2`.
- [ ] Pertahankan job yang sudah ada.
- [ ] Validasi konfigurasi.
- [ ] Terapkan perubahan secara aman.
- [ ] Pastikan target PM2 `up`.
- [ ] Verifikasi metrik PM2 muncul pada Prometheus.
- [ ] Pastikan tidak ada port exporter yang terbuka ke publik.

### Tahap D — Backend

- [ ] Buat helper query PM2 bila diperlukan.
- [ ] Implementasikan API daftar PM2.
- [ ] Implementasikan API detail PM2.
- [ ] Implementasikan API container atau gunakan API Phase 3 yang sudah ada.
- [ ] Normalisasi status, CPU, memory, uptime, dan restart.
- [ ] Implementasikan error handling dan stale data.
- [ ] Tambahkan query range untuk histori.

### Tahap E — Frontend

- [ ] Integrasikan halaman Applications.
- [ ] Tampilkan PM2 dan Docker secara terpisah.
- [ ] Tambahkan filter dan ringkasan.
- [ ] Integrasikan Application Detail.
- [ ] Tambahkan grafik historis.
- [ ] Tambahkan loading/error/empty states.
- [ ] Hapus penggunaan mock data pada bagian yang sudah terintegrasi.

### Tahap F — Validasi

- [ ] Bandingkan jumlah aplikasi dengan `pm2 list`.
- [ ] Bandingkan status PM2 dengan `pm2 list`.
- [ ] Bandingkan CPU dan memory proses dengan PM2 monitor/CLI pada waktu yang berdekatan.
- [ ] Bandingkan metrik PM2 di Prometheus dan Grafana.
- [ ] Bandingkan metrik container dengan cAdvisor/Grafana.
- [ ] Pastikan target scrape tetap `up`.
- [ ] Pastikan tidak ada aplikasi produksi yang restart atau berubah status akibat implementasi.
- [ ] Jalankan TypeScript check dan production build.

---

## 16. Acceptance Criteria

Phase 4 dinyatakan selesai jika:

1. PM2 exporter berjalan pada PM2 daemon yang benar.
2. Exporter hanya dapat dijangkau melalui jalur internal yang disetujui.
3. Prometheus memiliki target `serverwatch-pm2` dengan status `up`.
4. Metrik status, memory, CPU, uptime, dan restart ditampilkan hanya jika tersedia dan sudah diverifikasi.
5. Halaman Applications menampilkan daftar PM2 aktual.
6. Docker metrics tetap berfungsi melalui cAdvisor.
7. Detail aplikasi menampilkan data aktual dan timestamp.
8. Status exporter scrape dibedakan dari status aplikasi.
9. UI menangani data kosong, stale, dan error dengan benar.
10. Data ServerWatch konsisten dengan Prometheus/Grafana dan PM2 pada waktu pemeriksaan yang berdekatan.
11. Tidak ada port exporter yang diekspos ke internet.
12. Tidak ada gangguan yang tidak direncanakan pada aplikasi produksi.
13. `npx tsc --noEmit` dan `npm run build` berhasil.

---

## 17. Instruksi Khusus untuk AI Agent

AI Agent harus bekerja bertahap dan mengutamakan keselamatan produksi.

### 17.1 Sebelum coding

1. Baca struktur proyek ServerWatch yang sudah ada.
2. Baca implementasi Phase 3 dan Phase 2.
3. Periksa route API, tipe data, komponen, dan helper Prometheus yang sudah ada.
4. Jangan membuat ulang fitur yang sudah tersedia.
5. Identifikasi metric names dan labels aktual dari hasil Prometheus; jangan menebak.
6. Jangan mengubah infrastruktur VPS secara otomatis.

### 17.2 Saat coding

1. Gunakan TypeScript dan Next.js App Router.
2. Gunakan Prometheus sebagai sumber data metrik PM2 dan cAdvisor.
3. Semua query Prometheus dilakukan server-side.
4. Pertahankan desain visual Phase 2.
5. Pertahankan kompatibilitas interface yang sudah digunakan.
6. Jangan menghapus komponen atau mengubah struktur proyek besar-besaran.
7. Jangan menambahkan fitur kontrol proses PM2/Docker.
8. Jangan menampilkan data dummy seolah-olah data aktual.
9. Gunakan `null`/`N/A` untuk metrik yang tidak tersedia.
10. Tambahkan komentar untuk rumus konversi unit dan agregasi.

### 17.3 Batasan perubahan infrastruktur

AI Agent tidak boleh menjalankan perintah instalasi exporter, mengubah file Prometheus VPS, mengubah Docker network, firewall, Nginx, atau Cloudflare Tunnel tanpa instruksi dan persetujuan eksplisit dari pengguna.

Jika perubahan infrastruktur diperlukan:
- Jelaskan alasan.
- Tampilkan file/perintah yang akan diubah.
- Jelaskan risiko dan dampaknya.
- Tampilkan langkah rollback.
- Tunggu persetujuan sebelum eksekusi.

### 17.4 Setelah implementasi

Jalankan:

```bash
npx tsc --noEmit
npm run build
```

Laporkan:
- File yang dibuat.
- File yang diubah.
- Endpoint API yang tersedia.
- Query PromQL dan nama metrik yang benar-benar dipakai.
- Metrik yang belum tersedia.
- Hasil TypeScript check dan build.
- Hasil validasi data terhadap Prometheus/Grafana.
- Perubahan infrastruktur yang masih menunggu persetujuan.

---

## 18. Di Luar Cakupan Phase 4

Fitur berikut tidak dikerjakan pada fase ini:

- Alert dan notifikasi Telegram/WhatsApp/email.
- Restart/stop/delete aplikasi PM2 dari UI.
- Restart/stop/remove container Docker dari UI.
- Deployment aplikasi melalui ServerWatch.
- Monitoring database secara mendalam.
- Monitoring log terpusat.
- Public deployment dan konfigurasi Cloudflare Access final.
- Role-based access control tingkat lanjut.

Fitur alerting masuk Phase 5. Deployment dan security final masuk Phase 6.

---

## 19. Referensi Teknis

- PM2 Prometheus Module: https://github.com/VeXell/pm2-prom-module
- Prometheus configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- cAdvisor: https://github.com/google/cadvisor

Dokumentasi exporter yang dirujuk menjelaskan endpoint default port `9988`, opsi konfigurasi listener, dan metrik PM2 seperti status aplikasi, instance, memory, serta statistik proses. Periksa kembali dokumentasi dan versi paket saat implementasi karena detail dapat berubah.

---

## 20. Catatan Penutup

Phase 4 harus membuat ServerWatch mampu menjawab dua pertanyaan:

1. **Bagaimana kondisi VPS?** — dijawab oleh Node Exporter.
2. **Bagaimana kondisi aplikasi dan container di dalam VPS?** — dijawab oleh PM2 Prometheus Module dan cAdvisor.

Prometheus menjadi pusat pengumpulan dan query metrik, sedangkan Next.js menjadi backend aplikasi dan antarmuka monitoring untuk tim IT.

Prioritas utama bukan banyaknya metrik, tetapi akurasi data, konsistensi sumber, keamanan jaringan, dan tidak mengganggu aplikasi produksi GGP.

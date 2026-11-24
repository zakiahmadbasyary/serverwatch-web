# ServerWatch PM2 Process Tree CPU Collector

Service independen berbasis Node.js untuk mengukur utilisasi CPU aktual dari seluruh process tree aplikasi PM2 di VPS Ubuntu (2 vCPU).

---

## 1. Lokasi Penempatan File di VPS

```text
/opt/serverwatch/pm2-cpu-collector/
├── collector.js
├── package.json
└── README.md

/etc/systemd/system/
└── serverwatch-pm2-cpu-collector.service
```

---

## 2. Cara Kerja & Fitur Utama

1. **Process Tree Discovery**: Membaca root PID dari `pm2 jlist`, kemudian melakukan rekursif BFS di `/proc` untuk menemukan seluruh child process (misal: proses `node` di bawah wrapper `npm start`).
2. **Linux `/proc/[pid]/stat`**: Mengambil `utime` dan `stime` dari setiap proses tanpa overhead eksekusi external command berulang.
3. **High-Resolution Clock**: Mengambil `CLK_TCK` dinamis via `getconf CLK_TCK` dan durasi waktu sampling via `process.hrtime.bigint()`.
4. **Normalisasi 2 vCPU**:
   - `cpuCores = (deltaTicks / CLK_TCK) / elapsedSeconds`
   - `cpuPercent = (cpuCores / 2) * 100` (1 core penuh = 50%, 2 core penuh = 100%).
5. **Anti-Spike & Restart Protection**: Ketika aplikasi restart atau PID berubah, baseline di-reset ke 0 pada cycle pertama untuk mencegah lonjakan CPU palsu.
6. **Zero Dependencies**: Menggunakan library bawaan Node.js (`http`, `fs`, `child_process`).
7. **Keamanan Jaringan**: Mendengarkan strictly pada `172.20.0.1:9989` (Docker bridge gateway), tidak terbuka ke internet publik.

---

## 3. Langkah Instalasi di VPS

Jalankan perintah berikut di terminal VPS sebagai user `root`:

### Langkah A — Buat Direktori & Salin File
```bash
mkdir -p /opt/serverwatch/pm2-cpu-collector
cd /opt/serverwatch/pm2-cpu-collector
```

Salin file `collector.js` dan `package.json` ke direktori tersebut.

### Langkah B — Pasang Service Systemd
Salin file `serverwatch-pm2-cpu-collector.service` ke `/etc/systemd/system/`:
```bash
sudo cp serverwatch-pm2-cpu-collector.service /etc/systemd/system/
sudo chmod 644 /etc/systemd/system/serverwatch-pm2-cpu-collector.service
```

### Langkah C — Aktifkan dan Jalankan Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable serverwatch-pm2-cpu-collector
sudo systemctl start serverwatch-pm2-cpu-collector
```

---

## 4. Cara Validasi di VPS

### Periksa Status Service:
```bash
sudo systemctl status serverwatch-pm2-cpu-collector
```
*Hasil yang diharapkan: `Active: active (running)`*

### Uji Endpoint Metrics:
```bash
curl -s http://172.20.0.1:9989/metrics | head -n 30
```
*Hasil yang diharapkan: Format metrik Prometheus berisi 16 aplikasi PM2.*

### Uji Endpoint Health:
```bash
curl -s http://172.20.0.1:9989/health
```
*Hasil yang diharapkan:*
```json
{
  "status": "ok",
  "uptimeSeconds": 15,
  "appsCount": 16,
  "vCpuCores": 2,
  "clkTck": 100
}
```

---

## 5. Prosedur Rollback

Jika service perlu dihentikan atau dihapus:
```bash
sudo systemctl stop serverwatch-pm2-cpu-collector
sudo systemctl disable serverwatch-pm2-cpu-collector
sudo rm -f /etc/systemd/system/serverwatch-pm2-cpu-collector.service
sudo systemctl daemon-reload
```
Aplikasi PM2 produksi dan service Docker lainnya sama sekali tidak terpengaruh oleh proses rollback ini.

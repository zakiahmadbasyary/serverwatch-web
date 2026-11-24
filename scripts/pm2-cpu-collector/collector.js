/**
 * ServerWatch - PM2 Process Tree CPU Collector
 *
 * Mengukur utilisasi CPU aktual dari seluruh process tree aplikasi PM2
 * berbasis pembacaan Linux /proc/[pid]/stat secara rekursif.
 *
 * Normalisasi terhadap 2 vCPU:
 * - 1 core penuh = 50%
 * - 2 core penuh = 100%
 *
 * Endpoint Metrics: http://172.20.0.1:9989/metrics
 */

const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

// -----------------------------------------------------------------------------
// KONFIGURASI
// -----------------------------------------------------------------------------
const HOST = process.env.COLLECTOR_HOST || '172.20.0.1';
const PORT = parseInt(process.env.COLLECTOR_PORT || '9989', 10);
const SAMPLE_INTERVAL_MS = parseInt(process.env.SAMPLE_INTERVAL_MS || '5000', 10);
const TOTAL_VCPU = 2; // Total vCPU pada VPS Ubuntu

// Deteksi CLK_TCK (Clock Ticks per detik) secara dinamis
let CLK_TCK = 100;
try {
  const out = execSync('getconf CLK_TCK', { encoding: 'utf8', timeout: 2000 }).trim();
  const val = parseInt(out, 10);
  if (!isNaN(val) && val > 0) {
    CLK_TCK = val;
  }
} catch {
  CLK_TCK = 100;
}

console.log(`[ServerWatch Collector] Initialized with CLK_TCK=${CLK_TCK}, vCPU=${TOTAL_VCPU}, Interval=${SAMPLE_INTERVAL_MS}ms`);

// -----------------------------------------------------------------------------
// STATE PENYIMPANAN
// -----------------------------------------------------------------------------
// baseline: Map<appName, { rootPid: number, totalTicks: number, timestampNs: bigint }>
const baselines = new Map();

// currentMetrics: Map<appName, { cpuPercent: number, cpuCores: number, processCount: number, status: string }>
const currentMetrics = new Map();

// Status kesehatan collector
let isCollectorHealthy = 1;
let lastCollectTimestamp = 0;
let lastCollectDurationMs = 0;

// -----------------------------------------------------------------------------
// HELPER: PARSING LINUX /proc/[pid]/stat
// -----------------------------------------------------------------------------
function readProcessStat(pid) {
  try {
    const statPath = `/proc/${pid}/stat`;
    if (!fs.existsSync(statPath)) return null;

    const content = fs.readFileSync(statPath, 'utf8');
    const lastParen = content.lastIndexOf(')');
    if (lastParen === -1) return null;

    // Ambil data setelah kurung nama executable
    const rest = content.slice(lastParen + 2).trim().split(/\s+/);
    if (rest.length < 13) return null;

    // rest[0] = state
    // rest[1] = ppid
    // rest[11] = utime (Field 14 pada stat asli)
    // rest[12] = stime (Field 15 pada stat asli)
    const ppid = parseInt(rest[1], 10);
    const utime = parseInt(rest[11], 10);
    const stime = parseInt(rest[12], 10);

    if (isNaN(ppid) || isNaN(utime) || isNaN(stime)) return null;

    return {
      pid,
      ppid,
      utime,
      stime,
      totalTicks: utime + stime,
    };
  } catch {
    return null; // Proses mungkin sudah selesai di antara readdir dan readFileSync
  }
}

// -----------------------------------------------------------------------------
// HELPER: PEMETAAN PROCESS TREE DI LINUX
// -----------------------------------------------------------------------------
function buildProcessTree() {
  const pids = [];
  try {
    const entries = fs.readdirSync('/proc');
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i];
      // Hanya nama numerik (PID)
      if (name.charCodeAt(0) >= 48 && name.charCodeAt(0) <= 57 && /^\d+$/.test(name)) {
        pids.push(parseInt(name, 10));
      }
    }
  } catch (err) {
    console.error('[ServerWatch Collector] Error reading /proc:', err.message);
    return { processMap: new Map(), childrenMap: new Map() };
  }

  const processMap = new Map(); // pid -> stat
  const childrenMap = new Map(); // ppid -> [childPid, ...]

  for (let i = 0; i < pids.length; i++) {
    const pid = pids[i];
    const stat = readProcessStat(pid);
    if (stat) {
      processMap.set(pid, stat);
      if (!childrenMap.has(stat.ppid)) {
        childrenMap.set(stat.ppid, []);
      }
      childrenMap.get(stat.ppid).push(pid);
    }
  }

  return { processMap, childrenMap };
}

// -----------------------------------------------------------------------------
// HELPER: MENGAMBIL DAFTAR APLIKASI PM2
// -----------------------------------------------------------------------------
function getPm2AppList() {
  try {
    // Jalankan pm2 jlist secara sinkron
    const stdout = execSync('pm2 jlist', {
      encoding: 'utf8',
      timeout: 4000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, PM2_SILENT: 'true' },
    });

    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed)) return [];

    const apps = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      const name = item.name || '';
      // Abaikan modul exporter pm2-prom-module
      if (!name || name === 'pm2-prom-module') continue;

      const pid = item.pid || 0;
      const status = item.pm2_env?.status || 'stopped';
      const pm_id = item.pm_id !== undefined ? item.pm_id : item.pm2_env?.pm_id;

      apps.push({
        name,
        pm_id,
        pid,
        status,
      });
    }

    return apps;
  } catch (err) {
    console.error('[ServerWatch Collector] Failed to query PM2 list:', err.message);
    return [];
  }
}

// -----------------------------------------------------------------------------
// SIKLUS PENGUKURAN CPU PROCESS TREE
// -----------------------------------------------------------------------------
function collectCpuMetrics() {
  const startTime = Date.now();
  const nowNs = process.hrtime.bigint();

  const pm2Apps = getPm2AppList();
  if (pm2Apps.length === 0) {
    isCollectorHealthy = 0;
    return;
  }

  const { processMap, childrenMap } = buildProcessTree();
  const activeAppNames = new Set();

  for (let i = 0; i < pm2Apps.length; i++) {
    const app = pm2Apps[i];
    const appName = app.name;
    const rootPid = app.pid;
    activeAppNames.add(appName);

    // Jika aplikasi PM2 tidak aktif / tidak memiliki PID
    if (app.status !== 'online' || !rootPid || rootPid <= 0 || !processMap.has(rootPid)) {
      currentMetrics.set(appName, {
        cpuPercent: 0,
        cpuCores: 0,
        processCount: 0,
        status: app.status,
      });
      baselines.delete(appName);
      continue;
    }

    // Temukan seluruh proses dalam tree turunan rootPid (BFS)
    const treePids = new Set();
    const queue = [rootPid];

    while (queue.length > 0) {
      const curr = queue.shift();
      if (!treePids.has(curr)) {
        treePids.add(curr);
        const children = childrenMap.get(curr);
        if (children) {
          for (let c = 0; c < children.length; c++) {
            const childPid = children[c];
            if (!treePids.has(childPid)) {
              queue.push(childPid);
            }
          }
        }
      }
    }

    // Hitung total ticks (utime + stime) dari seluruh tree
    let currentTotalTicks = 0;
    for (const pid of treePids) {
      const stat = processMap.get(pid);
      if (stat) {
        currentTotalTicks += stat.totalTicks;
      }
    }

    const processCount = treePids.size;

    // Hitung perubahan CPU terhadap baseline sebelumnya
    const prev = baselines.get(appName);

    if (!prev) {
      // Sampel awal: simpan baseline, laporkan 0.0% di cycle pertama
      baselines.set(appName, {
        rootPid,
        totalTicks: currentTotalTicks,
        timestampNs: nowNs,
      });

      currentMetrics.set(appName, {
        cpuPercent: 0,
        cpuCores: 0,
        processCount,
        status: app.status,
      });
    } else {
      const elapsedSeconds = Number(nowNs - prev.timestampNs) / 1e9;
      const rootPidChanged = prev.rootPid !== rootPid;
      const ticksDecreased = currentTotalTicks < prev.totalTicks;

      // Perlindungan Anti-Spike: Deteksi restart / reset proses
      if (rootPidChanged || ticksDecreased || elapsedSeconds <= 0) {
        baselines.set(appName, {
          rootPid,
          totalTicks: currentTotalTicks,
          timestampNs: nowNs,
        });

        currentMetrics.set(appName, {
          cpuPercent: 0,
          cpuCores: 0,
          processCount,
          status: app.status,
        });
      } else {
        const deltaTicks = currentTotalTicks - prev.totalTicks;
        const cpuSeconds = deltaTicks / CLK_TCK;
        const cpuCores = Math.max(0, cpuSeconds / elapsedSeconds);

        // Normalisasi terhadap 2 vCPU: 1 core = 50%, 2 core = 100%
        let cpuPercent = (cpuCores / TOTAL_VCPU) * 100;
        if (cpuPercent > 100.0) cpuPercent = 100.0;
        if (cpuPercent < 0) cpuPercent = 0;

        // Update baseline untuk cycle berikutnya
        baselines.set(appName, {
          rootPid,
          totalTicks: currentTotalTicks,
          timestampNs: nowNs,
        });

        currentMetrics.set(appName, {
          cpuPercent: Number(cpuPercent.toFixed(2)),
          cpuCores: Number(cpuCores.toFixed(4)),
          processCount,
          status: app.status,
        });
      }
    }
  }

  // Bersihkan baseline untuk aplikasi yang sudah dihapus dari PM2
  for (const name of baselines.keys()) {
    if (!activeAppNames.has(name)) {
      baselines.delete(name);
      currentMetrics.delete(name);
    }
  }

  isCollectorHealthy = 1;
  lastCollectTimestamp = Date.now();
  lastCollectDurationMs = Date.now() - startTime;
}

// -----------------------------------------------------------------------------
// FORMATTER EXPOSITION PROMETHEUS
// -----------------------------------------------------------------------------
function generatePrometheusMetrics() {
  const lines = [];

  // Metric 1: serverwatch_pm2_app_cpu_percent
  lines.push('# HELP serverwatch_pm2_app_cpu_percent PM2 application CPU utilization percentage normalized to 2 vCPUs (0-100%)');
  lines.push('# TYPE serverwatch_pm2_app_cpu_percent gauge');
  for (const [appName, data] of currentMetrics.entries()) {
    const escapedApp = appName.replace(/["\\]/g, '\\$&');
    lines.push(`serverwatch_pm2_app_cpu_percent{app="${escapedApp}"} ${data.cpuPercent.toFixed(2)}`);
  }

  // Metric 2: serverwatch_pm2_app_cpu_cores
  lines.push('');
  lines.push('# HELP serverwatch_pm2_app_cpu_cores PM2 application CPU utilization in cores (0-2.0000)');
  lines.push('# TYPE serverwatch_pm2_app_cpu_cores gauge');
  for (const [appName, data] of currentMetrics.entries()) {
    const escapedApp = appName.replace(/["\\]/g, '\\$&');
    lines.push(`serverwatch_pm2_app_cpu_cores{app="${escapedApp}"} ${data.cpuCores.toFixed(4)}`);
  }

  // Metric 3: serverwatch_pm2_app_process_count
  lines.push('');
  lines.push('# HELP serverwatch_pm2_app_process_count Total active processes in application process tree');
  lines.push('# TYPE serverwatch_pm2_app_process_count gauge');
  for (const [appName, data] of currentMetrics.entries()) {
    const escapedApp = appName.replace(/["\\]/g, '\\$&');
    lines.push(`serverwatch_pm2_app_process_count{app="${escapedApp}"} ${data.processCount}`);
  }

  // Metric 4: serverwatch_pm2_app_cpu_collector_up
  lines.push('');
  lines.push('# HELP serverwatch_pm2_app_cpu_collector_up Health status of ServerWatch PM2 CPU Collector (1=running)');
  lines.push('# TYPE serverwatch_pm2_app_cpu_collector_up gauge');
  lines.push(`serverwatch_pm2_app_cpu_collector_up ${isCollectorHealthy}`);

  lines.push('');
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// HTTP SERVER (METRICS & HEALTH)
// -----------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url === '/metrics' && req.method === 'GET') {
    const output = generatePrometheusMetrics();
    res.writeHead(200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Content-Length': Buffer.byteLength(output),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(output);
    return;
  }

  if (url === '/health' && req.method === 'GET') {
    const payload = JSON.stringify({
      status: isCollectorHealthy === 1 ? 'ok' : 'degraded',
      uptimeSeconds: Math.floor(process.uptime()),
      appsCount: currentMetrics.size,
      lastCollectTimestamp: new Date(lastCollectTimestamp).toISOString(),
      lastCollectDurationMs,
      vCpuCores: TOTAL_VCPU,
      clkTck: CLK_TCK,
    });
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// -----------------------------------------------------------------------------
// START SERVICE
// -----------------------------------------------------------------------------
// Jalankan pengukuran pertama segera
collectCpuMetrics();

// Jadwalkan cycle berkala
const intervalId = setInterval(collectCpuMetrics, SAMPLE_INTERVAL_MS);

server.listen(PORT, HOST, () => {
  console.log(`[ServerWatch Collector] Listening strictly on http://${HOST}:${PORT}/metrics`);
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`[ServerWatch Collector] Received ${signal}, shutting down gracefully...`);
  clearInterval(intervalId);
  server.close(() => {
    console.log('[ServerWatch Collector] Closed HTTP server. Exit 0.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

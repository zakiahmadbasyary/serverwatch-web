/**
 * Kumpulan query PromQL standar untuk infrastruktur VPS GGP & cAdvisor
 */

export const PROMQL = {
  // ---------------------------------------------------------------------------
  // HOST / NODE EXPORTER METRICS
  // ---------------------------------------------------------------------------
  
  // Total CPU Usage host (%) over 5m
  CPU_USAGE_OVERALL: '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))',

  // Per-core CPU Usage (%)
  CPU_USAGE_PER_CORE: '100 * (1 - rate(node_cpu_seconds_total{mode="idle"}[5m]))',

  // Load Average (1m, 5m, 15m)
  LOAD_AVERAGE_1M: 'node_load1',
  LOAD_AVERAGE_5M: 'node_load5',
  LOAD_AVERAGE_15M: 'node_load15',

  // Memory metrics (bytes)
  MEM_TOTAL_BYTES: 'node_memory_MemTotal_bytes',
  MEM_AVAILABLE_BYTES: 'node_memory_MemAvailable_bytes',
  MEM_CACHED_BYTES: 'node_memory_Cached_bytes + node_memory_Buffers_bytes',
  MEM_FREE_BYTES: 'node_memory_MemFree_bytes',
  MEM_USAGE_PERCENT: '100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))',

  // Disk metrics (Root / on /dev/sda1)
  DISK_ROOT_TOTAL_BYTES: 'node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"}',
  DISK_ROOT_AVAILABLE_BYTES: 'node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"}',
  DISK_ROOT_USAGE_PERCENT: '100 * (1 - (node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"}))',

  // All Filesystems (excluding tmpfs/virtual)
  DISK_ALL_FILESYSTEMS: 'node_filesystem_size_bytes{fstype!~"tmpfs|overlay|rootfs|squashfs"}',

  // Network Traffic (bytes/sec, excluding loopback 'lo')
  NETWORK_RECEIVE_BYTES_PER_SEC: 'sum(rate(node_network_receive_bytes_total{device!="lo"}[5m]))',
  NETWORK_TRANSMIT_BYTES_PER_SEC: 'sum(rate(node_network_transmit_bytes_total{device!="lo"}[5m]))',

  // System Uptime (seconds)
  SYSTEM_UPTIME_SECONDS: 'node_time_seconds - node_boot_time_seconds',

  // ---------------------------------------------------------------------------
  // CADVISOR / DOCKER CONTAINER METRICS
  // ---------------------------------------------------------------------------

  // Docker Container CPU usage (%)
  CONTAINER_CPU_USAGE: 'sum by (name) (rate(container_cpu_usage_seconds_total{name!=""}[5m])) * 100',

  // Docker Container Memory usage (Working set bytes)
  CONTAINER_MEMORY_BYTES: 'container_memory_working_set_bytes{name!=""}',
};

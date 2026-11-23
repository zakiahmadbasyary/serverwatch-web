/**
 * Prometheus Client Helper (Server-Side Only)
 * Menjalankan instant dan range query ke Prometheus HTTP API dengan timeout dan safe error handling.
 */

export interface PrometheusVectorResult {
  metric: Record<string, string>;
  value: [number, string]; // [timestamp, "value"]
}

export interface PrometheusMatrixResult {
  metric: Record<string, string>;
  values: [number, string][]; // [[timestamp, "value"], ...]
}

export interface PrometheusResponse<T> {
  status: "success" | "error";
  data?: {
    resultType: "vector" | "matrix" | "scalar" | "string";
    result: T;
  };
  errorType?: string;
  error?: string;
}

export class PrometheusClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.PROMETHEUS_URL || "http://127.0.0.1:9090").replace(/\/+$/, "");
    this.defaultTimeoutMs = 8000; // 8 detik default timeout
  }

  /**
   * Cek kesehatan koneksi ke Prometheus
   */
  async checkHealth(): Promise<{ isHealthy: boolean; message: string; timestamp: string }> {
    const timestamp = new Date().toISOString();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${this.baseUrl}/-/ready`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return { isHealthy: true, message: "Prometheus is ready", timestamp };
      }

      return { isHealthy: false, message: `Prometheus status not ready (HTTP ${res.status})`, timestamp };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        isHealthy: false,
        message: isTimeout
          ? "Connection timeout to Prometheus"
          : "Cannot connect to Prometheus. Pastikan SSH tunnel aktif (port 9090).",
        timestamp,
      };
    }
  }

  /**
   * Eksekusi Instant Query (/api/v1/query)
   */
  async queryInstant(query: string, timeoutMs = this.defaultTimeoutMs): Promise<PrometheusVectorResult[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(`${this.baseUrl}/api/v1/query`);
      url.searchParams.set("query", query);

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Prometheus HTTP ${res.status}: ${res.statusText}`);
      }

      const json: PrometheusResponse<PrometheusVectorResult[]> = await res.json();
      if (json.status !== "success" || !json.data) {
        throw new Error(json.error || "Prometheus returned error status");
      }

      return json.data.result || [];
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        throw new Error(`Prometheus query timeout (${timeoutMs}ms) for: ${query}`);
      }
      throw err;
    }
  }

  /**
   * Eksekusi Range Query (/api/v1/query_range)
   */
  async queryRange(
    query: string,
    start: number,
    end: number,
    step: string,
    timeoutMs = this.defaultTimeoutMs
  ): Promise<PrometheusMatrixResult[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(`${this.baseUrl}/api/v1/query_range`);
      url.searchParams.set("query", query);
      url.searchParams.set("start", start.toString());
      url.searchParams.set("end", end.toString());
      url.searchParams.set("step", step);

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Prometheus HTTP ${res.status}: ${res.statusText}`);
      }

      const json: PrometheusResponse<PrometheusMatrixResult[]> = await res.json();
      if (json.status !== "success" || !json.data) {
        throw new Error(json.error || "Prometheus returned error status");
      }

      return json.data.result || [];
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        throw new Error(`Prometheus range query timeout (${timeoutMs}ms) for: ${query}`);
      }
      throw err;
    }
  }
}

export const prometheusClient = new PrometheusClient();

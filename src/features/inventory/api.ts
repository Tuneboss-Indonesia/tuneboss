declare const process: { env?: Record<string, string | undefined> };

export type ApiError = Error & { code?: string; status?: number; errors?: Record<string, string[]> };

const defaultBaseUrl = "http://localhost:8000";

export const apiBaseUrl = process.env?.EXPO_PUBLIC_API_URL ?? defaultBaseUrl;

export async function apiRequest<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(typeof payload === "object" && payload?.message ? payload.message : "Request failed") as ApiError;
    error.status = response.status;
    error.code = typeof payload === "object" ? payload?.code : undefined;
    error.errors = typeof payload === "object" ? payload?.errors : undefined;
    throw error;
  }

  return payload as T;
}

export async function downloadCsv(path: string, token: string | null, filename: string): Promise<void> {
  const headers = new Headers({ Accept: "text/csv" });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, { headers });
  const payload = await response.text();

  if (!response.ok) {
    throw new Error(payload || "Export CSV gagal.");
  }

  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
    throw new Error("Download CSV tersedia di web dashboard.");
  }

  const blob = new Blob([payload], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" }).format(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export const periodMap = {
  hari: "day",
  minggu: "week",
  bulan: "month",
  tahun: "year",
} as const;

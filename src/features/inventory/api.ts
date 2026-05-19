declare const process: { env?: Record<string, string | undefined> };

export type ApiError = Error & { code?: string; status?: number; errors?: Record<string, string[]> };

const defaultBaseUrl = "http://localhost:8000";

export const apiBaseUrl = process.env?.EXPO_PUBLIC_API_URL ?? defaultBaseUrl;

export async function apiRequest<T>(path: string, options: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
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

import { Platform } from "react-native";

declare const process: { env?: Record<string, string | undefined> };

export type ApiError = Error & { code?: string; status?: number; errors?: Record<string, string[]> };

const defaultBaseUrl = Platform.select({
  android: "http://10.0.2.2:8000",
  default: "http://localhost:8000",
}) + "/api";

export const apiBaseUrl = process.env?.EXPO_PUBLIC_API_URL ?? defaultBaseUrl;

function apiRootUrl(): string {
  const base = apiBaseUrl.replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

function apiUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${apiRootUrl()}/${normalizedPath}`;
}

function errorMessageFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Request failed";

  const errors = "errors" in payload ? payload.errors : undefined;
  if (errors && typeof errors === "object") {
    const firstMessages = Object.values(errors).find((value) => Array.isArray(value) && value.every((item) => typeof item === "string"));
    if (Array.isArray(firstMessages) && firstMessages.length) return firstMessages[0];
  }

  const message = "message" in payload ? payload.message : undefined;
  return typeof message === "string" ? message : "Request failed";
}

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

  const response = await fetch(apiUrl(path), { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(errorMessageFromPayload(payload)) as ApiError;
    error.status = response.status;
    error.code = typeof payload === "object" ? payload?.code : undefined;
    error.errors = typeof payload === "object" ? payload?.errors : undefined;
    throw error;
  }

  return payload as T;
}

export function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" }).format(value);
  } catch {
    return `Rp ${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  }
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
  } catch {
    const pad = (number: number) => String(number).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}.${pad(date.getMinutes())}`;
  }
}

export const periodMap = {
  hari: "day",
  minggu: "week",
  bulan: "month",
  tahun: "year",
} as const;

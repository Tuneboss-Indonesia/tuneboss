declare const process: { env?: Record<string, string | undefined> };
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export type ApiError = Error & { code?: string; status?: number; errors?: Record<string, string[]> };

const defaultBaseUrl = "http://localhost:8000";
let unauthenticatedHandler: (() => void) | null = null;

export const apiBaseUrl = process.env?.EXPO_PUBLIC_API_URL ?? defaultBaseUrl;

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

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(errorMessageFromPayload(payload)) as ApiError;
    error.status = response.status;
    error.code = typeof payload === "object" ? payload?.code : undefined;
    error.errors = typeof payload === "object" ? payload?.errors : undefined;
    if (error.status === 401 || error.code === "unauthenticated") unauthenticatedHandler?.();
    throw error;
  }

  return payload as T;
}

export async function downloadCsv(path: string, token: string | null, filename: string): Promise<void> {
  return downloadFile(path, token, filename, "text/csv;charset=utf-8", "Download CSV tersedia di web dashboard.", "text/csv");
}

export async function downloadPdf(path: string, token: string | null, filename: string): Promise<void> {
  return downloadFile(path, token, filename, "application/pdf", "Download PDF tersedia di web dashboard.", "application/pdf");
}

async function downloadFile(path: string, token: string | null, filename: string, mimeType: string, unsupportedMessage: string, accept: string): Promise<void> {
  const headers = new Headers({ Accept: accept });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (Platform.OS !== "web") {
    const file = new FileSystem.File(FileSystem.Paths.document, filename);
    let downloadedFile: FileSystem.File;
    try {
      downloadedFile = await FileSystem.File.downloadFileAsync(`${apiBaseUrl}${path}`, file, {
        headers: Object.fromEntries(headers.entries()),
        idempotent: true,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) unauthenticatedHandler?.();
      throw error;
    }
    if (!(await Sharing.isAvailableAsync())) throw new Error(unsupportedMessage);
    await Sharing.shareAsync(downloadedFile.uri, { mimeType, UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text" });
    return;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { headers });

  if (!response.ok) {
    const payload = await response.text();
    if (response.status === 401) unauthenticatedHandler?.();
    throw new Error(payload || "Export CSV gagal.");
  }

  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
    throw new Error(unsupportedMessage);
  }

  const blob = await response.blob();
  const typedBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
  const downloadable = typeof File === "undefined" ? typedBlob : new File([typedBlob], filename, { type: mimeType });
  const url = URL.createObjectURL(downloadable);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
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

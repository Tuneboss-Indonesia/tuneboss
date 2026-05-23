import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const AUTH_KEY = "tuneboss.auth";
const PAGE_KEY = "tuneboss.page";

function canUseLocalStorage() {
  return Platform.OS === "web" && typeof localStorage !== "undefined";
}

export async function getStoredValue(key: string): Promise<string | null> {
  try {
    if (canUseLocalStorage()) return localStorage.getItem(key);
    if (!SecureStore.isAvailableAsync || !(await SecureStore.isAvailableAsync())) return null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setStoredValue(key: string, value: string): Promise<void> {
  try {
    if (canUseLocalStorage()) {
      localStorage.setItem(key, value);
      return;
    }
    if (!SecureStore.isAvailableAsync || !(await SecureStore.isAvailableAsync())) return;
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore persistence failures; the app can still keep state in memory.
  }
}

export async function deleteStoredValue(key: string): Promise<void> {
  try {
    if (canUseLocalStorage()) {
      localStorage.removeItem(key);
      return;
    }
    if (!SecureStore.isAvailableAsync || !(await SecureStore.isAvailableAsync())) return;
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore cleanup failures.
  }
}

export const storageKeys = {
  auth: AUTH_KEY,
  page: PAGE_KEY,
} as const;

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import localforage from "localforage";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Offline Storage Utilities ---
export const offlineStore = localforage.createInstance({
  name: "expense-app-offline"
});

export async function getItem<T>(key: string): Promise<T | null> {
  return (await offlineStore.getItem<T>(key)) ?? null;
}
export async function setItem<T>(key: string, value: T): Promise<void> {
  await offlineStore.setItem<T>(key, value);
}
export async function removeItem(key: string): Promise<void> {
  await offlineStore.removeItem(key);
}

// Queue for offline sync
export async function addToQueue(action: any) {
  const queue = (await getItem<any[]>("sync-queue")) || [];
  queue.push(action);
  await setItem("sync-queue", queue);
}
export async function getQueue() {
  return (await getItem<any[]>("sync-queue")) || [];
}
export async function clearQueue() {
  await setItem("sync-queue", []);
}

// Everything ONboard keeps in this browser uses the "jat." prefix (the Supabase session token is
// managed by supabase-js and removed on sign-out). Used for export and for wiping a device.

import type { ChatMsg } from "./chatStore";

const PREFIX = "jat.";
const CHAT_PREFIX = "jat.chat.v1.";

type StorageLike = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;

function keys(storage: StorageLike, prefix: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(prefix)) out.push(k);
  }
  return out;
}

/** Chat threads of one user on this device, keyed by attached job id ("none" = no job). */
export function readLocalChats(userId: string, storage: StorageLike = localStorage): Record<string, ChatMsg[]> {
  const threads: Record<string, ChatMsg[]> = {};
  const userPrefix = `${CHAT_PREFIX}${userId}.`;
  for (const k of keys(storage, userPrefix)) {
    try {
      threads[k.slice(userPrefix.length)] = JSON.parse(storage.getItem(k) || "[]");
    } catch {
      // skip unreadable entries
    }
  }
  return threads;
}

/** Non-sensitive app preferences stored on this device. */
export function readLocalPreferences(storage: StorageLike = localStorage): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ["jat.prefs.v1", "jat.lang"]) {
    const v = storage.getItem(k);
    if (v === null) continue;
    try { out[k] = JSON.parse(v); } catch { out[k] = v; }
  }
  return out;
}

/** Removes the chat history of one user from this device. Returns the number of threads removed. */
export function clearLocalChats(userId: string, storage: StorageLike = localStorage): number {
  const removed = keys(storage, `${CHAT_PREFIX}${userId}.`);
  removed.forEach((k) => storage.removeItem(k));
  storage.removeItem(`jat.chat.attachedJob.${userId}`);
  // Drop the removed threads from the shared chat index.
  const idx = storage.getItem(`${CHAT_PREFIX}index`);
  if (idx) {
    try {
      const rest = (JSON.parse(idx) as string[]).filter((k) => !removed.includes(k));
      storage.setItem(`${CHAT_PREFIX}index`, JSON.stringify(rest));
    } catch {
      storage.removeItem(`${CHAT_PREFIX}index`);
    }
  }
  return removed.length;
}

/** Removes every ONboard key from local and session storage on this device. */
export function clearAllLocalAppData(
  local: StorageLike = localStorage,
  session: StorageLike = sessionStorage,
): void {
  for (const s of [local, session]) {
    keys(s, PREFIX).forEach((k) => s.removeItem(k));
  }
}

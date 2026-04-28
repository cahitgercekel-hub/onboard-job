// Local persistence for the AI Assistant chat threads.
// Threads are keyed by user + attached job (or "none" when no job is attached),
// so each job has its own conversation that persists across reloads and only
// gets cleared when the user explicitly resets it or wipes their data from Settings.

export type ChatMsg = { role: "user" | "assistant"; content: string };

const STORAGE_PREFIX = "jat.chat.v1";
const INDEX_KEY = `${STORAGE_PREFIX}.index`;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readIndex(): string[] {
  return safeParse<string[]>(localStorage.getItem(INDEX_KEY), []);
}

function writeIndex(keys: string[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(keys));
  } catch {
    // ignore
  }
}

function threadKey(userId: string | null | undefined, jobId: string | null | undefined): string {
  const u = userId || "anon";
  const j = jobId || "none";
  return `${STORAGE_PREFIX}.${u}.${j}`;
}

export function loadChatThread(
  userId: string | null | undefined,
  jobId: string | null | undefined,
): ChatMsg[] {
  try {
    return safeParse<ChatMsg[]>(localStorage.getItem(threadKey(userId, jobId)), []);
  } catch {
    return [];
  }
}

export function saveChatThread(
  userId: string | null | undefined,
  jobId: string | null | undefined,
  messages: ChatMsg[],
) {
  const key = threadKey(userId, jobId);
  try {
    if (!messages.length) {
      localStorage.removeItem(key);
      const idx = readIndex().filter((k) => k !== key);
      writeIndex(idx);
      return;
    }
    localStorage.setItem(key, JSON.stringify(messages));
    const idx = readIndex();
    if (!idx.includes(key)) {
      idx.push(key);
      writeIndex(idx);
    }
  } catch {
    // quota or serialization error — ignore silently
  }
}

export function clearChatThread(
  userId: string | null | undefined,
  jobId: string | null | undefined,
) {
  const key = threadKey(userId, jobId);
  try {
    localStorage.removeItem(key);
    writeIndex(readIndex().filter((k) => k !== key));
  } catch {
    // ignore
  }
}

/** Wipe every chat thread on this device (used by Settings → Clear all / Delete account). */
export function clearAllChats() {
  try {
    const idx = readIndex();
    for (const key of idx) localStorage.removeItem(key);
    localStorage.removeItem(INDEX_KEY);
    // Defensive sweep: catch any orphaned legacy keys with our prefix
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${STORAGE_PREFIX}.`)) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

import "@testing-library/jest-dom";

// Newer Node versions ship their own (file-backed, often unavailable) Web Storage globals that can
// shadow jsdom's. Fall back to an in-memory implementation so storage-related code is testable.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  key(index: number) { return [...this.map.keys()][index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
}
for (const name of ["localStorage", "sessionStorage"] as const) {
  let usable = false;
  try { usable = typeof globalThis[name]?.getItem === "function"; } catch { usable = false; }
  if (!usable) Object.defineProperty(globalThis, name, { configurable: true, value: new MemoryStorage() });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// No-account demo: sample data that lives only in this browser tab (sessionStorage) and never
// reaches the backend. The flag is read once at startup (see src/lib/db.ts), so entering or
// leaving the demo reloads the page. A real signed-in session is left untouched.

export const DEMO_FLAG_KEY = "jat.demo";
export const DEMO_DB_KEY = "jat.demo.db";
export const DEMO_AI_MESSAGE = "AI features are not available in the demo.";
export const DEMO_UNAVAILABLE_MESSAGE = "Not available in the demo.";

type SessionLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function session(): SessionLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function isDemo(): boolean {
  try {
    return session()?.getItem(DEMO_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/** Returns false when the browser blocks sessionStorage (the demo needs it to survive the reload). */
export function enterDemo(navigate: (path: string) => void = (p) => window.location.assign(p)): boolean {
  try {
    const s = session();
    if (!s) return false;
    s.setItem(DEMO_FLAG_KEY, "1");
    s.removeItem(DEMO_DB_KEY); // fresh sample data every time
  } catch {
    return false;
  }
  navigate("/");
  return true;
}

export function exitDemo(navigate: (path: string) => void = (p) => window.location.assign(p)) {
  try {
    const s = session();
    s?.removeItem(DEMO_FLAG_KEY);
    s?.removeItem(DEMO_DB_KEY);
  } catch {
    // nothing stored
  }
  navigate("/auth");
}

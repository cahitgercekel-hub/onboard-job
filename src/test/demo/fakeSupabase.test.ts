import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFakeSupabase } from "@/lib/demo/fakeSupabase";
import { DEMO_USER_ID } from "@/lib/demo/seed";
import { DEMO_DB_KEY, DEMO_FLAG_KEY, enterDemo, exitDemo, isDemo } from "@/lib/demo/demoMode";

type Row = Record<string, unknown>;

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    map,
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("fake Supabase client (demo mode)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("network call in demo");
    });
  });
  afterEach(() => fetchSpy.mockRestore());

  it("starts with fictional sample data owned by the demo user", async () => {
    const db = createFakeSupabase({ storage: memoryStorage() });
    const { data } = await db.from("jobs").select("*").eq("user_id", DEMO_USER_ID).order("created_at", { ascending: false });
    const jobs = data as Row[];
    expect(jobs.length).toBeGreaterThanOrEqual(15);
    expect(jobs.every((j) => j.user_id === DEMO_USER_ID)).toBe(true);
    expect(new Set(jobs.map((j) => j.status))).toEqual(new Set(["saved", "applied", "interviewing", "offer", "rejected", "archived"]));
    expect(String(jobs[0].created_at) >= String(jobs[jobs.length - 1].created_at)).toBe(true);
  });

  it("supports the query shapes the app uses", async () => {
    const db = createFakeSupabase({ storage: memoryStorage() });
    const { data: cv } = await db.from("cv_baseline").select("cv_text, file_path").eq("user_id", DEMO_USER_ID).maybeSingle();
    expect(Object.keys(cv as Row)).toEqual(["cv_text", "file_path"]);
    const { data: none } = await db.from("privacy_settings").select("ai_enabled").eq("user_id", DEMO_USER_ID).maybeSingle();
    expect(none).toBeNull();
    const { data: active } = await db.from("jobs").select("id").neq("status", "archived");
    expect((active as Row[]).length).toBeGreaterThan(0);
    const { error } = await db.from("jobs").select("*").single();
    expect(error?.code).toBe("PGRST116");
  });

  it("insert/update/delete emit realtime events, respecting the channel filter", async () => {
    const db = createFakeSupabase({ storage: memoryStorage() });
    const events: { eventType: string; id: unknown }[] = [];
    const other: unknown[] = [];
    const ch = db.channel("jobs-demo").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "jobs", filter: `user_id=eq.${DEMO_USER_ID}` },
      (p) => events.push({ eventType: p.eventType, id: (p.new.id ?? p.old.id) }),
    ).subscribe();
    db.channel("other").on("postgres_changes", { event: "*", table: "jobs", filter: "user_id=eq.someone-else" }, (p) => other.push(p)).subscribe();

    const { data: inserted } = await db.from("jobs").insert({ user_id: DEMO_USER_ID, company: "Test Co", role: "Tester", status: "saved" }).select().single();
    const id = (inserted as Row).id;
    await db.from("jobs").update({ status: "applied" }).eq("id", id);
    await db.from("jobs").delete().eq("id", id);
    await tick();

    expect(events).toEqual([
      { eventType: "INSERT", id },
      { eventType: "UPDATE", id },
      { eventType: "DELETE", id },
    ]);
    expect(other).toEqual([]);

    await db.removeChannel(ch);
    await db.from("jobs").insert({ company: "After", role: "Removed", status: "saved" });
    await tick();
    expect(events).toHaveLength(3);
  });

  it("upsert updates by the conflict key instead of duplicating", async () => {
    const db = createFakeSupabase({ storage: memoryStorage() });
    await db.from("cv_baseline").upsert({ user_id: DEMO_USER_ID, cv_text: "edited" }, { onConflict: "user_id" });
    const { data } = await db.from("cv_baseline").select("cv_text").eq("user_id", DEMO_USER_ID);
    expect(data).toEqual([{ cv_text: "edited" }]);
  });

  it("persists changes in the provided session storage and reloads them", async () => {
    const storage = memoryStorage();
    const first = createFakeSupabase({ storage });
    await first.from("jobs").insert({ company: "Persisted", role: "R", status: "saved" });
    expect(storage.map.has(DEMO_DB_KEY)).toBe(true);
    const second = createFakeSupabase({ storage });
    const { data } = await second.from("jobs").select("company").eq("company", "Persisted");
    expect(data).toEqual([{ company: "Persisted" }]);
  });

  it("never calls the network: AI, storage and auth changes return 'not in the demo'", async () => {
    const onSignOut = vi.fn();
    const db = createFakeSupabase({ storage: memoryStorage(), onSignOut });
    const ai = await db.functions.invoke("career-chat", { body: {} });
    expect(ai.error?.message).toMatch(/not available in the demo/);
    const up = await db.storage.from("cvs").upload("x", new Blob(["x"]));
    expect(up.error?.message).toMatch(/demo/);
    const login = await db.auth.signInWithPassword({ email: "a@b.c", password: "x" });
    expect(login.error?.message).toMatch(/demo/);
    const { data } = await db.auth.getSession();
    expect(data.session?.user.id).toBe(DEMO_USER_ID);
    await db.auth.signOut();
    expect(onSignOut).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("demo flag", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("enter/exit manage only demo keys and leave a real session alone", () => {
    localStorage.setItem("sb-project-auth-token", "real-session");
    const nav = vi.fn();
    expect(enterDemo(nav)).toBe(true);
    expect(nav).toHaveBeenCalledWith("/");
    expect(isDemo()).toBe(true);
    expect(sessionStorage.getItem(DEMO_FLAG_KEY)).toBe("1");

    exitDemo(nav);
    expect(nav).toHaveBeenLastCalledWith("/auth");
    expect(isDemo()).toBe(false);
    expect(localStorage.getItem("sb-project-auth-token")).toBe("real-session");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { buildDataExport, type ExportClient } from "@/lib/dataExport";
import { clearAllLocalAppData, clearLocalChats, readLocalChats } from "@/lib/localData";

const USER = {
  id: "00000000-0000-4000-8000-00000000000a",
  email: "test-a@example.test",
  created_at: "2026-01-01T00:00:00Z",
  last_sign_in_at: "2026-10-01T00:00:00Z",
  app_metadata: { providers: ["email"] },
  user_metadata: { display_name: "Test A" },
};

function fakeClient(rows: Record<string, unknown[]>, failing?: string) {
  const selects: Record<string, string> = {};
  const filters: Record<string, [string, string]> = {};
  const client: ExportClient = {
    from: (table) => ({
      select: (columns) => {
        selects[table] = columns;
        return {
          eq: async (column, value) => {
            filters[table] = [column, value];
            return table === failing
              ? { data: null, error: { message: "boom" } }
              : { data: rows[table] ?? [], error: null };
          },
        };
      },
    }),
  };
  return { client, selects, filters };
}

describe("buildDataExport", () => {
  beforeEach(() => localStorage.clear());

  it("includes every user table, the account and this device's chats", async () => {
    localStorage.setItem(`jat.chat.v1.${USER.id}.none`, JSON.stringify([{ role: "user", content: "hi" }]));
    localStorage.setItem("jat.chat.v1.someone-else.none", JSON.stringify([{ role: "user", content: "not mine" }]));
    const { client, filters } = fakeClient({ jobs: [{ id: "j1", company: "Synthetic GmbH" }] });

    const out = await buildDataExport(client, USER, localStorage);

    expect(Object.keys(out.database).sort()).toEqual(
      ["api_tokens", "cv_baseline", "cv_versions", "jobs", "privacy_events", "privacy_settings", "profiles"],
    );
    expect(out.database.jobs).toEqual([{ id: "j1", company: "Synthetic GmbH" }]);
    expect(out.account.email).toBe(USER.email);
    expect(Object.keys(out.thisDevice.aiChatThreads)).toEqual(["none"]);
    expect(Object.values(filters).every(([c, v]) => c === "user_id" && v === USER.id)).toBe(true);
    expect(out.notIncluded.length).toBeGreaterThan(0);
  });

  it("never selects secret columns such as API token hashes", async () => {
    const { client, selects } = fakeClient({});
    await buildDataExport(client, USER, localStorage);
    expect(selects.api_tokens).not.toMatch(/token_hash|\*/);
  });

  it("fails as a whole instead of returning a partial export", async () => {
    const { client } = fakeClient({}, "cv_versions");
    await expect(buildDataExport(client, USER, localStorage)).rejects.toThrow(/cv_versions/);
  });
});

describe("local device data", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("clears only the given user's chats", () => {
    localStorage.setItem(`jat.chat.v1.${USER.id}.job1`, "[]");
    localStorage.setItem(`jat.chat.v1.${USER.id}.none`, "[]");
    localStorage.setItem("jat.chat.v1.other.none", "[]");
    localStorage.setItem("jat.chat.v1.index", JSON.stringify([`jat.chat.v1.${USER.id}.job1`, "jat.chat.v1.other.none"]));

    expect(clearLocalChats(USER.id, localStorage)).toBe(2);
    expect(readLocalChats(USER.id, localStorage)).toEqual({});
    expect(localStorage.getItem("jat.chat.v1.other.none")).toBe("[]");
    expect(JSON.parse(localStorage.getItem("jat.chat.v1.index")!)).toEqual(["jat.chat.v1.other.none"]);
  });

  it("wipes every ONboard key but leaves unrelated storage alone", () => {
    localStorage.setItem("jat.prefs.v1", "{}");
    localStorage.setItem("jat.chat.v1.x.none", "[]");
    sessionStorage.setItem("jat.ghost.notified.v1", "[]");
    localStorage.setItem("unrelated", "keep");

    clearAllLocalAppData(localStorage, sessionStorage);

    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(sessionStorage.length).toBe(0);
  });
});

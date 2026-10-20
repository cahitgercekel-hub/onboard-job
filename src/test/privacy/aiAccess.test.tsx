import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const USER_ID = "00000000-0000-4000-8000-00000000000a";
const db = vi.hoisted(() => ({ aiEnabled: false, upserts: [] as unknown[] }));
// Stable object, like the real AuthProvider's session user.
const auth = vi.hoisted(() => ({ user: { id: "00000000-0000-4000-8000-00000000000a" } }));

vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { ai_enabled: db.aiEnabled }, error: null }) }),
      }),
      upsert: async (row: { ai_enabled: boolean }) => {
        db.upserts.push(row);
        db.aiEnabled = row.ai_enabled;
        return { error: null };
      },
    }),
  },
}));

import { AiAccessProvider, useAiAccess } from "@/lib/aiAccess";
import type { AiFeature } from "@/lib/aiFeatures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let api: ReturnType<typeof useAiAccess>;
function Probe() {
  api = useAiAccess();
  return null;
}

let root: Root;
let container: HTMLDivElement;

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const bodyText = () => document.body.textContent ?? "";
const button = (label: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;

async function setup() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(<AiAccessProvider><Probe /></AiAccessProvider>); });
  await flush();
}

// Returns the pending decision wrapped in an object: an async function returning a bare promise
// would wait for it, and the decision only arrives after a button click.
async function request(feature: AiFeature) {
  let result!: Promise<boolean>;
  await act(async () => { result = api.requestAi(feature); });
  await flush();
  return { result };
}

async function click(label: string) {
  const b = button(label);
  expect(b, `button "${label}"`).toBeDefined();
  await act(async () => { b!.click(); });
  await flush();
}

describe("AI access gate", () => {
  beforeEach(() => {
    db.aiEnabled = false;
    db.upserts = [];
    localStorage.clear();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("does nothing and stores nothing when the user cancels", async () => {
    await setup();
    const { result } = await request("fitness");
    expect(bodyText()).toMatch(/what will be sent to AI/);
    expect(bodyText()).toMatch(/Your baseline CV text/);
    await click("Cancel");
    expect(await result).toBe(false);
    expect(db.upserts).toEqual([]);
  });

  it("turns AI on only after explicit confirmation, then runs without asking again", async () => {
    await setup();
    const { result: first } = await request("polish");
    await click("Turn on AI and continue");
    expect(await first).toBe(true);
    expect(db.upserts).toEqual([expect.objectContaining({ user_id: USER_ID, ai_enabled: true })]);

    const { result: second } = await request("polish");
    expect(await second).toBe(true);
    expect(button("Continue")).toBeUndefined();
  });

  it("shows the disclosure for each new tool even when AI is already on", async () => {
    db.aiEnabled = true;
    await setup();
    const { result } = await request("chat");
    expect(bodyText()).toMatch(/only while "Share my CV" is on/);
    await click("Continue");
    expect(await result).toBe(true);
    expect(db.upserts).toEqual([]);
  });
});

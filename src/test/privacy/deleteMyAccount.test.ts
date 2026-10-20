import { describe, it, expect, vi, beforeEach } from "vitest";

const { invoke, signOut } = vi.hoisted(() => ({
  invoke: vi.fn(),
  signOut: vi.fn(async (_opts?: unknown) => ({ error: null })),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke }, auth: { signOut } },
}));

import { deleteMyAccount } from "@/lib/accountDeletion";

describe("deleteMyAccount (client)", () => {
  beforeEach(() => {
    invoke.mockReset();
    signOut.mockClear();
    localStorage.clear();
    localStorage.setItem("jat.chat.v1.u.none", "[]");
  });

  it("only wipes this browser and signs out after the server confirms", async () => {
    invoke.mockResolvedValue({ data: { ok: true, filesDeleted: 1, rowsDeleted: { jobs: 2 } }, error: null });
    const res = await deleteMyAccount();
    expect(invoke).toHaveBeenCalledWith("delete-account", { body: { confirm: "DELETE" } });
    expect(res).toEqual({ filesDeleted: 1, rowsDeleted: { jobs: 2 } });
    expect(localStorage.getItem("jat.chat.v1.u.none")).toBeNull();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("throws the server's message and keeps everything when deletion fails part-way", async () => {
    const context = new Response(JSON.stringify({ ok: false, step: "database", error: "Account deletion did not finish." }), { status: 500 });
    invoke.mockResolvedValue({ data: null, error: { message: "non-2xx", context } });
    await expect(deleteMyAccount()).rejects.toThrow("Account deletion did not finish.");
    expect(localStorage.getItem("jat.chat.v1.u.none")).toBe("[]");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("does not report success on an unexpected response", async () => {
    invoke.mockResolvedValue({ data: { something: "else" }, error: null });
    await expect(deleteMyAccount()).rejects.toThrow();
    expect(signOut).not.toHaveBeenCalled();
  });
});

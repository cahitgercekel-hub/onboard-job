import { describe, it, expect, vi } from "vitest";
import { deleteAccountData, DeletionError, type DeletionDeps } from "../../../supabase/functions/_shared/accountDeletion";
import { supabaseDeletionDeps } from "../../../supabase/functions/_shared/supabaseDeletionDeps";

const USER = "00000000-0000-4000-8000-00000000000a";

function fakeDeps(overrides: Partial<DeletionDeps> = {}) {
  let files = [`${USER}/cv-1.pdf`, `${USER}/cv-2.docx`];
  const calls: string[] = [];
  const deps: DeletionDeps = {
    listUserFiles: vi.fn(async () => [...files]),
    removeFiles: vi.fn(async (paths: string[]) => {
      calls.push("storage");
      files = files.filter((f) => !paths.includes(f));
    }),
    purgeRows: vi.fn(async () => {
      calls.push("database");
      return { jobs: 3, cv_baseline: 1 };
    }),
    deleteAuthUser: vi.fn(async () => {
      calls.push("auth");
    }),
    ...overrides,
  };
  return { deps, calls };
}

describe("deleteAccountData", () => {
  it("deletes files, then rows, then the auth account", async () => {
    const { deps, calls } = fakeDeps();
    const report = await deleteAccountData(USER, deps);
    expect(calls).toEqual(["storage", "database", "auth"]);
    expect(report).toEqual({ userId: USER, filesDeleted: 2, rowsDeleted: { jobs: 3, cv_baseline: 1 }, authUserDeleted: true });
  });

  it("keeps the auth account when a data step fails, so the user can retry", async () => {
    const { deps } = fakeDeps({ purgeRows: vi.fn(async () => { throw new Error("db down"); }) });
    await expect(deleteAccountData(USER, deps)).rejects.toMatchObject({ step: "database" });
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("fails the storage step if files are still there after removal", async () => {
    const { deps } = fakeDeps({ removeFiles: vi.fn(async () => undefined) });
    const err = await deleteAccountData(USER, deps).catch((e) => e);
    expect(err).toBeInstanceOf(DeletionError);
    expect(err.step).toBe("storage");
    expect(deps.purgeRows).not.toHaveBeenCalled();
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("refuses to touch files outside the user's own folder", async () => {
    const { deps } = fakeDeps({ listUserFiles: vi.fn(async () => [`${USER}/a.pdf`, "someone-else/b.pdf"]) });
    await expect(deleteAccountData(USER, deps)).rejects.toMatchObject({ step: "storage" });
    expect(deps.removeFiles).not.toHaveBeenCalled();
  });

  it("is safe to run again after a partial failure", async () => {
    const { deps } = fakeDeps();
    await deleteAccountData(USER, deps);
    const again = await deleteAccountData(USER, deps);
    expect(again.filesDeleted).toBe(0);
  });

  it("rejects a malformed user id", async () => {
    const { deps } = fakeDeps();
    await expect(deleteAccountData("../other", deps)).rejects.toBeInstanceOf(DeletionError);
    expect(deps.listUserFiles).not.toHaveBeenCalled();
  });
});

describe("supabaseDeletionDeps", () => {
  function fakeAdmin({ authError = null as null | { status?: number; message: string } } = {}) {
    const objects = Array.from({ length: 1205 }, (_, i) => ({ id: `id-${i}`, name: `cv-${i}.pdf` }));
    const list = vi.fn(async (_folder: string, { limit, offset }: { limit: number; offset: number }) => ({
      data: [...(offset === 0 ? [{ id: null, name: "nested-folder" }] : []), ...objects.slice(offset, offset + limit)],
      error: null,
    }));
    return {
      list,
      admin: {
        storage: { from: () => ({ list, remove: vi.fn(async () => ({ error: null })) }) },
        rpc: vi.fn(async () => ({ data: { jobs: 1 }, error: null })),
        auth: { admin: { deleteUser: vi.fn(async () => ({ error: authError })) } },
      },
    };
  }

  it("lists files under the user's folder across pages and skips folder entries", async () => {
    const { admin, list } = fakeAdmin();
    const paths = await supabaseDeletionDeps(admin).listUserFiles(USER);
    expect(list).toHaveBeenCalledWith(USER, expect.objectContaining({ offset: 0 }));
    expect(list).toHaveBeenCalledTimes(2);
    expect(paths).toHaveLength(1205);
    expect(paths.every((p) => p.startsWith(`${USER}/cv-`))).toBe(true);
  });

  it("treats an already-deleted auth user as success", async () => {
    const { admin } = fakeAdmin({ authError: { status: 404, message: "User not found" } });
    await expect(supabaseDeletionDeps(admin).deleteAuthUser(USER)).resolves.toBeUndefined();
  });

  it("surfaces other auth errors", async () => {
    const { admin } = fakeAdmin({ authError: { status: 500, message: "boom" } });
    await expect(supabaseDeletionDeps(admin).deleteAuthUser(USER)).rejects.toThrow(/auth delete failed/);
  });
});

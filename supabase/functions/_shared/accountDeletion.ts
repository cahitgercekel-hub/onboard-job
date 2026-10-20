// Deletes everything ONboard stores about one user, in an order that makes retries safe:
//   1. CV files in storage   2. all app rows (one transaction)   3. the auth account itself.
// The auth account goes last, so after any partial failure the user can still sign in and retry.
// Every step is idempotent. Pure module: the Supabase calls are injected (see delete-account/index.ts).

export type DeletionStep = "storage" | "database" | "auth";

export interface DeletionDeps {
  /** Full object paths stored under the user's folder in the CV bucket. */
  listUserFiles(userId: string): Promise<string[]>;
  removeFiles(paths: string[]): Promise<void>;
  /** Deletes all app rows of the user; returns deleted row counts per table. */
  purgeRows(userId: string): Promise<Record<string, number>>;
  /** Deletes the auth user. Must resolve (not throw) if the user no longer exists. */
  deleteAuthUser(userId: string): Promise<void>;
}

export interface DeletionReport {
  userId: string;
  filesDeleted: number;
  rowsDeleted: Record<string, number>;
  authUserDeleted: true;
}

export class DeletionError extends Error {
  constructor(public step: DeletionStep, message: string) {
    super(message);
    this.name = "DeletionError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BATCH = 100;

async function step<T>(name: DeletionStep, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DeletionError) throw e;
    throw new DeletionError(name, e instanceof Error ? e.message : String(e));
  }
}

export async function deleteAccountData(userId: string, deps: DeletionDeps): Promise<DeletionReport> {
  if (!UUID.test(userId)) throw new DeletionError("auth", "Invalid user id");

  const filesDeleted = await step("storage", async () => {
    const files = await deps.listUserFiles(userId);
    const foreign = files.filter((p) => !p.startsWith(`${userId}/`));
    if (foreign.length) throw new Error("Refusing to delete files outside the user's folder");
    for (let i = 0; i < files.length; i += BATCH) {
      await deps.removeFiles(files.slice(i, i + BATCH));
    }
    const left = await deps.listUserFiles(userId);
    if (left.length) throw new Error(`${left.length} file(s) could not be deleted`);
    return files.length;
  });

  const rowsDeleted = await step("database", () => deps.purgeRows(userId));

  await step("auth", () => deps.deleteAuthUser(userId));

  return { userId, filesDeleted, rowsDeleted, authUserDeleted: true };
}

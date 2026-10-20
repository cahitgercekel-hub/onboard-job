import { supabase } from "@/lib/db";
import { clearAllLocalAppData } from "./localData";

export interface DeletionResult {
  filesDeleted: number;
  rowsDeleted: Record<string, number>;
}

/**
 * Deletes the signed-in user's account on the server (files, all rows, auth account), then wipes
 * ONboard data from this browser. Throws — and leaves the session in place for a retry — unless
 * the server confirms that every step finished.
 */
export async function deleteMyAccount(): Promise<DeletionResult> {
  const { data, error } = await supabase.functions.invoke("delete-account", { body: { confirm: "DELETE" } });

  if (error || !data?.ok) {
    let message = "Account deletion did not finish. Your account still exists — please try again.";
    const ctx = (error as { context?: Response } | null)?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json().catch(() => null);
      if (body?.error) message = body.error;
    } else if (data?.error) {
      message = data.error;
    }
    throw new Error(message);
  }

  clearAllLocalAppData();
  // The server-side session is gone with the user; only clear the local token.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

  return { filesDeleted: data.filesDeleted ?? 0, rowsDeleted: data.rowsDeleted ?? {} };
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { deleteAccountData, DeletionError } from "../_shared/accountDeletion.ts";
import { supabaseDeletionDeps } from "../_shared/supabaseDeletionDeps.ts";

// Deletes accounts that have been inactive longer than the configured retention period.
// Safe by default:
//   - does nothing unless RETENTION_CRON_SECRET and RETENTION_INACTIVE_DAYS are set (no built-in period);
//   - is a DRY RUN unless the secret RETENTION_APPLY is "true" AND the request body says { "apply": true };
//   - never touches ids listed in RETENTION_EXCLUDE_USER_IDS (comma-separated);
//   - deletes at most MAX_PER_RUN accounts per call.
// Meant to be called by a scheduler (verify_jwt is off; the shared secret header authenticates it).

const MAX_PER_RUN = 25;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("RETENTION_CRON_SECRET") ?? "";
  const days = Number(Deno.env.get("RETENTION_INACTIVE_DAYS") ?? "");
  if (!secret || !Number.isInteger(days) || days < 30) {
    return json({ error: "Retention cleanup is not configured" }, 503);
  }
  if (!timingSafeEqual(req.headers.get("x-cron-secret") ?? "", secret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { apply?: unknown } = {};
  try { body = await req.json(); } catch { /* dry run */ }
  const apply = Deno.env.get("RETENTION_APPLY") === "true" && body.apply === true;
  const excluded = new Set(
    (Deno.env.get("RETENTION_EXCLUDE_USER_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  );

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.rpc("inactive_user_ids", { _inactive_for: `${days} days` });
  if (error) {
    console.error("retention-cleanup: lookup failed", error.code);
    return json({ error: "Lookup failed" }, 500);
  }
  const candidates = (data ?? []).filter((r: { user_id: string }) => !excluded.has(r.user_id));

  if (!apply) {
    return json({ dryRun: true, inactiveDays: days, candidates: candidates.length, excluded: excluded.size });
  }

  let deleted = 0;
  const failedSteps: string[] = [];
  for (const row of candidates.slice(0, MAX_PER_RUN)) {
    try {
      await deleteAccountData(row.user_id, supabaseDeletionDeps(admin));
      deleted++;
    } catch (e) {
      failedSteps.push(e instanceof DeletionError ? e.step : "unknown");
    }
  }
  console.log("retention-cleanup", { inactiveDays: days, deleted, failed: failedSteps.length });
  return json({
    dryRun: false,
    inactiveDays: days,
    candidates: candidates.length,
    deleted,
    failed: failedSteps.length,
    failedSteps,
    remaining: Math.max(0, candidates.length - MAX_PER_RUN),
  });
});

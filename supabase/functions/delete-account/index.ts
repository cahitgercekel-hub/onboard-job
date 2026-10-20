import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { deleteAccountData, DeletionError } from "../_shared/accountDeletion.ts";
import { supabaseDeletionDeps } from "../_shared/supabaseDeletionDeps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Deletes the CALLER's account. The user id comes only from the verified JWT — never from the body —
// so this cannot be pointed at another account.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "Missing auth" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

  let body: { confirm?: unknown } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (body.confirm !== "DELETE") return json({ error: 'Confirmation missing: send { "confirm": "DELETE" }' }, 400);

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const report = await deleteAccountData(userData.user.id, supabaseDeletionDeps(admin));
    return json({ ok: true, filesDeleted: report.filesDeleted, rowsDeleted: report.rowsDeleted });
  } catch (e) {
    const step = e instanceof DeletionError ? e.step : "unknown";
    // No user content or ids in logs — only which step failed.
    console.error("delete-account failed", step, e instanceof Error ? e.message : "");
    return json({
      ok: false,
      step,
      error: "Account deletion did not finish. Some data may already be removed, but your account still exists — it is safe to try again.",
    }, 500);
  }
});

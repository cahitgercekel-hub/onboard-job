import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Extract token: prefer X-Api-Token, fallback to Authorization: Bearer
  let token = req.headers.get("x-api-token") ?? "";
  if (!token) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth.toLowerCase().startsWith("bearer ")) token = auth.slice(7).trim();
  }
  if (!token || !token.startsWith("cvc_")) {
    return json({ error: "Missing or invalid API token" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tokenHash = await sha256Hex(token);
  const { data: tokenRow, error: tokenErr } = await admin
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return json({ error: "Invalid API token" }, 401);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const text = (v: unknown, max: number): string | null =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const company = text(payload.companyName ?? payload.company, 200) ?? "";
  const role = text(payload.roleTitle ?? payload.role, 200) ?? "";
  const rawUrl = text(payload.jobUrl ?? payload.url, 2000);
  const jobUrl = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
  const jobDescription = text(payload.jobDescription ?? payload.description, 20000);
  const location = text(payload.location, 200);
  const workModel = text(payload.workModel, 50);

  if (!company || !role) {
    return json({ error: "companyName and roleTitle are required" }, 400);
  }

  const { data: inserted, error: insertErr } = await admin
    .from("jobs")
    .insert({
      user_id: tokenRow.user_id,
      company,
      role,
      url: jobUrl,
      job_description: jobDescription,
      location,
      work_model: workModel,
      status: "saved",
      source: "extension",
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("ingest-job insert failed", insertErr.code);
    return json({ error: "Could not save the job" }, 500);
  }

  // Fire-and-forget: update last_used_at
  admin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id)
    .then(({ error }) => error && console.error("last_used_at update failed", error.code));

  return json({ ok: true, jobId: inserted.id }, 201);
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { redactContactDetails } from "../_shared/redact.ts";
import { AI_DISABLED_BODY, isAiEnabled } from "../_shared/aiAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  // The suggestions are AI-invented, not real listings; switched off for the external beta.
  if (Deno.env.get("DISCOVER_JOBS_ENABLED") !== "true") {
    return json({ error: "Job discovery is not available in this beta." }, 410);
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "Missing auth" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "AI gateway not configured" }, 500);

  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);
  const userId = userData.user.id;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const query = String(body.query ?? "").trim().slice(0, 200);
  const location = String(body.location ?? "").trim().slice(0, 120);
  const cvVersionId = body.cvVersionId ? String(body.cvVersionId) : null;
  const dateRange = String(body.dateRange ?? "any"); // any | 24h | 7d | 30d
  const jobType = String(body.jobType ?? "any");     // any | full-time | part-time | internship | contract
  const remote = String(body.remote ?? "any");       // any | remote | hybrid | onsite
  const sortBy = String(body.sortBy ?? "relevance"); // relevance | date

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  if (!(await isAiEnabled(admin, userId))) return json(AI_DISABLED_BODY, 403);

  // Pull CV (baseline always; named version notes are extra context)
  const { data: cv } = await admin
    .from("cv_baseline")
    .select("cv_text")
    .eq("user_id", userId)
    .maybeSingle();
  const cvText = redactContactDetails((cv?.cv_text ?? "").trim());
  if (!cvText) return json({ error: "Upload a baseline CV in Settings first." }, 400);

  let versionNotes = "";
  if (cvVersionId) {
    const { data: v } = await admin
      .from("cv_versions")
      .select("name, notes")
      .eq("id", cvVersionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (v) versionNotes = `CV variant: ${v.name}\n${v.notes ?? ""}`.trim();
  }

  const systemPrompt = `You are a career discovery assistant. Given a candidate CV, suggest 8 plausible, realistic job openings that match their profile and the requested filters. The openings should be diverse but relevant. Score each from 0 to 100 against the CV. Return ONLY through the suggest_jobs tool.`;

  const filterStr = [
    query ? `Search query: ${query}` : "",
    location ? `Location: ${location}` : "",
    dateRange !== "any" ? `Posted within: ${dateRange}` : "",
    jobType !== "any" ? `Job type: ${jobType}` : "",
    remote !== "any" ? `Work model: ${remote}` : "",
    `Sort by: ${sortBy}`,
    versionNotes,
  ].filter(Boolean).join("\n");

  const userPrompt = `FILTERS\n${filterStr || "(no specific filters)"}\n\nCANDIDATE CV:\n${cvText.slice(0, 10000)}`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "suggest_jobs",
          description: "Return job openings with match scores.",
          parameters: {
            type: "object",
            properties: {
              jobs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    company: { type: "string" },
                    role: { type: "string" },
                    location: { type: "string" },
                    workModel: { type: "string", enum: ["Remote", "Hybrid", "On-site"] },
                    applicationType: { type: "string", enum: ["Full-time", "Part-time", "Internship", "Contract", "Working Student", "Freelance"] },
                    description: { type: "string", maxLength: 800 },
                    daysAgo: { type: "integer", minimum: 0, maximum: 60 },
                    matchScore: { type: "integer", minimum: 0, maximum: 100 },
                    matchReason: { type: "string", maxLength: 200 },
                  },
                  required: ["company", "role", "location", "matchScore", "matchReason", "daysAgo"],
                  additionalProperties: false,
                },
              },
            },
            required: ["jobs"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "suggest_jobs" } },
    }),
  });

  if (!aiRes.ok) {
    if (aiRes.status === 429) return json({ error: "AI rate limit — try again in a moment." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted — add credits in workspace settings." }, 402);
    console.error("AI error", aiRes.status);
    return json({ error: "AI request failed" }, 500);
  }

  const aiData = await aiRes.json();
  const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
  let jobs: any[] = [];
  try {
    const args = JSON.parse(call?.function?.arguments ?? "{}");
    jobs = Array.isArray(args.jobs) ? args.jobs : [];
  } catch {
    console.error("parse error");
    return json({ error: "AI returned malformed output" }, 500);
  }

  if (sortBy === "date") jobs.sort((a, b) => (a.daysAgo ?? 99) - (b.daysAgo ?? 99));
  else jobs.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  return json({ jobs });
});

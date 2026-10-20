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
  const jobId = String(body.jobId ?? "").trim();
  if (!jobId) return json({ error: "jobId is required" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .select("id, user_id, company, role, job_description, location, work_model, application_type, industry")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr || !job) return json({ error: "Job not found" }, 404);
  if (job.user_id !== userId) return json({ error: "Forbidden" }, 403);
  if (!(await isAiEnabled(admin, userId))) return json(AI_DISABLED_BODY, 403);

  const { data: cv } = await admin
    .from("cv_baseline")
    .select("cv_text")
    .eq("user_id", userId)
    .maybeSingle();
  const cvText = redactContactDetails((cv?.cv_text ?? "").trim());
  if (!cvText) return json({ error: "Upload a baseline CV in Settings first." }, 400);
  if (!job.job_description?.trim()) {
    return json({ error: "Add a job description to score this role." }, 400);
  }

  const systemPrompt = `You are an expert career coach. Compare a candidate's CV against a job posting and rate the fit from 0 to 100.
Return ONLY via the score_fit tool. The reasoning must be one to two sentences citing concrete strengths and gaps (skills, seniority, certs, domain).`;

  const userPrompt = `JOB
Company: ${job.company}
Role: ${job.role}
${job.application_type ? `Type: ${job.application_type}\n` : ""}${job.industry ? `Industry: ${job.industry}\n` : ""}${job.work_model ? `Work model: ${job.work_model}\n` : ""}${job.location ? `Location: ${job.location}\n` : ""}
DESCRIPTION:
${job.job_description.slice(0, 8000)}

CANDIDATE CV:
${cvText.slice(0, 12000)}`;

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
          name: "score_fit",
          description: "Return the fitness score and reasoning.",
          parameters: {
            type: "object",
            properties: {
              score: { type: "integer", minimum: 0, maximum: 100 },
              reasoning: { type: "string", maxLength: 400 },
            },
            required: ["score", "reasoning"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "score_fit" } },
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
  let score = 0;
  let reasoning = "";
  try {
    const args = JSON.parse(call?.function?.arguments ?? "{}");
    score = Math.max(0, Math.min(100, Math.round(Number(args.score))));
    reasoning = String(args.reasoning ?? "").trim();
  } catch {
    console.error("parse error");
    return json({ error: "AI returned malformed output" }, 500);
  }
  if (!reasoning) return json({ error: "AI returned no reasoning" }, 500);

  const { error: updErr } = await admin
    .from("jobs")
    .update({ fitness_score: score, fitness_reasoning: reasoning })
    .eq("id", jobId)
    .eq("user_id", userId);
  if (updErr) {
    console.error("update failed", updErr.code);
    return json({ error: "Could not save the score" }, 500);
  }

  return json({ score, reasoning });
});

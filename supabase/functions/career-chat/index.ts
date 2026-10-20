// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { redactContactDetails } from "../_shared/redact.ts";
import { AI_DISABLED_BODY, isAiEnabled } from "../_shared/aiAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_PERSONA = `You are JobFlow's Career Strategist — a warm, sharp, no-fluff coach for job seekers.
You help with: resume review, interview prep, mock interviews (one question at a time, with feedback),
salary negotiation, skill gap analysis, follow-up emails, and career pivots.

Style:
- Conversational and concise. Bullets and short paragraphs over walls of text.
- Always ground advice in the user's CV when available. If you don't know something, ask.
- When the user attaches a job, tailor every answer to that role/company.
- For mock interviews: ask ONE question, wait, then critique the answer using STAR.
- Never invent experience. Reframe what's there.`;

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 6000;

// Only plain user/assistant turns are forwarded (no injected system prompts), newest last, size-capped.
function sanitizeMessages(raw: unknown): { role: "user" | "assistant"; content: string }[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages: rawMessages, jobContext, includeCv } = await req.json();
    const messages = sanitizeMessages(rawMessages);
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Require authentication
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: authErr } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(await isAiEnabled(sb, userData.user.id))) {
      return new Response(JSON.stringify(AI_DISABLED_BODY), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The CV is only shared when the user switched "Share my CV" on for this chat.
    // Read with the caller's JWT so RLS applies; contact details are stripped before sending.
    let cvText = "";
    if (includeCv === true) {
      const { data, error } = await sb.from("cv_baseline").select("cv_text").maybeSingle();
      if (error) console.warn("cv fetch failed", error.code);
      if (data?.cv_text) cvText = redactContactDetails(String(data.cv_text)).slice(0, 8000);
    }

    let systemPrompt = BASE_PERSONA;
    if (cvText) {
      systemPrompt += `\n\n--- USER'S BASELINE CV ---\n${cvText}\n--- END CV ---`;
    } else if (includeCv === true) {
      systemPrompt += `\n\nNote: the user has not uploaded a baseline CV yet. If a question requires CV details, ask them to add one in Settings.`;
    } else {
      systemPrompt += `\n\nNote: the user has chosen not to share their CV in this chat. If a question requires CV details, ask for the relevant details or suggest turning on "Share my CV".`;
    }
    if (jobContext && typeof jobContext === "object") {
      const { company, role, jobDescription, fitness_score } = jobContext;
      const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
      const score = Number.isFinite(Number(fitness_score)) ? Number(fitness_score) : "n/a";
      systemPrompt += `\n\n--- ATTACHED JOB CONTEXT ---\nCompany: ${str(company, 200) || "?"}\nRole: ${str(role, 200) || "?"}\nMatch score: ${score}\nJob description:\n${str(jobDescription, 4000)}\n--- END JOB ---`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit hit. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!response.ok) {
      // Status only: gateway error bodies can echo request content (CV, messages).
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("career-chat error", e instanceof Error ? e.name : "unknown");
    return new Response(JSON.stringify({ error: "Chat request failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

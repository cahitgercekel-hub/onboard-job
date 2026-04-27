// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, jobContext } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Pull baseline CV using the caller's JWT so RLS applies.
    let cvText = "";
    try {
      const authHeader = req.headers.get("Authorization") || "";
      if (authHeader) {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data } = await sb.from("cv_baseline").select("cv_text").maybeSingle();
        if (data?.cv_text) cvText = String(data.cv_text).slice(0, 8000);
      }
    } catch (e) {
      console.warn("cv fetch failed", e);
    }

    let systemPrompt = BASE_PERSONA;
    if (cvText) {
      systemPrompt += `\n\n--- USER'S BASELINE CV ---\n${cvText}\n--- END CV ---`;
    } else {
      systemPrompt += `\n\nNote: the user has not uploaded a baseline CV yet. If a question requires CV details, ask them to add one in Settings.`;
    }
    if (jobContext && typeof jobContext === "object") {
      const { company, role, jobDescription, fitness_score } = jobContext;
      systemPrompt += `\n\n--- ATTACHED JOB CONTEXT ---\nCompany: ${company || "?"}\nRole: ${role || "?"}\nMatch score: ${fitness_score ?? "n/a"}\nJob description:\n${(jobDescription || "").slice(0, 4000)}\n--- END JOB ---`;
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("career-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

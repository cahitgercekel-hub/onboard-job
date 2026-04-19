// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tool = "tone" | "translate" | "polish";

const SYSTEM: Record<Tool, string> = {
  tone:
    "You are an expert career coach and corporate communications analyst. Given a cover letter draft and a target company, infer the company's likely culture (traditional/enterprise, agile/startup, consulting/formal, creative, etc.) from public reputation. Evaluate whether the draft's tone matches that culture. Be specific. Output strict markdown with these sections: ## Inferred Culture, ## Tone Match (give a verdict + 1-10 score and 2-3 reasons), ## Issues (bulleted), ## Suggested Edits (3-6 concrete rewrites with before → after).",
  translate:
    "You are an expert resume writer specializing in translating unconventional experience into the precise corporate language of a target role. Given the user's past experience and the target job description, return STRICT markdown: a single section ## Resume Bullets followed by 3-5 bullet points. Each bullet must be a single line starting with a strong action verb, quantified where possible, using terminology mirrored from the job description. No preamble, no closing remarks.",
  polish:
    "You are a professional editor. Improve the user's text for grammar, clarity, conciseness, and professional business tone in the requested language. Preserve meaning and intent. Return strict markdown with: ## Polished Version (the rewritten text only) then ## Key Changes (bulleted, brief).",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool, payload } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userPrompt = "";
    if (tool === "tone") {
      userPrompt = `Target Company: ${payload.company}\n\nCover Letter Draft:\n"""\n${payload.draft}\n"""`;
    } else if (tool === "translate") {
      userPrompt = `Past Experience:\n"""\n${payload.experience}\n"""\n\nTarget Job Description:\n"""\n${payload.jobDescription}\n"""`;
    } else if (tool === "polish") {
      userPrompt = `Language: ${payload.language || "English"}\n\nText to polish:\n"""\n${payload.text}\n"""`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown tool" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM[tool as Tool] },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("career-assistant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

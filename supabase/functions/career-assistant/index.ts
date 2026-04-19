// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tool = "tone" | "translate" | "polish" | "extract";

const SYSTEM: Record<Tool, string> = {
  tone:
    "You are an expert career coach and corporate communications analyst. Given a cover letter draft and a target company, infer the company's likely culture and evaluate whether the draft's tone matches it. Always call the report_tone function with structured fields. Be specific and concrete.",
  translate:
    "You are an expert resume writer specializing in translating unconventional experience into precise corporate language. Given the user's experience and a target job description, return STRICT markdown with ONLY a single top-level section header `## Resume Bullets` followed by 3-5 unordered list items prefixed with `- `. Each bullet: one line, starts with a strong action verb, quantified where possible, mirrors JD vocabulary. No preamble, no closing remarks, no other sections.",
  polish:
    "You are a professional editor. Improve the user's text for grammar, clarity, conciseness, and professional business tone in the requested language. Preserve meaning. Always call the report_polish function with structured fields.",
  extract:
    "You extract structured job posting metadata. From the provided text (and optional URL), call the save_job function with your best inference. Always pick the closest enum value for applicationType and industry. If a field is truly unknown leave it empty. Keep notes to 1-2 short sentences summarizing key requirements.",
};

const EXTRACT_TOOL = {
  type: "function",
  function: {
    name: "save_job",
    description: "Save extracted job posting fields.",
    parameters: {
      type: "object",
      properties: {
        company: { type: "string" },
        role: { type: "string" },
        applicationType: {
          type: "string",
          enum: ["Working Student", "Internship", "Full-time", "Part-time", "Contract", "Freelance", ""],
        },
        industry: {
          type: "string",
          enum: ["Tech", "Automotive", "Consulting", "Finance", "Healthcare", "E-commerce", "Manufacturing", "Media", "Education", "Other", ""],
        },
        notes: { type: "string" },
      },
      required: ["company", "role", "applicationType", "industry", "notes"],
      additionalProperties: false,
    },
  },
};

const TONE_TOOL = {
  type: "function",
  function: {
    name: "report_tone",
    description: "Return a structured tone analysis.",
    parameters: {
      type: "object",
      properties: {
        culture: {
          type: "string",
          description: "1-2 sentence inference of the company's culture and communication style.",
        },
        toneVerdict: {
          type: "string",
          description: "Short verdict, e.g. 'Strong match', 'Partial match', 'Mismatch'.",
        },
        toneScore: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Tone match score from 1 to 10.",
        },
        toneReasoning: {
          type: "string",
          description: "1-2 sentences explaining the score.",
        },
        issues: {
          type: "array",
          items: { type: "string" },
          description: "Concrete issues with the draft (each <= 1 sentence).",
        },
        edits: {
          type: "array",
          description: "3-6 concrete rewrites with before/after.",
          items: {
            type: "object",
            properties: {
              before: { type: "string" },
              after: { type: "string" },
              reason: { type: "string", description: "Why this edit improves the draft." },
            },
            required: ["before", "after", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["culture", "toneVerdict", "toneScore", "toneReasoning", "issues", "edits"],
      additionalProperties: false,
    },
  },
};

const POLISH_TOOL = {
  type: "function",
  function: {
    name: "report_polish",
    description: "Return polished version + key changes.",
    parameters: {
      type: "object",
      properties: {
        polished: { type: "string", description: "The fully rewritten text only." },
        changes: {
          type: "array",
          items: { type: "string" },
          description: "Brief bullet points describing what was changed and why.",
        },
      },
      required: ["polished", "changes"],
      additionalProperties: false,
    },
  },
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
    } else if (tool === "extract") {
      userPrompt = `${payload.url ? `Source URL: ${payload.url}\n\n` : ""}Job posting text:\n"""\n${payload.text}\n"""`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown tool" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM[tool as Tool] },
        { role: "user", content: userPrompt },
      ],
    };

    if (tool === "extract") {
      body.tools = [EXTRACT_TOOL];
      body.tool_choice = { type: "function", function: { name: "save_job" } };
    } else if (tool === "tone") {
      body.tools = [TONE_TOOL];
      body.tool_choice = { type: "function", function: { name: "report_tone" } };
    } else if (tool === "polish") {
      body.tools = [POLISH_TOOL];
      body.tool_choice = { type: "function", function: { name: "report_polish" } };
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

    // Tool-call responses
    if (tool === "extract" || tool === "tone" || tool === "polish") {
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) {
        return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(call.function.arguments); }
      catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const key = tool === "extract" ? "extracted" : "structured";
      return new Response(JSON.stringify({ [key]: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

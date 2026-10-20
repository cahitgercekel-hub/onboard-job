// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { redactContactDetails } from "../_shared/redact.ts";
import { AI_DISABLED_BODY, isAiEnabled } from "../_shared/aiAccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tool = "tone" | "translate" | "polish" | "extract" | "interview" | "cv" | "optimize_cv";

const SYSTEM: Record<Tool, string> = {
  tone:
    "You are an expert career coach and corporate communications analyst. Given a cover letter draft and a target company, infer the company's likely culture and evaluate whether the draft's tone matches it. Always call the report_tone function with structured fields. Be specific and concrete.",
  translate:
    "You are an expert resume writer specializing in translating unconventional experience into precise corporate language. Given the user's experience and a target job description, translate their background into 3-5 high-impact resume bullet points. For each bullet, explain the strategic reason for the wording (e.g. which JD keywords it targets). Always call the report_translate function.",
  polish:
    "You are a professional editor. Improve the user's text for grammar, clarity, conciseness, and professional business tone in the requested language. Preserve meaning. Always call the report_polish function with structured fields.",
  extract:
    "You extract structured job posting metadata. From the provided text (and optional URL), call the save_job function with your best inference. Always pick the closest enum value for applicationType, industry, and workModel. Extract the location (city, country, or 'Remote') if present. For jobDescription, return a clean, condensed version of the core posting (responsibilities + requirements), 80-200 words, plain text. If a field is truly unknown leave it empty. Keep notes to 1-2 short sentences summarizing key highlights.",
  interview:
    "You are an interview coach. Given a role, company, and job description, generate exactly 5 highly probable interview questions tailored to the role. For each, provide a suggested answer structure using the STAR method (Situation, Task, Action, Result) — each section a short sentence. Always call the report_interview function.",
  cv:
    "You are a senior recruiter and ATS specialist. Holistically evaluate the user's CV. Provide elite-level feedback focusing on: 1) Impact over Tasks (quantifiable results like '%', '$', or time saved), 2) Professional Narrative (strong active verbs, no fluff), 3) Format & Scannability (standard headings, clear hierarchy), and 4) Technical/Keyword alignment. Return scores plus 5-8 highly actionable, recruiter-grade tips. Tips should be specific (e.g. 'Instead of \"helped with sales\", use \"Generated $50k in new revenue by...\"'). Always call the report_cv function.",
  optimize_cv:
    "You are a senior resume writer. The user's CV is missing several skills that are in high demand across the jobs they are targeting. Rewrite 5 resume bullet points that authentically incorporate the missing skills — never fabricate experience, but reframe and emphasize plausible adjacent work. Each bullet must start with a strong action verb, be one line, and include a metric where reasonable. Always call the report_optimize function.",
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
        applicationType: { type: "string", enum: ["Working Student", "Internship", "Full-time", "Part-time", "Contract", "Freelance", ""] },
        industry: { type: "string", enum: ["Tech", "Automotive", "Consulting", "Finance", "Healthcare", "E-commerce", "Manufacturing", "Media", "Education", "Other", ""] },
        workModel: { type: "string", enum: ["Remote", "Hybrid", "On-site", ""] },
        location: { type: "string" },
        jobDescription: { type: "string" },
        notes: { type: "string" },
      },
      required: ["company", "role", "applicationType", "industry", "workModel", "location", "jobDescription", "notes"],
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
        culture: { type: "string" },
        toneVerdict: { type: "string" },
        toneScore: { type: "integer", minimum: 1, maximum: 10 },
        toneReasoning: { type: "string" },
        issues: { type: "array", items: { type: "string" } },
        edits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              before: { type: "string" }, after: { type: "string" }, reason: { type: "string" },
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
        polished: { type: "string" },
        changes: { type: "array", items: { type: "string" } },
      },
      required: ["polished", "changes"],
      additionalProperties: false,
    },
  },
};

const INTERVIEW_TOOL = {
  type: "function",
  function: {
    name: "report_interview",
    description: "Return 5 likely interview questions with STAR answer structures.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              situation: { type: "string" },
              task: { type: "string" },
              action: { type: "string" },
              result: { type: "string" },
            },
            required: ["question", "situation", "task", "action", "result"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },
};

const CV_TOOL = {
  type: "function",
  function: {
    name: "report_cv",
    description: "Return CV scorecards and tips.",
    parameters: {
      type: "object",
      properties: {
        scores: {
          type: "object",
          properties: {
            language: { type: "integer", minimum: 0, maximum: 100 },
            formatting: { type: "integer", minimum: 0, maximum: 100 },
            ats: { type: "integer", minimum: 0, maximum: 100 },
            keywords: { type: "integer", minimum: 0, maximum: 100 },
          },
          required: ["language", "formatting", "ats", "keywords"],
          additionalProperties: false,
        },
        tips: { type: "array", items: { type: "string" } },
        strongKeywords: { type: "array", items: { type: "string" } },
      },
      required: ["scores", "tips", "strongKeywords"],
      additionalProperties: false,
    },
  },
};

const TRANSLATE_TOOL = {
  type: "function",
  function: {
    name: "report_translate",
    description: "Return translated resume bullets with reasoning.",
    parameters: {
      type: "object",
      properties: {
        bullets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "The corporate-translated resume bullet." },
              reason: { type: "string", description: "Strategic reasoning/keywords targeted." },
            },
            required: ["text", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["bullets"],
      additionalProperties: false,
    },
  },
};

const OPTIMIZE_TOOL = {
  type: "function",
  function: {
    name: "report_optimize",
    description: "Return rewritten resume bullets that incorporate missing skills.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-2 sentence summary of how the rewrite incorporates the missing skills." },
        bullets: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              skillsCovered: { type: "array", items: { type: "string" } },
            },
            required: ["text", "skillsCovered"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "bullets"],
      additionalProperties: false,
    },
  },
};

const MAX_FIELD_CHARS = 20000;
const MAX_LIST_ITEMS = 50;

// Accept only plain strings/booleans/short string lists, each size-capped.
type Payload = Record<string, string | boolean | string[]>;

function capPayload(raw: unknown): Payload {
  const out: Payload = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v.slice(0, MAX_FIELD_CHARS);
    else if (typeof v === "boolean") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === "string").slice(0, MAX_LIST_ITEMS).map((x) => x.slice(0, 200));
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { tool, payload: rawPayload } = await req.json();
    if (typeof tool !== "string" || !(tool in SYSTEM)) {
      return new Response(JSON.stringify({ error: "Unknown tool" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!(await isAiEnabled(sb, userData.user.id))) {
      return new Response(JSON.stringify(AI_DISABLED_BODY), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payload = capPayload(rawPayload);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userPrompt = "";
    let systemPrompt = SYSTEM[tool as Tool];

    if (tool === "tone") {
      userPrompt = `Target Company: ${payload.company}\n\nCover Letter Draft:\n"""\n${payload.draft}\n"""`;
    } else if (tool === "translate") {
      userPrompt = `Past Experience:\n"""\n${payload.experience}\n"""\n\nTarget Job Description:\n"""\n${payload.jobDescription}\n"""`;
    } else if (tool === "polish") {
      const lang = payload.language || "English";
      userPrompt = `Language: ${lang}\n\nText to polish:\n"""\n${payload.text}\n"""`;
      if (lang === "German" && payload.businessGerman) {
        systemPrompt += " The user has selected Geschäftsdeutsch (Business German) mode. Strictly enforce: formal salutations (Sehr geehrte Damen und Herren / Sehr geehrte Frau X / Sehr geehrter Herr Y), formal Sie throughout (never du unless the source clearly uses du intentionally), correct German business capitalization (all nouns capitalized, formal pronouns Sie/Ihr/Ihnen capitalized), and standard professional closings (Mit freundlichen Grüßen). Use precise corporate vocabulary appropriate for German business correspondence.";
      }
    } else if (tool === "extract") {
      userPrompt = `${payload.url ? `Source URL: ${payload.url}\n\n` : ""}Job posting text:\n"""\n${payload.text}\n"""`;
    } else if (tool === "interview") {
      // Personal job notes are deliberately not sent; only the posting itself.
      userPrompt = `Company: ${payload.company}\nRole: ${payload.role}\n\nJob Description:\n"""\n${payload.jobDescription || "(no JD provided — infer from role/company)"}\n"""`;
    } else if (tool === "cv") {
      userPrompt = `CV text:\n"""\n${redactContactDetails(payload.cv ?? "")}\n"""`;
    } else if (tool === "optimize_cv") {
      userPrompt = `Missing skills (high demand across the user's target jobs):\n${(payload.missingSkills || []).join(", ")}\n\nTop demanded skills overall (for context):\n${(payload.topSkills || []).join(", ")}\n\nUser's current CV:\n"""\n${redactContactDetails(payload.cv ?? "")}\n"""`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown tool" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    const toolMap: Record<string, [unknown, string]> = {
      extract: [EXTRACT_TOOL, "save_job"],
      tone: [TONE_TOOL, "report_tone"],
      translate: [TRANSLATE_TOOL, "report_translate"],
      polish: [POLISH_TOOL, "report_polish"],
      interview: [INTERVIEW_TOOL, "report_interview"],
      cv: [CV_TOOL, "report_cv"],
      optimize_cv: [OPTIMIZE_TOOL, "report_optimize"],
    };

    if (toolMap[tool]) {
      body.tools = [toolMap[tool][0]];
      body.tool_choice = { type: "function", function: { name: toolMap[tool][1] } };
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
      // Status only: gateway error bodies can echo request content.
      console.error("AI gateway error", resp.status);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();

    if (toolMap[tool]) {
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
    console.error("career-assistant error", e instanceof Error ? e.name : "unknown");
    return new Response(JSON.stringify({ error: "AI request failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

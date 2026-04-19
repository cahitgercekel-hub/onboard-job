// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tool = "tone" | "translate" | "polish" | "extract" | "interview" | "cv";

const SYSTEM: Record<Tool, string> = {
  tone:
    "You are an expert career coach and corporate communications analyst. Given a cover letter draft and a target company, infer the company's likely culture and evaluate whether the draft's tone matches it. Always call the report_tone function with structured fields. Be specific and concrete.",
  translate:
    "You are an expert resume writer specializing in translating unconventional experience into precise corporate language. Given the user's experience and a target job description, return STRICT markdown with ONLY a single top-level section header `## Resume Bullets` followed by 3-5 unordered list items prefixed with `- `. Each bullet: one line, starts with a strong action verb, quantified where possible, mirrors JD vocabulary. No preamble, no closing remarks, no other sections.",
  polish:
    "You are a professional editor. Improve the user's text for grammar, clarity, conciseness, and professional business tone in the requested language. Preserve meaning. Always call the report_polish function with structured fields.",
  extract:
    "You extract structured job posting metadata. From the provided text (and optional URL), call the save_job function with your best inference. Always pick the closest enum value for applicationType, industry, and workModel. Extract the location (city, country, or 'Remote') if present. For jobDescription, return a clean, condensed version of the core posting (responsibilities + requirements), 80-200 words, plain text. If a field is truly unknown leave it empty. Keep notes to 1-2 short sentences summarizing key highlights.",
  interview:
    "You are an interview coach. Given a role, company, and job description, generate exactly 5 highly probable interview questions tailored to the role. For each, provide a suggested answer structure using the STAR method (Situation, Task, Action, Result) — each section a short sentence. Always call the report_interview function.",
  cv:
    "You are a senior recruiter and CV reviewer. Holistically evaluate the user's CV across four dimensions on a 0-100 scale: 1) Professional Language (clarity, action verbs, no fluff), 2) Length & Formatting (appropriate length, structure, scannability), 3) ATS Appropriateness (parseable, no fancy graphics, standard headings), 4) Keyword Optimization (impactful nouns/verbs). Return scores plus 4-7 actionable tips and 4-8 strong/impactful keywords found. Always call the report_cv function.",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool, payload } = await req.json();
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
      userPrompt = `Company: ${payload.company}\nRole: ${payload.role}\n\nJob Description:\n"""\n${payload.jobDescription || payload.notes || "(no JD provided — infer from role/company)"}\n"""`;
    } else if (tool === "cv") {
      userPrompt = `CV text:\n"""\n${payload.cv}\n"""`;
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
      polish: [POLISH_TOOL, "report_polish"],
      interview: [INTERVIEW_TOOL, "report_interview"],
      cv: [CV_TOOL, "report_cv"],
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
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
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
    console.error("career-assistant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

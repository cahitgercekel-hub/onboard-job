## Goal

Make **Corporate Tone**, **Skill Translator**, **Grammar & Polish**, **Interview Prep**, and **CV Analyzer** feel like siblings of the redesigned **Career Chat** — same chrome, colors, gradients, buttons, and "Premium Tools" rail.

## What changes (visual only — logic untouched)

### 1. Shared page shell — new `AssistantToolShell`
Replace the plain `AssistantPageHeader` + bare content layout with a chat-style 2-column shell:

```text
┌─────────────────────────────────────┬──────────────────┐
│  [logo tile] Tool Name              │ ▸ Premium Tools  │
│  subtitle                           │   Pro features   │
├─────────────────────────────────────┤                  │
│                                     │  ┌────────────┐  │
│   tool body (inputs + results)      │  │ Premium    │  │
│   on muted/30 background            │  │ feature 1  │  │
│                                     │  └────────────┘  │
│                                     │  ┌────────────┐  │
│                                     │  │ Premium    │  │
│                                     │  │ feature 2  │  │
│                                     │  └────────────┘  │
│                                     │                  │
│                                     │ [Upgrade to Pro] │
└─────────────────────────────────────┴──────────────────┘
```

Same header treatment as chat:
- Square gradient logo tile (`bg-gradient-premium`) with the Logo on the left
- Title + subtitle stacked tight
- Wrapped in `surface-card` with rounded corners and border
- Body area uses `bg-muted/30` like the chat message panel

### 2. Per-tool premium rail
Each tool gets 2 contextual "Pro" upsell cards in the right rail (locked toggles + Pro badge, identical to chat):

| Tool | Premium teaser 1 | Premium teaser 2 |
|------|------------------|------------------|
| Corporate Tone | Multi-company tone presets | Bulk cover-letter rewrite |
| Skill Translator | JD batch translation | Industry-specific tone packs |
| Grammar & Polish | Track-changes export (DOCX) | Tone presets (formal/friendly/exec) |
| Interview Prep | Live mock interview (voice) | Recruiter-style follow-ups |
| CV Analyzer | Detailed ATS simulation | Unlimited daily scans |

Each rail ends with the same gradient **"Upgrade to Pro for Access"** button linking to `/billing`. Rail hidden on `<lg` breakpoints (collapses to a single CTA card under the tool body).

### 3. Buttons & accents — match chat
- Primary action buttons (Analyze tone, Translate, Polish, Generate questions, Analyze CV) → `bg-gradient-premium text-white` with `Sparkles` / tool icon, full-width on mobile, rounded
- Secondary buttons → outline pill style
- Quick-action style chips reused for Polish language toggle and Interview job picker shortcuts
- Replace plain `Upload` boxes with the chat-style dashed dropzone already present in CV Analyzer (extend to Tone, Translator, Polish via a shared `DropZone` component) — kept compact next to inputs

### 4. Result panel polish
- All result cards already use `surface-card` — add the subtle gradient ring (`ring-1 ring-accent/20`) used on chat bot bubbles, plus a small avatar tile (Bot / FileText / Sparkles) next to result section titles for visual continuity with chat
- Tone score gauge → restyle to match the `ScoreGauge` radial used in CV Analyzer for consistency
- Interview Q cards → keep STAR layout but add the gradient `Q1`/`Q2` numbered chip used in chat bubbles

### 5. Background
- Page wrapper switches from default body to the same soft `bg-muted/30` outer fill used by the chat page so everything sits on the same canvas
- Outer max-width raised from `max-w-6xl` → `max-w-7xl` to align with chat

## Files to edit

- `src/components/assistant/AssistantPageHeader.tsx` — replace with `AssistantToolShell` (header + 2-col grid + premium rail props)
- `src/components/assistant/PremiumRail.tsx` *(new)* — the right-side rail (toggles, lock icons, gradient CTA), data-driven from a `tools` prop
- `src/components/assistant/DropZone.tsx` *(new, optional)* — extracted from CV Analyzer's drag/drop block, reused by Tone / Translator / Polish
- `src/pages/assistant/ToneAssistant.tsx` — wrap in shell + premium rail
- `src/pages/assistant/TranslatorAssistant.tsx` — wrap in shell + premium rail
- `src/pages/assistant/PolishAssistant.tsx` — wrap in shell + premium rail
- `src/pages/assistant/InterviewAssistant.tsx` — wrap in shell + premium rail
- `src/pages/assistant/CvAssistant.tsx` — wrap in shell (CvAnalyzer already has its own scan-rail; the right rail will replace/absorb it so we don't double up)
- `src/pages/Assistant.tsx` — within `ToneAnalyzer`, `SkillTranslator`, `PolishTool`, `InterviewPrep`, `CvAnalyzer`: swap primary buttons to `bg-gradient-premium`, refresh badge/chip styles, add small bot avatar tiles to result section headers. **No logic, state, or API calls change.**

## Out of scope

- No backend / edge function changes
- No new routes
- No copy rewrites beyond the new premium-rail teaser labels
- No changes to `ChatAssistant.tsx` itself (it's the reference)

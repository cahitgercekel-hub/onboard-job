## Refinements — Billing, Charts, Branding, Chat, CV Analyzer

Five focused changes based on the screenshots.

### 1. Make Business tier more attractive + remove devplan tip

`src/pages/Billing.tsx`
- Remove the `?devplan=...` tip line at the bottom (still works under the hood for our testing, just not advertised).
- Visually elevate **Business** so it looks like the premium ceiling, not an afterthought:
  - Apply the `--gradient-premium` purple gradient to the card border/background-tint and to the "Upgrade" button (currently a plain outline).
  - Add a small "BEST VALUE" or "FOR TEAMS" ribbon on the card top (mirroring Pro's "MOST POPULAR" but in premium purple).
  - Add a `Sparkles` icon next to the price and bold the headline features (Auto-Apply Bot, Team members, Priority SLA).
  - Slight scale/shadow lift on hover.
- Keep Pro as "MOST POPULAR" but make Business clearly the aspirational tier.

### 2. Multi-color Role Concentration chart

`src/components/analytics/RoleDistribution.tsx`
- Replace the single `hsl(var(--accent))` fill with a per-category palette of 7 distinct hues (purple, indigo, blue, teal, green, amber, rose) sourced from CSS tokens so they respect the theme.
- Keep the opacity-by-match-quality logic, but apply it on top of each category's color.
- Tooltip and selected-stroke also use the matching color.

### 3. Use uploaded favicon as the actual app favicon

- Copy `user-uploads://favicon-2.ico` → `public/favicon.ico` (overwrite the current placeholder).
- Also copy it to `public/favicon.png` referenced size if needed; update `index.html` `<link rel="icon">` to point at the new file with a cache-busting query (`?v=2`).
- `src/components/Logo.tsx` already reads `/favicon.ico`, so the in-app sidebar logo updates automatically.

### 4. Career Chat redesigned to match the example screenshot

`src/pages/assistant/ChatAssistant.tsx` — full visual rework, same backend.

Layout becomes a 2-column shell on `md+` (single column on mobile):

```text
┌─────────────────────────────────────────┬──────────────────────┐
│ ▣ AI Career Assistant                   │  ◀ Premium Tools     │
│   Your personal career strategist       │     Pro Features     │
│ ─────────────────────────────────────── │  ┌────────────────┐  │
│  user bubble (right, purple gradient)   │  │ 🤖 Auto-apply  │  │
│  assistant bubble (left, white card     │  │ Bot   [Pro][🔒]│  │
│  with avatar)                           │  └────────────────┘  │
│                                         │  ┌────────────────┐  │
│                                         │  │ 📄 Unlimited   │  │
│                                         │  │ CV Versions    │  │
│                                         │  └────────────────┘  │
│ [View Tailored CV] [Mock Interview] …   │                      │
│ ┌─ Ask anything…              😊  ➤ ┐   │  [Upgrade to Pro]    │
└─────────────────────────────────────────┴──────────────────────┘
```

Specifics:
- Header card with avatar tile (uses Logo) + title "AI Career Assistant" / subtitle "Your personal career strategist", plus a small "Conversation" pill on the right that opens the existing job-context selector in a popover (replaces the current always-visible job bar).
- User messages: right-aligned, purple gradient bubble with white text, small user avatar on the right.
- Assistant messages: left-aligned, white card with subtle border, small bot/logo avatar on the left, markdown-rendered.
- Quick-action chips redesigned as pill buttons with leading icons (📄 View Tailored CV, ✨ Generate Interview Questions, 📅 Schedule Mock Interview, + overflow `…` opens the rest in a popover). Keep the same prompts; just restyle.
- Composer: rounded pill input with left-aligned placeholder, smiley/emoji slot on the right (decorative, no picker for now), and a circular gradient send button.
- Right rail "Premium Tools — Pro Features" (hidden on mobile, replaced by a dismissable banner):
  - Two cards: **Auto-apply Bot** ("Automatically apply to relevant jobs daily") and **Unlimited CV Versions** ("Create and store unlimited tailored CVs").
  - Each shows a `PlanBadge` (Pro), a lock icon, and a disabled toggle switch.
  - Bottom button: **"Upgrade to Pro for Access"** → links to `/billing`.
  - For users already on Pro/Business (via `usePlan`), swap copy to "Active" with a check, no upgrade button.
- Streaming, abort, CV-detect banner, and edge-function call all stay identical.

### 5. CV Analyzer redesigned to match the screenshot

`src/pages/Assistant.tsx` — refactor the `CvAnalyzer` block (used by `src/pages/assistant/CvAssistant.tsx`).

New 2-column layout (stacks on mobile):

```text
Left column                          Right column
┌─────────────────────────┐          ┌──────────┬──────────┐
│ Paste CV Text           │          │ Pro Lang │ Length & │
│ [textarea]              │          │  92%  92 │  Format  │
├─────────────────────────┤          ├──────────┼──────────┤
│  ⬆  Upload PDF or Docx  │          │   ATS    │ Keywords │
│  Drag & Drop or Browse  │          │  95%  95 │  85%  85 │
├─────────────────────────┤          ├─────────────────────┤
│ Daily Scan Limit 1/3    │          │ Strong Keywords     │
│ ▰▰▱▱▱  33%              │          │ [pill] [pill] …     │
├─────────────────────────┤          ├─────────────────────┤
│ ▶ Analyze CV (gradient) │          │ Actionable Tips     │
└─────────────────────────┘          │ • …                 │
                                     ├─────────────────────┤
                                     │ Detailed ATS Sim    │
                                     │ [Premium] (locked)  │
                                     │ [🔒 Unlock with Pro]│
                                     └─────────────────────┘
```

Specifics:
- **Left card**: textarea + drop-zone style upload area (large dashed box with upload icon, replacing the small button) + daily-scan-limit progress bar + big gradient "Analyze CV" CTA.
- **Daily scan limit**: free users see "1/3 free scans used" tracked in localStorage (resets per UTC day). Pro/Business users see "Unlimited scans" with no bar. Hitting the limit disables the CTA and shows an inline upgrade nudge.
- **Right column score cards**: 4 cards in a 2×2 grid, each with a small circular gauge (radial progress using SVG / `recharts` RadialBar) showing the % plus the raw `xx / 100` on the right. Reuses existing `cvResult.scores` (`language`, `formatting`, `ats`, `keywords`).
- **Strong Keywords**: existing `strongKeywords[]` rendered as outlined pill badges.
- **Actionable Tips**: existing `tips[]` as a bulleted list inside its own card.
- **Detailed ATS Simulation (Premium)**: new locked section. Shows a blurred/redacted preview block with a centered "🔒 Unlock with Pro" gradient button overlay. For Pro/Business it unlocks and shows a longer GPT-generated ATS report (we'll send a `detailed: true` flag to the existing `career-assistant` `cv` tool — server already returns the same shape, the extra detail is purely a prompt tweak; that is a small follow-up to `supabase/functions/career-assistant/index.ts`).
- Page header (`AssistantPageHeader`) updates to match: gradient purple band with the FileText icon and "Professional CV Analyzer" + small "v1" badge.

### Files touched

- edit: `src/pages/Billing.tsx`
- edit: `src/components/analytics/RoleDistribution.tsx`
- copy: `user-uploads://favicon-2.ico` → `public/favicon.ico`; edit `index.html`
- edit: `src/pages/assistant/ChatAssistant.tsx` (full visual rework)
- edit: `src/pages/Assistant.tsx` (CvAnalyzer block) + `src/pages/assistant/CvAssistant.tsx` (header style)
- edit: `supabase/functions/career-assistant/index.ts` (add `detailed` flag for premium ATS report)

No DB migration, no new routes, no Stripe changes — purely UI + prompt tweak.

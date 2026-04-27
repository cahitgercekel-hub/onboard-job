
# JobFlow v2 — UI Redesign, Assistant Split, Chat Agent & Monetization

Delivered in 4 phases. Each phase is independently shippable so we can pause for feedback.

---

## Phase 1 — Brand & UI foundation

**Goal:** new logo, design tokens placeholder, and a refreshed shell that the rest of the work plugs into.

- Replace favicon with uploaded `favicon.ico` (copy to `public/favicon.ico`, delete old, update `index.html`).
- Add the same icon as the in-app logo (sidebar + mobile header), replacing the cyan briefcase tile.
- Update `src/index.css` design tokens. Since `NEW_UI_COLORS.png` came through blank, I'll keep current Notion-warm tokens **but restructure them** so swapping to your real palette is one file. Once you re-upload, I'll diff and apply.
- Refresh the AppLayout sidebar: tighter spacing, new section dividers, room for the larger Assistant menu (Phase 2), and a small **plan badge** ("Free" / "Pro" / "Business") under the workspace name.
- Polish empty states, card shadows, button hover states across Tracker / Analytics for visual consistency.

**Deliverable:** same features as today, new shell, new logo, ready for new palette.

---

## Phase 2 — Split the AI Assistant into pages

**Goal:** every tool gets its own route + sidebar entry under the **Assistant** group.

New routes (each is its own page, not a tab):
- `/assistant/chat` — **Career Chat** (new, Phase 3)
- `/assistant/tone` — Corporate Tone
- `/assistant/translator` — Skill Translator
- `/assistant/polish` — Grammar & Polish
- `/assistant/interview` — Interview Prep
- `/assistant/cv` — CV Analyzer

Work:
- Extract each tab section from `src/pages/Assistant.tsx` into its own page file under `src/pages/assistant/`.
- Keep shared helpers (`runStructured`, `FileUploadButton`, `ResultPanel`) in `src/components/assistant/`.
- Sidebar rewrite: Assistant group now lists the 6 entries with icons (MessageSquare, Sparkles, Languages, Wand2, Target, FileText). Active route highlighted; collapsed sidebar shows icons only with tooltips.
- `/assistant` redirects to `/assistant/chat`.
- Mobile bottom nav: keep 4 slots (Dashboard, Analytics, Assistant, Settings); Assistant opens a sheet listing the 6 sub-pages.

**Deliverable:** existing tools work identically, just on dedicated pages with deep-linkable URLs.

---

## Phase 3 — Career Chat AI agent

**Goal:** a real conversational coach with context, quick-action chips, and job awareness.

UI (`/assistant/chat`):
- Streaming chat (token-by-token), markdown rendering with `react-markdown`.
- **Quick-action chips** above the input — one click drops a preset prompt:
  - "Review my CV"
  - "Mock interview me"
  - "Find my skill gaps"
  - "Draft a follow-up email"
  - "Negotiate this offer"
  - "Suggest a career pivot"
- **Job context selector**: dropdown to attach any saved job (company + role + JD). When attached, a chip appears above the composer ("Talking about: Samsung — Werkstudent Marketing ✕"). The job's company, role, JD, and match score are injected into the system prompt.
- **Baseline CV awareness**: user's `cv_baseline.cv_text` is fetched once per session and injected into the system prompt so the agent knows their background. If missing, a one-time banner asks them to add it in Settings.
- Conversation memory within a session (state only — not persisted unless requested in a later iteration).
- Stop / regenerate buttons; rate-limit (429) and credits-exhausted (402) errors surfaced as toasts per Lovable AI guidelines.

Backend:
- New edge function `supabase/functions/career-chat/index.ts` using the streaming SSE pattern against the Lovable AI gateway. Default model `google/gemini-3-flash-preview`; Pro/Business users get `google/gemini-2.5-pro` (gated server-side via the new `subscriptions` table from Phase 4).
- System prompt assembled server-side from: base persona + baseline CV (if any) + attached job (if any). Never sent from client.

**Deliverable:** working chat coach with chips and job/CV context.

---

## Phase 4 — Monetization scaffolding (Free / Pro / Business)

**Goal:** plan tiers, gating, paywall UI, and a clean place to wire Stripe later.

### Schema (migration)
- Enum `app_plan` = `('free','pro','business')`.
- Table `subscriptions`: `user_id` (PK), `plan app_plan default 'free'`, `status text`, `current_period_end`, `stripe_customer_id`, `stripe_subscription_id`, timestamps.
- RLS: user can `select` own row; only service-role can write (Stripe webhook later).
- Seed a `free` row for every existing + new user (extend `handle_new_user`).
- Helper SQL function `current_plan() returns app_plan` for server-side checks.

### Tier matrix (proposed — confirm before build)

| Capability | Free | Pro | Business |
|---|---|---|---|
| Saved jobs | 25 | unlimited | unlimited |
| AI calls / day | 10 | 200 | 1000 |
| Chat agent | preview (3 msgs/day) | unlimited | unlimited |
| AI model quality | Flash | Pro | Pro + reasoning |
| CV versions | 1 | unlimited | unlimited |
| Advanced Analytics (skill gap, velocity) | locked | unlocked | unlocked |
| Auto-Apply Bot | — | unlocked | unlocked |
| CSV import / export | export only | both | both |
| Team members | — | — | up to 5 (placeholder for v2) |
| Priority support | — | email | email + SLA |

### Frontend
- `usePlan()` hook reading `subscriptions` for current user.
- `<PaywallGate plan="pro">` wrapper component for any locked feature; renders an inline upgrade card.
- Premium badges: golden Pro pill, indigo Business pill (already partly present — standardize via a `<PlanBadge>` component).
- New page `/settings/billing` with three pricing cards, current plan highlighted, "Upgrade" / "Manage" buttons.
- Replace the existing "Unlock advanced insights" sidebar card with a single dynamic upsell that hides when user is already Pro/Business.

### Stripe wiring (deferred — separate approval)
- The plan **does not** call `enable_stripe_payments` yet. Once you confirm pricing, I'll run the recommend → enable flow, create the Pro and Business products via `batch_create_product`, and add a checkout edge function + webhook to flip `subscriptions.plan`. Until then the Upgrade buttons toast "Coming soon" and a hidden dev toggle (visible only with `?devplan=pro`) lets you preview gated UI.

**Deliverable:** full plan/limits architecture and paywall UI, ready to flip on real billing in one follow-up step.

---

## Open items (will ask as we go)

1. Real palette image (re-upload `NEW_UI_COLORS.png`).
2. Final tier limits — the matrix above is my proposal; tweak any numbers before Phase 4.
3. Pricing in $ for Pro / Business when you're ready to enable Stripe.
4. Whether chat conversations should be **persisted** to the DB (history across sessions) or stay in-memory. Default: in-memory for v1.

---

## Technical notes (for reference)

- Streaming follows the `connecting-to-ai-models` SSE pattern (line-by-line parse, `[DONE]` handling, 429/402 toasts).
- Plan checks happen **server-side** in edge functions via `subscriptions` lookup with the user's JWT — never trust client-sent plan.
- `subscriptions` policies: SELECT own row only; INSERT/UPDATE blocked for `authenticated` (service-role only).
- Sidebar uses existing custom `AppLayout` (not shadcn `Sidebar`) — keep that, just expand the nav arrays.
- Files touched (high-level):
  - new: `public/favicon.ico`, `src/pages/assistant/*`, `src/pages/Billing.tsx`, `src/components/PaywallGate.tsx`, `src/components/PlanBadge.tsx`, `src/lib/usePlan.ts`, `supabase/functions/career-chat/index.ts`, migration for `subscriptions` + `app_plan`.
  - edited: `src/App.tsx` (routes), `src/components/AppLayout.tsx` (nav + plan badge), `src/pages/Assistant.tsx` (becomes redirect), `src/index.css` (token cleanup), `index.html` (favicon), `supabase/config.toml` (new function).

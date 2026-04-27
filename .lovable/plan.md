## Job Card Redesign — Logo, Match Ring, Link & Delete actions

Restyle `JobCard` to match the screenshot. Same data, new layout.

### New layout

```text
┌──────────────────────────────────────────────────┐
│ Quality Assurance Specialist               ╭───╮ │
│                                            │40%│ │
│ [G] Gameforge                              ╰───╯ │
│                                          Match   │
│ [Part-time] [Tech]                               │
│                                                  │
│ 📍 Karlsruhe, Baden-Württemberg — 1 week ago     │
│ ──────────────────────────────────────────────── │
│ ✓ Applied 25.04.2026          🔗 Link · 🗑 Delete │
└──────────────────────────────────────────────────┘
```

### Changes to `src/components/kanban/JobCard.tsx`

1. **Company logo** (new): small 28px rounded-square avatar to the left of the company name.
   - Resolve via Logo.dev's free Clearbit-style endpoint: `https://img.logo.dev/{domain}?token=pk_X-1ZO13GSgeOoUrIuJ6GMQ&size=80` — works without an API key for low volume; falls back to Clearbit `https://logo.clearbit.com/{domain}` and finally to a colored placeholder tile with the company's first letter.
   - Domain resolution order:
     a. If `job.url` is set → parse hostname (strip `www.`), use that domain.
     b. Else slugify `job.company` to `<slug>.com` (lowercase, alphanumeric, no spaces). Good enough for most well-known companies (gameforge.com, samsung.com, etc.).
   - Implement as a tiny `<CompanyLogo company url size />` component with `<img onError>` fallback chain → final fallback is an initials tile colored from a hash of the name (uses existing premium/accent palette tokens).
   - Cached per-session via a module-level `Map<domain, resolvedSrc>` so re-renders don't re-fetch.

2. **Match score ring** moved to the **top-right corner**, larger (~44px), with the percentage text **inside** the ring and a small "Match score" caption below it (matching the screenshot). Reuses existing `FitnessRing` with a `size="lg"` variant — small additive change to `src/components/FitnessRing.tsx` to accept a size prop.

3. **Footer row** becomes two clear actions instead of icon-only:
   - Left: `✓ Applied 25.04.2026` (or status-aware label, e.g. `📌 Saved`, `📞 Interviewing 3.05.2026`) — keeps the existing `formatDate`.
   - Right: **`🔗 Link`** (text + icon, only if `job.url`) and **`🗑 Delete`** (text + icon, red on hover).
   - Replace the current Archive icon button with a **Delete** action that calls a new optional `onDelete` prop. Tracker page wires it up to the existing delete flow (or, to keep the destructive UX safer, opens the existing archive/delete dialog — I'll use whichever the Tracker already exposes so behavior matches the rest of the app).
   - A subtle horizontal divider (`border-t`) above this row, like the screenshot.

4. **Tag pills** — keep current set (workModel, applicationType, industry, cvVersion, rejectionTag) but render them with the lighter pastel look from the screenshot (slightly larger, rounded-full).

5. **Stale-update warning chip** stays, but moves to a small icon next to the date (so it doesn't fight with the new top-right ring).

### Changes to `src/pages/Tracker.tsx` (small)

- Pass an `onDelete` handler to each `<JobCard>` (uses the existing delete-job action already available in `useJobs`). Confirm with a quick `toast` + undo, OR open the existing rejection/delete dialog — will match what the current archive icon does today so no UX regression.

### Changes to `src/components/FitnessRing.tsx`

- Add a `size?: "sm" | "lg"` prop (default `sm` = today's look). `lg` renders ~44px ring with the percentage centered.

### Files touched
- edit: `src/components/kanban/JobCard.tsx` (layout + new `CompanyLogo` subcomponent)
- edit: `src/components/FitnessRing.tsx` (size prop)
- edit: `src/pages/Tracker.tsx` (wire `onDelete`)

No new dependencies, no DB changes, no API keys needed (logo.dev public token is free and rate-limited per-IP; Clearbit is the fallback).

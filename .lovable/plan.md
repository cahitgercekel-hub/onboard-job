
## Goals
Fix layout collisions and inconsistencies in the Assistant tools, make the Premium Rail collapsible (and let the work area expand when collapsed), and clean up several JobCard issues (wrong logos, "0d ago" on Saved cards, action button colors, layout shift when a match score appears).

---

## 1) Assistant tools — layout & button consistency

**File: `src/components/assistant/AssistantToolShell.tsx`**

- Add a `collapsed` state for the Premium Rail (persisted in `localStorage` under `jat.premiumRail.collapsed`).
- Switch the grid template based on state:
  - Expanded: `lg:grid-cols-[1fr_300px]`
  - Collapsed: `lg:grid-cols-[1fr_44px]` (thin strip that just shows the toggle chevron)
- The textarea/work area inside the main column already uses `flex-1`, so collapsing the rail will naturally let the main panel grow wider — no per-page changes needed.
- Pass `collapsed` + `onToggle` into `<PremiumRail />`.

**File: `src/components/assistant/PremiumRail.tsx`**

- Make the header arrow (`▸`) the actual toggle button (chevron rotates with state).
- When `collapsed`:
  - Render only a vertical strip: gradient background, the chevron (pointing left/right), and a tiny "Pro" pill rotated vertically (or just the crown icon).
  - Hide the tool list and the "Upgrade" footer.
- When expanded: current behavior.

**File: `src/pages/Assistant.tsx` — unify button placement across all tools**

Currently every tool puts the action button right under its inputs, so the button "jumps" depending on textarea height (Tone, Translator, Polish, Interview, CV all differ). Fix by:

- Wrap every tool's left/input column in a `flex flex-col h-full` container.
- Push the primary action button to the bottom with `mt-auto`.
- Make the textareas grow to fill remaining space (`className="flex-1 min-h-[160px] resize-none"`) instead of fixed `rows={N}`.

Specifically update:
- `ToneAnalyzer` (line ~129): wrap left col in `flex flex-col h-full`; textarea uses `flex-1`; "Analyze tone" button gets `mt-auto`.
- `SkillTranslator` (line ~247): same treatment, both textareas share remaining space (`flex-1`), "Translate skills" pinned bottom.
- `PolishTool` (line ~292): fix the broken header row where `Label` for Text and the Upload + Language selector are on one line but Label is empty (the textarea Label currently floats above the upload button — see screenshot 6). Restructure as:
  ```
  <Label>Text</Label>
  <row>[Upload file]   [Language select]   [BusinessGerman toggle inline when DE]</row>
  <Textarea flex-1 />
  <Button mt-auto />
  ```
- `InterviewPrep` (line ~390): the action card and the empty-state card are two stacked cards; merge them so the "Generate prep" button is in the same vertical position as other tools' buttons. Remove the separate empty card and instead show the empty hint inside the right column placeholder, matching the 2-column shape used by Tone/Translator/Polish/CV.
- `CvAnalyzer` (line ~610): wrap left col in `flex flex-col h-full`; "Analyze CV" pinned `mt-auto`.

**File: `src/pages/assistant/InterviewAssistant.tsx`**

Interview is currently a single-column tool — it needs the same 2-column shape so its button lines up. Update `InterviewPrep` itself (in `Assistant.tsx`) to use a `grid lg:grid-cols-2 gap-5` layout: left = role picker + Generate button (pinned bottom), right = results / placeholder. No change needed to the wrapper page.

---

## 2) JobCard — logo accuracy

**File: `src/components/kanban/JobCard.tsx`**

The `slugifyToDomain()` heuristic produces wrong domains for multi-word companies (e.g., "Altagram Group - Game Localization" → `altagramgroupgamelocalization.com`). Fix:

- **Prefer the parsed posting URL hostname first** (already done) — keep.
- **Use a smarter slug** when no URL: take only the first significant token, strip suffixes like `Group`, `GmbH`, `AG`, `Inc`, `Ltd`, `LLC`, `Germany`, and anything after `-` / `–` / `|`. Example: "Altagram Group - Game Localization" → `altagram.com`.
- **Add a Brandfetch fallback** as the first source (highest hit-rate for company branding):
  `https://cdn.brandfetch.io/{domain}/w/80/h/80?c=1idV74_default` — falls through to logo.dev, Clearbit, Google favicon, then color initials tile.
- **Only show LinkedIn-style "in" placeholder** when ALL sources fail and the domain looked guessable; otherwise show the colored initial tile (already done).
- Cache successful sources keyed by `company` (not just domain) so re-renders don't re-probe.

---

## 3) JobCard — "0d ago" should not show for Saved jobs

**File: `src/components/kanban/JobCard.tsx`** (location row, ~line 198)

Current logic shows `— {daysSince}d ago` whenever `alarm === "none"` and `updatedAt` exists, regardless of status. Change to only show the "Xd ago" suffix when `job.status !== "saved"` AND `job.dateApplied` exists (or status is interviewing/offer/rejected). For Saved, just show the location.

---

## 4) JobCard — colored Link / Delete actions

**File: `src/components/kanban/JobCard.tsx`** (footer, ~line 220)

- Link: change classes from `text-muted-foreground hover:text-accent` to `text-accent hover:text-accent/80 font-medium` (icon inherits via `currentColor`).
- Delete: change from `text-muted-foreground hover:text-destructive` to `text-destructive hover:text-destructive/80 font-medium`.
- Keep the `·` divider neutral.

---

## 5) JobCard — stable layout when match score is present

**File: `src/components/kanban/JobCard.tsx`** (top row, ~line 168 and company row ~line 180)

Issue (screenshot 13): when `fitnessScore` exists, the FitnessRing column pushes the title narrower AND the "Match score" caption below the ring adds extra height, so the company row drops and a blank gap appears.

Fix:
- Reserve the score slot with a fixed-width column always (e.g., `w-12`) so title width is identical with/without score. When score is null, render an empty placeholder div of the same dimensions.
- Move "Match score" caption out of the flow: render it as a `title`/tooltip on the ring, OR overlay it (absolute) so it doesn't add to row height. Preferred: remove the caption text, put it in `title="Match score"` on the ring wrapper.
- Reduce `FitnessRing variant="lg"` margin (`-mt-0.5` → `mt-0`) and ensure company row has consistent `mt-2` regardless.

---

## Files to change

- `src/components/assistant/AssistantToolShell.tsx` — collapsible rail state, dynamic grid.
- `src/components/assistant/PremiumRail.tsx` — chevron toggle, collapsed strip.
- `src/pages/Assistant.tsx` — flex-column layouts for all 5 tools, `mt-auto` buttons, fix Polish header row, give Interview a 2-column layout.
- `src/components/kanban/JobCard.tsx` — smarter domain slug + Brandfetch source, conditional "Xd ago", blue Link / red Delete, fixed-width score slot, removed inline "Match score" caption.

No backend, schema, or routing changes.

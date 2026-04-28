Redesign the Settings page to match the 4-card grid layout in the screenshots.

## Target layout

Two columns on wide screens, single column on narrow screens (the grid simply collapses; no separate component). Four cards arranged in a 2×2 grid:

```text
┌──────────────────────────┬──────────────────────────┐
│ 1. Account & Subscription│ 2. CV Management         │
├──────────────────────────┼──────────────────────────┤
│ 3. Workflow Preferences  │ 4. Data & Security       │
└──────────────────────────┴──────────────────────────┘
```

## Card contents

1. **Account & Subscription** (new card)
   - "Current Plan: <Plan>" headline (large)
   - Sub-line: "Upgrade for unlimited job tracking and advanced AI features." (free) or a status line for paid plans.
   - Primary button: "Upgrade to Pro" → links to `/billing`.
   - Secondary text link: "Manage Subscription" → `/billing`.
   - Show signed-in email + Sign out as a small footer inside this card (moved from the top of the page).

2. **CV Management** (combine existing `CvBaselineSection` + `CvVersionsSection`)
   - "Baseline CV" header row with `Replace CV` (outline) and `Remove` (destructive outline) buttons at the right.
   - File name line below.
   - "Extracted text (editable)" textarea + "Save text" button (disabled until dirty — keep current behaviour).
   - Divider, then **CV Versions** subsection with the existing pill list and "+ New version" button (or the empty-state copy when none exist).

3. **Workflow Preferences** (existing Preferences card, restyled)
   - Appearance segmented control (Light / Dark / System) with a small dropdown caret on the right (visual only — keep the existing segmented behaviour; the caret in the screenshot is decorative and we can omit it if it complicates things).
   - Language select.
   - Date format + Ghosting threshold side-by-side on wide layouts (`grid-cols-2`), stacked on narrow.
   - **Fitness Scoring** subsection (existing `RecalculateFitnessSection`): heading + description + "Recalculate fitness" button.

4. **Data & Security**
   - **API Tokens** subsection (existing `ApiTokensSection`) with the "+ New token" button on the right and the helper text/endpoint block below.
   - **Data Export & Import** subsection: stacked `Export data as CSV` and `Import data from CSV` buttons (full width within the column, icon on the right per screenshot).
   - **Danger Zone** sub-card at the bottom: light destructive-tinted background, "Clear all data" label + description + destructive "Clear all data" button. Keep the existing confirm dialog.

## Structural / layout details (`src/pages/Settings.tsx`)

- Wrap the four cards in `<div className="grid gap-6 lg:grid-cols-2">` inside the existing `max-w-6xl mx-auto` container (widen from `max-w-4xl` so two cards fit comfortably).
- Each card uses the existing `surface-card p-6` style with a header row: icon + title (icons: `User`, `FileText`, `Settings2`, `Shield` per the screenshots).
- Remove the separate sign-out button at the top — fold email + sign out into the Account card footer.
- Keep all existing logic and components intact; only reorganise composition.

## Component changes

- `CvBaselineSection.tsx`: small refactor to fit the new card — title becomes "Baseline CV" with action buttons aligned right, and the surrounding `<section className="surface-card p-6">` wrapper is removed (the parent card provides the wrapper). Same for `CvVersionsSection`, `RecalculateFitnessSection`, `ApiTokensSection`.
- Add a new "Account & Subscription" inline component inside `Settings.tsx` (no new file needed).
- Add a "Danger Zone" inline sub-card inside the Data & Security card with `border border-destructive/30 bg-destructive/5 rounded-lg p-4`.

## Responsive behaviour

- `lg` (≥1024px): 2 columns, wide variant matches `screen-10`.
- `<lg`: 1 column, cards stack — matches `screen-11`.
- All existing inner controls already wrap; no extra mobile work needed beyond column collapse.

No changes to data, routing, translations, or auth flow.
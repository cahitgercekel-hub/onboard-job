## Goal

In the "Attach a job" popover (AI Assistant header), there should be **one** control instead of two:

- The purple pill (currently just a display) becomes the clickable selector that opens the job list.
- The plain dropdown trigger underneath is removed.
- The X close button on the pill is removed.

When no job is attached yet, the purple pill itself is shown in an empty/placeholder state ("Select a job…") and clicking it opens the list.

## Reference

Current state (from screenshot):
```text
┌ Attach a job ─────────────────────┐
│ ╔═══════════════════════════════╗ │  ← purple pill (display only, has X)
│ ║ Altagram Group — Game Loc.  × ║ │
│ ║ Junior Localization Engineer  ║ │
│ ╚═══════════════════════════════╝ │
│ ┌───────────────────────────────┐ │  ← separate dropdown trigger
│ │ Altagram Group — Junior… ▾    │ │
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```

Target state:
```text
┌ Attach a job ─────────────────────┐
│ ╔═══════════════════════════════╗ │  ← purple pill IS the trigger (click to open list)
│ ║ Altagram Group — Game Loc.    ║ │
│ ║ Junior Localization Engineer  ║ │
│ ╚═══════════════════════════════╝ │
└───────────────────────────────────┘
```

Empty state (no job attached):
```text
┌ Attach a job ─────────────────────┐
│ ╔═══════════════════════════════╗ │
│ ║ Select a job…              ▾  ║ │  ← muted placeholder styling
│ ╚═══════════════════════════════╝ │
└───────────────────────────────────┘
```

## Changes

**File:** `src/pages/assistant/ChatAssistant.tsx` (the popover content inside the chat header, around lines 363–410)

1. Replace the two-part block (badge + Select) with a single shadcn `<Select>` whose `<SelectTrigger>` is restyled into the purple pill:
   - `h-auto` (so two lines fit), full width, padded (`px-3 py-2`).
   - Background `bg-accent/15`, border `border-accent/20`, text `text-accent`.
   - Inside the trigger, use `<SelectValue>` with a custom render: company name (semibold, top line) + role title (smaller, second line).
   - Show two-line content using `flex flex-col items-start text-left` and remove the trigger's default truncation so the role can wrap.
2. Remove the standalone X button (clearing the attached job is no longer offered here; switching to a different job is done by picking from the list).
3. Remove the now-unused `Badge` import if no other usages remain.
4. Keep the existing "Start new chat" button beneath, untouched.

## Behavior

- Clicking the purple pill opens the job list directly.
- Selecting a different job updates `attachedJobId` (existing handler), the pill updates to the new company/role, and the persisted thread for that job loads (existing effect already handles this).
- Empty list message ("No saved jobs yet") still shows when there are no jobs.

## Out of scope

- No change to thread persistence, search, or any other behavior.
- No removal action for the attached job from this popover (was previously the X). If the user later wants to "detach" a job, we can add a dedicated "No job attached" entry at the top of the list — flag if you want this.

## Goal

The Delete button inside the job info dialog (JobDialog) currently removes the job silently. Make it behave the same as deleting from a kanban card: delete immediately and show a bottom-right toast with an Undo action that re-adds the job.

## Change

**File:** `src/pages/Tracker.tsx` — the `onDelete` prop passed to `<JobDialog>` (line 374).

Replace:

```tsx
onDelete={dialog.job ? () => removeJob(dialog.job!.id) : undefined}
```

with:

```tsx
onDelete={dialog.job ? () => {
  const snapshot = dialog.job!;
  removeJob(snapshot.id);
  toast(`"${snapshot.role}" at ${snapshot.company} deleted`, {
    action: {
      label: "Undo",
      onClick: () => {
        const { id, createdAt, updatedAt, ...rest } = snapshot;
        addJob(rest);
      },
    },
    duration: 6000,
    position: "bottom-right",
  });
} : undefined}
```

This mirrors the existing kanban-card delete handler (lines 333–347) so behavior is consistent across both entry points.

## Notes

- The dialog already closes itself on delete (handled inside `JobDialog`'s Delete button), so no extra close logic needed.
- Undo re-creates the job via `addJob` with a fresh id (same approach as the card-level undo). Ordering on the board may shift slightly since it gets a new `created_at`.
- `toast`, `addJob`, and `removeJob` are already imported / in scope in this file.

## Out of scope

- No change to `JobDialog` itself.
- No change to archive flow.

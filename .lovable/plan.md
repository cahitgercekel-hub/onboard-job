Fix the footer (Plans & Billing, Settings) shifting upward in the collapsed sidebar.

## Root cause

The "Synced to your account." paragraph below the footer nav rows uses `px-3 pt-2 text-[11px]` and is hidden via `opacity-0 pointer-events-none` when collapsed. Because the placeholder still participates in layout, but the sidebar width shrinks from `w-60` to `w-16`, the same string wraps onto multiple lines in the collapsed rail. That makes the footer block taller in collapsed mode, which pushes the Plans & Billing and Settings icons upward relative to their expanded positions.

## Fix (in `src/components/AppLayout.tsx`)

Lock the placeholder to a fixed single-line height that does not depend on the available width:

- Change the wrapper to use a fixed height (e.g. `h-4` for the text + `pt-2` outside) and `whitespace-nowrap overflow-hidden` so the text never wraps.
- Use `invisible` instead of `opacity-0 pointer-events-none` when collapsed (cleaner, same layout).
- Add `aria-hidden={collapsed}` for accessibility.

Resulting block:

```text
<div
  aria-hidden={collapsed}
  className={cn(
    "px-3 pt-2 text-[11px] leading-4 h-6 whitespace-nowrap overflow-hidden text-muted-foreground transition-opacity duration-150",
    collapsed && "invisible"
  )}
>
  Synced to your account.
</div>
```

This guarantees the footer block has identical total height in both modes, so Plans & Billing and Settings icons stay at the same Y when toggling.

No other files need to change.
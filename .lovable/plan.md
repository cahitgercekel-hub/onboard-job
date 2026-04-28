Center collapsed sidebar items and replace section-header gaps with dividers.

Changes to `src/components/AppLayout.tsx`:

1. Collapsed nav rows become a centered 40x40 pill
- Keep row height fixed at `h-10` so Y-positions stay locked.
- When collapsed, switch the row to `w-10 mx-auto justify-center px-0` (same shape as the hamburger toggle) so the icon and the active/hover background are centered in the rail.
- When expanded, keep the current `pl-10 pr-3` layout with the icon absolutely positioned at left:12px.
- Render the icon directly (no absolute positioning) when collapsed, since the row itself is centered.

2. Section headers become centered dividers when collapsed
- Keep the `h-7` slot in both modes so vertical rhythm is preserved (icons stay at the same Y).
- Expanded: show the uppercase label ("Job Tracker", "Assistant") as today.
- Collapsed: hide the text and render a short centered horizontal divider line (e.g. `h-px w-6 bg-sidebar-border` centered) to visually separate the two icon groups.

3. Footer "Synced to your account." line
- Keep it visually hidden (`opacity-0`) when collapsed so the footer reserves the same vertical footprint and the Plans/Settings icons stay at the same Y.

Result
- Collapsed rail shows perfectly centered icons with selection backgrounds matching the hamburger button shape.
- Between Tracker and Assistant groups there is now a small centered divider instead of an empty gap.
- Toggling collapsed/expanded changes only width and label visibility — never icon Y or size.
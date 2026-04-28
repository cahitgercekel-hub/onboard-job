Plan to fix the collapsed sidebar icon alignment

1. Make the sidebar navigation rows always render with the same vertical structure
- Keep the same section header slots, nav row heights, row gaps, and footer spacing in both expanded and collapsed states.
- Hide text visually when collapsed instead of removing layout space where that can affect measurement.
- Avoid separate collapsed-only layouts that change vertical flow.

2. Lock icon X/Y placement inside fixed rows
- Use one shared nav item component/style for expanded and collapsed states.
- Set every row to a fixed height and every icon to a fixed wrapper size.
- In collapsed mode, center the fixed icon wrapper horizontally without changing row height, row margin, or row gap.
- Keep the actual SVG icon size identical across states.

3. Fix the header/toggle area so it does not change downstream icon positions
- The top header is currently different when collapsed: collapsed mode shows only the menu button, expanded mode shows logo/text/menu.
- I will make the header maintain the same height and internal alignment in both modes, with hidden placeholders as needed, so the nav starts at the same Y position.

4. Fix footer icons so they also stay locked
- Make the footer reserve the same vertical footprint in collapsed and expanded states, including the “Synced to your account.” line area if needed.
- Keep Plans & Billing and Settings at the same Y positions when toggling.

5. Improve the alignment-check overlay
- Keep the pixel-grid mode, but make it easier to compare by showing the same icon centers after toggle.
- Ensure it measures icon wrappers/centers consistently, not text or tooltip wrappers.

Technical details

- Primary file: `src/components/AppLayout.tsx`.
- Replace repeated nav markup with a small reusable render function/component so tracker, assistant, and footer items use exactly the same row DOM/classes.
- Use a fixed pattern like:

```text
sidebar header: fixed 69px
nav section header: fixed 28px
nav row: fixed 40px
row gap: fixed 4px
icon wrapper: fixed 16px or 40px center target
svg icon: fixed 16px
footer: fixed spacing model
```

- Collapsed state should change only width/label visibility, not vertical layout.
- The expected result: toggling collapsed/expanded changes only sidebar width and text visibility; all nav icons remain the same size and at the same Y-axis locations.
# Fix Premium Tools rail (Career Chat + collapsed state)

## Problems found

1. **Career Chat (`src/pages/assistant/ChatAssistant.tsx`)** uses its own custom inline rail markup instead of the shared `PremiumRail` component used by every other assistant page (CV Analyzer, Skill Translator, etc.). Result: it isn't collapsible and looks slightly different from the rest.
2. **Collapsed state of `PremiumRail`** (`src/components/assistant/PremiumRail.tsx`) renders a narrow purple bar that looks bad: vertical text uses an awkward CSS rotation, the chevron sits alone at top, and there is no rounded corner consistency with the expanded card.
3. **Chevron direction is inverted** when expanded. Currently it shows `ChevronRight` rotated 180° (= pointing left) when expanded, but the rail is on the right side, so the "collapse" affordance should point **right** (toward the edge it collapses to). When collapsed, the bar should show a chevron pointing **left** (toward the content it expands into).

## Changes

### 1. `src/components/assistant/PremiumRail.tsx`

**Fix chevron logic:**
- Expanded state: show `ChevronRight` (no rotation) — clicking collapses the rail to the right.
- Collapsed state: show `ChevronLeft` — clicking expands the rail back to the left. (Already `ChevronLeft`, so just remove the wrong rotation in expanded state.)

**Polish collapsed bar:**
- Keep the same `surface-card` rounded container so it visually matches the expanded card's outer shape.
- Replace the rotated-span vertical text trick with a cleaner layout: chevron at top, crown icon, then "PREMIUM TOOLS" using `writing-mode: vertical-rl` only (drop the extra `rotate(180deg)` — currently the combination makes it read bottom-to-top awkwardly; we'll keep it readable top-to-bottom).
- Slightly widen from `w-11` to `w-10` and center contents with even vertical spacing for a cleaner pill look.
- Add `rounded-md` to the inner button so the gradient fills the card cleanly.

### 2. `src/pages/assistant/ChatAssistant.tsx`

**Replace inline rail with shared `PremiumRail` + collapsible state:**
- Import `PremiumRail` and reuse the same `localStorage` key (`jat.premiumRail.collapsed`) used by `AssistantToolShell` so collapsed/expanded state persists consistently across all assistant pages.
- Add `collapsed` state with localStorage init/sync (same logic as `AssistantToolShell`).
- Change the outer grid from a static `lg:grid-cols-[1fr_300px]` to a dynamic `gridTemplateColumns` that switches between `minmax(0,1fr) 300px` (expanded) and `minmax(0,1fr) 44px` (collapsed), with a `transition-[grid-template-columns] duration-300` for smooth animation — matching `AssistantToolShell`.
- Remove the entire custom `<aside>` block (lines ~412–459) and replace with `<PremiumRail tools={PREMIUM_TOOLS} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />`.
- Remove the now-unused `ChevronRight`, `Lock`, and `PlanBadge` imports (PlanBadge is still used elsewhere — verify before removing; if used only in the rail, drop it).
- `PREMIUM_TOOLS` already matches the `PremiumTool` shape (`id`, `icon`, `title`, `desc`) — no data changes needed.

### Behavior after changes

- Career Chat right rail looks identical to CV Analyzer / Skill Translator / etc.
- Collapsing on any assistant page persists across all of them via shared localStorage key.
- Chevron always points the correct way: right when expanded (collapses toward the right edge), left when collapsed (expands back toward content).
- Collapsed bar is a clean rounded gradient pill with vertical "PREMIUM TOOLS" label that reads naturally.

## Files touched

- `src/components/assistant/PremiumRail.tsx` — chevron fix + collapsed bar polish
- `src/pages/assistant/ChatAssistant.tsx` — swap custom rail for shared `PremiumRail` with collapsible grid
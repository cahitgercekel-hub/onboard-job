# Align primary action buttons across all assistant tools

## Problem

Each assistant tool (Corporate Tone, Skill Translator, Grammar & Polish, Interview Prep, CV Analyzer) renders a primary CTA button in the left column, but they end up at different vertical positions because:

- **CV Analyzer** uses `w-full h-11` gradient button pinned to the bottom via `mt-auto`, with the textarea (`flex-1`) and other cards growing to fill the column → button sits flush at the bottom edge of the right column.
- **Other four tools** use `w-full sm:w-auto` (smaller auto-width on desktop) and their textareas have small `min-h` values without aggressive growth, so the button sits well above the bottom of the right column. Interview Prep is worst (no textarea at all → button floats near the top).

## Goal

Make the CTA button on Corporate Tone, Skill Translator, Grammar & Polish, and Interview Prep visually identical (size + bottom-edge alignment) to the **Analyze CV** button on CV Analyzer, and grow the input fields to fill the freed vertical space so the layout looks intentional.

## Reference button (CV Analyzer, line 673-680)

```tsx
<Button
  onClick={run}
  disabled={loading || limitReached}
  className="mt-auto w-full h-11 text-sm font-semibold bg-gradient-premium text-white border-0 hover:opacity-95 disabled:opacity-50"
>
  {loading ? <Loader2 ... /> : <Icon ... />}
  Label
</Button>
```

Key tokens to standardize: `mt-auto w-full h-11 text-sm font-semibold bg-gradient-premium text-white border-0 hover:opacity-95 disabled:opacity-50`.

## Changes (all in `src/pages/Assistant.tsx`)

### 1. ToneAnalyzer (~line 128–146)
- Promote the cover-letter Textarea to fill all available space: change its wrapper to `flex flex-col gap-1.5 flex-1 min-h-[260px]` (already has `flex-1`, just bump min-h so the column stretches more).
- Replace the button className with the standard one above. Icon stays `Wand2`, label stays "Analyze tone".

### 2. SkillTranslator (~line 246–266)
- Both textareas already share `flex-1`. Keep them, but bump each `min-h-[140px]` → `min-h-[200px]` so the column stretches like CV Analyzer's column.
- Replace button className with the standard one. Icon stays `Briefcase`, label stays "Translate skills".

### 3. PolishTool (~line 291–325)
- The Textarea has `flex-1 min-h-[240px]` — keep `flex-1`, bump min-h to `min-h-[300px]` so the textarea visibly grows and pushes the button down.
- Replace button className with the standard one. Icon stays `Sparkles`, label stays "Polish".

### 4. InterviewPrep (~line 390–415)
- This is the most off-position because the left column only contains a short job picker. Add a flex spacer (`<div className="flex-1" />`) between the picker block and the button so `mt-auto` actually pushes the button to the bottom of the column (which is sized by the right-column results panel).
- Replace button className with the standard one. Icon stays `MessageSquare`, label stays from i18n.

### 5. CV Analyzer
- No change — this is the reference.

## Result

All five tools will show a full-width, 44px-tall gradient primary button anchored to the bottom edge of the left column, exactly matching the right column's bottom edge. The freed vertical space is absorbed by the input textareas (or a spacer in Interview Prep's case), so nothing looks empty or floating.

## Files touched

- `src/pages/Assistant.tsx` — 4 button classNames + a few `min-h` bumps + 1 spacer div in InterviewPrep.
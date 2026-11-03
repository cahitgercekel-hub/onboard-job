import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DemoExampleLabel } from "@/components/shared/demo-bits";
import { cn } from "@/lib/utils";
import { describeKind, diffWords, matchChangeIds, type ChangeKind } from "@/lib/text-diff";

const BOX: Record<ChangeKind, string> = {
  spelling: "bg-diff-spelling-soft ring-diff-spelling/40",
  style: "bg-diff-style-soft ring-diff-style/40",
};
const ACTIVE: Record<ChangeKind, string> = {
  spelling: "ring-2 ring-diff-spelling",
  style: "ring-2 ring-diff-style",
};
const DOT: Record<ChangeKind, string> = { spelling: "bg-diff-spelling", style: "bg-diff-style" };

interface Props {
  original: string;
  polished: string;
  changes: string[];
}

export function PolishDiffView({ original, polished, changes }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"changes" | "clean">("changes");
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const segments = useMemo(() => diffWords(original, polished), [original, polished]);
  const counts = useMemo(() => {
    const c = { spelling: 0, style: 0 };
    for (const s of segments) if (s.type === "change") c[s.kind]++;
    return c;
  }, [segments]);
  const items = useMemo(
    () => changes.map((c) => ({ text: c, kind: describeKind(c, segments), ids: matchChangeIds(c, segments) })),
    [changes, segments],
  );

  const copy = async () => {
    await navigator.clipboard.writeText(polished);
    toast.success(t("ux.polish.copied"));
  };

  return (
    <div className="space-y-4">
      <div className="surface-card p-5 shadow-md ring-1 ring-accent/30 bg-card">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-accent/15 text-accent border-accent/20">
              <Sparkles className="h-3 w-3" /> {t("assistant.polish.polishedVersion")}
            </Badge>
            <DemoExampleLabel />
          </div>
          <div className="flex items-center gap-1">
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={mode}
              onValueChange={(v) => v && setMode(v as "changes" | "clean")}
              aria-label={t("ux.polish.viewLabel")}
            >
              <ToggleGroupItem value="changes" className="h-8 px-2.5 text-xs">{t("ux.polish.showChanges")}</ToggleGroupItem>
              <ToggleGroupItem value="clean" className="h-8 px-2.5 text-xs">{t("ux.polish.cleanText")}</ToggleGroupItem>
            </ToggleGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copy} aria-label={t("ux.polish.copy")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("ux.polish.copy")}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {mode === "changes" && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", DOT.spelling)} />{t("ux.polish.spelling")} ({counts.spelling})</span>
            <span className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", DOT.style)} />{t("ux.polish.style")} ({counts.style})</span>
          </div>
        )}

        <div className="text-sm text-foreground whitespace-pre-wrap leading-7">
          {mode === "clean"
            ? polished
            : segments.map((s, i) => {
                if (s.type === "equal") return <span key={i}>{s.text}</span>;
                const removed = !s.text;
                const label = t(s.kind === "spelling" ? "ux.polish.spelling" : "ux.polish.style");
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        aria-label={removed ? `${label}: ${t("ux.polish.removed")} “${s.original}”` : `${label}: ${s.original || "∅"} → ${s.text}`}
                        className={cn(
                          "rounded px-0.5 ring-1 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
                          BOX[s.kind],
                          activeIds.includes(s.id) && ACTIVE[s.kind],
                          removed && "inline-block min-w-[0.75rem] text-center text-muted-foreground",
                        )}
                      >
                        {removed ? "·" : s.text}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {removed ? (
                        <span><span className="line-through">{s.original}</span> <span className="text-muted-foreground">({t("ux.polish.removed")})</span></span>
                      ) : s.original ? (
                        <span><span className="line-through opacity-70">{s.original}</span> → {s.text}</span>
                      ) : (
                        <span>+ {s.text} <span className="text-muted-foreground">({t("ux.polish.added")})</span></span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
        </div>
      </div>

      <div className="surface-card p-5 bg-muted/40">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          {t("assistant.polish.keyChanges")} ({changes.length})
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {items.map((c, i) => (
            <li
              key={i}
              className="text-sm text-foreground/90 flex gap-2 rounded px-1 -mx-1 hover:bg-background/60"
              onMouseEnter={() => setActiveIds(c.ids)}
              onMouseLeave={() => setActiveIds([])}
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[c.kind])} aria-hidden />
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

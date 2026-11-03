import { Link } from "react-router-dom";
import { FlaskConical, Info, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isDemo } from "@/lib/demo/demoMode";
import { useAiAccess } from "@/lib/aiAccess";

/** Small "Example output (demo)" tag. Renders nothing outside the demo. */
export function DemoExampleLabel({ className }: { className?: string }) {
  const { t } = useTranslation();
  if (!isDemo()) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent",
        className,
      )}
    >
      <FlaskConical className="h-3 w-3" /> {t("ux.demo.exampleLabel")}
    </span>
  );
}

/** "Fill with sample data" button, shown only in the demo. */
export function DemoSampleButton({ onFill, disabled }: { onFill: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  if (!isDemo()) return null;
  return (
    <Button type="button" variant="outline" size="sm" onClick={onFill} disabled={disabled} className="self-start">
      <Wand2 className="h-3.5 w-3.5" /> {t("ux.demo.fillSample")}
    </Button>
  );
}

/** Explains why an AI action needs permission while AI features are off (never shown in the demo). */
export function AiOffNote({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { aiEnabled } = useAiAccess();
  if (isDemo() || aiEnabled !== false) return null;
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        {t("ux.ai.offNote")}{" "}
        <Link to="/settings#privacy" className="font-medium text-accent underline underline-offset-2">
          {t("ux.ai.offNoteLink")}
        </Link>{" "}
        {t("ux.ai.offNoteAfter")}
      </span>
    </p>
  );
}

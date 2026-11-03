import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Download, LayoutGrid, MousePointerClick, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const WELCOME_SEEN_KEY = "jat.welcome.seen";

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return true; // no storage: never auto-open, so it can't nag on every visit
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // ignore
  }
}

const TOTAL = 3;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "auth": visitor is signed out on /auth. "app": inside the app (demo or signed in). */
  mode: "auth" | "app";
  onTryDemo?: () => void;
}

export function WelcomeTour({ open, onOpenChange, mode, onTryDemo }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  // Marked seen only once the visitor closes, skips or finishes it (a reload before that shows it again).
  const change = (next: boolean) => {
    if (!next) {
      setStep(0);
      markWelcomeSeen();
    }
    onOpenChange(next);
  };

  const cards = [
    { icon: LayoutGrid, title: t("ux.welcome.card1Title"), body: t("ux.welcome.card1Body") },
    { icon: Sparkles, title: t("ux.welcome.card2Title"), body: t("ux.welcome.card2Body") },
    { icon: Download, title: t("ux.welcome.card3Title"), body: t("ux.welcome.card3Body") },
  ];
  const starts = [
    { icon: MousePointerClick, text: t("ux.welcome.start1") },
    { icon: LayoutGrid, text: t("ux.welcome.start2") },
    { icon: BarChart3, text: t("ux.welcome.start3") },
  ];
  const titles = [t("ux.welcome.step1Title"), t("ux.welcome.step2Title"), t("ux.welcome.step3Title")];
  const last = step === TOTAL - 1;

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[520px] rounded-xl" aria-label={t("ux.welcome.dialogLabel")}>
        <DialogHeader className="text-left">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("ux.welcome.stepOf", { n: step + 1, total: TOTAL })}
          </p>
          <DialogTitle className="text-xl">{titles[step]}</DialogTitle>
          {step === 0 && (
            <DialogDescription className="text-sm leading-relaxed">{t("ux.welcome.step1Body")}</DialogDescription>
          )}
          {step !== 0 && <DialogDescription className="sr-only">{titles[step]}</DialogDescription>}
        </DialogHeader>

        <div className="min-h-[200px]">
          {step === 0 && (
            <div className="flex h-full items-center justify-center py-6">
              <img src="/onboard_logo.png" alt="" className="h-24 w-24 object-contain" />
            </div>
          )}
          {step === 1 && (
            <ul className="grid gap-3">
              {cards.map((c) => (
                <li key={c.title} className="flex gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                    <c.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {step === 2 && (
            <ol className="grid gap-2.5">
              {starts.map((s, i) => (
                <li key={s.text} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="text-sm text-foreground">{s.text}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-5 bg-accent" : "w-1.5 bg-border")} />
          ))}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <Button variant="link" className="px-0 text-muted-foreground" onClick={() => change(false)}>
            {t("ux.welcome.skip")}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>{t("ux.welcome.back")}</Button>
            )}
            {!last && <Button onClick={() => setStep((s) => s + 1)}>{t("ux.welcome.next")}</Button>}
            {last && mode === "auth" && (
              <>
                <Button variant="outline" onClick={() => change(false)}>{t("ux.welcome.haveAccount")}</Button>
                <Button onClick={() => { change(false); onTryDemo?.(); }}>{t("ux.welcome.tryDemo")}</Button>
              </>
            )}
            {last && mode === "app" && (
              <Button onClick={() => change(false)}>{t("ux.welcome.startExploring")}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

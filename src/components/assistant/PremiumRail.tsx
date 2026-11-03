import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Lock, Crown, ChevronRight, ChevronLeft, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { isDemo } from "@/lib/demo/demoMode";

export interface PremiumTool {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

// Shared by every assistant page. Collapsed unless the user expanded it before ("0").
export const RAIL_STORAGE_KEY = "jat.premiumRail.collapsed";

export function readRailCollapsed(): boolean {
  try {
    return localStorage.getItem(RAIL_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeRailCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(RAIL_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore
  }
}

/** Click handler for upgrade links: in the demo, show a toast instead of navigating. */
export function guardDemoUpgrade(e: MouseEvent) {
  if (!isDemo()) return;
  e.preventDefault();
  toast.info(i18n.t("ux.demo.notAvailable"));
}

function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 text-amber-900 px-2 py-0.5 text-[10px] font-bold shrink-0">
      <Crown className="h-3 w-3" /> Pro
    </span>
  );
}

export function PremiumRail({
  tools,
  collapsed = true,
  onToggle,
}: {
  tools: PremiumTool[];
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const { t } = useTranslation();

  if (collapsed) {
    return (
      <aside className="hidden lg:flex flex-col h-full w-12">
        <button
          type="button"
          onClick={onToggle}
          className="h-full w-full surface-card flex flex-col items-center gap-3 py-3 text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
          aria-label={`${t("assistant.premiumTools")} — ${t("discovery.expand")}`}
          aria-expanded={false}
          title={t("discovery.expand")}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-amber-900" aria-hidden="true">
            <Crown className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Pro</span>
          <span
            className="text-[10px] font-semibold tracking-[0.18em] uppercase select-none"
            style={{ writingMode: "vertical-rl" }}
          >
            {t("assistant.premiumTools")}
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col surface-card overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-border bg-gradient-premium text-white flex items-center justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-left hover:opacity-90 transition min-w-0"
          aria-label={t("discovery.collapse")}
          aria-expanded={true}
          title={t("discovery.collapse")}
        >
          <ChevronRight className="h-4 w-4" />
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">{t("assistant.premiumTools")}</div>
            <div className="text-[11px] opacity-90 leading-tight">{t("assistant.proFeatures")}</div>
          </div>
        </button>
        <ProBadge />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tools.map((tool) => (
          <div key={tool.id} className="rounded-lg border border-border bg-card p-3 relative">
            <Lock className="h-3.5 w-3.5 text-muted-foreground absolute top-2.5 right-2.5" />
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <tool.icon className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 pr-5">
                <div className="text-sm font-semibold text-foreground leading-tight">{tool.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{tool.desc}</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-[10px] font-bold border border-amber-300">
                <Crown className="h-2.5 w-2.5" /> Pro
              </span>
              <Switch checked={false} disabled aria-label={tool.title} />
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border bg-card">
        <Link to="/billing" onClick={guardDemoUpgrade}>
          <Button className="w-full bg-gradient-premium text-white border-0 hover:opacity-95">
            {t("assistant.upgradeBtn")}
          </Button>
        </Link>
      </div>
    </aside>
  );
}

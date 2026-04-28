import { Link } from "react-router-dom";
import { Lock, Crown, ChevronRight, ChevronLeft, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PremiumTool {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

export function PremiumRail({
  tools,
  collapsed = false,
  onToggle,
}: {
  tools: PremiumTool[];
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  if (collapsed) {
    return (
      <aside className="hidden lg:flex flex-col surface-card overflow-hidden h-full w-11">
        <button
          type="button"
          onClick={onToggle}
          className="h-full w-full bg-gradient-premium text-white flex flex-col items-center gap-3 py-3 hover:opacity-95 transition"
          aria-label="Expand premium tools"
          title="Expand premium tools"
        >
          <ChevronLeft className="h-4 w-4" />
          <Crown className="h-4 w-4" />
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            PREMIUM TOOLS
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
          aria-label="Collapse premium tools"
          title="Collapse"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-180")} />
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">Premium Tools</div>
            <div className="text-[11px] opacity-90 leading-tight">Pro features</div>
          </div>
        </button>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 text-amber-900 px-2 py-0.5 text-[10px] font-bold shrink-0">
          <Crown className="h-3 w-3" /> Pro
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tools.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-card p-3 relative">
            <Lock className="h-3.5 w-3.5 text-muted-foreground absolute top-2.5 right-2.5" />
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <t.icon className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 pr-5">
                <div className="text-sm font-semibold text-foreground leading-tight">{t.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.desc}</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-[10px] font-bold border border-amber-300">
                <Crown className="h-2.5 w-2.5" /> Pro
              </span>
              <Switch checked={false} disabled />
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border bg-card">
        <Link to="/billing">
          <Button className="w-full bg-gradient-premium text-white border-0 hover:opacity-95">
            Upgrade to Pro for Access
          </Button>
        </Link>
      </div>
    </aside>
  );
}

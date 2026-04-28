import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PremiumRail, type PremiumTool } from "@/components/assistant/PremiumRail";

export function AssistantToolShell({
  title,
  subtitle,
  headerRight,
  premiumTools,
  children,
}: {
  title: string;
  subtitle: string;
  headerRight?: ReactNode;
  premiumTools: PremiumTool[];
  children: ReactNode;
}) {
  return (
    <div className="px-4 md:px-6 py-4 md:py-6 mx-auto max-w-7xl">
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 lg:gap-6 min-h-[calc(100vh-6rem)]">
        {/* MAIN COLUMN */}
        <div className="flex flex-col surface-card overflow-hidden">
          {/* Header (matches ChatAssistant) */}
          <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-md bg-gradient-premium flex items-center justify-center shadow-sm shrink-0">
                <Logo size={22} className="rounded" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-semibold leading-tight truncate">{title}</h1>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">{subtitle}</p>
              </div>
            </div>
            {headerRight && <div className="flex items-center gap-2 shrink-0">{headerRight}</div>}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-muted/30">
            {children}
          </div>
        </div>

        {/* RIGHT RAIL */}
        <PremiumRail tools={premiumTools} />

        {/* Mobile fallback CTA */}
        <div className="lg:hidden">
          <Link to="/billing">
            <Button className="w-full bg-gradient-premium text-white border-0 hover:opacity-95">
              Upgrade to Pro for Access
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

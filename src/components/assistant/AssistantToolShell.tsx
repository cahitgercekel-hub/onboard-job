import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { PremiumRail, type PremiumTool } from "@/components/assistant/PremiumRail";

const STORAGE_KEY = "jat.premiumRail.collapsed";

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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 w-full">
      <div
        className="grid gap-4 lg:gap-6 min-h-[calc(100vh-6.5rem)] transition-[grid-template-columns] duration-300"
        style={{
          gridTemplateColumns: collapsed
            ? "1fr 44px"
            : "1fr 300px",
        }}
      >
        {/* MAIN COLUMN */}
        <div className="flex flex-col surface-card overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-4 border-b border-border">
            <div className="flex items-center gap-4 min-w-0">
              <Logo size={64} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-semibold leading-tight truncate">{title}</h1>
                <p className="text-xs text-muted-foreground leading-tight truncate mt-1">{subtitle}</p>
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
        <PremiumRail
          tools={premiumTools}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />

        {/* Mobile fallback CTA */}
        <div className="lg:hidden col-span-full">
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

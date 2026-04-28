import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutGrid, BarChart3, Settings as SettingsIcon, Menu, Ruler,
  MessageSquare, Sparkles, Languages, Wand2, Target, FileText, CreditCard,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "@/components/Logo";
import { PlanBadge } from "@/components/PlanBadge";
import { usePlan } from "@/lib/usePlan";

export default function AppLayout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const { plan } = usePlan();

  // Dev-only "Sidebar alignment check" — draws Y-position guide lines for every nav icon.
  const [alignCheck, setAlignCheck] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const [iconYs, setIconYs] = useState<number[]>([]);

  // Toggle with keyboard shortcut: Shift + G
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "G" || e.key === "g") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        setAlignCheck((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Measure each nav icon's Y center relative to the sidebar.
  useLayoutEffect(() => {
    if (!alignCheck) return;
    const measure = () => {
      const aside = asideRef.current;
      if (!aside) return;
      const baseTop = aside.getBoundingClientRect().top;
      const icons = aside.querySelectorAll<SVGSVGElement>("[data-nav-icon]");
      const ys: number[] = [];
      icons.forEach((el) => {
        const r = el.getBoundingClientRect();
        ys.push(Math.round(r.top - baseTop + r.height / 2));
      });
      setIconYs(ys);
    };
    measure();
    const t1 = window.setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t1);
      window.removeEventListener("resize", measure);
    };
  }, [alignCheck, collapsed]);

  const trackerNav = [
    { to: "/", label: t("nav.board"), icon: LayoutGrid, end: true },
    { to: "/analytics", label: t("nav.analytics"), icon: BarChart3, end: true },
  ];
  const assistantNav = [
    { to: "/assistant/chat", label: "Career Chat", icon: MessageSquare, end: true },
    { to: "/assistant/tone", label: "Corporate Tone", icon: Sparkles, end: true },
    { to: "/assistant/translator", label: "Skill Translator", icon: Languages, end: true },
    { to: "/assistant/polish", label: "Grammar & Polish", icon: Wand2, end: true },
    { to: "/assistant/interview", label: "Interview Prep", icon: Target, end: true },
    { to: "/assistant/cv", label: "CV Analyzer", icon: FileText, end: true },
  ];
  const footerNav = [
    { to: "/billing", label: "Plans & Billing", icon: CreditCard, end: true },
    { to: "/settings", label: t("nav.settings"), icon: SettingsIcon, end: false },
  ];
  const allNav = [...trackerNav, assistantNav[0], ...footerNav];

  // Single row style used in BOTH expanded & collapsed so Y-positions stay identical.
  const navItem =
    "flex items-center gap-2.5 rounded-md h-10 px-3 text-sm transition-colors";
  const navInactive =
    "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";
  const navActive =
    "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-md transition-colors";

  // Section header — same height in both modes (text hidden when collapsed).
  const sectionHeader =
    "h-7 flex items-end px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground overflow-hidden";

  const toggleBtn = (
    <button
      type="button"
      onClick={() => setCollapsed((c) => !c)}
      aria-label="Toggle sidebar"
      className={cn(iconBtn, "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}
    >
      <Menu className="h-4 w-4" />
    </button>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full min-h-screen w-full bg-background">
        <aside
          ref={asideRef}
          className={cn(
            "hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out relative",
            collapsed ? "w-16" : "w-60"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 border-b border-sidebar-border h-[69px]",
              collapsed ? "justify-center px-2" : "px-4"
            )}
          >
            {collapsed ? (
              toggleBtn
            ) : (
              <>
                <Logo size={32} />
                <div className="leading-tight min-w-0 flex-1">
                  <div className="text-sm font-semibold text-sidebar-foreground truncate flex items-center gap-1.5">
                    {t("app.name")} <PlanBadge plan={plan} />
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{t("app.tagline")}</div>
                </div>
                {toggleBtn}
              </>
            )}
          </div>

          {/* Unified nav — same DOM in both modes; labels/headers fade away when collapsed */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
            <div className={sectionHeader}>
              <span className={cn("transition-opacity duration-150", collapsed && "opacity-0")}>
                {t("nav.tracker")}
              </span>
            </div>
            {trackerNav.map((n) => {
              const link = (
                <NavLink
                  to={n.to}
                  end={n.end as boolean}
                  className={({ isActive }) =>
                    cn(navItem, collapsed && "justify-center px-0 w-10 mx-auto", isActive ? navActive : navInactive)
                  }
                  aria-label={n.label}
                >
                  <n.icon className="h-4 w-4 shrink-0" data-nav-icon />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={n.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{n.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={n.to}>{link}</div>
              );
            })}

            <div className={sectionHeader}>
              <span className={cn("transition-opacity duration-150", collapsed && "opacity-0")}>
                {t("nav.assistant")}
              </span>
            </div>
            {assistantNav.map((n) => {
              const link = (
                <NavLink
                  to={n.to}
                  end={n.end as boolean}
                  className={({ isActive }) =>
                    cn(navItem, collapsed && "justify-center px-0 w-10 mx-auto", isActive ? navActive : navInactive)
                  }
                  aria-label={n.label}
                >
                  <n.icon className="h-4 w-4 shrink-0" data-nav-icon />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={n.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{n.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={n.to}>{link}</div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-sidebar-border space-y-1">
            {footerNav.map((n) => {
              const link = (
                <NavLink
                  to={n.to}
                  end={n.end as boolean}
                  className={({ isActive }) =>
                    cn(navItem, collapsed && "justify-center px-0 w-10 mx-auto", isActive ? navActive : navInactive)
                  }
                  aria-label={n.label}
                >
                  <n.icon className="h-4 w-4 shrink-0" data-nav-icon />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={n.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{n.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={n.to}>{link}</div>
              );
            })}
            {!collapsed && (
              <div className="px-3 pt-2 text-[11px] text-muted-foreground">
                Synced to your account.
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
          {/* Mobile top header */}
          <header className="md:hidden flex items-center border-b border-border px-4 h-12 bg-card">
            <div className="flex items-center gap-2">
              <Logo size={28} />
              <div className="text-sm font-semibold flex items-center gap-1.5">
                {t("app.name")} <PlanBadge plan={plan} />
              </div>
            </div>
          </header>

          <main className="flex-1 min-w-0 overflow-auto pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
            <Outlet />
          </main>

          {/* Mobile bottom nav — 4 slots: Dashboard / Analytics / Chat / Settings */}
          <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="grid grid-cols-4 h-16">
              {allNav.slice(0, 4).map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end as boolean}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium min-h-[44px]",
                      isActive ? "text-accent" : "text-muted-foreground active:text-foreground"
                    )
                  }
                >
                  <n.icon className="h-5 w-5" />
                  <span className="truncate max-w-full px-1">{n.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </TooltipProvider>
  );
}

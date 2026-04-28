import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutGrid, BarChart3, Settings as SettingsIcon, Menu,
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

  // Row height is locked at h-10 in both modes so Y-positions never shift.
  // Collapsed: row becomes a centered 40x40 pill (matches hamburger toggle).
  // Expanded: row spans full width with icon absolutely positioned at left:12px.
  const navItemBase =
    "relative flex items-center rounded-md h-10 text-sm transition-colors";
  const navItemExpanded = "pl-10 pr-3";
  const navItemCollapsed = "w-10 mx-auto justify-center px-0";
  const navInactive =
    "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";
  const navActive =
    "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-md transition-colors";

  // Section header — same height (h-7) in both modes so the vertical rhythm
  // (and downstream icon Y positions) stays identical.
  const sectionHeader =
    "h-7 flex items-end px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground overflow-hidden";

  const renderNavLink = (n: { to: string; label: string; icon: any; end?: boolean }) => (
    <NavLink
      to={n.to}
      end={n.end as boolean}
      className={({ isActive }) =>
        cn(
          navItemBase,
          collapsed ? navItemCollapsed : navItemExpanded,
          isActive ? navActive : navInactive
        )
      }
      aria-label={n.label}
    >
      {collapsed ? (
        <n.icon className="h-4 w-4 shrink-0" data-nav-icon />
      ) : (
        <>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center">
            <n.icon className="h-4 w-4 shrink-0" data-nav-icon />
          </span>
          <span className="truncate">{n.label}</span>
        </>
      )}
    </NavLink>
  );

  const renderNavRow = (n: { to: string; label: string; icon: any; end?: boolean }) => {
    const link = renderNavLink(n);
    return collapsed ? (
      <Tooltip key={n.to}>
        <TooltipTrigger asChild>
          <div>{link}</div>
        </TooltipTrigger>
        <TooltipContent side="right">{n.label}</TooltipContent>
      </Tooltip>
    ) : (
      <div key={n.to}>{link}</div>
    );
  };

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
          {/* Header — identical 69px height in both modes; only contents fade */}
          <div className="flex items-center gap-2 border-b border-sidebar-border h-[69px] px-2">
            <div className="flex h-10 w-10 items-center justify-center shrink-0">
              {collapsed ? (
                toggleBtn
              ) : (
                <Logo size={32} />
              )}
            </div>
            <div
              className={cn(
                "leading-tight min-w-0 flex-1 transition-opacity duration-150",
                collapsed && "opacity-0 pointer-events-none"
              )}
            >
              <div className="text-sm font-semibold text-sidebar-foreground truncate flex items-center gap-1.5">
                {t("app.name")} <PlanBadge plan={plan} />
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{t("app.tagline")}</div>
            </div>
            {!collapsed && toggleBtn}
          </div>

          {/* Unified nav — same DOM in both modes; labels/headers fade away when collapsed */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
            <div className={cn(sectionHeader, collapsed && "items-center justify-center pb-0")}>
              {collapsed ? (
                <div className="h-px w-6 bg-sidebar-border" aria-hidden="true" />
              ) : (
                <span>{t("nav.tracker")}</span>
              )}
            </div>
            {trackerNav.map((n) => renderNavRow(n))}

            <div className={cn(sectionHeader, collapsed && "items-center justify-center pb-0")}>
              {collapsed ? (
                <div className="h-px w-6 bg-sidebar-border" aria-hidden="true" />
              ) : (
                <span>{t("nav.assistant")}</span>
              )}
            </div>
            {assistantNav.map((n) => renderNavRow(n))}
          </nav>

          <div className="p-3 border-t border-sidebar-border space-y-1">
            {footerNav.map((n) => renderNavRow(n))}
            <div
              aria-hidden={collapsed}
              className={cn(
                "px-3 pt-2 h-6 text-[11px] leading-4 whitespace-nowrap overflow-hidden text-muted-foreground transition-opacity duration-150",
                collapsed && "invisible"
              )}
            >
              Synced to your account.
            </div>
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

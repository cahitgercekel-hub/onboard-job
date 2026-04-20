import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutGrid, Sparkles, BriefcaseBusiness, BarChart3, Settings as SettingsIcon, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AppLayout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const trackerNav = [
    { to: "/", label: t("nav.board"), icon: LayoutGrid, end: true },
    { to: "/analytics", label: t("nav.analytics"), icon: BarChart3, end: true },
  ];
  const assistantNav = [{ to: "/assistant", label: t("nav.aiAssistant"), icon: Sparkles, end: false }];
  const settingsNav = { to: "/settings", label: t("nav.settings"), icon: SettingsIcon, end: false };
  const allNav = [...trackerNav, ...assistantNav, settingsNav];

  const navItem =
    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors min-h-[44px]";
  const navInactive =
    "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";
  const navActive =
    "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

  const iconBtn =
    "flex h-11 w-11 items-center justify-center rounded-md transition-colors";

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
          className={cn(
            "hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out",
            collapsed ? "w-16" : "w-60"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 border-b border-sidebar-border h-[69px]",
              collapsed ? "justify-center px-2" : "px-5"
            )}
          >
            {collapsed ? (
              toggleBtn
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground shrink-0 bg-cyan-500">
                  <BriefcaseBusiness className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="leading-tight min-w-0 flex-1">
                  <div className="text-sm font-semibold text-sidebar-foreground truncate">{t("app.name")}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{t("app.tagline")}</div>
                </div>
                {toggleBtn}
              </>
            )}
          </div>

          {collapsed ? (
            <>
              <nav className="flex-1 p-2 space-y-1 flex flex-col items-center">
                {[...trackerNav, ...assistantNav].map((n) => (
                  <Tooltip key={n.to}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={n.to}
                        end={n.end as boolean}
                        className={({ isActive }) =>
                          cn(iconBtn, isActive ? navActive : navInactive, "text-sidebar-foreground bg-sidebar-accent px-[16px] rounded-md py-[8px] my-[8px]")
                        }
                        aria-label={n.label}
                      >
                        <n.icon className="my-[10px] w-[16px] h-[16px] text-inherit bg-inherit" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">{n.label}</TooltipContent>
                  </Tooltip>
                ))}
              </nav>
              <div className="p-2 border-t border-sidebar-border flex items-center justify-center py-[24px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={settingsNav.to}
                      className={({ isActive }) =>
                        cn(iconBtn, isActive ? navActive : navInactive, "text-sidebar-foreground bg-sidebar-accent px-[16px] rounded-md py-[8px] my-[8px]")
                      }
                      aria-label={settingsNav.label}
                    >
                      <settingsNav.icon className="my-[10px] w-[16px] h-[16px] text-inherit bg-inherit" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">{settingsNav.label}</TooltipContent>
                </Tooltip>
              </div>
            </>
          ) : (
            <>
              <nav className="flex-1 p-3 space-y-1">
                <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nav.tracker")}
                </div>
                {trackerNav.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) => cn(navItem, isActive ? navActive : navInactive)}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </NavLink>
                ))}
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("nav.assistant")}
                </div>
                <NavLink
                  to="/assistant"
                  className={({ isActive }) => cn(navItem, isActive ? navActive : navInactive)}
                >
                  <Sparkles className="h-4 w-4" />
                  {t("nav.aiAssistant")}
                </NavLink>
              </nav>
              <div className="p-3 border-t border-sidebar-border">
                <NavLink
                  to="/settings"
                  className={({ isActive }) => cn(navItem, isActive ? navActive : navInactive)}
                >
                  <SettingsIcon className="h-4 w-4" />
                  {t("nav.settings")}
                </NavLink>
                <div className="px-3 pt-3 text-[11px] text-muted-foreground">
                  Synced to your account.
                </div>
              </div>
            </>
          )}
        </aside>

        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
          {/* Mobile top header — logo only */}
          <header className="md:hidden flex items-center border-b border-border px-4 h-12 bg-card">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500 text-primary-foreground">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="text-sm font-semibold">{t("app.name")}</div>
            </div>
          </header>

          <main className="flex-1 min-w-0 overflow-auto pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
            <Outlet />
          </main>

          {/* Mobile bottom nav */}
          <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="grid grid-cols-4 h-16">
              {allNav.map((n) => (
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

import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutGrid, Sparkles, Briefcase, BarChart3, Settings as SettingsIcon, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const trackerNav = [
    { to: "/", label: t("nav.board"), icon: LayoutGrid, end: true },
    { to: "/analytics", label: t("nav.analytics"), icon: BarChart3, end: true },
  ];

  const navItem =
    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors";
  const navInactive =
    "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";
  const navActive =
    "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

  const toggleBtn = (
    <button
      type="button"
      onClick={() => setCollapsed((c) => !c)}
      aria-label="Toggle sidebar"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
    >
      <Menu className="h-4 w-4" />
    </button>
  );

  return (
    <div className="flex h-full min-h-screen w-full bg-background">
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out",
          collapsed ? "w-14" : "w-60"
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
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="leading-tight min-w-0 flex-1">
                <div className="text-sm font-semibold text-sidebar-foreground truncate">{t("app.name")}</div>
                <div className="text-[11px] text-muted-foreground truncate">{t("app.tagline")}</div>
              </div>
              {toggleBtn}
            </>
          )}
        </div>

        {!collapsed && (
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
                Local-first · Your data stays in this browser.
              </div>
            </div>
          </>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-card">
          <div className="font-semibold">{t("app.name")}</div>
          <nav className="flex gap-1">
            {[
              { to: "/", label: t("nav.board"), end: true },
              { to: "/analytics", label: t("nav.analytics"), end: true },
              { to: "/assistant", label: t("nav.assistant"), end: true },
              { to: "/settings", label: t("nav.settings"), end: true },
            ].map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end as boolean}
                className={({ isActive }) =>
                  cn("px-3 py-1.5 rounded-md text-xs", isActive ? "bg-secondary text-foreground" : "text-muted-foreground")
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

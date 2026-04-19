import { NavLink, Outlet } from "react-router-dom";
import { LayoutGrid, Sparkles, Briefcase, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const trackerNav = [
  { to: "/", label: "Board", icon: LayoutGrid, end: true },
  { to: "/analytics", label: "Analytics", icon: BarChart3, end: true },
];

export default function AppLayout() {
  const navItem =
    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors";
  const navInactive =
    "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";
  const navActive =
    "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

  return (
    <div className="flex h-full min-h-screen w-full bg-background">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-foreground">CareerDesk</div>
            <div className="text-[11px] text-muted-foreground">Track + Assist</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tracker
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
            Assistant
          </div>
          <NavLink
            to="/assistant"
            className={({ isActive }) => cn(navItem, isActive ? navActive : navInactive)}
          >
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </NavLink>
        </nav>
        <div className="p-4 text-[11px] text-muted-foreground border-t border-sidebar-border">
          Local-first · Your data stays in this browser.
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-card">
          <div className="font-semibold">CareerDesk</div>
          <nav className="flex gap-1">
            {[...trackerNav, { to: "/assistant", label: "Assistant", end: true }].map((n) => (
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

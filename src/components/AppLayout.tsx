import { NavLink, Outlet } from "react-router-dom";
import { LayoutGrid, Sparkles, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Tracker", icon: LayoutGrid, end: true },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
];

export default function AppLayout() {
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
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-[11px] text-muted-foreground border-t border-sidebar-border">
          Local-first · Your data stays in this browser.
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-card">
          <div className="font-semibold">CareerDesk</div>
          <nav className="flex gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md text-xs",
                    isActive ? "bg-secondary text-foreground" : "text-muted-foreground"
                  )
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

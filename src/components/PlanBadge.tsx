import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/usePlan";

export function PlanBadge({ plan, className }: { plan: Plan; className?: string }) {
  if (plan === "free") {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground border border-border", className)}>
        Free
      </span>
    );
  }
  if (plan === "pro") {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 bg-amber-200 border border-amber-300", className)}>
        <Crown className="h-2.5 w-2.5" /> Pro
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 border border-violet-400/40", className)}>
      <Sparkles className="h-2.5 w-2.5" /> Business
    </span>
  );
}

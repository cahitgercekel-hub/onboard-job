import { forwardRef } from "react";
import { Sparkles, BriefcaseBusiness } from "lucide-react";

export interface Milestone {
  headline: string;
  subline: string;
  emoji?: string;
}

interface Props {
  milestone: Milestone;
  stats: { total: number; interviewing: number; offers: number };
}

export const MilestoneCard = forwardRef<HTMLDivElement, Props>(({ milestone, stats }, ref) => {
  return (
    <div
      ref={ref}
      className="relative w-[600px] h-[600px] overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 60%, hsl(var(--primary)) 100%)",
      }}
    >
      {/* decorative blobs */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative h-full p-12 flex flex-col text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold leading-none">JobFlow</div>
            <div className="text-[11px] opacity-80 mt-0.5">Track Job & CV Assist</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-1.5 self-start text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 backdrop-blur mb-5">
            <Sparkles className="h-3 w-3" /> Milestone
          </div>
          <div className="text-5xl font-bold leading-tight tracking-tight">
            {milestone.emoji && <span className="mr-2">{milestone.emoji}</span>}
            {milestone.headline}
          </div>
          <p className="mt-4 text-lg opacity-90 leading-snug max-w-[440px]">
            {milestone.subline}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Tracked" value={stats.total} />
          <Stat label="Interviewing" value={stats.interviewing} />
          <Stat label="Offers" value={stats.offers} />
        </div>
      </div>
    </div>
  );
});
MilestoneCard.displayName = "MilestoneCard";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur px-4 py-3">
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

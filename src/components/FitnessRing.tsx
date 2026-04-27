import { cn } from "@/lib/utils";

interface Props {
  score: number | null | undefined;
  size?: number;
  stroke?: number;
  className?: string;
  /** Visual variant. "lg" = bigger ring with bigger centered % text. */
  variant?: "sm" | "lg";
}

function colorFor(score: number) {
  if (score >= 75) return "hsl(var(--success))";
  if (score >= 50) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

export function FitnessRing({ score, size, stroke, className, variant = "sm" }: Props) {
  if (score === null || score === undefined) return null;
  const resolvedSize = size ?? (variant === "lg" ? 48 : 36);
  const resolvedStroke = stroke ?? (variant === "lg" ? 5 : 4);
  const r = (resolvedSize - resolvedStroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const color = colorFor(pct);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: resolvedSize, height: resolvedSize }}
    >
      <svg width={resolvedSize} height={resolvedSize} className="-rotate-90">
        <circle cx={resolvedSize / 2} cy={resolvedSize / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={resolvedStroke} />
        <circle
          cx={resolvedSize / 2} cy={resolvedSize / 2} r={r} fill="none"
          stroke={color} strokeWidth={resolvedStroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <span
        className={cn(
          "absolute font-semibold tabular-nums",
          variant === "lg" ? "text-[11px]" : "text-[10px]"
        )}
        style={{ color }}
      >
        {variant === "lg" ? `${pct}%` : pct}
      </span>
    </div>
  );
}

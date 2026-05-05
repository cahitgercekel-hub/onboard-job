import { Crown, Sparkles, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePlan, type Plan } from "@/lib/usePlan";
import { PlanBadge } from "@/components/PlanBadge";
import { cn } from "@/lib/utils";

type Tier = {
  id: Plan;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Job Seeker",
    price: "$0",
    period: "forever",
    tagline: "Start tracking and get the AI advantage.",
    features: [
      "Up to 30 active job slots",
      "3 AI CV scans / day",
      "10 AI Job Auto-Adds / month",
      "Basic AI career advice",
      "Standard Kanban dashboard",
    ],
  },
  {
    id: "pro",
    name: "Career Strategist",
    price: "$9.99",
    period: "/month",
    tagline: "Full-scale AI tools for serious candidates.",
    highlight: true,
    features: [
      "Unlimited active job slots",
      "Unlimited AI CV scans",
      "Detailed ATS Parsing Simulation",
      "Full Career Strategist Tools",
      "Corporate Tone & Skill Translator",
      "Interview STAR Prep (Unlimited)",
      "CSV Import + Export",
      "Priority support",
    ],
  },
];

export default function Billing() {
  const { plan } = usePlan();

  const cta = (tier: Tier) => {
    if (tier.id === plan) return "Current plan";
    if (tier.id === "free") return "Downgrade";
    return "Upgrade Now";
  };

  const onClick = (tier: Tier) => {
    if (tier.id === plan) return;
    toast.info("Billing coming soon — Stripe checkout will go here.");
  };

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-5xl mx-auto">
      <div className="mb-6 md:mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Plans & Billing</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You're on the <PlanBadge plan={plan} className="align-middle mx-1" /> plan. Upgrade to accelerate your career.
        </p>
      </div>

      <div className={cn("grid gap-6 items-stretch", TIERS.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3")}>
        {TIERS.map((tier) => {
          const isCurrent = tier.id === plan;
          const isPro = tier.id === "pro";
          // Headline features get bolded
          const headlineSet = new Set(["Detailed ATS Parsing Simulation", "Unlimited active job slots", "Full Career Strategist Tools"]);
          return (
            <div
              key={tier.id}
              className={cn(
                "surface-card p-6 flex flex-col relative transition-all duration-200 border border-border",
                tier.highlight && "ring-2 ring-accent shadow-lg border-accent/20",
                isPro && "bg-gradient-to-b from-accent-soft/20 to-transparent",
                isCurrent && "bg-muted/10"
              )}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground shadow-sm">
                  MOST POPULAR
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold">{tier.name}</h2>
                {isPro && <Sparkles className="h-4 w-4 text-accent" />}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{tier.tagline}</p>
              <div className="mb-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((f) => {
                  const bold = headlineSet.has(f);
                  return (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className={cn("h-4 w-4 shrink-0 mt-0.5", isPro ? "text-accent" : "text-success")} />
                      <span className={cn("text-foreground/90", bold && "font-semibold text-foreground")}>{f}</span>
                    </li>
                  );
                })}
              </ul>
              <Button
                onClick={() => onClick(tier)}
                disabled={isCurrent}
                variant={tier.highlight ? "ai" : "outline"}
                className={cn("w-full", isPro && !isCurrent && "shadow-md")}
              >
                {cta(tier)}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <p className="text-xs text-muted-foreground">
          Prices in USD. All plans include automated dashboard updates and real-time syncing.
        </p>
      </div>
    </div>
  );
}

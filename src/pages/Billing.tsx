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
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Track your search and try the AI tools.",
    features: [
      "Up to 25 saved jobs",
      "10 AI calls / day",
      "Career Chat preview (3 msgs/day)",
      "Baseline CV + 1 version",
      "CSV export",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "/month",
    tagline: "For active job seekers who live in the tracker.",
    highlight: true,
    features: [
      "Unlimited saved jobs",
      "200 AI calls / day",
      "Unlimited Career Chat",
      "Higher-quality AI model",
      "Unlimited CV versions",
      "Advanced analytics & skill gap",
      "CSV import + export",
      "Email support",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$29",
    period: "/month",
    tagline: "For coaches, bootcamps, and small teams.",
    features: [
      "Everything in Pro",
      "1000 AI calls / day",
      "Top-tier reasoning AI model",
      "Up to 5 team members",
      "Auto-Apply Bot",
      "API access",
      "Priority support + SLA",
    ],
  },
];

export default function Billing() {
  const { plan } = usePlan();

  const cta = (tier: Tier) => {
    if (tier.id === plan) return "Current plan";
    if (tier.id === "free") return "Downgrade";
    return "Upgrade";
  };

  const onClick = (tier: Tier) => {
    if (tier.id === plan) return;
    toast.info("Billing coming soon — Stripe checkout will go here.");
  };

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto">
      <div className="mb-6 md:mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Plans & Billing</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You're on the <PlanBadge plan={plan} className="align-middle mx-1" /> plan. Upgrade anytime — cancel anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 items-stretch">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === plan;
          const isBusiness = tier.id === "business";
          // Headline features get bolded for Business
          const headlineSet = new Set(["Auto-Apply Bot", "Up to 5 team members", "Priority support + SLA"]);
          return (
            <div
              key={tier.id}
              className={cn(
                "surface-card p-6 flex flex-col relative transition-all duration-200",
                tier.highlight && "ring-2 ring-accent shadow-lg",
                isBusiness &&
                  "ring-2 ring-premium/60 shadow-[0_10px_40px_-10px_hsl(var(--premium)/0.45)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-10px_hsl(var(--premium)/0.55)] bg-gradient-to-b from-premium-soft/40 to-transparent",
                isCurrent && !isBusiness && "border-accent"
              )}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground">
                  MOST POPULAR
                </div>
              )}
              {isBusiness && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold text-white shadow bg-gradient-premium">
                  FOR TEAMS · BEST VALUE
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <h2 className={cn("text-lg font-semibold", isBusiness && "bg-gradient-premium bg-clip-text text-transparent")}>{tier.name}</h2>
                {tier.id === "pro" && <Crown className="h-4 w-4 text-amber-500" />}
                {isBusiness && <Sparkles className="h-4 w-4 text-premium" />}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{tier.tagline}</p>
              <div className="mb-5 flex items-baseline gap-1">
                <span className={cn("text-3xl font-bold", isBusiness && "bg-gradient-premium bg-clip-text text-transparent")}>{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.period}</span>
                {isBusiness && <Sparkles className="h-3.5 w-3.5 text-premium ml-1" />}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((f) => {
                  const bold = isBusiness && headlineSet.has(f);
                  return (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className={cn("h-4 w-4 shrink-0 mt-0.5", isBusiness ? "text-premium" : "text-success")} />
                      <span className={cn("text-foreground/90", bold && "font-semibold text-foreground")}>{f}</span>
                    </li>
                  );
                })}
              </ul>
              <Button
                onClick={() => onClick(tier)}
                disabled={isCurrent}
                variant={tier.highlight ? "ai" : "outline"}
                className={cn(
                  "w-full",
                  isBusiness && !isCurrent &&
                    "bg-gradient-premium text-white border-0 hover:opacity-95 hover:shadow-lg"
                )}
              >
                {cta(tier)}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

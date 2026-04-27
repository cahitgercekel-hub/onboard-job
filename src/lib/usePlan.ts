import { useEffect, useState } from "react";

export type Plan = "free" | "pro" | "business";

/**
 * usePlan — placeholder hook until Stripe + subscriptions table are wired up.
 *
 * Override the active plan locally with `?devplan=pro` or `?devplan=business`
 * (persisted in localStorage). This lets us preview gated UI before billing exists.
 */
export function usePlan(): { plan: Plan; loading: boolean } {
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get("devplan");
      if (fromQuery === "free" || fromQuery === "pro" || fromQuery === "business") {
        localStorage.setItem("jat.devplan", fromQuery);
      }
      const stored = localStorage.getItem("jat.devplan") as Plan | null;
      if (stored === "free" || stored === "pro" || stored === "business") {
        setPlan(stored);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  return { plan, loading };
}

export function isAtLeast(plan: Plan, required: Plan): boolean {
  const order: Record<Plan, number> = { free: 0, pro: 1, business: 2 };
  return order[plan] >= order[required];
}

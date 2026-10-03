import { useEffect, useState } from "react";
import { Backpack, ChevronRight } from "lucide-react";

import { buildBackpack, summarizeBackpack } from "@/lib/backpack";
import { readPlan } from "@/lib/services/plan-storage";
import type { HouseholdPlan } from "@/types";

const summarize = (plan: HouseholdPlan) => summarizeBackpack(buildBackpack(plan.members), plan.packedItems);

export default function BackpackLinkCard() {
  const [summary, setSummary] = useState(() => summarize(readPlan()));

  // A page restored from the back-forward cache keeps its old state: re-read the plan.
  useEffect(() => {
    const refresh = (event: PageTransitionEvent) => {
      if (event.persisted) setSummary(summarize(readPlan()));
    };
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  return (
    <a
      href="/plecak"
      className="border-border bg-surface hover:bg-secondary-hover focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 items-center gap-4 rounded-lg border p-6 shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
    >
      <span
        className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <Backpack className="size-5" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Plecak ewakuacyjny</span>
        <span className="text-muted-foreground mt-1 block text-sm">
          {summary.packed === 0 ? "Nic jeszcze nie spakowano." : `Spakowane: ${summary.packed} z ${summary.total}`}
        </span>
      </span>
      <ChevronRight className="text-muted-foreground size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
    </a>
  );
}

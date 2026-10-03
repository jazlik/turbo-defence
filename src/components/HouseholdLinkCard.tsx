import { useEffect, useState } from "react";
import { ChevronRight, Users } from "lucide-react";

import { summarizeHousehold } from "@/lib/household";
import { readPlan } from "@/lib/services/plan-storage";

export default function HouseholdLinkCard() {
  const [summary, setSummary] = useState(() => summarizeHousehold(readPlan()));

  // A page restored from the back-forward cache keeps its old state: re-read the plan.
  useEffect(() => {
    const refresh = (event: PageTransitionEvent) => {
      if (event.persisted) setSummary(summarizeHousehold(readPlan()));
    };
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  const empty = summary.members === 0 && summary.contacts === 0;

  return (
    <a
      href="/domownicy"
      className="border-border bg-surface hover:bg-secondary-hover focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 items-center gap-4 rounded-lg border p-6 shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
    >
      <span
        className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <Users className="size-5" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Domownicy i kontakty</span>
        <span className="text-muted-foreground mt-1 block text-sm">
          {empty ? "Nikogo jeszcze nie dodano." : `Domownicy: ${summary.members} · Kontakty: ${summary.contacts}`}
        </span>
      </span>
      <ChevronRight className="text-muted-foreground size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
    </a>
  );
}

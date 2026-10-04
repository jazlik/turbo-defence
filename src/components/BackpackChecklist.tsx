import { useEffect, useState } from "react";
import { Check, TriangleAlert, Users } from "lucide-react";

import { STORAGE_ERROR, StatusLine, type RecordFeedback } from "@/components/HouseholdFormParts";
import {
  buildBackpack,
  formatAmount,
  itemState,
  summarizeBackpack,
  togglePacked,
  type BackpackGroup,
  type BackpackItem,
  type ItemState,
} from "@/lib/backpack";
import { readPlan, readPlanResult, writePlan } from "@/lib/services/plan-storage";
import { cn } from "@/lib/utils";

/** The stored plan may be from a newer app version: a tick must not replace it with an empty one. */
const UNREADABLE_PLAN =
  "Nie udało się odczytać planu zapisanego na tym urządzeniu, więc odhaczenie nie zostało zapisane. Zaktualizuj aplikację i spróbuj ponownie.";

const GROUPS: { group: BackpackGroup; title: string }[] = [
  { group: "everyone", title: "Dla wszystkich" },
  { group: "children", title: "Dzieci" },
  { group: "pets", title: "Zwierzęta" },
  { group: "needs", title: "Potrzeby zdrowotne" },
];

function outdatedText(item: BackpackItem, state: ItemState): string {
  if (!item.quantity || state.previousAmount === null) return "Ilość wzrosła";
  return `Ilość wzrosła — wcześniej ${formatAmount(item.quantity, state.previousAmount)}`;
}

function ItemRow({
  item,
  state,
  onToggle,
}: {
  item: BackpackItem;
  state: ItemState;
  onToggle: (checked: boolean) => void;
}) {
  const packed = state.status === "packed";
  const secondary = packed ? "text-core-steel-deep" : "text-muted-foreground";
  return (
    <li>
      <label
        className={cn(
          "has-focus-visible:ring-ring has-focus-visible:ring-offset-background flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-4 has-focus-visible:ring-[3px] has-focus-visible:ring-offset-2",
          packed ? "border-core-steel-soft bg-core-steel-soft text-core-steel-deep" : "border-border bg-surface",
        )}
      >
        <input
          type="checkbox"
          checked={packed}
          onChange={(event) => {
            onToggle(event.target.checked);
          }}
          className="accent-primary mt-0.5 size-5 shrink-0 cursor-pointer outline-none"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{item.label}</span>
          {item.detail && <span className={cn("mt-1 block text-sm", secondary)}>{item.detail}</span>}
          {/* For needs the amount is the people count — the names below already say it. */}
          {item.quantity && item.group !== "needs" && (
            <span className={cn("mt-1 block text-sm", secondary)}>
              <span className="text-foreground font-medium">{formatAmount(item.quantity)}</span> · {item.quantity.basis}
            </span>
          )}
          {item.forNames.length > 0 && (
            <span className={cn("mt-1 block text-sm", secondary)}>Dla: {item.forNames.join(", ")}</span>
          )}
          {state.status === "outdated" && (
            <span className="text-attention-foreground mt-2 flex items-start gap-2 text-sm font-medium">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              {outdatedText(item, state)}
            </span>
          )}
        </span>
        {packed && <Check className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />}
      </label>
    </li>
  );
}

export default function BackpackChecklist() {
  const [plan, setPlan] = useState(readPlan);
  const [feedback, setFeedback] = useState<RecordFeedback>(null);

  // Back from /domownicy via the back-forward cache: the household may have changed.
  useEffect(() => {
    const refresh = (event: PageTransitionEvent) => {
      if (event.persisted) setPlan(readPlan());
    };
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  const items = buildBackpack(plan.members);
  const summary = summarizeBackpack(items, plan.packedItems);

  /** Works on a fresh read: /domownicy and the place cards write the same key. */
  const toggle = (itemId: string, checked: boolean) => {
    const { plan: fresh, source } = readPlanResult();
    if (source === "unreadable") {
      setFeedback({ text: UNREADABLE_PLAN, tone: "warning" });
      return;
    }
    const freshItems = buildBackpack(fresh.members);
    const item = freshItems.find((candidate) => candidate.id === itemId);
    if (!item) {
      setPlan(fresh);
      return;
    }
    const next = { ...fresh, packedItems: togglePacked(fresh.packedItems, item, checked, freshItems) };
    if (writePlan(next)) {
      setPlan(next);
      setFeedback(null);
    } else {
      // Nothing changed on the device — the checkbox stays as it was.
      setFeedback({ text: STORAGE_ERROR, tone: "warning" });
    }
  };

  return (
    <div>
      <p role="status" aria-live="polite" className="text-lg font-medium">
        Spakowane: {summary.packed} z {summary.total}
      </p>
      <StatusLine feedback={feedback} />

      {plan.members.length === 0 && (
        <div className="border-border bg-surface mt-6 flex items-start gap-4 rounded-md border p-4">
          <span
            className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <Users className="size-5" strokeWidth={2} />
          </span>
          <p className="text-muted-foreground">
            Lista jest teraz liczona dla jednej osoby.{" "}
            <a
              href="/domownicy"
              className="text-core-steel-deep focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
            >
              Dodaj domowników, żeby dopasować plecak
            </a>
          </p>
        </div>
      )}

      {(() => {
        const rows = items.map((item) => ({ item, state: itemState(item, plan.packedItems) }));
        const todo = rows.filter(({ state }) => state.status !== "packed");
        const packed = rows.filter(({ state }) => state.status === "packed");
        const renderRows = (list: typeof rows) =>
          list.map(({ item, state }) => (
            <ItemRow
              key={item.id}
              item={item}
              state={state}
              onToggle={(checked) => {
                toggle(item.id, checked);
              }}
            />
          ));
        return (
          <>
            <div className="mt-8 space-y-8">
              <h2 className="font-heading text-2xl tracking-[-0.015em]">Do spakowania ({todo.length})</h2>
              {todo.length === 0 && <p className="text-safe">Wszystko spakowane.</p>}
              {GROUPS.map(({ group, title }) => {
                const groupRows = todo.filter(({ item }) => item.group === group);
                if (groupRows.length === 0) return null;
                const headingId = `backpack-${group}`;
                return (
                  <section key={group} aria-labelledby={headingId}>
                    <h3 id={headingId} className="text-muted-foreground text-base font-medium">
                      {title}
                    </h3>
                    <ul className="mt-2 space-y-2">{renderRows(groupRows)}</ul>
                  </section>
                );
              })}
            </div>
            {packed.length > 0 && (
              <details className="border-border mt-8 rounded-lg border p-4">
                <summary className="min-h-11 cursor-pointer font-medium">Spakowane ({packed.length})</summary>
                <ul className="mt-4 space-y-2">{renderRows(packed)}</ul>
              </details>
            )}
          </>
        );
      })()}

      <p className="text-muted-foreground mt-8 text-sm">
        Na podstawie Poradnika bezpieczeństwa (gov.pl). Plecak na 72 godziny.
      </p>
    </div>
  );
}

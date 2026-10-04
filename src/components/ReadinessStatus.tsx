import { useState } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";

import { formatClockTime } from "@/lib/format";
import { needsHomeScreenInstall } from "@/lib/platform";
import { isMapReady, readMapPackage } from "@/lib/services/map-storage";
import { readNavigation } from "@/lib/services/navigation-storage";
import { readPlan } from "@/lib/services/plan-storage";

interface ReadinessItem {
  label: string;
  ready: boolean;
  detail: string;
}

/** What full offline guidance needs, read from existing state. Explains — never blocks the alarm. */
function readReadiness(): ReadinessItem[] {
  const map = readMapPackage();
  const route = readNavigation().primary;
  const plan = readPlan();
  const mapItem: ReadinessItem = isMapReady(map)
    ? { label: "Mapa offline", ready: true, detail: "pobrana" }
    : {
        label: "Mapa offline",
        ready: false,
        detail: needsHomeScreenInstall() ? "do pobrania w aplikacji z ekranu początkowego" : "do pobrania",
      };
  const routeItem: ReadinessItem = route
    ? { label: "Schron i trasa", ready: true, detail: `trasa z ${formatClockTime(Date.parse(route.createdAt))}` }
    : {
        label: "Schron i trasa",
        ready: false,
        detail: plan.places.shelter ? "tylko kierunek do Twojego punktu" : "alarm wyszuka schron na miejscu",
      };
  const positionItem: ReadinessItem = plan.lastKnownPosition
    ? { label: "Lokalizacja", ready: true, detail: "pozycja zapisana" }
    : { label: "Lokalizacja", ready: false, detail: "sprawdź czujniki" };
  return [mapItem, routeItem, positionItem];
}

export default function ReadinessStatus() {
  const [items] = useState(readReadiness);
  const allReady = items.every((item) => item.ready);

  return (
    <div className="mt-4 space-y-2">
      <p className={allReady ? "text-safe font-medium" : "font-medium"}>
        {allReady
          ? "Pełne prowadzenie offline jest gotowe."
          : "Pełne prowadzenie offline nie jest jeszcze gotowe — alarm i tak zadziała."}
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2">
            {item.ready ? (
              <CheckCircle2 className="text-safe mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            ) : (
              <CircleDashed
                className="text-muted-foreground mt-0.5 size-4 shrink-0"
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
            <span>
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground"> — {item.detail}</span>
              <span className="sr-only">{item.ready ? " (gotowe)" : " (niegotowe)"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

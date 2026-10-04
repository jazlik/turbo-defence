import type { ComponentType, SVGProps } from "react";
import {
  Backpack,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDashed,
  Compass,
  MapPin,
  Users,
  WifiOff,
} from "lucide-react";

import type { AreaId, AreaStatus } from "@/lib/readiness";
import { cn } from "@/lib/utils";

const ICONS: Record<AreaId, ComponentType<SVGProps<SVGSVGElement>>> = {
  places: MapPin,
  family: Users,
  backpack: Backpack,
  offline: WifiOff,
  sensors: Compass,
};

const STATE = {
  done: { label: "Gotowe", Icon: CheckCircle2, className: "text-safe" },
  partial: { label: "W toku", Icon: CircleDashed, className: "text-core-steel-deep" },
  todo: { label: "Do zrobienia", Icon: Circle, className: "text-muted-foreground" },
} as const;

/** Entry to the configurators once a step is done: status in text and icon, no buttons of its own. */
export default function AreaStrip({ areas }: { areas: AreaStatus[] }) {
  return (
    <section aria-labelledby="areas-title" className="space-y-3">
      <h2 id="areas-title" className="font-heading text-2xl tracking-[-0.015em]">
        Twój plan
      </h2>
      <ul className="border-border bg-surface divide-border divide-y rounded-lg border shadow-sm">
        {areas.map((area) => {
          const AreaIcon = ICONS[area.id];
          const { label, Icon, className } = STATE[area.status];
          return (
            <li key={area.id}>
              <a
                href={area.href}
                className="hover:bg-secondary-hover focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-14 items-center gap-4 px-4 py-2 outline-none first:rounded-t-lg last:rounded-b-lg focus-visible:ring-[3px] focus-visible:ring-offset-2 sm:px-6"
              >
                <AreaIcon className="text-core-steel-deep size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0 flex-1 font-medium">{area.title}</span>
                <span className={cn("flex items-center gap-2 text-sm font-medium", className)}>
                  <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  {label}
                </span>
                <ChevronRight className="text-muted-foreground size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

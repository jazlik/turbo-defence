import { useState } from "react";

import { cn } from "@/lib/utils";

interface DirectionArrowProps {
  rotationDegrees: number;
  dimmed?: boolean;
}

/** Shortest signed turn from `from` to `to`, -180…180. */
const shortestTurn = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

export default function DirectionArrow({ rotationDegrees, dimmed = false }: DirectionArrowProps) {
  // Accumulate the angle so a 350° → 10° change turns 20° instead of spinning back through 180°.
  const [input, setInput] = useState(rotationDegrees);
  const [displayed, setDisplayed] = useState(rotationDegrees);
  if (rotationDegrees !== input) {
    setInput(rotationDegrees);
    setDisplayed(displayed + shortestTurn(input, rotationDegrees));
  }

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn(
        "text-guidance aspect-square w-full transition-[transform,opacity] [transition-duration:var(--duration-feedback)] [transition-timing-function:var(--ease-standard)] motion-reduce:transition-none",
        dimmed && "opacity-50",
      )}
      style={{ transform: `rotate(${displayed}deg)` }}
    >
      <path d="M50 6 L86 88 L50 70 L14 88 Z" fill="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

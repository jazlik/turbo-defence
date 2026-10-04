import { useEffect, useState } from "react";

import type { MapFileCheck } from "@/lib/map-health";
import { openMapFile, verifyMapFile, type MapPackageState } from "@/lib/services/map-storage";

/**
 * Checks that the file of a package flagged ready is still on disk, whole. Runs on mount, when the package changes
 * and whenever the page becomes visible again — a phone can evict OPFS while the app is closed.
 */
export function useMapFile(map: MapPackageState | null): MapFileCheck {
  const [check, setCheck] = useState<{ fileName: string; result: MapFileCheck } | null>(null);
  const fileName = map?.status === "ready" ? map.fileName : null;
  const bytes = map?.bytes ?? 0;

  useEffect(() => {
    if (fileName === null) return;
    let cancelled = false;
    const run = () => {
      void openMapFile({ fileName }).then(async (file) => {
        const ok = file !== null && (await verifyMapFile(file, bytes).catch(() => false));
        if (!cancelled) setCheck({ fileName, result: ok ? "present" : "missing" });
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    run();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fileName, bytes]);

  return check !== null && check.fileName === fileName ? check.result : "unknown";
}

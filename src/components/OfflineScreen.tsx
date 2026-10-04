import InstallCard from "@/components/InstallCard";
import MapPackageCard from "@/components/MapPackageCard";
import OfflineChecklist, { type OfflineCheck } from "@/components/OfflineChecklist";
import OfflineShellCard from "@/components/OfflineShellCard";
import { useMapFile } from "@/components/hooks/useMapFile";
import { useMapPackage } from "@/components/hooks/useMapPackage";
import { useOfflineShell } from "@/components/hooks/useOfflineShell";
import { mapHealth } from "@/lib/map-health";
import { MAP_REGIONS } from "@/lib/map-regions";
import { readNavigation } from "@/lib/services/navigation-storage";

/**
 * `/offline`: one island owns the map package, so the checklist and the map card cannot disagree about it
 * (the checklist used to be impossible to keep in sync with a download finishing in a sibling island).
 */
export default function OfflineScreen() {
  const mapPackage = useMapPackage();
  const shell = useOfflineShell();
  const health = mapHealth(mapPackage.state, useMapFile(mapPackage.state));
  const { primary, alternate } = readNavigation();
  const regionName = MAP_REGIONS.find((region) => region.id === mapPackage.state?.regionId)?.name;

  const checks: OfflineCheck[] = [];
  if (shell !== "na") {
    checks.push({
      id: "shell",
      ok: shell === "ready",
      label:
        shell === "ready" ? "Aplikacja otworzy się bez internetu" : "Aplikacja jeszcze nie jest zapisana w telefonie",
      problem: "Odśwież stronę przy włączonym internecie i poczekaj chwilę.",
    });
  }
  checks.push(
    {
      id: "map",
      ok: health === "ready",
      label: health === "ready" ? `Mapa ${regionName ?? "regionu"} pobrana` : "Mapa offline nie jest gotowa",
      problem:
        health === "file-missing"
          ? "Telefon usunął pobraną mapę. Pobierz ją ponownie."
          : health === "downloading"
            ? "Pobieranie jeszcze trwa."
            : "Pobierz mapę poniżej.",
    },
    {
      id: "route-a",
      ok: primary !== null,
      label: primary !== null ? "Trasa A zapisana" : "Trasa A nie jest zapisana",
      problem: "Przygotuj trasy w „Miejscach ewakuacji”.",
    },
    {
      id: "route-b",
      ok: alternate !== null,
      label: alternate !== null ? "Trasa B zapisana" : "Trasa B nie jest zapisana",
      problem: "Trasa zapasowa pojawi się po przygotowaniu tras w „Miejscach ewakuacji”.",
    },
  );

  return (
    <div className="space-y-6">
      <OfflineChecklist checks={checks} />
      <div>
        <OfflineShellCard />
      </div>
      <div>
        <InstallCard />
      </div>
      <div>
        <MapPackageCard mapPackage={mapPackage} />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleX, LoaderCircle, TriangleAlert, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { loadPolishVoice, speak, speechSupported } from "@/lib/services/speech";
import { cn } from "@/lib/utils";

type VoiceResult = "idle" | "checking" | "offline" | "online-only" | "no-voice" | "failed";

const RESULT_COPY: Record<
  Exclude<VoiceResult, "idle" | "checking">,
  { label: string; icon: ReactNode; className: string; instruction: string }
> = {
  offline: {
    label: "Działa offline",
    icon: <CheckCircle2 className="size-5" strokeWidth={2} aria-hidden="true" />,
    className: "text-safe",
    instruction: "Sprawdź raz w trybie samolotowym — tylko to potwierdza działanie bez sieci.",
  },
  "online-only": {
    label: "Tylko z siecią",
    icon: <TriangleAlert className="size-5" strokeWidth={2} aria-hidden="true" />,
    className: "text-attention-foreground",
    instruction:
      "Aby głos działał offline, pobierz polskie dane głosowe: Android — Ustawienia → System → Języki → Zamiana tekstu na mowę → silnik Google → Zainstaluj dane głosowe → Polski. iOS — Ustawienia → Dostępność → Treść mówiona → Głosy → Polski.",
  },
  "no-voice": {
    label: "Brak polskiego głosu",
    icon: <CircleX className="size-5" strokeWidth={2} aria-hidden="true" />,
    className: "text-destructive",
    instruction: speechSupported()
      ? "Pobierz polskie dane głosowe: Android — Ustawienia → System → Języki → Zamiana tekstu na mowę → silnik Google → Zainstaluj dane głosowe → Polski. iOS — Ustawienia → Dostępność → Treść mówiona → Głosy → Polski."
      : "Ta przeglądarka nie obsługuje głosu — prowadzenie będzie tylko na ekranie.",
  },
  failed: {
    label: "Nie zadziałało",
    icon: <TriangleAlert className="size-5" strokeWidth={2} aria-hidden="true" />,
    className: "text-destructive",
    instruction: "Głos się nie odezwał. Sprawdź, czy telefon nie jest wyciszony, i spróbuj ponownie.",
  },
};

export default function VoiceCheck() {
  const [result, setResult] = useState<VoiceResult>("idle");
  const [voiceLocal, setVoiceLocal] = useState<boolean | null>(null);

  // Loaded on mount so the click handler can speak without awaiting anything.
  const voiceLoad = useRef<ReturnType<typeof loadPolishVoice> | null>(null);
  // undefined while loading, null when the phone has no Polish voice.
  const loadedVoice = useRef<Awaited<ReturnType<typeof loadPolishVoice>> | undefined>(undefined);

  useEffect(() => {
    if (!speechSupported()) return;
    const load = loadPolishVoice();
    voiceLoad.current = load;
    void load.then((loaded) => {
      loadedVoice.current = loaded;
    });
  }, []);

  const checkVoice = () => {
    const load = voiceLoad.current;
    if (!load || loadedVoice.current === null) {
      setResult("no-voice");
      return;
    }
    setResult("checking");
    // Must start synchronously in the click: iOS only speaks from a user gesture, and an await before speak() loses it.
    // Before the voice list arrives, speak with the default pl-PL voice.
    const spoken = speak("Głos prowadzenia działa.", loadedVoice.current?.voice ?? null);
    void Promise.all([spoken, load]).then(([outcome, polishVoice]) => {
      if (!polishVoice) {
        setResult("no-voice");
        return;
      }
      setVoiceLocal(polishVoice.local);
      if (outcome === "spoken") {
        setResult(polishVoice.local ? "offline" : "online-only");
      } else {
        setResult("failed");
      }
    });
  };

  const resultData = result !== "idle" && result !== "checking" ? RESULT_COPY[result] : null;

  return (
    <section aria-labelledby="voice-title" className="border-border bg-surface rounded-lg border p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 id="voice-title" className="font-heading flex items-center gap-3 text-2xl">
          <Volume2 className="text-core-steel-deep size-6" strokeWidth={2} aria-hidden="true" />
          Głos
        </h2>
        <div aria-live="polite">
          {result === "checking" && (
            <p className="text-muted-foreground flex items-center gap-2 font-medium">
              <LoaderCircle
                className="size-5 animate-spin motion-reduce:animate-none"
                strokeWidth={2}
                aria-hidden="true"
              />
              Sprawdzam…
            </p>
          )}
          {resultData && (
            <p className={cn("flex items-center gap-2 font-medium", resultData.className)}>
              {resultData.icon}
              {resultData.label}
            </p>
          )}
        </div>
      </div>

      {result === "idle" && (
        <>
          <p className="text-muted-foreground mt-2">Sprawdź, czy telefon będzie mówił po polsku bez internetu.</p>
          <Button type="button" size="lg" className="mt-4 w-full sm:w-auto" onClick={checkVoice}>
            Sprawdź głos
          </Button>
        </>
      )}

      {result !== "idle" && result !== "checking" && resultData && (
        <>
          <p className="text-muted-foreground mt-4">{resultData.instruction}</p>
          <Button type="button" variant="secondary" size="lg" className="mt-4 w-full sm:w-auto" onClick={checkVoice}>
            Sprawdź ponownie
          </Button>
        </>
      )}

      {result === "checking" && <p className="text-muted-foreground mt-4">Sprawdzam głos…</p>}

      {voiceLocal !== null && result !== "checking" && (
        <p className="text-muted-foreground mt-2 text-sm">
          {voiceLocal ? "Głos lokalny (offline)" : "Głos sieciowy (wymaga połączenia)"}
        </p>
      )}
    </section>
  );
}

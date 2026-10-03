import { useState, type ReactNode } from "react";
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

  const checkVoice = () => {
    // Kick off the async part, but speak() is called synchronously below (gesture preserved).
    setResult("checking");

    // loadPolishVoice is async — we must call speak() synchronously in this handler.
    // Strategy: load the voice, then speak. On browsers where getVoices() returns immediately
    // (iOS), speak() runs right away. On Chromium the voices may not be ready yet, but
    // the button click itself is the gesture, so the subsequent speak() still counts.
    void (async () => {
      if (!speechSupported()) {
        setResult("no-voice");
        return;
      }
      const polishVoice = await loadPolishVoice();
      if (!polishVoice) {
        setResult("no-voice");
        return;
      }
      setVoiceLocal(polishVoice.local);
      // speak() must be called as close to the gesture as possible — no unrelated awaits after this.
      const outcome = await speak("Głos prowadzenia działa.", polishVoice.voice);
      if (outcome === "spoken") {
        setResult(polishVoice.local ? "offline" : "online-only");
      } else {
        setResult("failed");
      }
    })();
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

import { useCallback, useEffect, useRef, useState } from "react";

import { loadPolishVoice, speak, stopSpeaking } from "@/lib/services/speech";
import { readVoiceSettings, writeVoiceSettings } from "@/lib/services/voice-settings";
import {
  distanceMark,
  nextDistanceAnnouncement,
  phraseFor,
  spokenDistance,
  type GuidanceVoiceState,
} from "@/lib/voice";

// liveFix flips to stale after 20 s of GPS silence and can flicker on a weak signal; only a change that holds is spoken.
const STABLE_MS = 2000;
// Standing right at the arrival radius flickers arrived ↔ guiding; walking back out this little stays silent.
const ARRIVAL_JITTER_METERS = 50;

export type VoiceStatus = "loading" | "ready" | "blocked" | "unavailable" | "off";

function stateKey(state: GuidanceVoiceState): string {
  // Tytuł kroku wchodzi do klucza: bez tego przejście z miejsca spotkania na punkt ewakuacji
  // (oba to `guiding:live`) nie zmieniłoby klucza i głos przemilczałby zmianę celu.
  if (state.kind === "guiding") return `guiding:${state.title}:${state.live ? "live" : "stale"}`;
  if (state.kind === "arrived") return `arrived:${state.label}`;
  if (state.kind === "locationProblem") return `locationProblem:${state.problem}`;
  return state.kind;
}

export function useVoiceGuidance(state: GuidanceVoiceState) {
  const [enabled, setEnabled] = useState(() => readVoiceSettings().enabled);
  // undefined while loading, null when the phone has no Polish voice (or no speech API).
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null | undefined>(undefined);
  const [blocked, setBlocked] = useState(false);
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");

  const stateRef = useRef(state);
  const announcedRef = useRef<GuidanceVoiceState | null>(null);
  const lastMarkRef = useRef<number | null>(null);
  // Nazwa miejsca, którego dojście już ogłoszono. Sekwencja ma wiele dojść, więc pojedyncza flaga
  // uciszyłaby każde kolejne; tłumimy tylko powtórkę dla tego samego miejsca (drganie na progu).
  const arrivedPlaceRef = useRef<string | null>(null);
  const speechSeqRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    let cancelled = false;
    void loadPolishVoice().then((result) => {
      if (!cancelled) setVoice(result?.voice ?? null);
    });
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      const nowVisible = document.visibilityState === "visible";
      if (!nowVisible) {
        speechSeqRef.current++;
        stopSpeaking();
        announcedRef.current = null;
      }
      setVisible(nowVisible);
    };
    // Leaving /alarm is a full navigation, not an unmount.
    const onPageHide = () => {
      stopSpeaking();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  const say = useCallback(
    (text: string) => {
      const seq = ++speechSeqRef.current;
      const onLateStart = () => {
        if (seq === speechSeqRef.current) setBlocked(false);
      };
      void speak(text, voice ?? null, onLateStart).then((result) => {
        // A newer utterance cancelled this one; its outcome says nothing about blocking.
        if (seq !== speechSeqRef.current) return;
        if (result === "blocked") setBlocked(true);
        if (result === "spoken") setBlocked(false);
      });
    },
    [voice],
  );

  const announceFull = useCallback(
    (current: GuidanceVoiceState) => {
      announcedRef.current = current;
      lastMarkRef.current = current.kind === "guiding" && current.live ? distanceMark(current.meters) : null;
      if (current.kind === "arrived") arrivedPlaceRef.current = current.label;
      say(phraseFor(current, null));
    },
    [say],
  );

  const active = enabled && voice != null && visible && !blocked;

  useEffect(() => {
    if (!active || announcedRef.current !== null) return;
    announceFull(stateRef.current);
  }, [active, announceFull]);

  const key = stateKey(state);
  useEffect(() => {
    if (!active) return;
    const announced = announcedRef.current;
    if (announced === null || stateKey(announced) === key) return;
    const timer = window.setTimeout(() => {
      const current = stateRef.current;
      const previous = announcedRef.current;
      if (previous === null) return;
      announcedRef.current = current;
      lastMarkRef.current = current.kind === "guiding" && current.live ? distanceMark(current.meters) : null;
      if (current.kind === "arrived") {
        if (arrivedPlaceRef.current === current.label) return;
        arrivedPlaceRef.current = current.label;
      } else if (
        previous.kind === "arrived" &&
        current.kind === "guiding" &&
        // Tylko to samo miejsce to drganie na progu. Inny cel to prawdziwe przejście na następny
        // krok i trzeba je powiedzieć, nawet gdy następne miejsce jest blisko.
        current.label === previous.label &&
        current.meters < ARRIVAL_JITTER_METERS
      ) {
        return;
      }
      say(phraseFor(current, previous));
    }, STABLE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [active, key, say]);

  const liveMeters = state.kind === "guiding" && state.live ? state.meters : null;
  useEffect(() => {
    if (!active || liveMeters === null) return;
    const announced = announcedRef.current;
    if (announced?.kind !== "guiding" || !announced.live) return;
    const next = nextDistanceAnnouncement(lastMarkRef.current, liveMeters);
    lastMarkRef.current = next.mark;
    // „Do celu”, nie „do punktu”: celem bywa też miejsce spotkania i miejsce zapasowe.
    if (next.announce) say(`Do celu ${spokenDistance(liveMeters)}.`);
  }, [active, liveMeters, say]);

  // Both run inside a click handler: speak() must start synchronously to count as the user gesture on iOS.
  const unlock = () => {
    if (voice) announceFull(stateRef.current);
  };

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    writeVoiceSettings({ enabled: next });
    if (!next) {
      speechSeqRef.current++;
      stopSpeaking();
      announcedRef.current = null;
      return;
    }
    if (voice && visible) announceFull(stateRef.current);
  };

  let status: VoiceStatus;
  if (voice === null) status = "unavailable";
  else if (!enabled) status = "off";
  else if (voice === undefined) status = "loading";
  else if (blocked) status = "blocked";
  else status = "ready";

  return { enabled, toggle, status, unlock };
}

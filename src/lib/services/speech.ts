import { pickPolishVoice } from "../voice";

export function speechSupported(): boolean {
  return "speechSynthesis" in window;
}

export async function loadPolishVoice(): Promise<{ voice: SpeechSynthesisVoice; local: boolean } | null> {
  if (!speechSupported()) return null;
  let voices = speechSynthesis.getVoices();
  if (voices.length === 0) {
    await new Promise<void>((resolve) => {
      const handler = () => {
        speechSynthesis.removeEventListener("voiceschanged", handler);
        resolve();
      };
      speechSynthesis.addEventListener("voiceschanged", handler);
      window.setTimeout(resolve, 2000);
    });
    voices = speechSynthesis.getVoices();
  }
  return pickPolishVoice(voices);
}

/**
 * Speaks text in Polish. Returns "spoken" | "blocked" | "failed".
 * speechSynthesis.speak() is called synchronously — required for iOS gesture unlock.
 * Never async-before-speak: the Promise constructor executes synchronously up to speak().
 */
export function speak(text: string, voice: SpeechSynthesisVoice | null): Promise<"spoken" | "blocked" | "failed"> {
  return new Promise((resolve) => {
    if (!speechSupported()) {
      resolve("failed");
      return;
    }
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pl-PL";
    if (voice) utterance.voice = voice;

    let settled = false;
    const timerRef = { id: 0 as number };

    const settle = (result: "spoken" | "blocked" | "failed") => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerRef.id);
      resolve(result);
    };

    utterance.addEventListener("start", () => {
      settle("spoken");
    });
    utterance.addEventListener("error", (e) => {
      settle(e.error === "not-allowed" ? "blocked" : "failed");
    });

    // iOS does not fire an error when blocked — silence after 1500 ms means blocked.
    timerRef.id = window.setTimeout(() => {
      settle("blocked");
    }, 1500);

    speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (speechSupported()) {
    speechSynthesis.cancel();
  }
}

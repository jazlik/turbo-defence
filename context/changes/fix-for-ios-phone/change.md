---
change_id: fix-for-ios-phone
title: Przytrzymanie przycisku nie działa na iPhonie
status: implementing
created: 2026-10-03
updated: 2026-10-04
archived_at: null
---

## Notes

Objaw zgłoszony przez użytkownika: „Przycisk do alarmu wciska sie ale nie odlicza 2 sekund.
Na innym telefonie dziala." (Android działa, iPhone nie; dostępność dotyku wyłączona;
trzymanie 3–4 s nigdy nie przechodzi na ekran alarmu; `:active` z opóźnieniem ~1 s).

Ramowanie w `frame.md` — pewność WYSOKA, **przyczyna odtworzona na urządzeniu**.
Root Reacta dla wyspy (`<astro-island>`) ma `display: contents`, więc iOS Safari nie dostarcza
tam zdarzeń wskaźnika z dotyku. Kontrola A/B/C/D na iPhonie: zdjęcie `display: contents`
naprawia (D), nasłuch na `window` (B) i wymuszone przeliczenie stylu (C) nie naprawiają.

## Odstępstwo od planu: faza 1 zwinięta do fazy 2 (2026-10-04)

Faza 1 (sonda na urządzeniu) miała rozstrzygnąć jedno pytanie: czy nasza reguła wygrywa z inline'em
Astro w faktycznie wysyłanym arkuszu. **Pytanie rozstrzygnięte dowodem statycznym na buildzie**, bez
urządzenia:

- reguła obecna w wysyłanym arkuszu: `dist/_astro/Layout.C_qH7tay.css:html astro-island{display:block}`
- reguła leży poza `@layer` — jedyny `@layer` w arkuszu to `@layer properties` Tailwinda (bajt 66),
  nasza reguła na bajcie 24828
- nadpisywana reguła Astro nadal obecna w `dist/index.html`
- specyficzność 0-0-2 > 0-0-1, obie reguły niewarstwowe, nasza później w kaskadzie

Że zdjęcie `display: contents` przywraca zdarzenia wskaźnika na urządzeniu, wiadomo z testu D
w `frame.md` (pewność WYSOKA). Potwierdzenie na iPhonie przeniesione na bramkę fazy 2, która i tak
testuje to samo na docelowej wersji naprawy — zamiast dwóch wizyt na urządzeniu jest jedna.
Wiersze 1.4–1.7 zostają w `## Progress` nieodhaczone i wracają w zbiorczym podsumowaniu na końcu.

Powód operacyjny: weryfikacja na urządzeniu była zablokowana siecią, nie kodem. Mac nie ma własnego
Wi-Fi — jego jedyna sieć to tethering z tego samego iPhone'a po tym samym kablu, którego używa Web
Inspector (`Hardware Port: iPhone USB, Device: en5`, gateway `172.20.10.1`), a zapora macOS jest
włączona bez wyjątku dla `node`, więc `localhost:4321` odpowiada, a telefon nie dochodzi.
**Do rozwiązania przed bramką fazy 2.**

Plan w `plan.md`, streszczenie w `plan-brief.md` — 4 fazy: sonda na urządzeniu, naprawa
(niewarstwowa reguła CSS + opakowanie trzech punktów montażu `PlaceCard`), guard regresji
w `scripts/smoke.mjs`, zapisany target platformowy. Ustalone w planowaniu: reguła Astro jest inline
w `<head>` **po** naszym arkuszu i niewarstwowa, więc nadpisanie wymaga specyficzności ≥ 0-0-2
poza `@layer`.

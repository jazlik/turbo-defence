# Przytrzymanie przycisku nie działa na iPhonie — Plan Brief

> Pełny plan: `context/changes/fix-for-ios-phone/plan.md`
> Frame brief: `context/changes/fix-for-ios-phone/frame.md`

## What & Why

Jedynym dotykowym wejściem do automatu przytrzymania jest delegowany przez Reacta `onPointerDown`,
a nasłuch tej delegacji siedzi na elemencie `<astro-island>` z `display: contents` — do którego
iOS Safari nie dostarcza zdarzeń wskaźnika pochodzących z dotyku.

Skutek: **każda akcja chroniona przytrzymaniem — uruchomienie alarmu, przełączenie na miejsce
zapasowe, potwierdzenie dojścia — jest na iPhonie nieosiągalna dotykiem.** To nie usterka
kosmetyczna jednego przycisku, a połowa rynku telefonów bez dostępu do trybu alarmowego
w aplikacji ratunkowej.

## Starting Point

`useHoldAction` jest poprawny i sprawdzony w terenie — frame aktywnie wykluczył `releasePointerCapture`,
zabezpieczenia CSS dotyku, dławienie rAF, stan dostępności urządzenia i rozjazd wersji. Kontrola
A/B/C/D na iPhonie (Safari 26.6.2, Web Inspector) pokazała, że `pointerdown` nie dociera nawet do
nasłuchu w fazie przechwytywania na `window`, a zdjęcie `display: contents` z wyspy (test D)
natychmiast przywraca odliczanie. Dziś w `src/` nie ma żadnej dotykowej ścieżki zapasowej: ani
jednego `onTouch*`, ani jednego `addEventListener` dla wskaźnika.

## Desired End State

Na iPhonie przytrzymanie odlicza od pierwszej klatki i kończy akcję po 2 s — we wszystkich trzech
miejscach. Na Androidzie nic się nie zmienia. Karty miejsc na stronie głównej mają odstęp
pochodzący z jawnego elementu, nie z wyspy. `npm run smoke` pada, jeśli naprawa zniknie z wysyłanego
CSS-u. iOS Safari jest zapisany jako wspierany target, a zapis testu w terenie nazywa platformę.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego | Źródło |
| --- | --- | --- | --- |
| Przyczyna | Root wyspy bez renderera (`display: contents`) | Odtworzona i wyłączona na urządzeniu; dwie konkurencyjne naprawy wykluczone (testy B i C) | Frame |
| Mechanizm naprawy | Globalne nadpisanie `display` dla `astro-island` | Dokładnie to, co potwierdził test D; jedna reguła leczy wszystkie 6 punktów montowania i każdą przyszłą wyspę, bez dotykania sprawdzonego automatu | Plan |
| Punktowy nasłuch w hooku | Odrzucony | Frame oznacza to obejście jako NIESPRAWDZONE na tym urządzeniu (test B dotyczył `window`, nie przycisku), a leczyłoby tylko przytrzymanie | Frame + Plan |
| Kolejność weryfikacji | Faza 0: sonda na urządzeniu przed naprawą | Test D był wstrzyknięciem stylu w Web Inspectorze, nie wysyłanym CSS-em — sonda domyka różnicę, na której stoi reszta planu | Plan |
| Zmiana layoutu | Opakować trzy punkty montażu `PlaceCard` | Odstęp wraca do elementu generującego boks, więc wyspa przestaje być istotna layoutowo na zawsze; zgodne z `JEZYK_WIZUALNY.md:200` | Plan |
| Guard regresji | Asercje w `scripts/smoke.mjs` | Jedyne miejsce widzące faktycznie wysłany CSS; test w Vitest musiałby czytać `dist/`, łamiąc konwencję „czyste funkcje w `src/lib/`" | Plan |
| Playwright w CI | Odrzucony | WebKit na Linuksie to nie iOS Safari — defekt może się tam nie odtworzyć, więc zielony test dałby fałszywe poczucie bezpieczeństwa przy koszcie ciężkiej zależności | Plan |
| Target platformowy | iOS Safari zapisany w `CLAUDE.md` + wymóg nazwania platformy w testach | Usuwa lukę, która pozwoliła uznać androidowe „sprawdzone w terenie" za dowód dla obu platform | Frame + Plan |

## Scope

**W zakresie:**

- Niewarstwowa reguła CSS zdejmująca `display: contents` z `astro-island` (leczy wszystkie 6 wysp)
- Opakowanie trzech punktów montażu `PlaceCard` w `HomeScreen.astro`
- Asercje regresji w `scripts/smoke.mjs` — na nasze nadpisanie i na regułę Astro
- Zapisany target platformowy i zasada nazywania platformy w testach w terenie
- Doprecyzowanie komentarza „sprawdzony w terenie" w `useHoldAction.ts`

**Poza zakresem:**

- `useHoldAction` — `releasePointerCapture`, czas 2000 ms, pierścień postępu, `cancel()`
- Natywny nasłuch wskaźnika na `<button>` (niesprawdzone obejście z React #29890)
- Zabezpieczenia CSS dotyku (`touch-action`, `-webkit-touch-callout` itd.) — kompletne i poprawne
- Playwright i jakikolwiek runner przeglądarkowy
- Podpowiedź `sr-only` radząca gest otwierający na iOS menu kontekstowe (luka F9 — osobna decyzja produktowa)
- Martwy `onContextMenu: preventDefault` (Safari iOS nigdy nie wysyła `contextmenu`)
- `astro-slot` i `astro-static-slot` — nie są rootami Reacta

## Architecture / Approach

Jedna reguła w `global.css` sprawia, że root każdej wyspy generuje boks, więc WebKit dostarcza do
niego zdarzenia wskaźnika. Automat przytrzymania i jego konsumenci pozostają nietknięci — naprawa
siedzi wyłącznie w warstwie, która zawiodła.

Dwa ograniczenia odkryte w planowaniu kształtują implementację, a naiwna wersja by na nich padła:

- **Specyficzność i warstwy.** Astro emituje `astro-island{display:contents}` jako `<style>` inline
  w `<head>`, **po** linku do naszego arkusza (bajt 2206 vs 586 w `dist/index.html`) i niewarstwowo.
  Nasza reguła potrzebuje specyficzności ≥ 0-0-2 **i** musi leżeć poza `@layer` — spełnienie tylko
  jednego warunku daje regułę, która cicho nic nie robi.
- **Bezwładne marginesy.** `.space-y-4 > :not(:last-child)` celuje dziś w elementy `astro-island`,
  których marginesy nie działają, bo `display: contents` nie generuje boksu — więc karty miejsc są
  dziś sklejone. Zdjęcie `display: contents` aktywowałoby te marginesy, dlatego odstęp przenosimy na
  jawne `<div>`-y. Po zmianie wszystkie 6 punktów montowania ma ten sam wzorzec.

## Phases at a Glance

| Faza | Co dostarcza | Główne ryzyko |
| --- | --- | --- |
| 1. Sonda na urządzeniu | Dowód, że reguła w prawdziwym buildzie naprawia iPhone'a | Sonda nie zadziała → powrót do wyboru mechanizmu (plan opisuje ścieżkę odwrotu) |
| 2. Naprawa | Reguła CSS + opakowanie trzech `PlaceCard` | Zmiana wizualna na stronie głównej do akceptacji; regresja layoutu na `/alarm` (zbadana — `min-h-screen` jest względem viewportu, więc brak) |
| 3. Zabezpieczenie regresji | Asercje w `scripts/smoke.mjs` | Asercja zawsze zielona — dlatego obowiązkowe zobaczenie jej w stanie czerwonym |
| 4. Target platformowy | Zapis targetu, zasada testów, zapis dowodu | Zobowiązanie do testów dwuplatformowych to realny narząd przy jednoosobowym projekcie |

**Prerequisites:** iPhone z iOS Safari + sesja Web Inspectora (USB, Safari na Macu), telefon
z Androidem do testu braku regresji, maszyna i telefon w jednej sieci lokalnej (`npm run preview -- --host`).

**Estimated effort:** ~1–2 sesje; naprawa jest mała, większość czasu to weryfikacja na urządzeniach
i bramki na testy w terenie w fazach 1, 2 i 4.

## Open Risks & Assumptions

- **Nadpisujemy selektor wewnętrzny frameworka.** Zmiana znaczników wysp w przyszłym Astro mogłaby
  cicho usunąć naprawę — dlatego faza 3 asercjonuje obie strony zależności, także obecność reguły Astro.
- **Guard sprawdza obecność reguły, nie dostarczenie zdarzenia.** Zmiany zachowania WebKita nie
  wyłapie — świadomy koszt odrzucenia Playwrighta.
- **Odstęp 1rem między kartami miejsc to zmiana widoczna.** Prawdopodobnie naprawa utajonej usterki
  (karty są dziś sklejone), ale wymaga akceptacji wizualnej względem `JEZYK_WIZUALNY.md`.
- **Mechanizm opóźnienia `:active` o ~1 s pozostaje wnioskowaniem** (frame, „Pewność"). To objaw
  towarzyszący, nie przyczyna — ale jeśli po naprawie nie zniknie, założenie trzeba przemyśleć.
- **Zobowiązanie do testów dwuplatformowych** może nie być utrzymane przy jednoosobowym projekcie;
  wtedy zapisany target zostanie bez pokrycia.
- **Urządzenia z zainstalowaną aplikacją mają precache'owany stary arkusz** — weryfikacja po
  deployu wymaga wymuszenia aktualizacji service workera, inaczej potwierdzi stary build.

## Success Criteria (Summary)

- Na iPhonie wszystkie trzy akcje chronione przytrzymaniem działają dotykiem; na Androidzie nic się
  nie zmieniło.
- Usunięcie naprawy z `global.css` powoduje czerwony `npm run smoke` z komunikatem nazywającym przyczynę.
- W repo istnieje pierwszy zapis testu w terenie nazywający platformę — w tym przytrzymanie
  przycisku potwierdzone na iPhonie.

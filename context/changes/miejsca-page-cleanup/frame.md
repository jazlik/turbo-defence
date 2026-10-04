# Frame Brief: Uporządkowanie strony /miejsca

> Framing step before /10x-plan. This document captures what is *actually*
> at issue, separated from what was initially assumed.

## Reported Observation

Strona `/miejsca` jest rozwlekła i nieuporządkowana, z kiepskim UX; nie wiadomo, czy wszystko, co na niej jest, jest potrzebne. Zauważone przy pierwszym ustawianiu miejsc.

## Initial Framing (preserved)

- **User's stated cause or approach**: forma jest za mało zwięzła, wszystko jest równorzędne i brakuje jednej głównej funkcji; część elementów może być zbędna, a „Punkt ewakuacji” może dublować miejsce spotkania.
- **User's proposed direction**: zwięźlejsza forma; „Ustaw tutaj” jako akcja podstawowa, a ręczne ustawianie schowane i odsłaniane, gdy GPS nie działa; zapas jako opcja ukryta.
- **Pre-dispatch narrowing**: przeszkadza wszystko naraz (długość i powtórzenia, brak orientacji, zbędne kontrolki), przede wszystkim brak jednej głównej funkcji. Wątpliwość „czy potrzebne” dotyczy karty „Punkt ewakuacji”. Sytuacja: pierwsze ustawianie.

## Dimension Map

1. **Hierarchia w karcie.** Nazwa, GPS i formularz współrzędnych są równie widoczne. ← wstępne ujęcie
2. **Struktura strony.** Trzy identyczne karty bez kolejności i bez jednego zadania na wizytę.
3. **Model pojęciowy miejsc.** Strona pokazuje trzy wewnętrzne rekordy planu (`meeting`, `backup`, `shelter`) zamiast zadania użytkownika, a ręczny „Punkt ewakuacji” jest odklejony od schronu PSP z `/offline`.
4. **Sposób wskazania miejsca.** Dominująca akcja („Ustaw tutaj”) zakłada, że użytkownik stoi w docelowym miejscu.

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| 1. Równorzędne kontrolki w karcie | `PlaceCard.tsx:124-186`: pole nazwy, „Ustaw tutaj” i formularz współrzędnych zawsze rozwinięte. ×3 daje 3 pola nazwy, 3 pola współrzędnych i 6 przycisków. Pole nazwy nie zapisuje się samo (dług F9, `step-flow-and-fallback/plan.md:419`), więc wygląda na funkcję, a nią nie jest. | STRONG |
| 2. Trzy równe karty, brak jednego zadania | `miejsca.astro:17-44`: trzy karty jedna pod drugą, różni je tylko wariant przycisku (`emphasis`). Gotowość prowadzi na `/miejsca` dwoma osobnymi krokami (spotkanie jako 1. quick win, zapasowe jako 5., `readiness.ts:151-220`), a strona przy każdym wejściu pokazuje komplet. Łamie §4 JV „jedna dominująca akcja na sekcję” i §3.7 „prostota nad gęstością”. | STRONG |
| 3. Model pojęciowy / „Punkt ewakuacji” | W sekwencji to osobny cel: plecak → spotkanie → schron (`evacuation-steps.ts:43-61`), więc w zachowaniu nie dubluje spotkania. Na stronie to jednak karta-sierota: schron wybiera się automatycznie na `/offline` (`RouteCard`), a ręczny punkt jest tylko celem awaryjnym. Gotowość kieruje na `/miejsca` po schron wyłącznie wtedy, gdy w pobliżu nie ma punktów PSP (`readiness.ts:181-187`). `/miejsca` w ogóle nie pokazuje stanu schronu PSP. Użytkownik odczytał kartę jako drugie określenie miejsca zbiórki. | STRONG (konfuzja), NONE (dublowanie w logice) |
| 4. „Ustaw tutaj” wymaga obecności na miejscu | Zapisuje bieżący fix GPS (`PlaceCard.tsx:64-81`). Zarchiwizowany plan wprost zakłada „stań w docelowym miejscu” (`guided-to-point-offline/plan.md:388`), a wskazanie na mapie odłożono na S-04 (`plan-brief.md:21`) i nigdy go nie zbudowano. Z domu jedyną drogą jest ręczny wpis współrzędnych. Użytkownik ustawia miejsca z domu. Skutek uboczny: „Ustaw tutaj” nadpisuje też `lastKnownPosition`, od której zależą świeżość trasy (`readiness.ts:148-166`) i propozycja regionu mapy (`useMapPackage.ts:33`). | STRONG |

## Narrowing Signals

- Użytkownik ustawia miejsca **z domu**, a nie w docelowym miejscu. To podważa proponowany kierunek: „Ustaw tutaj” jako akcja podstawowa zapisałoby dom. Ukrycie wpisu ręcznego schowałoby jedyną drogę, która z domu w ogóle działa, a ta droga wymaga znajomości współrzędnych.
- Użytkownik uznał „Punkt ewakuacji” za **to samo co miejsce spotkania**. Strona nie przekazuje różnicy między zbiórką a schronem ani tego, że schron jest zwykle wybierany automatycznie.
- Oczekiwanie: **jedno miejsce podstawowe**, a zapasowe jako opcja na dalszym planie. To zgadza się z kolejnością quick winów (spotkanie najwyżej, zapasowe później).

## Cross-System Convention

Aplikacje, które pytają o miejsce oddalone od użytkownika, standardowo dają wybór na mapie albo wyszukiwanie adresu, a „moja lokalizacja” traktują jako skrót. Ręczny wpis współrzędnych to ścieżka ekspercka. Projekt ma już na urządzeniu mapę regionu (MapLibre + PMTiles, ładowaną leniwie na `/alarm`). Wyszukiwanie adresu wymagałoby sieci, czyli tego samego warunku co przygotowanie trasy. Wstępne ujęcie (hierarchia) pasuje do konwencji „jedna akcja podstawowa”, ale wybór *która* akcja jest podstawowa przeczy obserwowanemu użyciu.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: `/miejsca` pokazuje wewnętrzny model planu (trzy równorzędne rekordy, każdy z pełnym zestawem kontrolek) zamiast jednego zadania użytkownika, „wskaż, gdzie zbiera się rodzina”, a jedyna dominująca metoda wskazania zakłada obecność na miejscu, której przy pierwszym ustawianiu nie ma.

Wstępne ujęcie jest trafne w połowie. Brak hierarchii i nadmiar powtórzonych kontrolek są realne (hipotezy 1–2). Proponowany kierunek, „Ustaw tutaj” jako podstawa, a ręczne schowane, pogorszyłby jednak sytuację właśnie dla pierwszego ustawiania z domu (hipoteza 4). Karta „Punkt ewakuacji” nie dubluje spotkania w logice, ale na tej stronie jest myląca i odklejona od schronu PSP (hipoteza 3). Jej miejsce i nazwa to pytanie o zakres, a nie o kosmetykę.

## Confidence

**HIGH.** Dowody w kodzie są jednoznaczne dla wszystkich czterech wymiarów, a dwa sygnały od użytkownika (ustawianie z domu, utożsamianie punktu ze spotkaniem) są rozstrzygające.

## What Changes for /10x-plan

Plan ma odpowiedzieć na trzy pytania, a nie tylko „schować kontrolki”:

1. **Jak wskazać miejsce, nie stojąc w nim** (wejście z domu jako ścieżka podstawowa, GPS jako skrót).
2. **Jedno zadanie główne** (miejsce spotkania) z zapasowym na dalszym planie.
3. **Co zrobić z ręcznym „Punktem ewakuacji”** względem schronu PSP z `/offline`: przenieść, przemianować, pokazać stan PSP albo ukryć do przypadku „brak punktów PSP”.

Ograniczenia, których plan nie może zgubić:
- skutek uboczny `lastKnownPosition`,
- dług F9 (nazwa zapisuje się tylko razem ze współrzędnymi),
- `readPlan()` przed `writePlan`,
- quick win „Wskaż punkt ewakuacji” linkujący na `/miejsca`.

## References

- Source files:
  - `src/pages/miejsca.astro:17-44`
  - `src/components/PlaceCard.tsx:51-186`
  - `src/lib/evacuation-steps.ts:43-61`
  - `src/lib/readiness.ts:148-220`
  - `src/components/RouteCard.tsx`
  - `src/pages/offline.astro`
  - `src/components/hooks/useMapPackage.ts:33`
- Visual language: `JEZYK_WIZUALNY.md` §3, §4 (Wzorzec widoku)
- Prior decisions:
  - `context/archive/2026-10-03-guided-to-point-offline/plan-brief.md:21`
  - `context/changes/step-flow-and-fallback/plan.md:180-182, 419`
  - `context/changes/coordinates-problem/change.md`
  - PRD FR-004 i decyzja S-04
- Investigation: przeprowadzone bezpośrednio (grep/read), bez sub-agentów

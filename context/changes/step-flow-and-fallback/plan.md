# Kroki ewakuacji i przełączenie na miejsce zapasowe (S-02) — plan implementacji

## Overview

Prowadzenie z S-01 zna jeden cel i jeden ekran. S-02 zamienia je w sekwencję kroków budowaną z planu gospodarstwa (plecak → miejsce spotkania → punkt ewakuacji), gdzie każdy ekran pokazuje dokładnie jeden następny krok, a na kroku miejsca spotkania pojawia się jedno wyjście awaryjne „niedostępne”, które przełącza prowadzenie na miejsce zapasowe. Realizuje FR-013 i dwa kryteria akceptacji US-01, które dziś nie przechodzą: „każdy ekran pokazuje dokładnie jeden następny krok” i „przycisk »niedostępne« przełącza prowadzenie na miejsce zapasowe”.

## Current State Analysis

Po S-01 (`context/archive/2026-10-03-guided-to-point-offline/`) istnieje kompletna, przetestowana w terenie warstwa czujników i jeden ekran prowadzenia:

- `HouseholdPlan` (`src/types.ts:17`) ma `schemaVersion: 1` i **jedno** miejsce: `evacuationPoint`. FR-004 wymaga trzech (miejsce spotkania, miejsce zapasowe, punkt ewakuacji), więc S-02 wykonuje **pierwszą migrację schematu** w tym projekcie.
- `readPlan` (`src/lib/services/plan-storage.ts:58`) czyta synchronicznie z `localStorage` pod kluczem `wrw.plan`, nigdy nie rzuca i waliduje każde pod-pole osobno (naprawa F1 z impl-review S-01). Komentarz w pliku zapowiada gałąź migracji dla kolejnych wersji schematu.
- `GuidanceScreen` (`src/components/GuidanceScreen.tsx`) ma cztery stany (brak punktu / szukam sygnału / prowadzenie / na miejscu), obsługę fixu nieaktualnego po 20 s, problemów ze zgodą na lokalizację, wake locka i fallbacku kompasu na azymut z ruchu. Stopka ma jedną akcję drugorzędną „Wyjdź z trybu alarmu”; komentarz w `plan.md` S-01 (`:277`) wprost zostawia wyjście „niedostępne” dla S-02.
- `AlarmButton` (`src/components/AlarmButton.tsx:10-48`) zawiera jedyny w projekcie automat przytrzymania: `pointerdown/up/leave/cancel`, `keydown/keyup`, `blur`, zwolnienie przechwycenia wskaźnika, pierścień postępu na `requestAnimationFrame`. Logika jest sprawna i zweryfikowana na telefonie, ale zamknięta w komponencie i zahardkodowana na `window.location.assign("/alarm")`.
- `EvacuationPointCard` (`src/components/EvacuationPointCard.tsx`) obsługuje jedno miejsce: nazwa, „Ustaw tutaj” z GPS, ręczne współrzędne z `parseCoordinates`, komunikaty błędów i potwierdzenia.
- Testy: Vitest wyłącznie dla czystych funkcji w `src/lib/` (`geo.test.ts`, `plan-storage.test.ts`); brak testów komponentów i E2E — taki jest kontrakt z `CLAUDE.md`.
- Tokeny: `--destructive` w Execution Mode to `#FF747A` (`src/styles/global.css:123`), `--guidance` to `#F2C15C` (`:127`), `--safe` to `#6BC49B` (`:129`). **Żaden nowy token nie jest potrzebny.**

Czego nie ma: pojęcia kroku, jakiegokolwiek stanu przebiegu ewakuacji, miejsca spotkania i miejsca zapasowego w danych oraz w UI przygotowań.

## Desired End State

Na telefonie, w trybie samolotowym: organizator ma w sekcji „Miejsca” na stronie domowej ustawione trzy miejsca. Przytrzymuje alarm i trafia na `/alarm`, gdzie widzi pierwszy krok („Zabierz plecak ewakuacyjny”) z jedną akcją. Potwierdza go i dostaje prowadzenie strzałką do miejsca spotkania. Przytrzymuje „Punkt niedostępny” przez 2 s — cel przełącza się na miejsce zapasowe, strzałka i odległość natychmiast pokazują nowy kierunek, a przycisk awaryjny znika. Po dojściu poniżej 25 m widzi „Jesteś na miejscu” i jedną akcję „Dalej: Idź do punktu ewakuacji”. Gdy GPS nie potwierdza dojścia, przytrzymuje „Potwierdź dojście” przez 2 s i potwierdza dotknięciem. Ostatni krok kończy się ekranem „Jesteś na miejscu” z akcją „Zakończ tryb alarmu”, która czyści zapisany przebieg. Zabicie i ponowne otwarcie aplikacji w trakcie marszu wraca na ten sam krok; przebieg starszy niż 6 godzin startuje od początku.

### Key Discoveries

- Automat przytrzymania jest już napisany i sprawdzony w terenie (`AlarmButton.tsx:16-48`) — wystarczy go wydzielić, zamiast pisać drugi raz dla dwóch nowych akcji.
- `readPlan` jest synchroniczny **celowo**, bo to mechanizm spełnienia NFR „pierwszy krok < 2 s” (`plan-storage.ts:53-57`). Odczyt przebiegu musi zachować tę właściwość.
- `JEZYK_WIZUALNY.md` §18 ma gotową specyfikację tej akcji: „awaryjna akcja »punkt niedostępny« w czerwieni, wyraźnie drugorzędna wobec prowadzenia”, a §11 wymaga etykiety opisującej czynność („Idź do punktu zapasowego”, nie „OK”).
- Impl-review S-01 F9 (`reviews/impl-review.md:119-131`) odnotował, że gest przytrzymania jest niedostępny dla czytnika ekranu bez gestu przejścia — każdy nowy przycisk przytrzymania musi powtórzyć podpowiedź `sr-only` z `AlarmButton.tsx:112`.
- `scripts/smoke.mjs` sprawdza obecność stron w buildzie i w liście precache SW. S-02 nie dodaje strony, więc lista stron się nie zmienia.
- `build.format: "file"` i glob w `scripts/generate-sw.mjs` zostają bez zmian — nie pojawiają się nowe zasoby runtime.

## What We're NOT Doing

- **Głos czytający kroki** — S-03 (`voice-guidance`). Model kroku dostaje pole `instruction`, żeby S-03 miało co czytać, ale żadnej syntezy mowy tu nie ma.
- **Mapa i trasa pod strzałką** — S-04 (`offline-map-and-route`).
- **Domownicy, kontakty i treść checklisty plecaka** — S-05 i S-06. Krok „Zabierz plecak ewakuacyjny” jest pojedynczym krokiem akcji ze stałą polską treścią, bez listy pozycji.
- **Onboarding pierwszego uruchomienia** — S-07. Miejsca ustawia się na stronie domowej, nie w kreatorze.
- **Ekran gotowości i luki w przygotowaniu** — S-08. Brak miejsca zapasowego nie generuje tu quick wina; w prowadzeniu po prostu nie ma przycisku awaryjnego.
- **Edytowalna przez użytkownika lista kroków** — odrzucone w planowaniu: żadne FR tego nie wymaga, a cel to „szybkość do demo”.
- **Ekran podsumowania przebiegu** (ile kroków, czy użyto zapasowego, czas) — odrzucone; materiał dla S-08 i FR-017.
- **Cofanie kroku, przeskakiwanie w dowolne miejsce sekwencji, powrót z miejsca zapasowego** — zasada „minimum decyzji w kryzysie”. Reset przebiegu daje „Zakończ tryb alarmu” i próg świeżości.
- **Nowe tokeny, nowe strony, zmiany w service workerze, wibracje, testy komponentów.**

## Implementation Approach

Od środka na zewnątrz, tak jak w S-01: najpierw czysta logika z testami, potem UI, które ją zapełnia danymi, na końcu ekran, który ją konsumuje.

Sekwencja kroków jest **wyliczana z planu przy każdym wejściu w tryb alarmu**, nie przechowywana. Przechowywany jest wyłącznie przebieg: identyfikator bieżącego kroku i flaga aktywnego fallbacku, w osobnym kluczu `localStorage` (`wrw.run`). Rozdzielenie planu od przebiegu ma dwa konkretne skutki: plan nie puchnie o stan chwilowy, a przebieg można wyczyścić jednym `removeItem`, nie dotykając planu. Przebieg wskazuje krok **identyfikatorem, nie indeksem** — gdy organizator doda miejsce spotkania między dwoma przebiegami, indeks wskazywałby inny krok, a identyfikator po prostu się nie znajdzie i przebieg startuje od początku.

Trzy nowe pojęcia w warstwie czystej: `buildSteps(plan)` (plan → sekwencja), `resumeIndex(steps, run)` (przebieg → pozycja w sekwencji) i `parseRun(value, now)` (surowy JSON → przebieg albo `null`). Wszystkie trzy są czystymi funkcjami w `src/lib/`, czyli dokładnie tym, co pokrywa `npm test`.

W Execution Mode `GuidanceScreen` przestaje być ekranem jednego celu i staje się ekranem jednego **kroku**: rozwiązuje cel bieżącego kroku z planu i oddaje go niezmienionej warstwie czujników z S-01. Cała matematyka geo, obsługa fixu, wake lock i kompas zostają bez zmian.

## Critical Implementation Details

**Timing i cykl życia.** NFR „pierwszy krok < 2 s od zwolnienia alarmu” jest spełniany przez synchroniczny odczyt w inicjalizatorze `useState` (wzorzec z `GuidanceScreen.tsx:51`). Odczyt przebiegu musi dołączyć do tego samego, pierwszego przebiegu renderowania — `useEffect` pokazałby na moment krok pierwszy, a potem przeskoczył na właściwy. Z tego samego powodu próg świeżości liczy się raz, przy montowaniu, z jednego `Date.now()`; nie odświeża się tykaniem `useNow`.

**Sekwencja stanów przy przełączeniu na miejsce zapasowe.** Zapis przebiegu i podmiana celu muszą nastąpić w tej samej aktualizacji stanu React. Gdyby flaga trafiła najpierw do `localStorage`, a dopiero potem do stanu, strzałka pokazywałaby stary kierunek do następnego renderu — w kryzysie to strzałka wskazująca w złe miejsce.

**Dostępność gestu przytrzymania.** Przytrzymanie jest podpięte pod zdarzenia wskaźnika i klawiatury; podwójne stuknięcie czytnika ekranu generuje `click`, którego ten automat nie widzi (F9 z impl-review S-01). Każdy przycisk przytrzymania powtarza podpowiedź `sr-only` o geście przejścia, wzorem `AlarmButton.tsx:109-113`.

---

## Phase 1: Fundament — miejsca, sekwencja kroków i stan przebiegu

### Overview

Cała logika S-02 w czystych funkcjach z testami, plus migracja schematu planu. Na końcu fazy build i testy są zielone, a aplikacja zachowuje się jak przed zmianą (jeden cel, jeden ekran) — zmieniły się tylko nazwy w danych.

### Changes Required

#### 1. Trzy miejsca w typach planu

**File**: `src/types.ts`

**Intent**: Zastąpić pojedynczy `evacuationPoint` zestawem trzech miejsc wymaganym przez FR-004, nie wprowadzając trzech osobnych pól, które trzeba by obsługiwać z osobna w każdym miejscu wywołania.

**Contract**: `EvacuationPoint` zmienia nazwę na `Place` (ten sam kształt: `label`, `coords`). Nowy `PlaceKind = "meeting" | "backup" | "shelter"`. `HouseholdPlan.schemaVersion` to `2`, a `evacuationPoint: EvacuationPoint | null` zastępuje `places: Record<PlaceKind, Place | null>`. `Coordinates`, `LastKnownPosition` i `updatedAt` bez zmian. Nowy typ przebiegu:

```ts
export interface EvacuationRun {
  schemaVersion: 1;
  /** Identyfikator kroku, nie indeks — plan mógł się zmienić między przebiegami. */
  stepId: string;
  fallbackActive: boolean;
  /** ISO 8601 */
  startedAt: string;
  /** ISO 8601 — od tego liczy się próg świeżości */
  updatedAt: string;
}
```

#### 2. Migracja schematu planu

**File**: `src/lib/services/plan-storage.ts`

**Intent**: Przenieść zapisane plany z S-01 na nowy kształt bez utraty jedynej rzeczy, którą użytkownik już wprowadził — punktu ewakuacji. Wypełnia gałąź migracji zapowiedzianą w komentarzu `plan-storage.ts:53-57` i konwencję z `CLAUDE.md` („każda zmiana kształtu podnosi wersję i dopisuje migrację w `readPlan`”).

**Contract**: `CURRENT_SCHEMA_VERSION = 2`. `parsePlan` rozgałęzia się na wersji: `2` czyta `places` (każde miejsce walidowane osobno przez dotychczasowy `parsePlace`, uszkodzone → `null`), `1` mapuje `evacuationPoint → places.shelter` i ustawia `meeting` oraz `backup` na `null`, każda inna wartość → pusty plan. `createEmptyPlan` zwraca trzy `null`-e. `saveLastKnownPosition` bez zmian. Zachowane gwarancje: funkcja nigdy nie rzuca, a uszkodzone pod-pole staje się `null`, nie unieważnia całego planu.

#### 3. Sekwencja kroków ewakuacji

**File**: `src/lib/evacuation-steps.ts` (nowy)

**Intent**: Zamienić plan w sekwencję kroków — to ta „czwarta decyzja” z sekcji Business Logic PRD („zamienia plan w sekwencję kroków ewakuacji”). Jako czysta funkcja jest testowalna bez telefonu i bez przeglądarki, a S-03 i S-07 mogą ją wywołać bez dotykania ekranu prowadzenia.

**Contract**: Typ kroku z dwoma wariantami i polem `instruction` przewidzianym dla S-03:

```ts
export type EvacuationStep =
  | { id: string; kind: "action"; title: string; instruction: string }
  | { id: string; kind: "navigate"; title: string; instruction: string; place: PlaceKind; fallback: PlaceKind | null };
```

`buildSteps(plan: HouseholdPlan): EvacuationStep[]` w stałej kolejności: krok akcji „Zabierz plecak ewakuacyjny”, potem `navigate` do `meeting` (jeśli ustawione), potem `navigate` do `shelter` (jeśli ustawione). Reguły, które muszą być pokryte testami:

- brak jakiegokolwiek kroku `navigate` → zwraca `[]` (prowadzenie bez celu nie ma sensu, a `/alarm` ma na to osobny stan);
- `fallback: "backup"` tylko na kroku `meeting` i tylko gdy `places.backup !== null`; w każdym innym przypadku `null`;
- `id` jest stabilny i niezależny od pozycji (`"backpack"`, `"meeting"`, `"shelter"`).

Dodatkowo dwie czyste funkcje: `resumeIndex(steps, run): number` (indeks kroku o `run.stepId`, albo `0`, gdy go nie ma) i `targetPlaceKind(step, run): PlaceKind | null` (`step.fallback`, gdy `run.fallbackActive` i krok ma fallback; inaczej `step.place`; dla kroku akcji `null`). Polskie tytuły i instrukcje kroków żyją w tym pliku, jako jedno źródło treści dla ekranu i dla przyszłego głosu.

#### 4. Zapis przebiegu ewakuacji

**File**: `src/lib/services/run-storage.ts` (nowy)

**Intent**: Przebieg ma przeżyć ubicie aplikacji w marszu, ale nie ma witać nikogo dzień później — ani na scenie przy drugim podejściu do demo. Osobny klucz, żeby `clearRun` nie dotykał planu.

**Contract**: Klucz `wrw.run`, `RUN_FRESH_MS = 6 * 60 * 60 * 1000`. Eksportuje `parseRun(value: unknown, now: number): EvacuationRun | null` (eksportowane dla testów, wzorem `parsePlan`), `readRun(): EvacuationRun | null`, `writeRun(run): void`, `clearRun(): void`. `parseRun` zwraca `null`, gdy: wartość nie jest obiektem, `schemaVersion !== 1`, `stepId` nie jest niepustym napisem, `fallbackActive` nie jest wartością logiczną, znacznik czasu jest nieparsowalny albo `now - Date.parse(updatedAt) >= RUN_FRESH_MS`. `writeRun` nadpisuje `updatedAt` bieżącym czasem (wzorem `writePlan`). Wszystkie funkcje przechwytują wyjątki `localStorage` i nigdy nie rzucają.

#### 5. Testy logiki kroków i przebiegu

**File**: `src/lib/evacuation-steps.test.ts` (nowy), `src/lib/services/run-storage.test.ts` (nowy), `src/lib/services/plan-storage.test.ts`

**Intent**: Te reguły nie są widoczne na ekranie — pusta sekwencja, fallback na niewłaściwym kroku albo wznowiony przebieg wskazujący nieistniejący krok wyglądają jak „ekran się zepsuł”, i to w kryzysie. Pokrycie testami jest tu tańsze od diagnozy w terenie.

**Contract**: `evacuation-steps.test.ts` pokrywa: pełny plan → trzy kroki w kolejności; plan bez miejsca spotkania → krok akcji + schron, bez fallbacku; plan bez schronu → krok akcji + spotkanie; plan bez miejsc → `[]`; brak miejsca zapasowego → `fallback === null` na kroku spotkania; `resumeIndex` dla znanego i dla nieistniejącego `stepId`; `targetPlaceKind` dla aktywnego i nieaktywnego fallbacku. `run-storage.test.ts` pokrywa `parseRun`: poprawny przebieg, przebieg starszy niż próg, zła wersja schematu, uszkodzone pola, nieparsowalny znacznik czasu. `plan-storage.test.ts` dostaje nowy przypadek: plan `schemaVersion: 1` z `evacuationPoint` migruje się na `places.shelter` z zachowanym `lastKnownPosition`, a istniejące przypadki przechodzą na kształt v2.

#### 6. Aktualizacja miejsc wywołania

**File**: `src/components/GuidanceScreen.tsx`, `src/components/EvacuationPointCard.tsx`

**Intent**: Utrzymać zielony build i działającą aplikację na końcu fazy. To wyłącznie zmiana nazw: `plan.evacuationPoint` → `plan.places.shelter`, bez zmian zachowania.

**Contract**: Oba komponenty czytają i zapisują `places.shelter`. Żaden tekst interfejsu, żaden stan ekranu i żadne zachowanie czujników się nie zmienia — kroki i trzy miejsca przychodzą w fazach 2 i 3.

### Success Criteria

#### Automated Verification

- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Testy przechodzą, łącznie z nowymi plikami `evacuation-steps.test.ts` i `run-storage.test.ts`: `npm test`
- Build przechodzi: `npm run build`
- Smoke przechodzi bez zmian w pliku: `npm run smoke`

#### Manual Verification

- Plan zapisany przed zmianą (`schemaVersion: 1` z punktem ewakuacji) po wgraniu nowej wersji nadal prowadzi do tego samego punktu — migracja nie gubi danych
- `/alarm` i strona domowa zachowują się dokładnie jak przed fazą

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie, że migracja zadziałała na urządzeniu z zapisanym planem z S-01, zanim przejdziesz do fazy 2.

---

## Phase 2: Przygotowanie — sekcja „Miejsca”

### Overview

Trzy miejsca do ustawienia tam, gdzie dziś jest jedno. Realizuje część FR-004 potrzebną S-02 i daje fazie 3 dane do zbudowania sekwencji.

### Changes Required

#### 1. Karta miejsca

**File**: `src/components/PlaceCard.tsx` (nowa, uogólnienie `src/components/EvacuationPointCard.tsx`), `src/components/EvacuationPointCard.tsx` (usunięty)

**Intent**: Jedna karta obsługująca dowolne z trzech miejsc, zamiast trzech kopii logiki „Ustaw tutaj” i parsowania współrzędnych.

**Contract**: Props `{ kind: PlaceKind; title: string; description: string; emphasis: "primary" | "secondary" }`. Zachowuje całe zachowanie `EvacuationPointCard`: nazwa miejsca, „Ustaw tutaj” z `requestCurrentPosition`, formularz ręcznych współrzędnych z `parseCoordinates`, komunikaty błędów lokalizacji, obszar `role="status"` z potwierdzeniem, `aria-busy` na czas ustalania pozycji. Czyta i zapisuje `plan.places[kind]`. `emphasis` steruje wyłącznie wariantem przycisku „Ustaw tutaj” (`default` kontra `outline`) — żadnej zmiany układu, bo `JEZYK_WIZUALNY.md` §3 wymaga jednej dominującej akcji na sekcję, a trzy wypełnione stalowe przyciski obok siebie łamią tę zasadę. Domyślne nazwy miejsc: „Miejsce spotkania”, „Miejsce zapasowe”, „Punkt ewakuacji”.

Uwaga na zapis: trzy wyspy zapisują ten sam klucz `localStorage`, a każda trzyma plan w swoim stanie. Każdy zapis musi iść przez `readPlan()` tuż przed `writePlan` (wzorzec już obecny w `EvacuationPointCard.tsx:33-34`), inaczej druga karta nadpisze miejsce ustawione przez pierwszą.

#### 2. Sekcja „Miejsca” na stronie domowej

**File**: `src/components/HomeScreen.astro`

**Intent**: Zgrupować trzy miejsca w jednej sekcji o własnym sensie (§10 JV: grupuj tylko wtedy, gdy karta ma własny sens), zachowując spokojną hierarchię strony przygotowań.

**Contract**: Sekcja `aria-labelledby` z nagłówkiem „Miejsca” renderowanym statycznie w Astro (poza wyspą — to jedyna część, którą smoke może zobaczyć w HTML) i krótkim kontekstem wyjaśniającym rolę każdego miejsca. W środku trzy `PlaceCard` jako `client:only="react"` (wymóg z `CLAUDE.md` dla wysp czytających `localStorage`), w kolejności: miejsce spotkania, miejsce zapasowe, punkt ewakuacji. `emphasis="primary"` dla pierwszego miejsca, `secondary` dla pozostałych. Istniejące elementy strony — sekcja alarmu, odnośnik do `/czujniki`, blok statusu offline z kontacją `data-offline-status` — zostają nietknięte.

#### 3. Asercja smoke na sekcję miejsc

**File**: `scripts/smoke.mjs`

**Intent**: Nagłówek sekcji jest jedynym statycznym śladem miejsc w HTML; asercja wychwyci przypadkowe usunięcie sekcji przy przyszłych zmianach strony domowej.

**Contract**: Dodaje do istniejących sprawdzeń `/` asercję, że HTML zawiera nagłówek sekcji miejsc. Zachowuje wszystkie obecne kontrakty (`lang="pl"`, manifest, `data-offline-status`, strony, lista precache, nagłówki). Lista stron i precache bez zmian — S-02 nie dodaje strony.

### Success Criteria

#### Automated Verification

- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Testy przechodzą: `npm test`
- Build przechodzi: `npm run build`
- Smoke z nową asercją przechodzi: `npm run smoke`

#### Manual Verification

- Ustawienie trzech miejsc po kolei („Ustaw tutaj” i wpisane współrzędne) zapisuje wszystkie trzy — żadne nie nadpisuje poprzedniego po odświeżeniu strony
- Każde miejsce przeżywa zamknięcie i ponowne otwarcie aplikacji
- Strona domowa ma nadal jeden czytelny dominujący następny krok, a nie trzy równorzędne stalowe przyciski
- Blok statusu offline nadal dochodzi do stanu „Gotowe do pracy offline”

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie testów ręcznych, zanim przejdziesz do fazy 3.

---

## Phase 3: Prowadzenie — kroki, „niedostępne” i potwierdzenie dojścia

### Overview

Serce slice'u: `/alarm` przechodzi z jednego celu na sekwencję kroków, dostaje czerwone wyjście awaryjne na kroku miejsca spotkania i dwa gesty przytrzymania chroniące akcje, których nie da się cofnąć. Realizuje FR-013 i oba brakujące kryteria akceptacji US-01.

### Changes Required

#### 1. Wydzielenie automatu przytrzymania

**File**: `src/components/hooks/useHoldAction.ts` (nowy), `src/components/AlarmButton.tsx`

**Intent**: S-02 dodaje dwa przyciski przytrzymania. Trzy kopie automatu zdarzeń wskaźnika (ze zwolnieniem przechwycenia, `pointerleave`, `blur`, obsługą klawiatury i pierścieniem na `requestAnimationFrame`) to trzy miejsca, w których ten sam błąd może się pojawić osobno. Logika już istnieje i jest sprawdzona na telefonie — przenosimy ją, nie przepisujemy.

**Contract**: Hook `useHoldAction(holdMs: number, onComplete: () => void)` zwraca `{ progress: number; holding: boolean; handlers }`, gdzie `handlers` to zestaw propsów do rozłożenia na elemencie `<button>` (`onPointerDown`, `onPointerUp`, `onPointerLeave`, `onPointerCancel`, `onKeyDown`, `onKeyUp`, `onBlur`, `onContextMenu`). Zachowanie przeniesione 1:1 z `AlarmButton.tsx:16-48`, łącznie ze zwolnieniem przechwycenia wskaźnika przy `pointerdown` (bez tego zjechanie palcem nie anuluje przytrzymania) i z `cancelAnimationFrame` oraz `clearTimeout` w funkcji sprzątającej. `AlarmButton` zachowuje **niezmienioną** strukturę DOM, klasy, etykiety i podpowiedź `sr-only` — zmienia się wyłącznie źródło `progress` i `holding`. Nie zmieniaj czasu 2000 ms ani wyglądu pierścienia: ten przycisk przeszedł testy w terenie w S-01.

#### 2. Przycisk przytrzymania dla Execution Mode

**File**: `src/components/HoldButton.tsx` (nowy)

**Intent**: Dwie nowe akcje na ekranie prowadzenia potrzebują tego samego widocznego sprzężenia zwrotnego co alarm (pierścień postępu, licznik sekund), ale w hierarchii drugorzędnej wobec strzałki.

**Contract**: Props `{ holdMs; onComplete; label; holdingLabel?; icon; className; hintId? }`, zbudowany na `useHoldAction`. Pierścień postępu jak w `AlarmButton` (ten sam promień i grubość), etykieta opisuje czynność (§11 JV), minimalny target 44 × 44 px (§15), `touch-none` i `select-none` dla gestu przytrzymania, pierścień focusu `3px` z odstępem `2px` w kolorze właściwym dla wariantu. Kolory wyłącznie z tokenów przez klasy Tailwind, podawane przez `className` wołającego — komponent nie zna trybu. Podpowiedź `sr-only` o geście przejścia czytnika ekranu, wzorem `AlarmButton.tsx:112`.

#### 3. Automat kroków na ekranie prowadzenia

**File**: `src/components/GuidanceScreen.tsx`

**Intent**: Jeden ekran, jeden krok — kryterium akceptacji US-01, którego dziś nie ma. Cel prowadzenia przestaje być stały i wynika z bieżącego kroku oraz z flagi fallbacku.

**Contract**: Sekwencja i przebieg czytane synchronicznie w inicjalizatorach `useState` (`buildSteps(readPlan())`, `readRun()`), pozycja startowa przez `resumeIndex`. Cel prowadzenia to `plan.places[targetPlaceKind(step, run)]`. Cała dotychczasowa warstwa czujników — `useGeolocation`, `useHeading`, `useScreenWakeLock`, progi `ARRIVAL_RADIUS_METERS = 25` i `FIX_STALE_MS = 20_000`, logika fixu żywego/nieaktualnego, `LOCATION_PROBLEMS`, `saveLastKnownPosition` — zostaje bez zmian i jest zasilana celem bieżącego kroku.

Stany ekranu:

| Stan | Warunek | Co widać |
| --- | --- | --- |
| Brak sekwencji | `buildSteps()` zwraca `[]` | „Nie wskazano żadnego miejsca” i odnośnik do strony domowej |
| Krok akcji | `step.kind === "action"` | Tytuł i instrukcja kroku, jedna akcja guidance „Zrobione — dalej” |
| Prowadzenie | krok `navigate`, cel ustalony, brak doszukanego dojścia | Tytuł kroku, strzałka, odległość — jak dziś; w stopce akcje awaryjne |
| Na miejscu (krok pośredni) | żywy fix, odległość < 25 m | „Jesteś na miejscu”, jedna akcja guidance „Dalej: <tytuł następnego kroku>” |
| Koniec sekwencji | dojście na ostatnim kroku | „Jesteś na miejscu”, akcja „Zakończ tryb alarmu” czyszcząca przebieg |

Dotychczasowe stany „Szukam sygnału GPS”, „Dane z HH:MM” (fix nieaktualny) i problem ze zgodą na lokalizację zostają niezmienione i obowiązują wewnątrz stanu „Prowadzenie”.

Trzy przejścia zmieniają przebieg i każde zapisuje go przez `writeRun` **w tej samej aktualizacji stanu**, w której zmienia się widok (patrz Critical Implementation Details):

- **Dalej** — jedno dotknięcie, dostępne po dojściu (albo na kroku akcji). Ustawia `stepId` następnego kroku i zeruje `fallbackActive`.
- **Punkt niedostępny** — widoczne wyłącznie gdy `step.fallback !== null` i `!run.fallbackActive`. `HoldButton`, 2000 ms, kolor `destructive`, wyraźnie drugorzędny wobec strzałki (§18 JV). Etykieta opisuje czynność: „Punkt niedostępny — idź do zapasowego”. Ustawia `fallbackActive: true`; tytuł kroku zmienia się na wariant dla miejsca zapasowego, przycisk znika, a strzałka i odległość przeliczają się na nowy cel w tym samym renderze.
- **Potwierdź dojście** — dwustopniowe, bo potwierdza coś, czego GPS nie potwierdził: `HoldButton` 2000 ms przestawia akcję w stan potwierdzenia, a dopiero dotknięcie „Potwierdź: jestem na miejscu” przechodzi dalej. Stan potwierdzenia wygasa przy opuszczeniu kroku. Akcja jest stale dostępna na kroku `navigate` (nie po czasie), w hierarchii drugorzędnej, obok „Wyjdź z trybu alarmu”.

Hierarchia stopki, żeby ekran miał jedną dominującą akcję (§5 JV): w stanie „Prowadzenie” dominuje strzałka, a stopka ma kolejno „Punkt niedostępny” (gdy dostępny), „Potwierdź dojście” i „Wyjdź z trybu alarmu”; po dojściu „Potwierdź dojście” znika jako zbędne, a jego miejsce zajmuje akcja guidance „Dalej”. „Wyjdź z trybu alarmu” **nie** czyści przebiegu — dzięki temu powrót na `/alarm` wraca na ten sam krok; czyści go tylko „Zakończ tryb alarmu” na końcu sekwencji oraz próg świeżości po 6 godzinach.

Kolory wyłącznie z tokenów §6 przez klasy Tailwind, bez hexów: tytuł kroku `text-foreground`, instrukcja i tekst pomocniczy `text-muted-foreground`, strzałka i odległość oraz akcja „Dalej” `text-guidance` / `bg-guidance`, stan dojścia `text-safe`, akcja awaryjna `destructive`.

### Success Criteria

#### Automated Verification

- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Testy przechodzą: `npm test`
- Build przechodzi: `npm run build`
- Smoke przechodzi: `npm run smoke`

#### Manual Verification

- Na telefonie w trybie samolotowym przytrzymanie alarmu przez 2 s pokazuje pierwszy krok w mniej niż 2 s od zwolnienia (mierzone stoperem) — NFR nie uległ regresji po dodaniu odczytu przebiegu
- Każdy ekran pokazuje dokładnie jeden następny krok; „Zrobione — dalej” na kroku plecaka przechodzi na prowadzenie do miejsca spotkania
- Przytrzymanie „Punkt niedostępny” przez 2 s przełącza cel na miejsce zapasowe: tytuł, strzałka i odległość zmieniają się natychmiast, a przycisk znika
- Zwolnienie „Punkt niedostępny” po 1 s nie przełącza celu
- Dojście poniżej 25 m do miejsca spotkania pokazuje „Jesteś na miejscu” i „Dalej: Idź do punktu ewakuacji”
- Przytrzymanie „Potwierdź dojście” i dotknięcie potwierdzenia przechodzi dalej bez dojścia w promieniu 25 m
- Zamknięcie i ponowne otwarcie aplikacji w trakcie prowadzenia na drugim kroku wraca na drugi krok, z zachowanym fallbackiem
- „Zakończ tryb alarmu” na ostatnim kroku czyści przebieg: kolejne przytrzymanie alarmu startuje od kroku pierwszego
- Prowadzenie bez ustawionego miejsca zapasowego nie pokazuje przycisku awaryjnego, a sekwencja działa
- Plan z samym punktem ewakuacji (stan po migracji z S-01) prowadzi do niego bez kroku miejsca spotkania
- Ekran na `/alarm` nie gaśnie przez 2 min marszu — wake lock nie uległ regresji
- Przycisk alarmu działa jak przed wydzieleniem hooka: 2 s uruchamia, 1 s nie uruchamia, klawiatura Space/Enter działa

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie testów ręcznych w terenie, zanim przejdziesz do fazy 4.

---

## Phase 4: Weryfikacja offline i domknięcie dokumentów

### Overview

Pełny przebieg na telefonie w trybie samolotowym pod publicznym adresem i odnotowanie decyzji tam, gdzie następny slice ich poszuka.

### Changes Required

#### 1. Zamknięcie S-02 w roadmapie

**File**: `context/foundation/roadmap.md`

**Intent**: Odblokować S-03 i S-04 oraz utrzymać Baseline jako aktualny opis kodu — kolejne slice'y czytają go, żeby nie budować drugi raz tego samego.

**Contract**: `S-02` na `done` w tabeli „At a glance” i w sekcji „Slices”; wpis w „Backlog Handoff” z notatką o archiwizacji (wzorem wiersza S-01); wpis w sekcji „Done”. Baseline: pozycja **Data** odnotowuje `schemaVersion: 2` z trzema miejscami oraz drugi klucz `wrw.run` z przebiegiem i progiem świeżości; pozycja **Tests** odnotowuje testy sekwencji kroków i przebiegu. Status S-02 flipuje się w commicie archiwizacji, nie wcześniej (nauka z F5 impl-review S-01).

#### 2. Odnotowanie decyzji w PRD

**File**: `context/foundation/prd.md`

**Intent**: Trzy decyzje z tego planowania nie wynikają z PRD i bez wpisu wrócą jako pytania w S-03 i S-07.

**Contract**: Wpis w sekcji „Rozstrzygnięte” pod Open Questions: (a) wyjście awaryjne „niedostępne” jest dostępne wyłącznie na kroku miejsca spotkania i przełącza cel na miejsce zapasowe, a sekwencja biegnie dalej do punktu ewakuacji; (b) przebieg ewakuacji jest zapisywany lokalnie i wznawiany tylko gdy jest świeższy niż 6 godzin; (c) sekwencja kroków jest wyliczana z planu, nie edytowana przez użytkownika, a kroki przejścia bez potwierdzenia GPS oraz przełączenie na miejsce zapasowe są chronione przytrzymaniem. Nie dopisujemy nowych FR i nie zmieniamy istniejących.

#### 3. Zapis konwencji w instrukcjach dla agentów

**File**: `CLAUDE.md`

**Intent**: Dwa nowe fakty, których nie da się wyczytać ze struktury katalogów: drugi klucz w `localStorage` i to, że sekwencja kroków jest wyliczana, a nie przechowywana.

**Contract**: Sekcja „Key conventions” / „Architecture”: `wrw.plan` ma `schemaVersion: 2` z `places` (`meeting`, `backup`, `shelter`); przebieg ewakuacji żyje osobno pod `wrw.run` i jest wznawiany tylko w progu świeżości; sekwencja kroków wynika z planu przez `buildSteps` w `src/lib/evacuation-steps.ts` i nie jest zapisywana. Bez duplikowania specyfikacji wizualnej — odnośnik do `JEZYK_WIZUALNY.md` zostaje.

### Success Criteria

#### Automated Verification

- Lint, typy, testy, build i smoke przechodzą na gałęzi: `npm run lint && npx astro check && npm test && npm run build && npm run smoke`
- CI na gałęzi `step-flow-and-fallback` jest zielone (`ci` i `smoke`)
- Smoke na żywym adresie po wdrożeniu: `BASE_URL=https://w-razie-w.jzogala.workers.dev EXPECT_HEADERS=1 npm run smoke`

#### Manual Verification

- Na telefonie w trybie samolotowym, pod publicznym adresem, pełny przebieg przechodzi od przytrzymania alarmu do „Zakończ tryb alarmu”, z użyciem „Punkt niedostępny” na kroku miejsca spotkania
- Przebieg działa bez sieci po pierwszym otwarciu online (service worker precache'uje wszystkie strony)
- Wpisy w roadmapie, PRD i `CLAUDE.md` odpowiadają temu, co faktycznie działa w kodzie

---

## Testing Strategy

### Unit Tests

Vitest, wyłącznie czyste funkcje w `src/lib/` (kontrakt z `CLAUDE.md` — środowisko node, bez jsdom, bez testów komponentów React):

- `buildSteps`: pełny plan, plan bez miejsca spotkania, plan bez schronu, plan bez miejsc, plan bez miejsca zapasowego (brak fallbacku)
- `resumeIndex`: znany `stepId`, `stepId` nieobecny w przebudowanej sekwencji
- `targetPlaceKind`: fallback aktywny i nieaktywny, krok akcji
- `parseRun`: poprawny przebieg, przebieg poza progiem świeżości, zła wersja schematu, uszkodzone pola, nieparsowalny znacznik czasu
- `parsePlan`: migracja v1 → v2 z zachowaniem `lastKnownPosition`, walidacja każdego z trzech miejsc osobno

### Integration Tests

Brak frameworka E2E i nie dodajemy go (cel „szybkość do demo”). Rolę testu integracyjnego pełni `npm run smoke`: strony istnieją w buildzie, są w liście precache service workera, a strona domowa zawiera sekcję miejsc i kontrakt `data-offline-status`.

### Manual Testing Steps

1. Na stronie domowej ustaw trzy miejsca: miejsce spotkania („Ustaw tutaj”), miejsce zapasowe (wpisane współrzędne kilkaset metrów dalej), punkt ewakuacji (wpisane współrzędne). Odśwież i sprawdź, że wszystkie trzy się zapisały.
2. Wejdź na `/czujniki` i udziel zgody na lokalizację oraz kompas.
3. Włącz tryb samolotowy. Przytrzymaj alarm 2 s i zmierz stoperem czas do pojawienia się pierwszego kroku (< 2 s).
4. Potwierdź krok plecaka („Zrobione — dalej”) i sprawdź, że strzałka prowadzi do miejsca spotkania.
5. Przytrzymaj „Punkt niedostępny” 1 s i puść — cel się nie zmienia. Potem przytrzymaj 2 s — cel, tytuł, strzałka i odległość przełączają się na miejsce zapasowe, a przycisk znika.
6. Dojdź do miejsca zapasowego poniżej 25 m — pojawia się „Jesteś na miejscu” i „Dalej: Idź do punktu ewakuacji”.
7. Zamknij aplikację (ubij z przełącznika zadań) i otwórz ponownie `/alarm` — wracasz na ten sam krok z zachowanym fallbackiem.
8. Na kroku punktu ewakuacji przytrzymaj „Potwierdź dojście” i dotknij potwierdzenia — sekwencja kończy się ekranem „Jesteś na miejscu”.
9. Dotknij „Zakończ tryb alarmu”, przytrzymaj alarm ponownie — sekwencja startuje od kroku pierwszego.
10. Wyczyść miejsce zapasowe w przygotowaniach i powtórz krok 4 — przycisku awaryjnego nie ma, a prowadzenie działa.
11. Na urządzeniu z planem zapisanym przed zmianą sprawdź, że punkt ewakuacji przeżył migrację.

## Performance Considerations

`buildSteps` i `readRun` wykonują się raz, przy montowaniu wyspy, na danych wielkości kilku obiektów — nie wchodzą w budżet 2 s w sposób mierzalny. Nowe pliki w `src/lib/` to czysty TypeScript bez zależności, więc bundle `/alarm` rośnie o kilkaset bajtów. `HoldButton` dodaje pętlę `requestAnimationFrame` wyłącznie na czas trwania przytrzymania (maks. 2 s), tak jak `AlarmButton` dziś. Nieruszona zostaje znana z impl-review S-01 obserwacja F8(d) — kompas aktualizuje stan z częstotliwością sensora i przerysowuje ekran — odłożona do danych z terenu.

## Migration Notes

Pierwsza migracja schematu planu w tym projekcie. `schemaVersion: 1` z pojedynczym `evacuationPoint` mapuje się na `places.shelter`, a `meeting` i `backup` startują jako `null` — użytkownik po S-01 nie traci jedynego miejsca, które wprowadził, i dostaje prowadzenie do niego bez kroku miejsca spotkania. Migracja jest jednokierunkowa: po zapisie planu w wersji 2 starsza wersja aplikacji przeczyta go jako pusty plan (`parsePlan` odrzuca nieznane wersje). Nowy klucz `wrw.run` nie wymaga migracji — nieznany albo uszkodzony przebieg czyta się jako `null`, czyli start od pierwszego kroku.

## References

- Roadmapa, slice S-02: `context/foundation/roadmap.md:96-106`
- Wymagania: `context/foundation/prd.md` — FR-013, FR-004, US-01 (kryteria akceptacji), Business Logic
- Język wizualny: `JEZYK_WIZUALNY.md` §5 (wzorzec widoku Execution Mode), §11 (etykiety i stany akcji), §18 („Prowadzenie do punktu”)
- Poprzedni slice: `context/archive/2026-10-03-guided-to-point-offline/plan.md`, w szczególności tabela stanów `/alarm` (`:266-277`)
- Dług i obserwacje z S-01: `context/archive/2026-10-03-guided-to-point-offline/reviews/impl-review.md` — F2 (fix nieaktualny), F8 (kompas), F9 (dostępność przytrzymania)
- Automat przytrzymania do wydzielenia: `src/components/AlarmButton.tsx:16-48`
- Wzorzec walidacji i migracji: `src/lib/services/plan-storage.ts:39-67`

## Addendum (faza 4) — odstępstwa od kontraktów faz 1–3

Dopisane przy domykaniu S-02. Każda pozycja jest już w kodzie i w zielonej weryfikacji automatycznej; trafia tu, bo nie wynikała z kontraktów powyżej, a następny slice będzie jej szukał w planie. Źródło: `reviews/impl-review-phase-1-3.md` (F8 — pozycje 1–3, F2 — ekran wznowienia).

1. **`stepContent(step, run)` w `src/lib/evacuation-steps.ts`** plus wpis `NAVIGATION_CONTENT.backup`. Wymagane przez klauzulę fazy 3 „tytuł kroku zmienia się na wariant dla miejsca zapasowego", ale nieobecne w kontrakcie `evacuation-steps.ts`, który wymieniał tylko `buildSteps`, `resumeIndex` i `targetPlaceKind`. Treść kroków zostaje w jednym pliku, zgodnie z intencją kontraktu.
2. **Stan `confirmedArrival` w `GuidanceScreen`.** Tabela stanów fazy 3 warunkuje „Koniec sekwencji" na dojściu potwierdzonym przez GPS. Ręczne „Potwierdź dojście" na **ostatnim** kroku musi dawać ten sam stan końcowy, inaczej sekwencji nie da się domknąć bez zasięgu GPS — stąd osobna flaga. Dodana ścieżka, nie zmiana istniejącej.
3. **`useGeolocation({ watch: steps.length > 0 })`** zamiast dawnego `watch: point !== null`. Watcher chodzi teraz także na kroku akcji („Zabierz plecak"), który nie ma celu — żeby fix był ciepły w momencie wejścia w prowadzenie (NFR pierwszego kroku). Jest to zmiana zachowania wewnątrz warstwy czujników, którą kontrakt fazy 3 zamroził jako „bez zmian", więc zostaje odnotowana jawnie.
4. **Ekran wznowienia przerwanego przebiegu** (`resumePrompt` w `GuidanceScreen`, akcje „Kontynuuj: <krok>" i „Zacznij od początku"). Kontrakt fazy 3 zakładał ciche wznowienie na zapisanym kroku. Review wykazało, że „Wyjdź z trybu alarmu" nie czyści przebiegu, więc przypadkowy alarm sprzed godziny mógł w cichym wznowieniu pominąć krok z plecakiem — jedyny krok, którego pominąć nie wolno. Wznowienie jest więc jawne, ale tylko gdy przebieg wskazuje krok dalszy niż pierwszy; świeży alarm nie ma przebiegu i nie widzi tego ekranu, więc pomiar NFR z 3.6 jest nietknięty.

5. **Integracja z S-03 `voice-guidance`, zmergowanym do `main` równolegle.** Plan zakładał, że S-02 wchodzi na S-01; w praktyce S-03 wylądowało na `main` pierwsze i przebudowało ten sam `GuidanceScreen`. Scalenie wymagało rozszerzenia warstwy głosu o pojęcie kroku, bo warianty `GuidanceVoiceState` były zbudowane wokół jednego celu:
   - nowe warianty `noSteps` (zamiast `noPoint`), `resume` i `action`; `guiding` dostaje `title` i `fallback`, `arrived` dostaje `next`;
   - `stateKey` w `useVoiceGuidance` zawiera tytuł kroku i nazwę miejsca — bez tego przejście z miejsca spotkania na punkt ewakuacji (oba `guiding:live`) nie zmieniałoby klucza i głos przemilczałby zmianę celu;
   - `arrivedOnceRef` (pojedyncza flaga) zmieniony na `arrivedPlaceRef` z nazwą miejsca, bo sekwencja ma wiele dojść, a jedna flaga uciszyłaby każde kolejne; tłumienie drgania na progu dotyczy teraz tylko tego samego miejsca;
   - `LOCATION_PROBLEMS` czytane z `@/lib/guidance-copy` (S-03 wyprowadziło je z komponentu), a `useVoiceGuidance` wołany przed wczesnymi `return`-ami, więc wyliczenia geo przeniosły się nad nie.

   Wyjście awaryjne i przejścia między krokami są teraz zapowiadane głosem, co domyka FR-015 („słyszy kolejne kroki”) dla sekwencji, nie tylko dla jednego punktu. Nowe przypadki w `src/lib/voice.test.ts`.

Pozycje F8.4 (wspólny akapit `<p id="hold-hint">`) i F8.5 (korekty treści) nie wymagają wpisu. Świadomie **nieprzyjęte** zalecenia review: F6 (podpowiedź `sr-only` wewnątrz przycisku wchodzi do nazwy dostępnej) i F9 (nazwy miejsca nie da się zmienić bez ponownego ustawienia współrzędnych — zachowanie odziedziczone z `EvacuationPointCard`). Oba są długiem do S-07 albo do osobnej zmiany dostępności.

## Progress

> Konwencja: `- [ ]` do zrobienia, `- [x]` zrobione. Po zakończeniu kroku dopisz ` — <commit sha>`. Nie zmieniaj tytułów kroków. Patrz `references/progress-format.md`.

### Phase 1: Fundament — miejsca, sekwencja kroków i stan przebiegu

#### Automated

- [x] 1.1 Lint przechodzi: `npm run lint` — 6614e4f
- [x] 1.2 Typy przechodzą: `npx astro check` — 6614e4f
- [x] 1.3 Testy przechodzą, łącznie z nowymi plikami `evacuation-steps.test.ts` i `run-storage.test.ts`: `npm test` — 6614e4f
- [x] 1.4 Build przechodzi: `npm run build` — 6614e4f
- [x] 1.5 Smoke przechodzi bez zmian w pliku: `npm run smoke` — 6614e4f

#### Manual

- [x] 1.6 Plan zapisany przed zmianą (`schemaVersion: 1` z punktem ewakuacji) po wgraniu nowej wersji nadal prowadzi do tego samego punktu — migracja nie gubi danych — 6614e4f
- [x] 1.7 `/alarm` i strona domowa zachowują się dokładnie jak przed fazą — 6614e4f

### Phase 2: Przygotowanie — sekcja „Miejsca”

#### Automated

- [x] 2.1 Lint przechodzi: `npm run lint` — 266ffce
- [x] 2.2 Typy przechodzą: `npx astro check` — 266ffce
- [x] 2.3 Testy przechodzą: `npm test` — 266ffce
- [x] 2.4 Build przechodzi: `npm run build` — 266ffce
- [x] 2.5 Smoke z nową asercją przechodzi: `npm run smoke` — 266ffce

#### Manual

- [x] 2.6 Ustawienie trzech miejsc po kolei („Ustaw tutaj” i wpisane współrzędne) zapisuje wszystkie trzy — żadne nie nadpisuje poprzedniego po odświeżeniu strony — 266ffce
- [x] 2.7 Każde miejsce przeżywa zamknięcie i ponowne otwarcie aplikacji — 266ffce
- [x] 2.8 Strona domowa ma nadal jeden czytelny dominujący następny krok, a nie trzy równorzędne stalowe przyciski — 266ffce
- [x] 2.9 Blok statusu offline nadal dochodzi do stanu „Gotowe do pracy offline” — 266ffce

### Phase 3: Prowadzenie — kroki, „niedostępne” i potwierdzenie dojścia

#### Automated

- [x] 3.1 Lint przechodzi: `npm run lint` — 481ee72
- [x] 3.2 Typy przechodzą: `npx astro check` — 481ee72
- [x] 3.3 Testy przechodzą: `npm test` — 481ee72
- [x] 3.4 Build przechodzi: `npm run build` — 481ee72
- [x] 3.5 Smoke przechodzi: `npm run smoke` — 481ee72

#### Manual

- [ ] 3.6 Na telefonie w trybie samolotowym przytrzymanie alarmu przez 2 s pokazuje pierwszy krok w mniej niż 2 s od zwolnienia (mierzone stoperem) — NFR nie uległ regresji po dodaniu odczytu przebiegu
- [ ] 3.7 Każdy ekran pokazuje dokładnie jeden następny krok; „Zrobione — dalej” na kroku plecaka przechodzi na prowadzenie do miejsca spotkania
- [ ] 3.8 Przytrzymanie „Punkt niedostępny” przez 2 s przełącza cel na miejsce zapasowe: tytuł, strzałka i odległość zmieniają się natychmiast, a przycisk znika
- [ ] 3.9 Zwolnienie „Punkt niedostępny” po 1 s nie przełącza celu
- [ ] 3.10 Dojście poniżej 25 m do miejsca spotkania pokazuje „Jesteś na miejscu” i „Dalej: Idź do punktu ewakuacji”
- [ ] 3.11 Przytrzymanie „Potwierdź dojście” i dotknięcie potwierdzenia przechodzi dalej bez dojścia w promieniu 25 m
- [ ] 3.12 Zamknięcie i ponowne otwarcie aplikacji w trakcie prowadzenia na drugim kroku wraca na drugi krok, z zachowanym fallbackiem
- [ ] 3.13 „Zakończ tryb alarmu” na ostatnim kroku czyści przebieg: kolejne przytrzymanie alarmu startuje od kroku pierwszego
- [ ] 3.14 Prowadzenie bez ustawionego miejsca zapasowego nie pokazuje przycisku awaryjnego, a sekwencja działa
- [ ] 3.15 Plan z samym punktem ewakuacji (stan po migracji z S-01) prowadzi do niego bez kroku miejsca spotkania
- [ ] 3.16 Ekran na `/alarm` nie gaśnie przez 2 min marszu — wake lock nie uległ regresji
- [ ] 3.17 Przycisk alarmu działa jak przed wydzieleniem hooka: 2 s uruchamia, 1 s nie uruchamia, klawiatura Space/Enter działa

### Phase 4: Weryfikacja offline i domknięcie dokumentów

#### Automated

- [x] 4.1 Lint, typy, testy, build i smoke przechodzą na gałęzi: `npm run lint && npx astro check && npm test && npm run build && npm run smoke` — 2eaf5c4
- [x] 4.2 CI na gałęzi `step-flow-and-fallback` jest zielone (`ci` i `smoke`) — 7c8e94d
- [x] 4.3 Smoke na żywym adresie po wdrożeniu: `BASE_URL=https://w-razie-w.jzogala.workers.dev EXPECT_HEADERS=1 npm run smoke`

#### Manual

- [ ] 4.4 Na telefonie w trybie samolotowym, pod publicznym adresem, pełny przebieg przechodzi od przytrzymania alarmu do „Zakończ tryb alarmu”, z użyciem „Punkt niedostępny” na kroku miejsca spotkania
- [ ] 4.5 Przebieg działa bez sieci po pierwszym otwarciu online (service worker precache'uje wszystkie strony)
- [ ] 4.6 Wpisy w roadmapie, PRD i `CLAUDE.md` odpowiadają temu, co faktycznie działa w kodzie

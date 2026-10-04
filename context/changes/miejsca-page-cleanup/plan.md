# Miejsca ewakuacji — jeden cel alarmu i strona bez szumu — Implementation Plan

## Overview

Usuwamy z całej aplikacji miejsce spotkania i miejsce zapasowe. Jedynym celem alarmu zostaje schron (punkt ewakuacji): domyślnie automatycznie wybrany schron PSP z trasą A i B, awaryjnie własny schron wskazany przez organizatora. Strona `/miejsca` staje się stroną „Miejsca ewakuacji” z jednym głównym zadaniem. Własny schron wskazuje się na mapie z pinezką, więc da się to zrobić z domu, bez stania w docelowym miejscu.

## Current State Analysis

Z frame brief (`frame.md`, pewność HIGH):

- `/miejsca` (`src/pages/miejsca.astro:17-44`) ma trzy równorzędne `PlaceCard`, każdą z polem nazwy, „Ustaw tutaj” i formularzem współrzędnych (`src/components/PlaceCard.tsx:124-186`). Razem to 3 pola nazwy, 3 pola współrzędnych i 6 przycisków.
- „Ustaw tutaj” zapisuje bieżący fix GPS, więc wymaga obecności na miejscu. Z domu jedyną drogą jest wpis współrzędnych.
- Pole nazwy samo nic nie zapisuje (dług F9).
- Ręczny „Punkt ewakuacji” jest odklejony od schronu PSP, który żyje na `/offline` (`RouteCard`).
- Użytkownik ustawia miejsca z domu, a „Punkt ewakuacji” i „Miejsce spotkania” były dla niego tym samym.

Decyzja produktowa z planowania: miejsce spotkania i zapasowe znikają w całej aplikacji. To cofa część FR-004 i FR-013 oraz decyzję S-02 o wyjściu „niedostępne” na miejsce zapasowe.

Gdzie żyje dziś model trzech miejsc:

- `src/types.ts:7,50`: `PlaceKind = "meeting" | "backup" | "shelter"`, `HouseholdPlan.places: Record<PlaceKind, Place | null>`, `schemaVersion: 4`.
- `src/lib/services/plan-storage.ts:16,49-55,140-200`: `CURRENT_SCHEMA_VERSION = 4`, `parsePlaces`, gałęzie migracji v1–v3.
- `src/lib/evacuation-steps.ts:6,16-61,77-89`: krok `navigate` z `place` i `fallback` typu `PlaceKind`, `NAVIGATION_CONTENT` dla trzech miejsc, `targetPlaceKind`, `stepContent`.
- `src/lib/step-target.ts:22-40`: `resolveStepTarget(kind, …)`; dla `shelter` trasa A/B, w pozostałych przypadkach `plan.places[kind]`.
- `src/components/GuidanceScreen.tsx:73-81,176-178,251-258,333-337`: pusty stan z „miejsce spotkania”, fallback z `step.fallback !== null || shelterFallback`.
- `src/lib/voice.ts:90`: fraza pustego stanu z „miejsce spotkania”.
- `src/components/hooks/useVoiceGuidance.ts:21,152`: komentarze o przejściu ze spotkania na schron.
- `src/lib/readiness.ts:21-35,151-220,326-331,60-71`: quick winy `meeting` i `backup`, quick win `shelter` w obszarze `offline` z `href: "/offline"`, `levelFor` liczy `meeting`, opisy poziomów.
- Testy: `readiness.test.ts`, `evacuation-steps.test.ts`, `step-target.test.ts`, `plan-storage.test.ts`, `run-storage.test.ts`, `voice.test.ts`.
- `scripts/smoke.mjs:53-72`: sprawdza `/miejsca` i `/offline` (tekst `OfflineShellCard`).
- Dokumenty: `PROJECT.md`, `CLAUDE.md`, `context/foundation/prd.md` (FR-004, FR-013, Business Logic, decyzje S-02 i poziomy), `context/foundation/roadmap.md`.

Mapa:

- `ExecutionMap.tsx:13-16` rejestruje protokół `pmtiles` na poziomie modułu i czyta paczkę z OPFS (`openMapFile`).
- Paczka regionu leży na R2 (`src/lib/map-regions.ts:17-29`, Małopolska, 99 MB). CORS pozwala na `GET`/`HEAD` z nagłówkiem `range` i eksponuje `Content-Range` (`scripts/map/r2-cors.json`), więc `pmtiles` może czytać zdalny plik fragmentami (Range), bez pobierania całości.
- Glify (`public/map/fonts/`) są w precache.

## Desired End State

- **Alarm** prowadzi: plecak → schron. Na kroku schronu „niedostępne” przełącza na trasę B, jak dziś. Bez trasy prowadzi do własnego schronu w linii prostej. Nigdzie w UI, w głosie ani w gotowości nie pada „miejsce spotkania” ani „miejsce zapasowe”.
- **`/miejsca`** ma tytuł „Miejsca ewakuacji” i pokazuje:
  1. Kartę „Schron i trasa” (przeniesioną z `/offline`) jako jedną dominującą akcję.
  2. Pod nią sekcję „Własny schron”. Nieustawiona, jest zwinięta do przycisku drugorzędnego. Rozwija się sama, gdy w pobliżu nie ma schronu PSP. Ustawiona, pokazuje podsumowanie (nazwa i współrzędne) z „Zmień”.
- **Edytor własnego schronu** to mapa z pinezką na środku:
  - przesuwasz mapę, nazywasz miejsce, „Zapisz schron” zapisuje punkt i nazwę razem;
  - „Moja pozycja” centruje mapę na fixie GPS;
  - „Wpisz współrzędne” jest zwinięte i rozwija się samo, gdy mapy nie da się pokazać (offline bez pobranej paczki, poza obszarem paczki, błąd ładowania).
- **Gotowość**: obszar „Miejsca ewakuacji” zawiera jeden quick win schronu, prowadzący na `/miejsca`. Poziom „Podstawy” = schron. „Gotowi do wyjścia” = schron, kontakt lub domownik i plecak kluczowy.
- **Migracja**: plan v1–v4 przechodzi na v5 bez utraty celu. Jeśli nie było schronu, a było miejsce spotkania (albo zapasowe), staje się ono własnym schronem.
- Dokumenty opisują nowy model.

Weryfikacja: `npm test`, `npm run lint`, `npx astro check`, `npm run build`, `npm run smoke` oraz ręczny przebieg na iOS Safari i Android Chrome (Manual w Progress).

### Key Discoveries:

- Krok schronu ma już „niedostępne” → trasa B (`step-target.ts:14-15,28-35`, `GuidanceScreen.tsx:178`). Usunięcie spotkania nie zostawia alarmu bez wyjścia awaryjnego tam, gdzie jest trasa PSP.
- Przebieg wskazuje krok po **id** (`resumeIndex`, `evacuation-steps.ts:70-74`). Zapisany `wrw.run` ze `stepId: "meeting"` po aktualizacji po prostu startuje od początku, więc migracja `wrw.run` jest zbędna.
- `Destination.source: "psp" | "manual"` (`types.ts`) już przewiduje własny punkt jako cel.
- `useReadiness` montuje `useRouteRefresh` na `/` (CLAUDE.md). Przeniesienie `RouteCard` z `/offline` na `/miejsca` nie zmienia odświeżania tras.
- JV §4 „jedna dominująca akcja na sekcję” i §3.7 „prostota nad gęstością” uzasadniają zwinięcie własnego schronu i współrzędnych.

## What We're NOT Doing

- Liczenie trasy pieszej do własnego schronu ani trasa B dla niego. Własny schron prowadzi w linii prostej, jak dziś.
- Wyszukiwarki adresu (geokoder).
- Ręcznego wyboru konkretnego schronu PSP z listy lub z mapy (S-04 zostaje: wybór automatyczny).
- Danych PSP spoza Małopolski i nowych regionów mapy.
- Przekierowania ani zmiany adresu: `/miejsca` zostaje.
- Migracji `wrw.run` (patrz Key Discoveries).
- Zmian w `HoldButton`/`useHoldAction`, w czasie 2000 ms i w trybie Execution poza tekstami.

## Implementation Approach

Od środka na zewnątrz. Najpierw czysty model i logika w `src/lib/` z testami, bo od nich zależy alarm. Potem strona na istniejącym wpisie współrzędnych. Potem mapa jako ulepszenie edytora, które ma bezpieczny fallback. Na końcu dokumenty. Każda faza kończy się zielonym buildem i działającym alarmem.

## Critical Implementation Details

- **Protokół `pmtiles` rejestrowany raz.** `ExecutionMap.tsx` wywołuje `addProtocol("pmtiles", …)` na poziomie modułu. Drugi moduł mapy zrobiłby to ponownie i nadpisał instancję `Protocol` z dodanymi plikami. Rejestracja `setWorkerUrl` i `addProtocol` oraz współdzielona instancja `Protocol` muszą żyć w jednym module, importowanym przez oba widoki.
- **Kolejność w migracji.** Promocja „miejsce spotkania → własny schron” zachodzi tylko wtedy, gdy `shelter` jest `null`. Kolejność źródeł to `shelter`, potem `meeting`, potem `backup`. Etykieta zostaje z promowanego miejsca, bo i tak nazwał je użytkownik.
- **Edytor nie dotyka `lastKnownPosition`.** Zapis pinezki z mapy nie jest pozycją użytkownika. Dzisiejsze „Ustaw tutaj” nadpisywało `lastKnownPosition`, od której zależą świeżość trasy (`readiness.ts:148-166`) i propozycja regionu (`useMapPackage.ts:33`). Nowy zapis tego nie robi. „Moja pozycja” zapisuje `lastKnownPosition` z prawdziwego fixa, bo to rzeczywiście pozycja użytkownika.
- **Zdalny PMTiles to Range na R2**, więc działa tylko online i tylko z originów z `r2-cors.json`. Lokalny podgląd przez `astro preview` na `localhost:4321` jest w CORS. Każdy inny port wymaga fallbacku na współrzędne albo pobranej paczki.

## Phase 1: Model i logika — jeden cel alarmu

### Overview

Plan v5 z jednym własnym schronem, migracja, prowadzenie plecak → schron, gotowość bez spotkania i zapasowego. Zawiera minimalne poprawki UI potrzebne do kompilacji: `/miejsca` tymczasowo z jedną kartą `PlaceCard` dla schronu i teksty pustego stanu alarmu.

### Changes Required:

#### 1. Typy

**File**: `src/types.ts`

**Intent**: Usunąć pojęcie trzech miejsc z modelu.

**Contract**:
- `HouseholdPlan.schemaVersion: 5`.
- `places: Record<PlaceKind, Place | null>` zastąpione przez `shelter: Place | null` (własny schron).
- `PlaceKind` usunięty.

#### 2. Zapis planu i migracja

**File**: `src/lib/services/plan-storage.ts`

**Intent**: v5 jako bieżąca wersja. Każda starsza wersja mapuje się na `shelter` bez utraty celu alarmu.

**Contract**:
- `CURRENT_SCHEMA_VERSION = 5`.
- `createEmptyPlan()` z `shelter: null`.
- Gałąź v5 czyta `value.shelter` przez `parsePlace`.
- Gałęzie v4, v3 i v2 biorą `places.shelter ?? places.meeting ?? places.backup`, a pozostałe pola jak dziś (v2 i v3 dostają puste listy, jak teraz), z `source: "migrated"`.
- v1 bierze `evacuationPoint`.
- `parsePlaces` znika.

#### 3. Sekwencja kroków

**File**: `src/lib/evacuation-steps.ts`

**Intent**: Plecak, potem schron. Jedno źródło treści kroku schronu.

**Contract**:
- Krok `navigate` traci pola `place` i `fallback` (jedyny cel to schron).
- `buildSteps(plan, { shelterRoute })` tworzy krok `shelter`, gdy `plan.shelter !== null || shelterRoute`, w przeciwnym razie `[]`.
- `targetPlaceKind` zostaje usunięte albo zastąpione predykatem kroku nawigacji. `stepContent` zwraca treść kroku.
- Tytuł „Idź do schronu”, instrukcja bez odwołań do planu wielu miejsc.

#### 4. Cel kroku

**File**: `src/lib/step-target.ts`

**Intent**: Cel kroku schronu: trasa A, trasa B po „niedostępne”, inaczej własny schron.

**Contract**:
- `resolveStepTarget(plan, navigation, fallbackActive): StepTarget | null`, bez parametru `kind`.
- `shelterFallbackContent` sprawdza `step.kind === "navigate"` zamiast `step.place === "shelter"`.

#### 5. Ekran prowadzenia i głos

**Files**: `src/components/GuidanceScreen.tsx`, `src/lib/voice.ts`, `src/components/hooks/useVoiceGuidance.ts`

**Intent**: Dopasować wywołania do nowych sygnatur. Wyjście awaryjne tylko przez trasę B. Teksty pustego stanu bez miejsca spotkania.

**Contract**:
- `fallbackAvailable` i `switchToFallback` opierają się wyłącznie na `shelterFallback`.
- Pusty stan (`GuidanceScreen.tsx:73-81`) i fraza `voice.ts:90` mówią o schronie i odsyłają do `/miejsca`, np. „Nie wskazano schronu. Wróć do planu i przygotuj miejsce ewakuacji.” Link „Ustaw miejsca w planie” prowadzi do `/miejsca`.
- Komentarze w `useVoiceGuidance.ts:21,152` bez odwołań do miejsca spotkania.

#### 6. Gotowość

**File**: `src/lib/readiness.ts`

**Intent**: Jeden quick win celu (schron) w obszarze „Miejsca ewakuacji”, poziomy liczone bez spotkania.

**Contract**:
- `QuickWinId` bez `meeting` i `backup`.
- `AREAS[places].title = "Miejsca ewakuacji"`.
- Quick win `shelter`: `area: "places"`, `stage: "target"`, gotowy, gdy `plan.shelter !== null || routeFresh`. Wszystkie warianty (`route-stale`, `no-candidates`, domyślny) mają `href: "/miejsca"`.
- `levelFor`: `basics = done("shelter")`, `readyToGo = done("shelter") && done("household") && done("backpack-key")`.
- `LEVELS[3].description` bez słowa „Miejsca” w znaczeniu trzech miejsc, np. „Schron, plecak, mapa i czujniki są przygotowane.”
- Obszar `offline` traci quick win schronu i liczy offline-shell, install i map.

#### 7. Tymczasowa strona

**Files**: `src/pages/miejsca.astro`, `src/components/PlaceCard.tsx`

**Intent**: Utrzymać działającą stronę do fazy 2: jedna karta własnego schronu.

**Contract**:
- `PlaceCard` bez propsa `kind`, czyta i zapisuje `plan.shelter` przez `readPlan()` tuż przed `writePlan`.
- Strona ma jedną kartę.

#### 8. Testy

**Files**: `src/lib/services/plan-storage.test.ts`, `src/lib/evacuation-steps.test.ts`, `src/lib/step-target.test.ts`, `src/lib/readiness.test.ts`, `src/lib/services/run-storage.test.ts`, `src/lib/voice.test.ts`

**Intent**: Zastąpić scenariusze trzech miejsc scenariuszami jednego celu i pokryć migrację.

**Contract**: przypadki opisane w Testing Strategy → Unit Tests.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Build passes: `npm run build`
- No remaining references to the old model: `grep -rnE "PlaceKind|places\.(meeting|backup|shelter)|\"meeting\"|\"backup\"" src` returns only historical migration-branch reads in `plan-storage.ts` and their tests

#### Manual Verification:

- W przeglądarce z planem v4 (spotkanie i schron ustawione) po aktualizacji alarm prowadzi plecak → schron. Gotowość nie pokazuje quick winów spotkania ani zapasowego.
- Plan v4 z samym miejscem spotkania po aktualizacji ma własny schron o tej samej nazwie i współrzędnych, a alarm do niego prowadzi.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Strona „Miejsca ewakuacji”

### Overview

`/miejsca` dostaje kartę „Schron i trasa” jako główną akcję i zwiniętą sekcję własnego schronu z podsumowaniem, nazwą zapisywaną razem z punktem i zwiniętymi współrzędnymi. Na tym etapie edytor ma „Moja pozycja” i współrzędne. Mapa przychodzi w fazie 3.

### Changes Required:

#### 1. Strona

**File**: `src/pages/miejsca.astro`

**Intent**: Jedno zadanie główne: schron PSP z trasą, a własny schron jako opcja drugorzędna.

**Contract**:
- Tytuł strony i `<h1>` „Miejsca ewakuacji”.
- Jeden krótki akapit kontekstu: aplikacja wybiera najbliższy schron PSP i przygotowuje trasę; własny schron jest na wypadek, gdy w pobliżu nie ma schronu PSP.
- Kolejność: `RouteCard`, potem `OwnShelterCard`. Każda wyspa `client:only="react"` w osobnym elemencie blokowym (konwencja `astro-island`).
- `PageBackLink` bez zmian.

#### 2. Przeniesienie karty trasy

**Files**: `src/pages/offline.astro`, `src/components/RouteCard.tsx`

**Intent**: Schron i trasa żyją na jednej stronie. `/offline` zostaje o działaniu bez internetu.

**Contract**:
- `RouteCard` usunięty z `offline.astro`. Akapit wstępu `/offline` bez „trasy do schronu”.
- `RouteCard` bez zmian zachowania. Nagłówek może zejść do `h2` w hierarchii nowej strony (już jest `h2`).

#### 3. Karta własnego schronu

**File**: `src/components/OwnShelterCard.tsx` (zastępuje `PlaceCard.tsx`, który znika)

**Intent**: Zwięzła karta z trzema stanami: zwinięta, podsumowanie i edytor. Nazwa zapisuje się razem z punktem, co usuwa dług F9.

**Contract**:
- Stan **zwinięty** (brak `plan.shelter`): jedna linia wyjaśnienia i przycisk `variant="outline"` „Wskaż własny schron”. Rozwinięty od razu, gdy `navigation.lastRefresh?.ok === false && reason === "no-candidates"`.
- Stan **podsumowania** (`plan.shelter` ustawiony): nazwa, współrzędne (`font-operational`), przycisk „Zmień” i „Usuń” chroniony potwierdzeniem w treści (np. drugi klik „Na pewno usuń”).
- Stan **edytora**:
  - punkt kandydacki (w fazie 2 z „Moja pozycja” albo ze współrzędnych);
  - pole „Nazwa” z podpowiedzią;
  - przycisk „Zapisz schron” (jedyny wypełniony) zapisujący `{ label, coords }` przez `readPlan()` → `writePlan()`;
  - „Anuluj”;
  - sekcja „Wpisz współrzędne” zwinięta (`<details>` albo przełącznik), z dotychczasową walidacją `parseCoordinates` i komunikatami.
- Edycja samej nazwy w podsumowaniu działa bez ponownego wskazania punktu (nazwa i obecne `coords`).
- `writePlan` zwracające `false` pokazuje `STORAGE_ERROR`, nigdy sukces.
- Usunięcie (`shelter: null`) przy braku trasy PSP zostawia alarm bez celu, więc tekst potwierdzenia to mówi.

#### 4. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Smoke odzwierciedla przeniesienie karty.

**Contract**: asercja treści `/miejsca` sprawdza znacznik `RouteCard` (lub `OwnShelterCard`), `/offline` nadal `OfflineShellCard`. Lista ścieżek bez zmian.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Build passes: `npm run build`
- Smoke passes against preview: `npm run preview` + `npm run smoke`

#### Manual Verification:

- Pusty profil: `/miejsca` pokazuje jedną dominującą akcję („Wybierz schron i przygotuj trasę”), a własny schron jest zwinięty.
- Profil z `no-candidates` (pozycja poza Małopolską): sekcja własnego schronu jest rozwinięta od razu.
- Zapis z nazwą, potem „Zmień” → zmiana samej nazwy → odświeżenie: nazwa i punkt są zachowane.
- Na 360 px strona mieści się bez poziomego przewijania, a pasek obszarów na `/` mieści „Miejsca ewakuacji”.
- `/offline` nie ma już karty trasy, a quick win „Wybierz schron…” z `/` prowadzi na `/miejsca`.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Mapa z pinezką

### Overview

Edytor własnego schronu dostaje mapę: pinezka stoi na środku, użytkownik przesuwa mapę. Online czyta kafle zdalnie z R2 (Range), z pobraną paczką lokalnie z OPFS. Gdy mapa jest niedostępna, rozwijają się współrzędne.

### Changes Required:

#### 1. Wspólna rejestracja PMTiles

**File**: `src/components/map/pmtiles.ts` (nowy), `src/components/map/ExecutionMap.tsx`

**Intent**: Jedna instancja `Protocol` i jedna rejestracja workera dla obu widoków mapy.

**Contract**:
- Moduł wywołuje `setWorkerUrl` i `addProtocol("pmtiles", protocol.tile)` raz i eksportuje `protocol`.
- `ExecutionMap.tsx` importuje stąd zamiast rejestrować sam.
- `readMapPalette` przenosi się tutaj albo zostaje eksportowane jak dziś. `SpikeMapView` ma importować z nowego miejsca, jeśli plik jeszcze istnieje.

#### 2. Wybór źródła kafli

**File**: `src/lib/map-source.ts` (nowy, czysty) + test

**Intent**: Czysta decyzja, skąd brać kafle i czy mapa w ogóle ma sens.

**Contract**: `pickMapSource({ mapPackage, online, center }): { kind: "local"; fileName } | { kind: "remote"; url } | { kind: "none"; reason: "offline-no-package" | "outside-region" }`.
- Pobrana paczka (`isMapReady`) daje `local`.
- Online i punkt startowy w `regionCovering` albo brak punktu startowego daje `remote` z `region.url`.
- W pozostałych przypadkach `none`.
- Punkt startowy kolejno: istniejący `plan.shelter`, potem `lastKnownPosition`, potem środek regionu.

#### 3. Komponent wyboru punktu

**File**: `src/components/map/PlacePickerMap.tsx` (nowy, ładowany leniwie)

**Intent**: Mapa w trybie Preparation z pinezką na środku. Zwraca środek mapy jako punkt kandydacki.

**Contract**:
- Props: `{ source, initialCenter: Coordinates, onCenterChange(coords), onError() }`.
- `local`: `openMapFile` → `new PMTiles(new FileSource(file))`. `remote`: `new PMTiles(url)`. Oba trafiają do `protocol.add`, a styl to `buildMapStyle(key, readMapPalette())`.
- Bez obrotu i pochylenia (północ u góry). Zoom startowy ok. 16.
- `onCenterChange` na `moveend`.
- Pinezka jako element HTML nad środkiem kontenera (nie warstwa mapy), z ikoną `MapPin` i tokenami JV, bez hexów.
- Błąd ładowania pliku lub stylu wywołuje `onError`.
- `role="application"` z `aria-label` „Mapa — przesuń, by ustawić schron pod pinezką”.

#### 4. Edytor z mapą

**File**: `src/components/OwnShelterCard.tsx`

**Intent**: Mapa jako podstawowa metoda wskazania, GPS jako skrót, współrzędne jako wyjście awaryjne.

**Contract**:
- `PlacePickerMap` przez `React.lazy` + `Suspense` z placeholderem tej samej wysokości (ok. 280–320 px), żeby nie skakał layout.
- Przycisk „Moja pozycja” (outline, ikona `LocateFixed`) centruje mapę na fixie z `requestCurrentPosition` i zapisuje `lastKnownPosition`. Błędy lokalizacji pokazuje jak dziś.
- Gdy `pickMapSource` zwraca `none` albo mapa zgłosi `onError`, sekcja „Wpisz współrzędne” rozwija się sama, z jednozdaniowym powodem („Mapa jest dostępna online albo po pobraniu paczki na stronie Offline” / „Mapa obejmuje na razie Małopolskę”).
- Wpis współrzędnych przy działającej mapie centruje mapę na wpisanym punkcie, zamiast zapisywać od razu. Zapis zawsze idzie przez „Zapisz schron”.

#### 5. Granica leniwego ładowania

**Files**: `src/components/GuidanceScreen.tsx` (bez zmian), weryfikacja buildu

**Intent**: Moduł mapy nie trafia do statycznego grafu `/miejsca` ani `GuidanceScreen`.

**Contract**: `PlacePickerMap` i `maplibre-gl` są importowane wyłącznie dynamicznie.

### Success Criteria:

#### Automated Verification:

- Unit tests pass (incl. `map-source.test.ts`): `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Build passes: `npm run build`
- MapLibre stays out of the static page bundle: `grep -l "maplibre" dist/_astro/*.js` matches only lazily loaded chunks (no match in the entry chunk referenced by `dist/miejsca.html`)
- Smoke passes: `npm run preview` + `npm run smoke`

#### Manual Verification:

- iOS Safari (urządzenie nazwane w zapisie): online, bez paczki. Mapa ładuje się z R2, przesuwanie palcem działa, „Zapisz schron” zapisuje punkt pod pinezką, alarm prowadzi do niego.
- Android Chrome: to samo, plus wariant z pobraną paczką w trybie samolotowym (kafle z OPFS).
- Tryb samolotowy bez paczki: zamiast mapy rozwinięte współrzędne z powodem, zapis współrzędnych działa.
- „Moja pozycja” centruje mapę. Odmowa lokalizacji pokazuje komunikat i nie psuje edytora.
- Alarm (`/alarm`) z mapą wykonawczą działa jak przed zmianą (wspólny protokół).

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Dokumenty

### Overview

Źródła prawdy opisują jeden cel alarmu, nową stronę i plan v5.

### Changes Required:

#### 1. PRD

**File**: `context/foundation/prd.md`

**Intent**: Zapisać decyzję i jej koszt, zamiast cicho przepisywać historię.

**Contract**:
- FR-004: organizator przygotowuje schron. Wybór automatyczny PSP z trasą A/B, własny schron awaryjnie, wskazywany na mapie lub współrzędnymi.
- FR-013: „niedostępne” przełącza na zapasowy schron (trasa B).
- Business Logic i wejścia organizatora bez miejsca spotkania i zapasowego.
- Sekcja decyzji: nowy wpis (2026-10-04, `miejsca-page-cleanup`) z uzasadnieniem (użytkownik nie odróżniał pojęć, pierwsze ustawianie z domu) i świadomym kosztem: brak punktu zbiórki rodziny rozdzielonej w chwili alarmu. Wpisy S-02 i „Poziomy gotowości” oznaczone jako zastąpione w części dotyczącej miejsc.
- Given/When/Then z linii 87 i lista onboardingu z linii 107 zaktualizowane.

#### 2. Roadmapa, PROJECT.md, CLAUDE.md

**Files**: `context/foundation/roadmap.md`, `PROJECT.md`, `CLAUDE.md`

**Intent**: Usunąć odwołania do trzech miejsc i zaktualizować konwencje.

**Contract**:
- CLAUDE.md: opis `wrw.plan` (`schemaVersion: 5`, pole `shelter`, migracja v1–v4 z promocją spotkania), opis konfiguratora `/miejsca` („Miejsca ewakuacji”, `RouteCard` + `OwnShelterCard`), linijka o wspólnym module `src/components/map/pmtiles.ts` i o tym, że mapa wyboru punktu jest ładowana leniwie.
- Akapit „Multiple islands writing one key” bez „trzech `PlaceCard`”.
- Roadmapa i PROJECT.md: wzmianki o miejscu spotkania i zapasowym przepisane albo oznaczone jako zmienione.

### Success Criteria:

#### Automated Verification:

- No stale references in docs: `grep -n -i "miejsce spotkania\|miejsce zapasowe\|miejsca zapasowego\|miejsca spotkania" CLAUDE.md PROJECT.md context/foundation/roadmap.md context/foundation/prd.md` returns only lines inside the explicitly superseded decision entries
- Format passes: `npm run format`

#### Manual Verification:

- PRD czyta się spójnie: FR-004, FR-013, Business Logic i decyzje nie przeczą sobie nawzajem.

---

## Testing Strategy

### Unit Tests:

- `plan-storage.test.ts`:
  - v5 round-trip;
  - v4 z `shelter` zostawia go, nawet gdy `meeting` jest ustawione;
  - v4 tylko z `meeting` promuje je do `shelter`, z nazwą;
  - v4 tylko z `backup` promuje `backup`;
  - v4 bez miejsc daje `shelter: null`;
  - v3, v2 i v1 analogicznie;
  - uszkodzony `shelter` daje `null`;
  - nieznana wersja daje `unreadable`.
- `evacuation-steps.test.ts`:
  - brak celu daje `[]`;
  - sam `shelter` daje plecak → schron;
  - sama trasa PSP daje plecak → schron;
  - `resumeIndex` ze starym `stepId: "meeting"` daje 0.
- `step-target.test.ts`:
  - trasa A;
  - trasa B po fallbacku;
  - bez tras własny schron;
  - fallback bez trasy B zostaje na A;
  - brak czegokolwiek daje `null`.
- `readiness.test.ts`:
  - poziom „Podstawy” przy samym schronie lub samej świeżej trasie;
  - „Gotowi do wyjścia” bez spotkania;
  - wszystkie warianty quick winu schronu z `href: "/miejsca"` i `area: "places"`;
  - obszar `offline` bez schronu.
- `voice.test.ts`: fraza pustego stanu.
- `map-source.test.ts`:
  - pobrana paczka daje `local`;
  - online w regionie daje `remote`;
  - online poza regionem daje `none/outside-region`;
  - offline bez paczki daje `none/offline-no-package`;
  - brak punktu startowego online daje `remote`.

### Integration Tests:

- `npm run smoke` na podglądzie buildu (fazy 2–3).

### Manual Testing Steps:

1. Profil z planem v4 (spotkanie + zapasowe + schron) → aktualizacja → `/` pokazuje obszar „Miejsca ewakuacji”, brak quick winów spotkania i zapasowego; alarm prowadzi plecak → schron.
2. Profil v4 tylko ze spotkaniem → aktualizacja → `/miejsca` pokazuje własny schron z tą nazwą; alarm do niego prowadzi.
3. Pusty profil na iOS Safari: `/miejsca` → „Wskaż własny schron” → mapa z R2 → przesunięcie → nazwa → „Zapisz schron” → odświeżenie → podsumowanie → alarm.
4. Android Chrome z pobraną paczką w trybie samolotowym: edytor pokazuje mapę z OPFS.
5. Tryb samolotowy bez paczki: rozwinięte współrzędne z powodem; zapis działa.
6. Krok schronu z trasą A i B: „niedostępne” przełącza na B, głos to ogłasza (bez regresji).

## Performance Considerations

- Mapa wyboru ładuje się dopiero po rozwinięciu edytora (lazy chunk MapLibre ok. 250 kB gz, już precache'owany przez SW jako zasób `dist/`).
- Zdalne PMTiles pobierają tylko nagłówek, katalog i potrzebne kafle przez Range. Brak wpływu na stronę, gdy edytor jest zwinięty.

## Migration Notes

- `wrw.plan` v1–v4 → v5 w `parsePlanWithSource`, przy pierwszym odczycie (`source: "migrated"`). Zapis v5 następuje przy najbliższym `writePlan`, jak dotąd.
- `wrw.run` bez migracji: nieznany `stepId` startuje od początku.
- Rollback: starsze wydanie traktuje v5 jak nieznaną wersję (`unreadable`) i nie nadpisuje danych. Powrót do starszego wydania pokazuje pusty plan, dopóki nie wróci nowe.

## References

- Frame brief: `context/changes/miejsca-page-cleanup/frame.md`
- Obecna karta: `src/components/PlaceCard.tsx`, `src/pages/miejsca.astro`
- Karta trasy: `src/components/RouteCard.tsx`, `src/pages/offline.astro`
- Mapa: `src/components/map/ExecutionMap.tsx:13-16`, `src/lib/map-regions.ts:17-29`, `scripts/map/r2-cors.json`
- Logika: `src/lib/evacuation-steps.ts`, `src/lib/step-target.ts`, `src/lib/readiness.ts`, `src/lib/services/plan-storage.ts`
- Język wizualny: `JEZYK_WIZUALNY.md` §3, §4

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Model i logika — jeden cel alarmu

#### Automated

- [x] 1.1 Unit tests pass: `npm test` — eb7d66a
- [x] 1.2 Lint passes: `npm run lint` — eb7d66a
- [x] 1.3 Type check passes: `npx astro check` — eb7d66a
- [x] 1.4 Build passes: `npm run build` — eb7d66a
- [x] 1.5 No remaining references to the old model outside migration branches — eb7d66a

#### Manual

- [x] 1.6 Plan v4 (spotkanie + schron) po aktualizacji: alarm plecak → schron, brak quick winów spotkania/zapasowego — eb7d66a
- [x] 1.7 Plan v4 z samym spotkaniem: własny schron o tej samej nazwie i współrzędnych, alarm do niego prowadzi — eb7d66a

### Phase 2: Strona „Miejsca ewakuacji”

#### Automated

- [x] 2.1 Unit tests pass: `npm test` — 86e3de3
- [x] 2.2 Lint passes: `npm run lint` — 86e3de3
- [x] 2.3 Type check passes: `npx astro check` — 86e3de3
- [x] 2.4 Build passes: `npm run build` — 86e3de3
- [x] 2.5 Smoke passes against preview — 86e3de3

#### Manual

- [x] 2.6 Pusty profil: jedna dominująca akcja, własny schron zwinięty — 86e3de3
- [x] 2.7 `no-candidates`: sekcja własnego schronu rozwinięta od razu — 86e3de3
- [x] 2.8 Zapis z nazwą, zmiana samej nazwy, odświeżenie — oba zachowane — 86e3de3
- [x] 2.9 360 px bez poziomego przewijania; pasek obszarów mieści „Miejsca ewakuacji” — 86e3de3
- [x] 2.10 `/offline` bez karty trasy; quick win schronu prowadzi na `/miejsca` — 86e3de3

### Phase 3: Mapa z pinezką

#### Automated

- [x] 3.1 Unit tests pass (incl. `map-source.test.ts`): `npm test` — 3f8d314
- [x] 3.2 Lint passes: `npm run lint` — 3f8d314
- [x] 3.3 Type check passes: `npx astro check` — 3f8d314
- [x] 3.4 Build passes: `npm run build` — 3f8d314
- [x] 3.5 MapLibre stays out of the static page bundle — 3f8d314
- [x] 3.6 Smoke passes against preview — 3f8d314

#### Manual

- [x] 3.7 iOS Safari online bez paczki: mapa z R2, przesuwanie, zapis pod pinezką, alarm prowadzi — 3f8d314
- [x] 3.8 Android Chrome: to samo + paczka w trybie samolotowym (OPFS) — 3f8d314
- [x] 3.9 Tryb samolotowy bez paczki: współrzędne rozwinięte z powodem, zapis działa — 3f8d314
- [x] 3.10 „Moja pozycja” centruje mapę; odmowa lokalizacji nie psuje edytora — 3f8d314
- [x] 3.11 Alarm z mapą wykonawczą bez regresji (wspólny protokół) — 3f8d314

### Phase 4: Dokumenty

#### Automated

- [x] 4.1 No stale references in docs outside superseded decision entries
- [x] 4.2 Format passes: `npm run format`

#### Manual

- [x] 4.3 PRD spójny: FR-004, FR-013, Business Logic i decyzje bez sprzeczności

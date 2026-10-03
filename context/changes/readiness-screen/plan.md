# Ekran gotowości jako strona główna (S-08) — plan implementacji

## Overview

Strona główna `/` staje się ekranem gotowości: pokazuje jakościowy poziom, jeden quick win jako CTA „następny krok”, zwarty pasek pięciu obszarów ze statusem i przyklejony na dole alarm. Konfiguratory (miejsca, domownicy, plecak, offline, czujniki) wychodzą na podstrony ze wspólnym powrotem „← Gotowość”. Wszystkie czynności wynikają z jednego katalogu quick winów w `src/lib/`, który zasila CTA, poziom, pasek obszarów i (w fazie 4) stronę `/droga` z pełną ścieżką do gotowości. Zastępuje onboarding (S-07, usunięte z roadmapy 2026-10-04): pierwsze uruchomienie to stan początkowy tego ekranu.

Roadmap: `S-08`, change id `readiness-screen`, prerequisite `S-06` (done). PRD: FR-008, FR-009, FR-001 (onboarding jako stan początkowy), US-01, NFR (offline-first, UI po polsku, dane nie opuszczają urządzenia). Odblokowuje `S-09` (udostępnianie planu).

## Current State Analysis

- **Strona główna to stos siedmiu kart** (`src/components/HomeScreen.astro:36-146`): alarm, `MapPackageCard`, `RouteCard`, trzy `PlaceCard` z formularzami, `HouseholdLinkCard`, `BackpackLinkCard`, link do czujników i status offline. Każda karta ma własne CTA, żadna nie mówi, co zrobić teraz.
- **Wszystkie dane do gotowości już istnieją** i są czytane synchronicznie z `localStorage`: `wrw.plan` (miejsca, domownicy, kontakty, odhaczenia plecaka, `lastKnownPosition`; `src/lib/services/plan-storage.ts`), `wrw.navigation` (zapisana trasa do schronu; `navigation-storage.ts`), `wrw.map` (czy paczka jest `ready`; `map-storage.ts`). Czujniki nie mają dziś śladu w danych, instalację (PWA standalone) da się odczytać z przeglądarki.
- **Plecak** ma stany `packed / unpacked / outdated` (`src/lib/backpack.ts:269-286`), więc poziom może spaść po zmianie składu rodziny.
- **Mapa offline działa tylko dla Małopolski**: jedna paczka w `MAP_REGIONS` (`src/lib/map-regions.ts:16`), `proposeRegion` zwraca `covers` względem `lastKnownPosition`. Punkty schronienia PSP i promień wyboru (15 km, `SHORTLIST_RADIUS_METERS`, `src/lib/shelters.ts:19`) także dotyczą Małopolski.
- **Odświeżanie trasy** (`useRouteRefresh`, `route-refresh.ts:needsRefresh`) działa przy otwarciu aplikacji i zapisuje `lastKnownPosition`, więc ekran gotowości odzwierciedla pozycję bez własnej obsługi GPS.
- **Instalacja na iOS ma znaczenie funkcjonalne**: mapa pobrana w karcie Safari nie jest widoczna w aplikacji z ekranu początkowego (`useMapPackage.ts:needsHomeScreenInstall`), a funkcja jest prywatna dla hooka.
- **Alarm** to `AlarmButton` (`src/components/AlarmButton.tsx`) na `useHoldAction` z przytrzymaniem 2000 ms, które „przetestowano w terenie” i nie wolno go zmieniać (`CLAUDE.md`).
- **Nawigacja podstron**: `/czujniki`, `/domownicy`, `/plecak` mają skopiowany blok „← Wróć do planu” (identyczny HTML w trzech plikach `src/pages/*.astro`). Nie ma stron `/miejsca` ani `/offline`.
- **Układ i wzorzec ekranu** są opisane w `JEZYK_WIZUALNY.md`: §4 (Preparation: najważniejszy stan, jedna dominująca akcja na sekcję), §18 „Ekran gotowości” (stalowy pasek postępu, zielony status z ikoną i tekstem, bursztynowa uwaga z etykietą), §3 pkt 7 (prostota nad gęstość). Zakaz mierników gotowości dotyczy tylko Execution Mode (§5).
- **Testy**: Vitest tylko dla czystych funkcji w `src/lib/` (`vitest.config.ts`, środowisko node). `scripts/smoke.mjs:33,42` zawiera listę stron do sprawdzenia i listę plików w precache.

## Desired End State

Użytkownik otwiera aplikację i widzi: poziom gotowości (jeden z czterech: Zaczynamy, Podstawy, Gotowi do wyjścia, 72H Ready), jeden quick win jako główny przycisk, pasek pięciu obszarów ze statusem (każdy wchodzi do swojego konfiguratora) i alarm przyklejony do dołu ekranu. Po zrobieniu kroku w konfiguratorze i powrocie przez „← Gotowość” poziom albo następny quick win zmieniają się od razu. Gdy ostatnia pozycja wypada poza obszar pobranej mapy albo daleko od punktu, z którego policzono trasę, status się cofa, quick win wraca, a na ekranie pojawia się baner. Strona `/droga` pokazuje wszystkie quick winy w etapach ze stanem „zrobione / następny / później”.

**Jak to zweryfikować:** `npm test`, `npm run lint`, `npx astro check`, `npm run build`, `npm run smoke`; ręcznie na telefonie (alarm przyklejony, przytrzymanie 2 s działa, poziomy się zmieniają po edycji planu, tryb samolotowy, iOS standalone).

### Key Discoveries:

- Cały stan gotowości da się wyliczyć z istniejących kluczy, nie trzeba nowego klucza poza jednym: `wrw.sensors` (czy czujniki sprawdzono i działają), bo tego nie da się odtworzyć z danych. Wzór: `wrw.voice` i `wrw.navigation` to też osobne klucze stanu urządzenia (`CLAUDE.md`).
- `lastKnownPosition` aktualizuje się przy każdym `Ustaw tutaj` i odświeżeniu trasy, więc nie nadaje się jako dowód, że kompas działa. Dlatego `wrw.sensors`.
- `needsHomeScreenInstall` jest prywatne w `useMapPackage.ts`; wydzielenie do `src/lib/services/install.ts` pozwala użyć go w katalogu i w kartach bez duplikatu.
- `Layout.astro:34-71` podpina status offline do elementu `[data-offline]` na stronie; element musi zostać na nowej stronie głównej, inaczej skrypt przestaje cokolwiek pokazywać.
- Trzy `PlaceCard` zapisują ten sam klucz (`wrw.plan`) i każda re-czyta plan tuż przed zapisem (`PlaceCard.tsx:savePlace`). Przeniesienie ich na jedną stronę `/miejsca` nie zmienia tego zachowania i nie wymaga zmian w karcie.
- Zapis planu bywa nieczytelny (`readPlanResult().source === "unreadable"`). Ekran gotowości nie może wtedy pokazywać „Zaczynamy” i zapraszać do zapisu, który nadpisałby dane.

## What We're NOT Doing

- Powiadomień push ani systemowych (wymagają serwera, NFR: dane nie opuszczają urządzenia). Baner „poza regionem” jest w aplikacji.
- Nowych paczek map ani nowych regionów. Reguły regionu działają ogólnie, ale dziś jest jedna paczka.
- Własnego przycisku instalacji (`beforeinstallprompt`) i ilustracji poradnika (`context/foundation/ilustracje`). Quick win „instalacja” to instrukcja i stan.
- Punktów, streaków i odznak (FR-016), procentów postępu (FR-009), emergency drill (FR-017).
- Zmian w `/alarm`, krokach ewakuacji, głosie i prowadzeniu. Zmian czasu przytrzymania alarmu.
- Automatycznego przekierowania po zapisie w konfiguratorze. Powrót jest jawny („← Gotowość”).
- Pozycji „kluczowych” poza ustaloną listą i klasyfikacji treści plecaka poza flagą kluczowości.
- Testów komponentów React (reguła repo): logika jest w `src/lib/`, a UI weryfikujemy ręcznie.
- Udostępniania planu (S-09).

## Implementation Approach

Logika wchodzi pierwsza, jako czyste funkcje bez UI, z testami. Potem podstrony i wspólna nawigacja, dopóki strona główna jeszcze działa po staremu, żeby nic nie znikało po drodze. Strona główna zmienia się dopiero w fazie 3, gdy cele linków już istnieją. Mapa gotowości (`/droga`) to faza 4 na tym samym katalogu.

Jedno źródło prawdy: **katalog quick winów** w `src/lib/readiness.ts`. Każdy quick win ma id, obszar (stronę konfiguratora), etap (do `/droga`), regułę „zrobione” wyliczaną z danych, tytuł czynności, jednozdaniowe uzasadnienie i adres. Z katalogu wynikają: następny krok (pierwszy niezrobiony w kolejności), poziom, status obszarów i lista na `/droga`. Treść (tytuły, uzasadnienia, nazwy poziomów) mieszka w tym pliku, tak jak treść kroków ewakuacji w `evacuation-steps.ts`.

Poziom jest stanem bieżącym, nie trofeum: może spaść (plecak „nieaktualny” po dodaniu dziecka, pozycja poza mapą). To rozstrzyga Open Question 1 z PRD: poziom różni się od kamienia milowego (FR-016, nice-to-have) tym, że jest wyliczany, a nie zdobywany.

**Kolejność quick winów** (ustalona 2026-10-04): miejsce spotkania → schron i trasa → kontakt/domownik → plecak kluczowy → miejsce zapasowe → instalacja → mapa offline → czujniki → plecak komplet.

**Poziomy** (liczone na „zrobionych” quick winach; krok „niedostępny” jest pomijany):
- Zaczynamy — domyślnie.
- Podstawy — jest miejsce spotkania albo schron (alarm ma dokąd prowadzić).
- Gotowi do wyjścia — miejsce spotkania, schron, kontakt/domownik i plecak kluczowy.
- 72H Ready — wszystko zrobione (poza krokami niedostępnymi).

## Critical Implementation Details

- **Mapa a region (reguła użytkownika, 2026-10-04).** Krok „mapa offline” jest zrobiony, gdy paczka jest `ready` i jej region obejmuje ostatnią znaną pozycję (`bounds` regionu paczki, nie najbliższy region z manifestu). Gdy paczka jest gotowa, ale pozycja leży poza nią: krok wraca jako niezrobiony i pojawia się baner. Jeśli istnieje inny region obejmujący pozycję, quick win brzmi „Pobierz mapę: {nazwa}”. Jeśli żaden region nie obejmuje pozycji (dziś zawsze poza Małopolską), krok ma stan `unavailable`: nie liczy się do poziomu, baner informuje, że mapy są na razie dla Małopolski. Pozycja nieznana (`null`) = krok niezrobiony bez banera.
- **Aktualność trasy.** Trasa jest „świeża”, gdy ostatnia znana pozycja jest nie dalej niż `SHORTLIST_RADIUS_METERS` od `route.origin`. Quick win „schron” jest zrobiony, gdy istnieje świeża trasa albo ręczny punkt ewakuacji. Stara trasa bez punktu ręcznego → „Odśwież trasę do schronu”. Brak kandydatów PSP w zasięgu (`lastRefresh.reason === "no-candidates"`) → quick win prowadzi do `/miejsca` i brzmi „Wskaż punkt ewakuacji”.
- **Nieczytelny plan.** Hook zwraca `planSource`; przy `unreadable` ekran nie pokazuje poziomu ani CTA, tylko komunikat o nieodczytanym planie (bez zapisu). Źródło: `readPlanResult()`.
- **Alarm przyklejony.** Dock musi uwzględniać `env(safe-area-inset-bottom)` i zostawiać na dole treści odstęp równy własnej wysokości, żeby nie zasłaniał ostatniego wiersza. Hold-to-confirm zostaje na `useHoldAction` (2000 ms, bez zmian); nie powstaje druga kopia automatu. Alarm jest tylko na `/`, na podstronach jest „← Gotowość”.
- **Odświeżanie stanu.** Ekran czyta źródła w pierwszym renderze (`client:only="react"`, jak pozostałe wyspy) i ponownie po `pageshow` z `persisted`, `visibilitychange` i `storage` (zmiany z innej karty). Wzór: `HouseholdLinkCard.tsx`.

## Phase 1: Logika gotowości

### Overview

Czyste funkcje i dane pomocnicze bez UI: katalog quick winów, poziom, następny krok, status obszarów, powiadomienia, pozycje kluczowe plecaka, pokrycie regionu mapy, nowy klucz `wrw.sensors`, wydzielona funkcja instalacji. Po tej fazie aplikacja wygląda tak samo, ale logika jest przetestowana.

### Changes Required:

#### 1. Katalog i wyliczenie gotowości

**File**: `src/lib/readiness.ts` (nowy), `src/lib/readiness.test.ts` (nowy)

**Intent**: Jedno źródło prawdy o tym, co podnosi gotowość: katalog dziewięciu quick winów, wyliczenie poziomu, następnego kroku, statusu pięciu obszarów i powiadomień z jednego wejścia.

**Contract**: `computeReadiness(input: ReadinessInput): Readiness`, gdzie `ReadinessInput = { plan: HouseholdPlan; planSource: PlanSource; navigation: NavigationState; map: MapPackageState | null; sensors: SensorCheckState | null; install: "done" | "todo" | "na" }`. `Readiness = { level: ReadinessLevel; quickWins: QuickWin[]; next: QuickWin | null; areas: AreaStatus[]; notices: ReadinessNotice[] }`. `QuickWin = { id; area: AreaId; stage: StageId; status: "done" | "todo" | "unavailable"; title; reason; href; progress?: { done; total } }`. Stałe wyeksportowane do UI: `LEVELS` (nazwa, opis jednozdaniowy), `STAGES`, `AREAS` (nazwa, adres, ikona-klucz). Funkcja jest czysta i nie czyta storage ani `Date.now()`. Testy obejmują: pusty plan, każdy próg poziomu, spadek poziomu przy plecaku `outdated` i dodanym dziecku, kolejność `next`, pozycję poza paczką z innym regionem, bez innego regionu (`unavailable`), `null` pozycji, starą trasę z punktem ręcznym i bez, `no-candidates`, `planSource: "unreadable"`, `install: "na"`.

#### 2. Pozycje kluczowe plecaka

**File**: `src/lib/backpack.ts`, `src/lib/backpack.test.ts`

**Intent**: Oznaczyć pozycje kluczowe i dać podsumowanie osobno dla nich i dla całości, żeby poziom „Gotowi do wyjścia” wymagał tylko kluczowych, a „72H Ready” całości (zgodnie z decyzją o dwóch etapach).

**Contract**: `isKeyItem(item: BackpackItem): boolean` (id `water`, `food`, `documents`, `first-aid`, `pet-food` oraz każda pozycja z grupy `needs`); `summarizeKeyItems(items, packed): { packed; total }`. `summarizeBackpack` zostaje bez zmian. Lista kluczowych jest decyzją produktową spoza PRD, więc stoi jako jedna stała z komentarzem o źródle.

#### 3. Pokrycie regionu mapy

**File**: `src/lib/map-regions.ts`, `src/lib/map-regions.test.ts` (nowy)

**Intent**: Odpowiedzieć na pytanie „czy pobrana paczka obejmuje tę pozycję” i „czy jakikolwiek region ją obejmuje”, bez zmiany istniejącego `proposeRegion`.

**Contract**: `regionById(id): MapRegion | undefined`, `regionCovering(position): MapRegion | undefined`, `packageCovers(state: MapPackageState, position): boolean`.

#### 4. Stan czujników

**File**: `src/lib/services/sensor-storage.ts` (nowy), `src/lib/services/sensor-storage.test.ts` (nowy), `src/components/SensorCheck.tsx`

**Intent**: Zapamiętać, że organizator sprawdził czujniki i co z tego wyszło, bo tego nie da się odtworzyć z planu. `SensorCheck` zapisuje wynik, gdy oba odczyty się ustalą.

**Contract**: klucz `wrw.sensors`, `schemaVersion: 1`, `{ checkedAt: string; location: "working" | "denied" | "unavailable"; compass: "working" | "denied" | "unavailable" }`; `readSensors(): SensorCheckState | null`, `writeSensors(state): boolean`, `sensorsReady(state): boolean` (prawda, gdy `location === "working"` i `compass !== "denied"`). Odczyt waliduje pole po polu jak `parseNavigation`; uszkodzony wpis to `null`. Zapis zwraca `boolean`, `false` jest pokazywany użytkownikowi (reguła repo).

#### 5. Instalacja

**File**: `src/lib/services/install.ts` (nowy), `src/components/hooks/useMapPackage.ts`

**Intent**: Wydzielić wykrywanie „iOS poza aplikacją z ekranu początkowego” z prywatnej funkcji hooka, żeby katalog i karta instalacji korzystały z jednego kodu.

**Contract**: `installState(): "done" | "todo" | "na"` (`na` poza iOS, `todo` na iOS w karcie przeglądarki, `done` w trybie standalone); `useMapPackage` importuje stąd i zachowuje swoje `needsInstall`.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `npm test`
- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Build się buduje: `npm run build`

#### Manual Verification:

- Zapis `wrw.sensors` pojawia się w DevTools po sprawdzeniu czujników na `/czujniki`.
- Aplikacja wygląda i działa tak samo jak przed fazą (strona główna bez zmian).

**Implementation Note**: Po tej fazie i przejściu automatycznych kryteriów zatrzymaj się na potwierdzenie ręczne przed fazą 2.

---

## Phase 2: Podstrony i wspólna nawigacja

### Overview

Konfiguratory dostają własne adresy i wspólny powrót „← Gotowość”. Strona główna zostaje jeszcze w obecnej postaci, więc nic nie znika, a nowe adresy już działają.

### Changes Required:

#### 1. Wspólny powrót

**File**: `src/components/PageBackLink.astro` (nowy), `src/pages/czujniki.astro`, `src/pages/domownicy.astro`, `src/pages/plecak.astro`

**Intent**: Zastąpić trzy skopiowane bloki „← Wróć do planu” jednym komponentem z etykietą „Gotowość”, tak żeby wszystkie podstrony wracały do ekranu gotowości jednakowo.

**Contract**: `<PageBackLink />` renderuje link do `/` z ikoną `ArrowLeft` (Lucide, obrys 2 px), celem dotykowym min. 44 px i widocznym fokusem jak dotychczasowy blok. Etykieta: „Gotowość”.

#### 2. Strona miejsc

**File**: `src/pages/miejsca.astro` (nowy)

**Intent**: Trzy formularze miejsc (spotkania, zapasowe, punkt ewakuacji) przeniesione ze strony głównej bez zmian zachowania.

**Contract**: ta sama kolejność i te same propsy `PlaceCard` co na stronie głównej (`emphasis` primary tylko dla miejsca spotkania, §3 JV); nagłówek „Miejsca” z krótkim opisem kolejności prowadzenia (tekst z `HomeScreen.astro:63-66`).

#### 3. Strona offline

**File**: `src/pages/offline.astro` (nowy), `src/components/InstallCard.tsx` (nowy)

**Intent**: Wszystko, co przygotowuje działanie bez sieci, w jednym miejscu: instalacja, mapa, schron i trasa.

**Contract**: kolejność sekcji: `InstallCard` → `MapPackageCard` → `RouteCard`. `InstallCard` pokazuje stan z `installState()` (zrobione z ikoną i tekstem, instrukcja „Udostępnij → Do ekranu początkowego” na iOS, brak karty na `na`). Nie dodaje własnego przycisku instalacji.

#### 4. Smoke i precache

**File**: `scripts/smoke.mjs`

**Intent**: Dodać nowe strony do listy sprawdzanych tras i plików w precache.

**Contract**: `/miejsca`, `/offline` w pętli stron (linia ~33) oraz `miejsca.html`, `offline.html` w liście plików precache (linia ~42). Glob w `scripts/generate-sw.mjs` obejmuje `*.html`, więc nowe strony są w precache bez zmian skryptu.

### Success Criteria:

#### Automated Verification:

- Lint, typy i build przechodzą: `npm run lint && npx astro check && npm run build`
- Smoke przechodzi na buildzie: `npm run preview` w tle, `npm run smoke`

#### Manual Verification:

- `/miejsca` pozwala ustawić trzy miejsca, a po zapisie jednego drugie nie jest nadpisane.
- `/offline` pobiera mapę i przygotowuje trasę jak dotychczas na stronie głównej.
- Każda podstrona wraca „← Gotowość” na `/`.
- Strony działają w trybie samolotowym po pierwszym wejściu online.

**Implementation Note**: Po tej fazie zatrzymaj się na potwierdzenie ręczne przed zmianą strony głównej.

---

## Phase 3: Ekran gotowości jako strona główna

### Overview

Strona główna zamienia stos kart na ekran gotowości. Stare karty miejsc, mapy i trasy znikają z `/` (żyją na podstronach z fazy 2).

### Changes Required:

#### 1. Hook stanu gotowości

**File**: `src/components/hooks/useReadiness.ts` (nowy)

**Intent**: Jedno miejsce, które czyta wszystkie źródła stanu i zwraca gotowy wynik `computeReadiness`, odświeżając go po powrocie na stronę.

**Contract**: `useReadiness(): Readiness & { planSource: PlanSource }`. Stan początkowy z synchronicznych odczytów (`readPlanResult`, `readNavigation`, `readMapPackage`, `readSensors`, `installState`); odświeżenie na `pageshow` z `persisted`, `visibilitychange` (widoczny) i `storage`. Bez efektów ubocznych poza odczytem.

#### 2. Ekran gotowości

**File**: `src/components/ReadinessScreen.tsx` (nowy), `src/components/ReadinessLevel.tsx` (nowy), `src/components/AreaStrip.tsx` (nowy)

**Intent**: Pokazać w kolejności wzorca z §4 JV: tytuł i kontekst, poziom z postępem, jeden quick win jako główna akcja, pasek obszarów i alarm.

**Contract**: poziom jako cztery segmenty stalowego paska z nazwą bieżącego poziomu i jednozdaniowym opisem, bez procentu (§18 JV, FR-009); status „zrobione” zawsze z ikoną i tekstem (§13 JV), kolor zielony tylko dla `safe`. CTA to link ostylowany jak przycisk primary z etykietą quick winu i uzasadnieniem pod nim; jeden primary na ekranie. `AreaStrip`: pięć pozycji (miejsca, rodzina, plecak, offline, czujniki), każda to link ≥ 44 px do konfiguratora, ze stanem „zrobione / do zrobienia / częściowo” (tekst i ikona), bez własnych przycisków primary. Baner w kolorze uwagi (`attention-foreground`, ikona `TriangleAlert`) dla powiadomień z `Readiness.notices`: pozycja poza mapą, trasa nieaktualna, plan nieczytelny. Przy poziomie „72H Ready” zamiast CTA komunikat o gotowości. Przy `planSource: "unreadable"` zamiast poziomu i CTA komunikat bez zachęty do zapisu.

#### 3. Alarm przyklejony

**File**: `src/components/AlarmButton.tsx`, `src/components/ReadinessScreen.tsx`

**Intent**: Alarm zawsze dostępny na dole ekranu, w spokojnej formie Preparation Mode, z tym samym zachowaniem przytrzymania.

**Contract**: `AlarmButton` dostaje wariant zwarty (`compact`) bez osobnej kopii automatu: dalej `useHoldAction(2000, …)`. Dock jest przyklejony do dołu (`env(safe-area-inset-bottom)`), ma `aria-describedby` na krótką podpowiedź „Przytrzymaj 2 s”, a główna treść ma dolny odstęp równy wysokości docka. Kolor alarmu bez zmian względem obecnego przycisku (czerwień jest dopuszczona dla awaryjnej akcji, §3 pkt 3 JV).

#### 4. Strona główna

**File**: `src/components/HomeScreen.astro`

**Intent**: Zastąpić zawartość `<main>` wyspą `ReadinessScreen`, zachowując nagłówek marki, plakietkę trybu i element statusu offline.

**Contract**: usunięte z `/`: `AlarmButton` jako karta, `MapPackageCard`, `RouteCard`, trzy `PlaceCard`, `HouseholdLinkCard`, `BackpackLinkCard`, link czujników. Zostaje blok `[data-offline]` (`Layout.astro` podpina do niego skrypt), przeniesiony poniżej paska obszarów. `HouseholdLinkCard` i `BackpackLinkCard` są nieużywane po zmianie: usuwamy je, jeśli nic innego ich nie importuje.

### Success Criteria:

#### Automated Verification:

- Testy, lint, typy, build: `npm test && npm run lint && npx astro check && npm run build`
- Smoke przechodzi: `npm run preview` w tle, `npm run smoke`
- Brak nieużywanych komponentów po usunięciu kart: `npm run lint`

#### Manual Verification:

- Pierwsze uruchomienie (czyste dane): poziom „Zaczynamy”, CTA „Ustaw miejsce spotkania”, alarm na dole.
- Kolejne kroki podnoszą poziom w kolejności z katalogu; po dodaniu dziecka plecak spada na „nieaktualny” i poziom się cofa.
- Przytrzymanie alarmu przez 2 s uruchamia `/alarm`, puszczenie wcześniej niczego nie uruchamia; ostatni wiersz strony nie jest zasłonięty przez dock (iPhone z paskiem domu).
- Pozycja poza Małopolską: baner „mapy są na razie dla Małopolski”, krok mapy nie blokuje poziomu.
- Po zmianie pozycji daleko od trasy: quick win „Odśwież trasę do schronu”.
- Nieczytelny wpis `wrw.plan` w DevTools: komunikat zamiast poziomu.
- Czytnik ekranu odczytuje poziom, CTA i stan obszarów bez polegania na kolorze.

**Implementation Note**: Po tej fazie zatrzymaj się na potwierdzenie ręczne przed fazą 4.

---

## Phase 4: Ścieżka gotowości `/droga` i dokumenty

### Overview

Pełny obraz: wszystkie quick winy w czterech etapach ze stanem. Aktualizacja dokumentów projektu.

### Changes Required:

#### 1. Strona ścieżki

**File**: `src/pages/droga.astro` (nowy), `src/components/ReadinessPath.tsx` (nowy)

**Intent**: Pokazać całą drogę do gotowości zamiast listy braków: etapy z postępem, gdzie zrobione kroki są widoczne i spokojne, następny jest wyróżniony, a późniejsze wyszarzone.

**Contract**: etapy z `STAGES` (Cel alarmu, Rodzina i plecak, Offline, Komplet 72H); wiersz = ikona stanu z tekstem („Zrobione”, „Następny krok”, „Później”, „Niedostępne w Twoim regionie”), tytuł, uzasadnienie i link do konfiguratora. Nagłówek bez słowa „mapa” (rozróżnienie od mapy offline), np. „Droga do gotowości”. Przycisk primary tylko przy następnym kroku. Wejście: link „Zobacz całą drogę” na ekranie gotowości.

#### 2. Smoke

**File**: `scripts/smoke.mjs`

**Intent**: Dodać `/droga` do sprawdzanych tras i precache.

**Contract**: `/droga`, `droga.html` jak w fazie 2.

#### 3. Dokumenty

**File**: `context/foundation/prd.md`, `context/foundation/roadmap.md`, `CLAUDE.md`

**Intent**: Zapisać decyzje i konwencje, żeby kolejne zmiany (S-09) korzystały z katalogu i nie powielały logiki.

**Contract**: PRD, „Rozstrzygnięte 2026-10-04”: poziomy i progi (Open Question 1), onboarding zastąpiony stanem początkowym ekranu gotowości (FR-001), reguła regionu mapy i aktualności trasy, powiadomienie jako baner w aplikacji. Roadmapa: S-08 `done`. `CLAUDE.md`: konwencje o katalogu quick winów jako jedynym źródle gotowości, o kluczu `wrw.sensors` (czwarty klucz localStorage, stan urządzenia), o stałej nawigacji podstron („← Gotowość”) i o dokowanym alarmie na `/`.

### Success Criteria:

#### Automated Verification:

- Testy, lint, typy, build: `npm test && npm run lint && npx astro check && npm run build`
- Smoke przechodzi: `npm run preview` w tle, `npm run smoke`

#### Manual Verification:

- `/droga` pokazuje te same stany co ekran gotowości, a następny krok jest tym samym quick winem co CTA.
- Zrobiony krok po powrocie na `/droga` zmienia stan bez przeładowania ręcznego.
- Dokumenty opisują reguły zgodnie z kodem.

---

## Testing Strategy

### Unit Tests:

- `readiness.test.ts`: wszystkie progi poziomów, kolejność `next`, spadek poziomu (plecak `outdated`, nowy domownik), `unavailable` dla mapy poza regionami, `null` pozycji, trasa stara/świeża z punktem ręcznym i bez, `no-candidates`, plan nieczytelny, `install: "na"`.
- `backpack.test.ts`: `isKeyItem` dla pozycji stałych, potrzeb i karmy; `summarizeKeyItems` z pozycją `outdated`.
- `map-regions.test.ts`: `regionCovering`, `packageCovers` na granicach `bounds`.
- `sensor-storage.test.ts`: parsowanie pole po polu, uszkodzony wpis, `sensorsReady` dla trzech wyników kompasu.

### Integration Tests:

- `npm run smoke` na buildzie: nowe strony serwowane i obecne w precache.

### Manual Testing Steps:

1. Wyczyść dane witryny, otwórz `/`: „Zaczynamy”, CTA do miejsca spotkania.
2. Przejdź kolejno wszystkie quick winy do „72H Ready”, sprawdzając poziom po każdym.
3. Dodaj dziecko po spakowaniu plecaka: poziom spada, quick win wraca z postępem.
4. Symuluj pozycję poza Małopolską (DevTools → Sensors): baner, krok mapy `unavailable`.
5. Tryb samolotowy: wszystkie strony i poziom działają po wcześniejszym wejściu online.
6. iPhone w standalone: przytrzymanie alarmu, dock nad paskiem domu.

## Performance Considerations

`computeReadiness` jest O(liczba pozycji plecaka) i liczone po stronie klienta przy odczycie; odświeżenie tylko po zdarzeniach strony, bez pętli i bez timerów. Ekran nie ładuje modułu mapy (reguła z `CLAUDE.md`: moduł mapy tylko na `/alarm`).

## Migration Notes

Brak migracji danych: `wrw.plan` (v4), `wrw.navigation` i `wrw.map` bez zmian. Nowy klucz `wrw.sensors` jest opcjonalny, jego brak oznacza „czujniki niesprawdzone”, więc istniejący użytkownik zobaczy ten quick win raz. Zmiana adresów: stare linki do kart na stronie głównej nie istnieją (były kotwicami bez adresu), `/czujniki`, `/domownicy`, `/plecak` zostają.

## References

- Brief: `context/changes/readiness-screen/plan-brief.md`
- Wzorzec odczytu stanu na wyspie: `src/components/HouseholdLinkCard.tsx`
- Wzorzec stanu urządzenia: `src/lib/services/navigation-storage.ts`, `src/lib/services/voice-settings.ts`
- Hold-to-confirm: `src/components/hooks/useHoldAction.ts`
- Wzorzec wizualny: `JEZYK_WIZUALNY.md` §3, §4, §13, §18
- Wymagania: `context/foundation/prd.md` FR-008, FR-009, FR-001, US-01

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Logika gotowości

#### Automated

- [x] 1.1 Testy przechodzą: `npm test` — 94775be
- [x] 1.2 Lint przechodzi: `npm run lint` — 94775be
- [x] 1.3 Typy przechodzą: `npx astro check` — 94775be
- [x] 1.4 Build się buduje: `npm run build` — 94775be

#### Manual

- [ ] 1.5 Zapis `wrw.sensors` pojawia się w DevTools po sprawdzeniu czujników
- [ ] 1.6 Aplikacja wygląda i działa tak samo jak przed fazą

### Phase 2: Podstrony i wspólna nawigacja

#### Automated

- [x] 2.1 Lint, typy i build przechodzą: `npm run lint && npx astro check && npm run build` — d36d19d
- [x] 2.2 Smoke przechodzi na buildzie: `npm run smoke` — d36d19d

#### Manual

- [ ] 2.3 `/miejsca` ustawia trzy miejsca bez nadpisywania sąsiednich
- [ ] 2.4 `/offline` pobiera mapę i przygotowuje trasę jak dotychczas
- [ ] 2.5 Każda podstrona wraca „← Gotowość” na `/`
- [ ] 2.6 Nowe strony działają w trybie samolotowym

### Phase 3: Ekran gotowości jako strona główna

#### Automated

- [x] 3.1 Testy, lint, typy, build: `npm test && npm run lint && npx astro check && npm run build`
- [x] 3.2 Smoke przechodzi: `npm run smoke`
- [x] 3.3 Brak nieużywanych komponentów po usunięciu kart

#### Manual

- [ ] 3.4 Pierwsze uruchomienie: „Zaczynamy”, CTA do miejsca spotkania, alarm na dole
- [ ] 3.5 Kolejne kroki podnoszą poziom; po dodaniu dziecka poziom spada
- [ ] 3.6 Przytrzymanie alarmu 2 s działa, dock nie zasłania treści (iPhone)
- [ ] 3.7 Pozycja poza Małopolską: baner i krok mapy `unavailable`
- [ ] 3.8 Pozycja daleko od trasy: quick win „Odśwież trasę do schronu”
- [ ] 3.9 Nieczytelny `wrw.plan`: komunikat zamiast poziomu
- [ ] 3.10 Czytnik ekranu odczytuje poziom, CTA i stan obszarów

### Phase 4: Ścieżka gotowości `/droga` i dokumenty

#### Automated

- [ ] 4.1 Testy, lint, typy, build: `npm test && npm run lint && npx astro check && npm run build`
- [ ] 4.2 Smoke przechodzi: `npm run smoke`

#### Manual

- [ ] 4.3 `/droga` pokazuje te same stany co ekran gotowości, następny krok = CTA
- [ ] 4.4 Zrobiony krok zmienia stan na `/droga` po powrocie
- [ ] 4.5 Dokumenty (PRD, roadmapa, CLAUDE.md) zgodne z kodem

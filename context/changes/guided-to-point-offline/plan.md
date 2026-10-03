# Prowadzenie do punktu offline (S-01) — plan implementacji

## Overview

Dowozimy gwiazdę przewodnią roadmapy: organizator zapisuje punkt ewakuacji na urządzeniu, na spokojnie sprawdza czujniki, a w kryzysie przytrzymuje przycisk alarmu i idzie za dużą bursztynową strzałką z odległością do punktu — w trybie samolotowym, bez sieci i bez serwera.

Roadmap: `S-01`, change id `guided-to-point-offline`, prerequisite `F-01` (done).
PRD: US-01, FR-004, FR-006, FR-012, FR-014, NFR (pierwszy krok < 2 s od zwolnienia alarmu, interfejs po polsku, dane nie opuszczają urządzenia).

## Current State Analysis

Po `F-01` repozytorium jest statyczną PWA bez backendu i to wszystko, co mamy:

- `src/pages/index.astro` renderuje `src/components/Welcome.astro` — po PR #16 ekran powitalny w nowym języku wizualnym, ale bez żadnej funkcji produktu.
- PR #16 dostarczył warstwę wizualną: font Commissioner (self-hostowany `.woff2`), tokeny §6 w `src/styles/global.css` z osobnym zestawem dla `[data-mode="execution"]` (`global.css:101-134`: `--background` #0b1117, `--foreground` #f3f7fa, `--muted-foreground` #a8b5c0, `--guidance` #f2c15c, `--safe` #6bc49b), mapowanie na klasy Tailwind w `@theme inline` (`bg-background`, `text-guidance`, `text-safe`…), wariant `execution:` oraz prop `mode: "preparation" | "execution"` w `src/layouts/Layout.astro`, który ustawia `data-mode` i `theme-color`. Wzorzec użycia: `src/pages/design.astro`.
- Nie ma żadnej warstwy zapisu danych: brak `src/types.ts`, brak `src/lib/services/`, brak jakiegokolwiek dostępu do localStorage czy IndexedDB.
- Jedyny komponent React to `src/components/ui/button.tsx` (shadcn). Nie ma ani jednego islandu na stronie.
- Nie ma frameworka testów. CI (`.github/workflows/ci.yml`) uruchamia `npm ci`, `astro sync`, `npm run lint`, `npx astro check`, `npm run build`, osobno `npm run smoke`, a na `main` deploy i smoke na żywo.
- `scripts/generate-sw.mjs:5` precache'uje `**/*.{html,js,css,png,svg,ico,webmanifest,woff2}` z `dist/`. Nowe strony trafią tam automatycznie, bez zmian w skrypcie.
- `scripts/smoke.mjs:20` sprawdza obecność atrybutu `data-offline-status` na `/`. Przebudowa strony domowej musi ten element zachować albo smoke padnie w CI.

Czyli: cała logika, cały zapis danych, cała obsługa czujników i oba realne ekrany produktu powstają w tym slice'ie od zera.

## Desired End State

Na telefonie, pod publicznym adresem `https://w-razie-w.jzogala.workers.dev`, po jednym otwarciu online:

1. Strona domowa pokazuje stan planu („Punkt ewakuacji: nie wskazano" albo nazwę i współrzędne), przycisk zapisu punktu, odnośnik do sprawdzenia czujników i przycisk alarmu.
2. Organizator zapisuje punkt — przyciskiem „Ustaw tutaj" (bieżąca pozycja z GPS) albo wpisując współrzędne. Plan ląduje w localStorage i przeżywa zamknięcie aplikacji.
3. Ekran „Sprawdź czujniki" pyta o zgody, pokazuje na żywo pozycję z dokładnością i kurs kompasu, i zapisuje ostatnią znaną pozycję.
4. Włączony tryb samolotowy. Przytrzymanie alarmu przez 2 s przenosi na `/alarm`, gdzie natychmiast widać cel i instrukcję, a strzałka z odległością pojawia się od razu z ostatniej znanej pozycji (z podpisem czasu) i przełącza się na bieżącą po pierwszym fixie.
5. Wejście w promień 25 m od punktu pokazuje ekran „Jesteś na miejscu".

Weryfikacja: `npm run lint`, `npx astro check`, `npm test`, `npm run build`, `npm run smoke` przechodzą lokalnie i w CI; przejście 1–5 wykonane ręcznie na telefonie w trybie samolotowym.

### Key Discoveries

- **Strona domowa jest objęta kontraktem smoke testu.** `scripts/smoke.mjs:20` wymaga `data-offline-status` w HTML `/`; element pochodzi z `src/components/Welcome.astro:67`, a skrypt rejestrujący SW w `src/layouts/Layout.astro:39` go wypełnia. Przebudowa strony musi zachować i atrybut, i działanie skryptu.
- **localStorage jest tu wyborem wydajnościowym, nie tylko prostotą.** Odczyt jest synchroniczny, więc `/alarm` renderuje cel i instrukcję w pierwszym przebiegu Reacta, bez stanu ładowania — to jest mechanizm spełnienia NFR „pierwszy krok < 2 s".
- **Kompas to dwa różne API.** iOS podaje `event.webkitCompassHeading` (stopnie od północy, zgodnie z ruchem wskazówek) i wymaga `DeviceOrientationEvent.requestPermission()` wywołanego z gestu użytkownika. Chromium na Androidzie używa zdarzenia `deviceorientationabsolute` i `event.alpha` liczonego przeciwnie do ruchu wskazówek, czyli kurs to `(360 - alpha) % 360`. Obie ścieżki wymagają HTTPS — mamy je pod workers.dev.
- **Nowe strony wchodzą do precache, ale przy domyślnym `build.format: "directory"` service worker ich nie znajdzie.** Glob w `scripts/generate-sw.mjs:5` łapie `**/*.html`, więc `dist/alarm/index.html` trafia do precache jako `alarm/index.html`. Workbox dla nawigacji na `/alarm` sprawdza jednak tylko `/alarm` i `/alarm.html` (`index.html` dokleja wyłącznie do ścieżek kończących się `/`), więc nie trafia i `navigateFallback` podaje `/index.html` — stronę domową, online i offline. Ten sam błąd ma już `/design`. Dlatego w fazie 2 przełączamy `build.format` na `"file"` (`dist/alarm.html`), co `cleanURLs` w Workboxie dopasowuje do `/alarm`. Smoke tego nie wykryje, bo zwykły `fetch` omija SW — pilnuje tego test ręczny offline.
- **Odległości referencyjne do testów są wyliczone i sprawdzone**: Warszawa Centrum (52.2297, 21.0122) → Kraków Rynek (50.0647, 19.9450) = 251 977 m, azymut 197,6°; Centrum → PKiN (52.2317, 21.0059) = 483,3 m, azymut 297,4°; 1° szerokości na równiku = 111 195 m, azymut 0°; ten sam punkt = 0 m.

## What We're NOT Doing

- **Automatyczne szukanie najbliższego schronu i cykliczne wyznaczanie trasy w tle.** Pomysł zgłoszony w trakcie planowania, świadomie odłożony: to Non-Goal w PRD („Bez własnej bazy i propozycji schronów", FR-004) i pozycja w `roadmap.md` §Parked, a dostępność danych PSP nie jest potwierdzona (`konkurencja/porownanie-gdziesieukryc-vs-household-resilience.md:85`). Wchodzi jako nowy slice po S-04 — wpis do roadmapy w fazie 4.
- **Trasa i mapa offline** — to S-04 (`offline-map-and-route`). Tutaj wyłącznie odległość w linii prostej, jawnie tak podpisana w UI.
- **Sekwencja kroków i wyjście „niedostępne" na miejsce zapasowe** — S-02 (`step-flow-and-fallback`). `/alarm` prowadzi do jednego punktu.
- **Voice guidance** — S-03.
- **Domownicy, plecak, onboarding, ekran gotowości, udostępnianie** — S-05…S-09.
- **Zmiany w warstwie tokenów.** Tokeny z PR #16 wystarczają; ten slice ich używa i nie dopisuje nowych do `global.css`. Żadnych hexów wpisanych lokalnie w komponentach.
- **Tryb demo z symulowaną pozycją.** Decyzja zespołu: bez planu B, demo na zewnątrz na realnych czujnikach. Ryzyko przyjęte świadomie — patrz Open Risks w `plan-brief.md`.
- **Wibracje** — wycięte z Execution Mode decyzją zespołu (US-01, odstępstwo od `PROJECT.md` 4.1 pkt 6).
- **Testy komponentów React.** Vitest wchodzi wyłącznie dla czystych funkcji geo.

## Implementation Approach

Budujemy od środka na zewnątrz: najpierw czysta logika z testami (typy, zapis, geo), potem ekrany przygotowań, które tę logikę zapełniają danymi, na końcu ekran prowadzenia, który ją konsumuje. Dzięki temu najbardziej błędogenna część (matematyka) jest sprawdzona, zanim zacznie zależeć od czujników, a każda faza zostawia aplikację w stanie, który da się wdrożyć i pokazać.

Podział na strony Astro ze statycznym HTML i wyspami React tylko tam, gdzie jest interakcja:

| Strona       | Plik                        | Island React                            | Tryb wizualny |
| ------------ | --------------------------- | --------------------------------------- | ------------- |
| `/`          | `src/pages/index.astro`     | `EvacuationPointCard`, `AlarmButton`    | Preparation   |
| `/czujniki`  | `src/pages/czujniki.astro`  | `SensorCheck`                           | Preparation   |
| `/alarm`     | `src/pages/alarm.astro`     | `GuidanceScreen`                        | Execution     |

Wszystkie wyspy montujemy jako `client:only="react"`, bo każda czyta localStorage w pierwszym renderze — przy `client:load` statyczny HTML z builda nie zawierałby zapisanych danych i doszłoby do rozjazdu hydratacji.

## Critical Implementation Details

**Timing i cykl życia zgód.** `DeviceOrientationEvent.requestPermission()` na iOS działa tylko wywołane bezpośrednio z obsługi gestu użytkownika (kliknięcie przycisku), nigdy z `useEffect`. Dlatego żądanie zgody na kompas żyje na ekranie `/czujniki` za jawnym przyciskiem, a nie przy wejściu na `/alarm` — na `/alarm` tylko podłączamy nasłuch i obsługujemy przypadek braku zgody fallbackiem na azymut z ruchu. Zgoda iOS nie jest pewnie pamiętana między uruchomieniami PWA, więc `/alarm` ma też awaryjną ścieżkę z gestu: gdy `DeviceOrientationEvent.requestPermission` istnieje, a przez ~1 s nie przyszło żadne zdarzenie kompasu, pokazuje drugorzędny przycisk „Włącz kompas", który wywołuje `requestHeadingPermission()` bezpośrednio w obsłudze kliknięcia.

**Sekwencja stanów na `/alarm`.** Kolejność ma znaczenie dla NFR: najpierw synchroniczny odczyt planu i render celu oraz instrukcji, potem w `useEffect` start `watchPosition` i nasłuchu kompasu. Odwrotna kolejność (czekanie na pozycję przed pierwszym renderem) łamie próg 2 s przy zimnym fixie, który realnie trwa 10–30 s.

**Spec doświadczenia w oknie bez fixa.** Strzałka i odległość liczą się z `lastKnownPosition` i są podpisane „dane z HH:MM", a strzałka ma obniżoną nieprzezroczystość. W momencie pierwszego fixu podpis znika i strzałka przechodzi w pełną jasność. Brak `lastKnownPosition` i brak fixu to trzeci stan: „Szukam sygnału GPS" bez strzałki. Stan musi być czytelny tekstem, nie tylko kolorem (`JEZYK_WIZUALNY.md` §13).

## Phase 1: Fundament — dane planu i matematyka geo

### Overview

Czysta logika bez UI: typy współdzielone, zapis planu w localStorage z wersjonowaniem schematu, funkcje odległości i azymutu, vitest i krok w CI. Po tej fazie nic nie widać w przeglądarce, ale wszystko, co dalej, stoi na sprawdzonym fundamencie.

### Changes Required

#### 1. Typy współdzielone

**File**: `src/types.ts` (nowy)

**Intent**: Jedno miejsce z kształtem planu domowego, żeby S-05, S-06 i S-09 rozszerzały ten sam typ, a nie wymyślały własny.

**Contract**: Eksportuje `Coordinates`, `EvacuationPoint`, `LastKnownPosition`, `HouseholdPlan`. `HouseholdPlan` jest kontacktem, na którym oprą się kolejne slice'y, więc zapisujemy go jawnie:

```ts
export type HouseholdPlan = {
  schemaVersion: 1;
  evacuationPoint: EvacuationPoint | null; // { label: string; coords: Coordinates }
  lastKnownPosition: LastKnownPosition | null; // { coords: Coordinates; recordedAt: string }
  updatedAt: string; // ISO 8601
};
```

Daty jako łańcuchy ISO 8601, nie `Date` — plan musi przejść przez `JSON.stringify` bez straty i w S-09 wejść do QR albo pliku.

#### 2. Zapis planu na urządzeniu

**File**: `src/lib/services/plan-storage.ts` (nowy)

**Intent**: Odczyt i zapis planu pod jednym kluczem localStorage, z migracją przy odczycie i odpornością na brak localStorage (tryb prywatny, zablokowane dane witryny). Realizuje FR-006.

**Contract**: Klucz `"wrw.plan"`. Eksportuje `createEmptyPlan(): HouseholdPlan`, `readPlan(): HouseholdPlan` (synchronicznie; zwraca pusty plan przy braku danych, niepoprawnym JSON, nieznanym `schemaVersion` lub niedostępnym localStorage) oraz `writePlan(plan: HouseholdPlan): void` (ustawia `updatedAt` na moment zapisu). Odczyt nigdy nie rzuca — `/alarm` nie może się wysypać w kryzysie przez uszkodzony wpis. Każdy `localStorage` dotykany jest w `try/catch`.

#### 3. Matematyka geo

**File**: `src/lib/geo.ts` (nowy)

**Intent**: Czyste funkcje: odległość w linii prostej, azymut do celu i obrót strzałki względem kursu urządzenia. Bez zależności, bez stanu.

**Contract**: `distanceMeters(from: Coordinates, to: Coordinates): number` (haversine, promień Ziemi 6 371 000 m), `bearingDegrees(from: Coordinates, to: Coordinates): number` (azymut początkowy, 0–360, 0 = północ), `relativeBearing(targetBearing: number, deviceHeading: number): number` (0–360, kąt obrotu strzałki na ekranie). Dodatkowo `formatDistance(meters: number): string` dla UI: poniżej 1000 m zaokrąglone do 10 m z jednostką „m", powyżej — kilometry z jedną cyfrą po przecinku.

#### 4. Testy matematyki geo

**File**: `src/lib/geo.test.ts` (nowy)

**Intent**: Zabezpieczyć jedyną logikę w slice'ie, w której pomyłka stopnie/radiany albo odwrócony znak nie objawia się na ekranie, tylko złym kierunkiem w terenie.

**Contract**: Przypadki na zweryfikowanych wartościach, z tolerancją: Warszawa Centrum → Kraków Rynek = 251 977 m ±100 m i azymut 197,6° ±0,5°; Centrum → PKiN = 483,3 m ±2 m i azymut 297,4° ±0,5°; 1° szerokości od (0,0) = 111 195 m ±50 m i azymut 0°; ten sam punkt = 0 m. Dla `relativeBearing` przypadki przejścia przez 0/360 (cel 10°, kurs 350° → 20°).

#### 5. Uruchamianie testów

**File**: `package.json`, `.github/workflows/ci.yml`, ewentualnie `eslint.config.js`

**Intent**: Dodać vitest jako jedyną nową zależność dev i wpuścić testy do CI, żeby regresja w geo zatrzymywała merge.

**Contract**: `vitest` w `devDependencies` przypięty na `5.0.3` (peer `vite` `^6.4.0 || ^7.0.0 || ^8.0.0` obejmuje Vite 8.3 z Astro 7; po instalacji `npm ls vite` musi pokazać jedną kopię), skrypt `"test": "vitest run"`. W jobie `ci` krok `npm test` po `npm run lint`. Środowisko domyślne (node), bez jsdom — testujemy wyłącznie funkcje czyste. Jeśli reguły ESLint z type-checkiem zgłoszą plik testowy poza `tsconfig`, dopisać go do zakresu zamiast wyciszać regułę.

### Success Criteria

#### Automated Verification

- Testy przechodzą: `npm test`
- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Build przechodzi: `npm run build`
- CI uruchamia `npm test` w jobie `ci`

#### Manual Verification

- Celowa zmiana znaku w `bearingDegrees` wywala test (sprawdzenie, że testy faktycznie coś pilnują)

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie testu ręcznego, zanim przejdziesz do fazy 2.

---

## Phase 2: Przygotowanie — punkt ewakuacji i sprawdzenie czujników

### Overview

Dwa ekrany Preparation Mode, które zapełniają plan danymi: strona domowa z zapisem punktu i osobny ekran sprawdzenia czujników, który załatwia zgody na spokojnie, przed kryzysem. Realizuje FR-004 i FR-006.

### Changes Required

#### 1. Hook geolokalizacji

**File**: `src/components/hooks/useGeolocation.ts` (nowy)

**Intent**: Jedno źródło pozycji dla wszystkich ekranów: nasłuch `watchPosition` z obsługą braku zgody i braku fixu, z jawnym stanem do pokazania w UI.

**Contract**: `useGeolocation(options?: { watch?: boolean })` zwraca `{ coords, accuracyMeters, status, error }`, gdzie `status` to `"idle" | "prompting" | "locating" | "ready" | "denied" | "unavailable"`. Używa `enableHighAccuracy: true`. Czyści `watchPosition` w funkcji sprzątającej efektu — nieposprzątany watcher drenuje baterię w kryzysie.

#### 2. Hook kursu (kompas z fallbackiem)

**File**: `src/components/hooks/useHeading.ts` (nowy)

**Intent**: Kurs urządzenia z kompasu, a gdy kompasu lub zgody nie ma — azymut z kolejnych pozycji GPS. Pokrywa oba warunki: użytkownik stoi i użytkownik idzie.

**Contract**: `useHeading(coords: Coordinates | null, accuracyMeters: number | null)` zwraca `{ heading: number | null, source: "compass" | "movement" | null }`. Normalizacja kursu jest różna na obu platformach i to jest sedno tego pliku:

```ts
// iOS Safari: webkitCompassHeading już jest stopniami od północy, zgodnie z ruchem wskazówek
// Chromium/Android: zdarzenie "deviceorientationabsolute", alpha liczona przeciwnie do ruchu wskazówek
const heading =
  typeof e.webkitCompassHeading === "number" ? e.webkitCompassHeading : (360 - e.alpha) % 360;
```

Przypadki brzegowe: zdarzenia z `alpha === null` (Android) ignorujemy; `webkitCompassHeading` nie ma w `lib.dom`, więc lokalny typ `type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }` zamiast `any`; przeglądarka bez `deviceorientationabsolute` i bez `webkitCompassHeading` (np. Firefox na Androidzie) to brak kompasu, czyli od razu fallback z ruchu — zwykłe `deviceorientation` z względną `alpha` nie wskazuje północy i go nie używamy. Obsługujemy tylko orientację pionową, bez kompensacji `screen.orientation.angle`.

Eksportuje też `requestHeadingPermission(): Promise<PermissionState>` wywoływane wyłącznie z obsługi gestu (iOS). Fallback na azymut z ruchu aktywuje się, gdy nie ma kursu z kompasu. Hook sam trzyma punkt odniesienia w `useRef` (bez historii przekazywanej z zewnątrz): azymut z ruchu to `bearingDegrees(odniesienie, coords)` i jest liczony, a odniesienie przesuwane, dopiero gdy `distanceMeters(odniesienie, coords) > max(10, accuracyMeters)` — próg poniżej szumu GPS (5–20 m) kręciłby strzałką stojącego użytkownika. Do tego czasu zostaje poprzedni kurs z ruchu albo `null`.

#### 3. Karta punktu ewakuacji

**File**: `src/components/EvacuationPointCard.tsx` (nowy)

**Intent**: Zapisanie i podejrzenie punktu ewakuacji dwiema drogami: „Ustaw tutaj" z bieżącej pozycji i ręczny wpis współrzędnych. Realizuje FR-004.

**Contract**: Island React. Czyta i zapisuje plan przez `plan-storage`. Pokazuje stan: brak punktu albo nazwa z współrzędnymi. Pole nazwy (domyślnie „Punkt ewakuacji"), przycisk „Ustaw tutaj" (zapisuje bieżącą pozycję i aktualizuje `lastKnownPosition`), pole na współrzędne przyjmujące format „52.2297, 21.0122" z walidacją zakresów (−90…90, −180…180) i komunikatem błędu po polsku. Zapis punktu z GPS aktualizuje `lastKnownPosition` tym samym fixem.

#### 4. Strona domowa

**File**: `src/components/HomeScreen.astro` (nowy, zastępuje `src/components/Welcome.astro`), `src/pages/index.astro`

**Intent**: Zastąpić stronę ze startera realnym ekranem Preparation Mode: stan planu, zapis punktu, odnośnik do czujników, przycisk alarmu.

**Contract**: Statyczny HTML Astro z dwiema wyspami (`EvacuationPointCard`, `AlarmButton`, obie `client:only="react"`). **Musi zachować element z atrybutem `data-offline-status`** — `scripts/smoke.mjs:20` go wymaga, a skrypt w `src/layouts/Layout.astro:39` go wypełnia. Układ mobile-first, neutralne tło, jedna dominująca akcja na sekcję (`JEZYK_WIZUALNY.md` §4). Kolory wyłącznie z tokenów (`<Layout>` w trybie domyślnym `preparation`). Usuwa `src/components/Welcome.astro`.

#### 5. Ekran sprawdzenia czujników

**File**: `src/pages/czujniki.astro` (nowy), `src/components/SensorCheck.tsx` (nowy)

**Intent**: Pozwolić organizatorowi przed kryzysem przyznać zgody i zobaczyć, czy GPS i kompas faktycznie działają na jego telefonie. Jednocześnie zapisuje ostatnią znaną pozycję, z której `/alarm` zbuduje pierwszą strzałkę.

**Contract**: Dwa jawne przyciski: „Sprawdź lokalizację" i „Sprawdź kompas" (ten drugi wywołuje `requestHeadingPermission()` bezpośrednio w obsłudze kliknięcia — warunek iOS). Pokazuje na żywo szerokość, długość, dokładność w metrach, kurs w stopniach i źródło kursu. Każdy fix zapisuje `lastKnownPosition`. Dla każdego czujnika jeden z trzech wyników, z tekstem i ikoną, nie tylko kolorem: działa / brak zgody / niedostępny. Przy braku zgody komunikat mówi, co zrobić (ustawienia przeglądarki), zgodnie z `JEZYK_WIZUALNY.md` §13.

#### 6. Format builda zgodny z service workerem

**File**: `astro.config.mjs`

**Intent**: Sprawić, żeby nawigacja na `/czujniki`, `/alarm` (i istniejące `/design`) trafiała w precache, a nie w `navigateFallback` na stronę domową.

**Contract**: `build: { format: "file" }` — strony lądują jako `dist/czujniki.html`, `dist/alarm.html`; Workbox (`cleanURLs`) dopasowuje `/alarm` → `/alarm.html`, a assets Cloudflare serwują `/alarm` z `alarm.html`. Linki i `location.assign` używają adresów bez ukośnika na końcu. `scripts/generate-sw.mjs` bez zmian.

### Success Criteria

#### Automated Verification

- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Build przechodzi: `npm run build`
- Smoke przechodzi po przebudowie strony domowej: `npm run smoke`
- `dist/czujniki.html` istnieje po buildzie

#### Manual Verification

- „Ustaw tutaj" na telefonie zapisuje punkt, a po zamknięciu i ponownym otwarciu aplikacji punkt nadal jest widoczny
- Wpis współrzędnych „52.2297, 21.0122" zapisuje punkt, a wpis „abc" i „200, 0" pokazuje błąd i nie psuje planu
- Na `/czujniki` na Androidzie i iOS oba czujniki raportują wynik, a kurs zmienia się przy obracaniu telefonem
- Odmowa zgody na lokalizację daje czytelny komunikat, a nie puste pole
- Po jednym otwarciu online, w trybie samolotowym, wejście na `/czujniki` i `/design` pokazuje te strony, a nie stronę domową

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie testów ręcznych na realnym telefonie (oba systemy, jeśli są dostępne), zanim przejdziesz do fazy 3.

---

## Phase 3: Prowadzenie — alarm i ekran `/alarm`

### Overview

Serce slice'u: przycisk alarmu chroniony przytrzymaniem i ekran Execution Mode z dużą strzałką oraz odległością. Realizuje FR-012, FR-014 i NFR „pierwszy krok < 2 s".

### Changes Required

#### 1. Przycisk alarmu

**File**: `src/components/AlarmButton.tsx` (nowy)

**Intent**: Uruchomienie trybu działania gestem odpornym na przypadkowe naciśnięcie, bez drugiego ekranu potwierdzenia. Realizuje FR-012.

**Contract**: Island React. Przytrzymanie 2000 ms uruchamia przejście na `/alarm`; zwolnienie, `pointercancel` albo zjechanie palcem z przycisku przed czasem anuluje bez skutków. Pierścień postępu pokazuje pozostały czas i respektuje `prefers-reduced-motion` (bez pulsowania, sam postęp zostaje — to informacja, nie dekoracja). Target dotykowy minimum 44 × 44 px (`JEZYK_WIZUALNY.md` §15). Etykieta opisuje czynność, nie stan. Przejście przez `window.location.assign("/alarm")`.

#### 2. Ekran prowadzenia

**File**: `src/pages/alarm.astro` (nowy), `src/components/GuidanceScreen.tsx` (nowy)

**Intent**: Pokazać jedną dominującą informację operacyjną — kierunek i odległość do punktu — i nic poza tym. Realizuje FR-014.

**Contract**: Strona bez nagłówka nawigacji, tło Execution Mode. Island `client:only="react"` czyta plan synchronicznie w pierwszym renderze, więc nazwa celu i instrukcja są na ekranie przed jakimkolwiek odczytem czujnika. Cztery stany:

| Stan | Warunek | Co widać |
| --- | --- | --- |
| Brak punktu | `evacuationPoint === null` | Komunikat „Nie wskazano punktu ewakuacji" i odnośnik do strony domowej |
| Szukam sygnału | brak fixu i brak `lastKnownPosition` | Cel, instrukcja, „Szukam sygnału GPS", bez strzałki |
| Prowadzenie | jest fix albo `lastKnownPosition` | Strzałka obrócona o `relativeBearing`, odległość, podpis „w linii prostej"; przy danych z `lastKnownPosition` dodatkowo „dane z HH:MM" i przygaszona strzałka |
| Na miejscu | odległość < 25 m | „Jesteś na miejscu", bez strzałki |

Strona renderowana przez `<Layout mode="execution">`, kolory wyłącznie z tokenów §6 przez klasy Tailwind (wzorzec: `src/pages/design.astro`): tło `bg-background`, tekst `text-foreground`, tekst pomocniczy `text-muted-foreground`, strzałka i odległość `text-guidance`, stan „na miejscu" `text-safe`. Bez hexów w komponencie. Odległość cyframi tabularnymi (§8). Jedna akcja drugorzędna „Wyjdź z trybu alarmu", wyraźnie podrzędna wobec prowadzenia — bez czerwieni, bo nie jest to akcja awaryjna (wyjście „niedostępne" przychodzi w S-02). Każdy fix aktualizuje `lastKnownPosition`, żeby następne wejście w tryb alarmu startowało ze świeższych danych. Ekran nie może gasnąć w marszu: w efekcie `navigator.wakeLock?.request("screen")`, zwolnienie w funkcji sprzątającej, ponowne przejęcie przy `visibilitychange` (blokada przepada po zminimalizowaniu); brak wsparcia lub odmowa — cicho pomijamy, bez komunikatu.

#### 3. Strzałka kierunku

**File**: `src/components/DirectionArrow.tsx` (nowy)

**Intent**: Wydzielić samą grafikę kierunku, żeby S-02 i S-04 mogły ją osadzić nad mapą bez kopiowania logiki.

**Contract**: Props `{ rotationDegrees: number; dimmed?: boolean }`. Inline SVG, prosty kształt bez dekoracji (`JEZYK_WIZUALNY.md` §12), skalujący się do szerokości kontenera. Obrót przez `transform: rotate(...)`; animacja wyłącznie jako przejście kąta i pomijana przy `prefers-reduced-motion` (§14).

#### 4. Smoke dla nowej strony

**File**: `scripts/smoke.mjs`

**Intent**: Pilnować, że `/alarm` istnieje w buildzie i jest w liście precache SW — bez tego regresja w routingu albo w globie wyjdzie dopiero na telefonie w trybie samolotowym.

**Contract**: Dodaje `get("/alarm")` ze sprawdzeniem, że odpowiedź jest HTML, oraz asercję, że treść `/sw.js` zawiera `alarm.html`. Analogicznie dla `/czujniki` (`czujniki.html`). Zachowuje obecny kontrakt na `/`, manifest i ikony.

### Success Criteria

#### Automated Verification

- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Testy przechodzą: `npm test`
- Build przechodzi: `npm run build`
- Smoke z nowymi asercjami przechodzi: `npm run smoke`
- `/sw.js` zawiera `alarm.html` w liście precache

#### Manual Verification

- Na telefonie w trybie samolotowym przytrzymanie alarmu przez 2 s otwiera `/alarm`, a cel i instrukcja są widoczne w mniej niż 2 s od zwolnienia (mierzone stoperem)
- Zwolnienie przycisku po 1 s nie uruchamia trybu alarmu
- Strzałka obraca się przy obracaniu telefonem i wskazuje w kierunku punktu sprawdzonym niezależnie (kompas telefonu albo znany kierunek w terenie)
- Odległość maleje w trakcie przejścia w stronę punktu i poniżej 25 m pojawia się „Jesteś na miejscu"
- Przy odmówionej zgodzie na kompas strzałka działa po kilku krokach marszu (fallback na azymut z ruchu)
- Wejście na `/alarm` bez zapisanego punktu pokazuje komunikat, a nie pusty ekran ani błąd
- Ekran na `/alarm` nie gaśnie przez 2 min marszu bez dotykania telefonu
- Na iOS po zamknięciu i ponownym uruchomieniu PWA `/alarm` pokazuje „Włącz kompas", jeśli kompas milczy, a dotknięcie przywraca kurs z kompasu

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie testów ręcznych w terenie, zanim przejdziesz do fazy 4.

---

## Phase 4: Weryfikacja offline i domknięcie dokumentów

### Overview

Zamknięcie slice'u: potwierdzenie całej ścieżki na telefonie pod publicznym adresem w trybie samolotowym i zapisanie w dokumentach decyzji podjętych w planowaniu — w szczególności odstępstwa wobec Non-Goals i nowego slice'u na automatyczny wybór schronu.

### Changes Required

#### 1. Nowy slice w roadmapie

**File**: `context/foundation/roadmap.md`

**Intent**: Zapisać pomysł „co 30 min pobierz pozycję, znajdź najbliższy schron, wyznacz trasę, zapisz offline" jako jawny slice, żeby nie zginął i nie wrócił jako niespodzianka w trakcie innego zadania.

**Contract**: Nowy wiersz w „At a glance" i sekcja w „Slices": `S-10: Automatyczny wybór schronu i trasa odświeżana w tle`, change id `auto-shelter-and-route`, prerequisite `S-04`, status `proposed`. Unknowns muszą wymieniać trzy rzeczy ustalone w tym planowaniu: brak potwierdzonego API danych o schronach, konflikt z twardym NFR prywatności przy odpytywaniu zewnętrznych usług o pozycję oraz fakt, że Periodic Background Sync jest tylko w Chromium, wymaga zainstalowanej PWA i nie daje kontroli nad interwałem (w Chrome praktycznie kilkanaście godzin, nie 30 minut) — czyli „co 30 min" realnie oznacza „przy otwarciu aplikacji i cyklicznie, gdy jest otwarta". Dodatkowo zaktualizować status `S-01` na `done` i wiersz w „Backlog Handoff".

#### 2. Odnotowanie decyzji w PRD

**File**: `context/foundation/prd.md`

**Intent**: PRD jest źródłem prawdy o wymaganiach, a w planowaniu zapadły trzy decyzje, których w nim nie ma.

**Contract**: W Non-Goals zostaje „bez własnej bazy i propozycji schronów", ale z dopiskiem, że automatyczny wybór schronu jest zaplanowany jako `S-10` po MVP. W Open Questions nowa pozycja albo rozstrzygnięcie: odległość w MVP jest liczona w linii prostej (trasa dopiero w S-04), próg dojścia to 25 m, a tryb demo z symulowaną pozycją został odrzucony. Nie dopisujemy nowych FR — zakres się nie zmienia.

#### 3. Zapis komend i konwencji

**File**: `CLAUDE.md`

**Intent**: Nowa komenda i nowa konwencja muszą być w pliku, który agent czyta na starcie.

**Contract**: W bloku Commands dopisać `npm test` (vitest, tylko funkcje czyste w `src/lib/`). W Key conventions dopisać, że wyspy czytające localStorage montujemy jako `client:only="react"`, oraz że ekrany Execution Mode używają `<Layout mode="execution">` i tokenów z `global.css`, nie hexów w komponentach.

### Success Criteria

#### Automated Verification

- Pełne CI przechodzi na branchu: lint, `npx astro check`, `npm test`, build, smoke
- Smoke przeciwko wdrożonemu adresowi przechodzi: `BASE_URL=https://w-razie-w.jzogala.workers.dev EXPECT_HEADERS=1 npm run smoke`

#### Manual Verification

- Na telefonie: otwarcie aplikacji online raz, włączenie trybu samolotowego, zapisanie punktu, sprawdzenie czujników, przytrzymanie alarmu, dojście do punktu — całość bez sieci
- Po zamknięciu i ponownym otwarciu w trybie samolotowym plan nadal jest na urządzeniu
- `roadmap.md` ma `S-01` jako `done` i `S-10` jako `proposed`
- Żaden dokument nie opisuje automatycznego wyboru schronu jako części MVP

**Implementation Note**: To ostatnia faza — po jej zaliczeniu slice jest gotowy do zamknięcia i archiwizacji.

---

## Testing Strategy

### Unit Tests

- `distanceMeters`: pary o znanej odległości (Warszawa–Kraków 251 977 m, Centrum–PKiN 483,3 m, 1° szerokości 111 195 m), ten sam punkt = 0
- `bearingDegrees`: azymuty 197,6°, 297,4°, 0° na tych samych parach
- `relativeBearing`: przejście przez 0/360 (cel 10°, kurs 350° → 20°), kurs równy azymutowi → 0
- `formatDistance`: poniżej 1000 m w metrach, powyżej w kilometrach z jedną cyfrą

### Integration Tests

Brak — w repo nie ma frameworka do testów integracyjnych i świadomie go nie dodajemy (24 h do zgłoszenia). Rolę testu integracyjnego pełni `scripts/smoke.mjs` sprawdzający, że wszystkie trzy strony są w buildzie i w liście precache SW.

### Manual Testing Steps

1. Telefon, połączenie z siecią: otwórz publiczny adres, zaczekaj na „Gotowe do pracy offline", zainstaluj aplikację na ekranie głównym.
2. Przejdź na `/czujniki`, przyznaj zgody, potwierdź, że pozycja i kurs się pokazują i że kurs reaguje na obrót telefonu.
3. Na stronie domowej stań w docelowym miejscu i naciśnij „Ustaw tutaj". Odejdź 200–300 m.
4. Włącz tryb samolotowy. Zamknij i otwórz aplikację — punkt musi tam być.
5. Przytrzymaj alarm 2 s, zmierz stoperem czas do pojawienia się celu i instrukcji (próg 2 s).
6. Sprawdź, że strzałka wskazuje w stronę punktu, i idź za nią. Odległość musi maleć.
7. Poniżej 25 m potwierdź ekran „Jesteś na miejscu".
8. Przypadki brzegowe: zwolnij alarm po 1 s (nie uruchamia), wejdź na `/alarm` z wyczyszczonym localStorage (komunikat, nie błąd), odmów zgody na kompas i sprawdź fallback po kilku krokach marszu.

## Performance Considerations

Budżet NFR to 2 s od zwolnienia alarmu do pierwszego kroku na ekranie, a nie do pierwszego fixu GPS. Trzy rzeczy go pilnują: synchroniczny odczyt planu z localStorage (żadnego stanu ładowania przed pierwszym renderem), osobna strona `/alarm` z własnym, małym islandem (nie wciąga kodu strony domowej) i precache całego HTML oraz JS przez service worker z `F-01` (brak ruchu sieciowego przy wejściu). Pomiar jest ręczny, stoperem, w fazie 3 — nie zakładamy, że próg jest spełniony.

`watchPosition` z `enableHighAccuracy: true` i nasłuch kompasu drenują baterię, więc oba muszą być sprzątane w funkcjach czyszczących efektów. Na `/alarm` to akceptowalny koszt, bo ekran z definicji działa krótko i pod nadzorem.

## Migration Notes

Brak danych do migracji — slice wprowadza pierwszy zapis lokalny w historii projektu. `schemaVersion: 1` jest punktem zerowym: od tej pory każda zmiana kształtu `HouseholdPlan` w S-05, S-06 lub S-09 podnosi numer i dopisuje gałąź migracji w `readPlan`. Nieznany `schemaVersion` traktujemy jako brak planu (pusty plan), nigdy jako błąd — telefon demo nie może się zablokować na niezgodnym wpisie.

## References

- Roadmap slice: `context/foundation/roadmap.md` (S-01, sekcja Slices)
- Wymagania: `context/foundation/prd.md` (US-01, FR-004, FR-006, FR-012, FR-014, Non-Functional Requirements, Non-Goals)
- Język wizualny: `JEZYK_WIZUALNY.md` §5 (Execution Mode), §6 (tokeny), §13 (stany), §15 (accessibility), §18 („Prowadzenie do punktu")
- Poprzedni slice (fundament offline): `context/archive/2026-10-03-offline-app-shell/plan.md`
- Kontrakt smoke testu: `scripts/smoke.mjs:15-33`
- Glob precache: `scripts/generate-sw.mjs:5`
- Otwarte pytanie o dane o schronach: `konkurencja/porownanie-gdziesieukryc-vs-household-resilience.md:85`

## Progress

> Konwencja: `- [ ]` do zrobienia, `- [x]` zrobione. Po zakończeniu kroku dopisz ` — <commit sha>`. Nie zmieniaj tytułów kroków. Patrz `references/progress-format.md`.

### Phase 1: Fundament — dane planu i matematyka geo

#### Automated

- [x] 1.1 Testy przechodzą: `npm test` — 958fe22
- [x] 1.2 Lint przechodzi: `npm run lint` — 958fe22
- [x] 1.3 Typy przechodzą: `npx astro check` — 958fe22
- [x] 1.4 Build przechodzi: `npm run build` — 958fe22
- [x] 1.5 CI uruchamia `npm test` w jobie `ci` — 958fe22

#### Manual

- [x] 1.6 Celowa zmiana znaku w `bearingDegrees` wywala test — 958fe22

### Phase 2: Przygotowanie — punkt ewakuacji i sprawdzenie czujników

#### Automated

- [x] 2.1 Lint przechodzi: `npm run lint` — f2a799e
- [x] 2.2 Typy przechodzą: `npx astro check` — f2a799e
- [x] 2.3 Build przechodzi: `npm run build` — f2a799e
- [x] 2.4 Smoke przechodzi po przebudowie strony domowej: `npm run smoke` — f2a799e
- [x] 2.5 `dist/czujniki.html` istnieje po buildzie — f2a799e

#### Manual

- [ ] 2.6 „Ustaw tutaj" zapisuje punkt, który przeżywa ponowne otwarcie aplikacji
- [x] 2.7 Wpis współrzędnych działa, a niepoprawny wpis pokazuje błąd i nie psuje planu — f2a799e
- [ ] 2.8 Na `/czujniki` oba czujniki raportują wynik, a kurs reaguje na obrót telefonu
- [x] 2.9 Odmowa zgody na lokalizację daje czytelny komunikat — f2a799e
- [x] 2.10 `/czujniki` i `/design` otwierają się offline jako właściwe strony — f2a799e

### Phase 3: Prowadzenie — alarm i ekran `/alarm`

#### Automated

- [x] 3.1 Lint przechodzi: `npm run lint` — 766f23e
- [x] 3.2 Typy przechodzą: `npx astro check` — 766f23e
- [x] 3.3 Testy przechodzą: `npm test` — 766f23e
- [x] 3.4 Build przechodzi: `npm run build` — 766f23e
- [x] 3.5 Smoke z nowymi asercjami przechodzi: `npm run smoke` — 766f23e
- [x] 3.6 `/sw.js` zawiera `alarm.html` w liście precache — 766f23e

#### Manual

- [x] 3.7 Cel i instrukcja widoczne w mniej niż 2 s od zwolnienia alarmu (stoper) — 766f23e
- [x] 3.8 Zwolnienie przycisku po 1 s nie uruchamia trybu alarmu — 766f23e
- [ ] 3.9 Strzałka obraca się z telefonem i wskazuje w stronę punktu
- [x] 3.10 Odległość maleje w marszu, a poniżej 25 m pojawia się „Jesteś na miejscu" — 766f23e
- [x] 3.11 Przy odmówionej zgodzie na kompas działa fallback na azymut z ruchu — 766f23e
- [x] 3.12 `/alarm` bez zapisanego punktu pokazuje komunikat, nie błąd — 766f23e
- [ ] 3.13 Ekran na `/alarm` nie gaśnie przez 2 min marszu
- [ ] 3.14 Na iOS po ponownym uruchomieniu „Włącz kompas" przywraca kurs z kompasu

### Phase 4: Weryfikacja offline i domknięcie dokumentów

#### Automated

- [ ] 4.1 Pełne CI przechodzi na branchu (lint, check, test, build, smoke)
- [ ] 4.2 Smoke przeciwko wdrożonemu adresowi przechodzi z `EXPECT_HEADERS=1`

#### Manual

- [ ] 4.3 Cała ścieżka przechodzi na telefonie w trybie samolotowym
- [ ] 4.4 Plan przeżywa zamknięcie i ponowne otwarcie aplikacji bez sieci
- [x] 4.5 `roadmap.md` ma `S-01` jako `done` i `S-10` jako `proposed`
- [x] 4.6 Żaden dokument nie opisuje automatycznego wyboru schronu jako części MVP

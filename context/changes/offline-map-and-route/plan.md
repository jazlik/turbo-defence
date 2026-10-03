# Mapa i trasa offline jako drugi poziom prowadzenia (S-04) — plan implementacji

## Overview

Rozszerzamy działający navigation core z S-01 o prowadzenie po zapisanej trasie pieszej do automatycznie wybranego punktu schronienia PSP. Mapa regionu jest pobrana na urządzenie i pokazuje się na `/alarm` jako drugi poziom pod strzałką. Gdy jest sieć, aplikacja sama wybiera cel (A) i cel zapasowy (B) i przygotowuje do nich trasy. W trybie samolotowym strzałka prowadzi po ostatniej zapisanej trasie, a mapa pokazuje użytkownika, trasę i cel bez żadnego zapytania do sieci.

Roadmap: `S-04`, change id `offline-map-and-route`, prerequisite `S-01` (done).
PRD: US-01, FR-004 (zmiana: automatyczny wybór schronu), FR-007, FR-014, NFR (pierwszy krok < 2 s, offline-first, dane nie opuszczają urządzenia — z wyjątkiem opisanym niżej).
Zamrożone decyzje zespołu: `context/changes/offline-map-and-route/change.md` (sekcja Notes). Plan ich nie powtarza, tylko na nich buduje.

## Current State Analysis

Stan po S-01 (szczegóły: `MAP_HANDOVER_LOCAL.md`, lokalny):

- **Navigation core jest inline w `src/components/GuidanceScreen.tsx:92-110`.** Ten fragment wylicza pozycję (`liveFix` / `staleFix` / `origin`, próg `FIX_STALE_MS = 20_000`), odległość `distanceMeters(origin, point.coords)`, obrót `relativeBearing(bearingDegrees(...), heading)` i warunek dojścia (`ARRIVAL_RADIUS_METERS = 25`, tylko na żywym fixie). Nie istnieje ani hook, ani czysta funkcja, którą mógłby współdzielić ekran mapy.
- **Cel to jeden `HouseholdPlan.evacuationPoint`** (`src/types.ts`), wpisywany ręcznie w `src/components/EvacuationPointCard.tsx` („Ustaw tutaj” albo współrzędne). Plan leży w localStorage pod kluczem `wrw.plan`, w `schemaVersion: 1`. `parsePlan` dla nieznanej wersji zwraca **pusty plan** (`src/lib/services/plan-storage.ts:43-53`), więc każda zmiana kształtu wymaga migracji.
- **Czujniki:** `useGeolocation` (`watchPosition`, `fixedAt`, statusy), `useHeading` (kompas iOS/Android z fallbackiem z ruchu, stan aktualizowany z częstotliwością czujnika). Matematyka geo w `src/lib/geo.ts`, testy w `geo.test.ts`.
- **`DirectionArrow`** (`src/components/DirectionArrow.tsx`) przyjmuje `rotationDegrees` i `dimmed`. Nie zna celu, więc wystarczy podać mu inny obrót.
- **Offline:** Workbox precache'uje cały `dist/` według globu `**/*.{html,js,css,png,svg,ico,webmanifest,woff2}` (`scripts/generate-sw.mjs:5`), a skrypt przerywa build przy ostrzeżeniach (np. plik > 2 MiB). Nie ma IndexedDB, OPFS, Cache API dla danych ani runtime cachingu.
- **Hosting:** assets-only Worker. Limit 25 MiB na plik wyklucza trzymanie paczki mapy w `dist/`.
- **Testy:** Vitest tylko dla czystych funkcji w `src/lib/` (środowisko node). `scripts/smoke.mjs` sprawdza strony i listę precache.

### Wyniki rozpoznania technicznego (2026-10-03, w trakcie planowania)

**Mapa (Protomaps, build `20261003`, przycięte granicą województwa z OSM/Nominatim)**

| Wariant | Rozmiar | Uwagi |
| --- | --- | --- |
| Standard Małopolska z15 | 245 MB | landuse 40%, buildings 24%, roads 18%, water 7%, POI 5% |
| Standard bez POI | 235 MB | POI nie są głównym kosztem |
| Lekka z15 (bez POI, landuse 16 rodzajów, granice: kraj i województwo) | 172 MB | w landuse 59% to pola, łąki, tereny mieszkalne, zarośla, trawy |
| Lekka z14 + Kraków z15 | 91 MB | poza Krakowem prawie nie ma budynków (Tarnów: 9 zamiast 2 220) |
| **Lekka warstwowa (wybrana)** | **111 MB** | drogi, ścieżki, woda i etykiety do z14; w z15 tylko budynki i adresy, w całym regionie; landuse do z12 |

- Z14 zawiera już pełną sieć ulic i ścieżek (`minor_road`, `path/footway`, `sidewalk`, `crossing`, `steps`). Z15 dokłada budynki (z14 ma ich ułamek) i punkty adresowe (`buildings` kind `address`, `addr_housenumber`). Budynki z adresami dla całej Małopolski to około 48 MB i jest to dolna granica, poniżej której traci się priorytety 2 i 3.
- Metoda: `pmtiles extract` z oficjalnego builda, potem skrypt filtrujący kafle (warstwy, `kind`, zoom, przepisanie protobufa bez zmiany geometrii). Zostaje schemat Protomaps, więc da się użyć warstw stylu z `@protomaps/basemaps`. Prototyp leży w scratchpadzie sesji (`lean.py`): zbudowanie archiwum zajmuje mniej niż minutę, a `pmtiles verify` przechodzi.
- Własny profil w Planetilerze (Java, PBF z Geofabrika, własny schemat i styl) jest nieproporcjonalnie droższy przy zysku głównie na mikro-atrybutach. Trafia do Parking lot.

**Hosting paczki:** Cloudflare R2, bucket `turbo-defence-maps`, publiczny adres `https://pub-52c8b7e32b42466d9dc408ed80a9241c.r2.dev/`. Sprawdzenie CORS bez uploadu:
- origin produkcyjny: preflight GET/HEAD z `range` zwraca 204, a widoczne nagłówki to `Content-Range, Content-Length, Accept-Ranges`. **Brakuje `ETag`.**
- `http://localhost:4321`: 403 i brak `Access-Control-Allow-Origin`, czyli origin nie jest skonfigurowany (albo jest wpisany z końcowym `/`).
- `If-Match` jest odrzucany. To w porządku: pmtiles (`FetchSource`) go nie wysyła, porównuje ETag po stronie klienta, a nasz downloader też go nie użyje.

**Routing:** publiczne serwisy FOSSGIS działają bez klucza i mają `Access-Control-Allow-Origin: *`:
- OSRM foot `https://routing.openstreetmap.de/routed-foot/` (`/route` i `/table`, GET bez preflightu),
- Valhalla `https://valhalla1.openstreetmap.de/` (`/route` i `/sources_to_targets`, POST z preflightem).
Obie przetestowane na trasie Rynek–Kazimierz.

**Punkty schronienia PSP:** `https://gdziesieukryc.pl/PS_XML/punkty_schronienia.csv` (zbiór dane.gov.pl „Punkty schronienia w Polsce”, CC BY 4.0, aktualizowany w poniedziałki).
- 86 520 punktów, z czego 6 097 w Małopolsce i 3 012 w Krakowie. Wszystkie mają współrzędne.
- Plik **nie ma CORS**, więc trzeba go przygotować przy buildzie.
- Kolumny: `Identyfikator publiczny, Nazwa, Rodzaj obiektu, Opis ogolny, Gmina, Powiat, Wojewodztwo, Szerokosc geograficzna, Dlugosc geograficzna, Adres, Dostepnosc`.
- `Nazwa` i `Rodzaj` są identyczne dla wszystkich punktów („Miejsce ochronne” / „Obiekt ochrony ludności”). Różni je tylko `Dostepnosc`: „Na żądanie” 51%, „Całodobowa” 37%, „Określone godziny” 12%.
- Kompaktowy JSON dla Małopolski zajmuje 696 KB (157 KB po gzipie).

**Biblioteki (aktualne wersje):** `maplibre-gl` 6.11, `pmtiles` 4.5 (`FileSource(file: File)`, `Protocol`, URL kafli `pmtiles://<key>/{z}/{x}/{y}`), `@protomaps/basemaps` 5.7 (`layers(source, namedFlavor("dark"), { lang })`; fonty `Noto Sans Regular/Medium/Italic`; ikony ze sprite'a tylko w warstwach POI i strzałek jednokierunkowości), `@turf/*` 7.4 (`nearestPointOnLine` zwraca `totalDistance` i `pointDistance`, z opcją `units: "meters"`).

**Platforma:**
- iOS Safari przed 26 nie ma `FileSystemFileHandle.createWritable`. Zapis do OPFS musi iść przez dedykowany Web Worker z `createSyncAccessHandle` (od iOS 15.2). Chrome na Androidzie obsługuje oba sposoby.
- Na iOS zainstalowana PWA ma **osobny magazyn danych niż karta Safari** i nie podlega 7-dniowemu kasowaniu danych ITP.
- Żadna platforma nie daje geolokalizacji w tle dla zamkniętej PWA. Periodic Background Sync działa tylko w Chromium, tylko dla zainstalowanej PWA i bez kontroli nad interwałem.

## Desired End State

Na telefonie (iPhone i Android, zainstalowana PWA pod `https://w-razie-w.jzogala.workers.dev`):

1. **Przygotowanie, online.** Na stronie głównej karta „Mapa offline” proponuje region i rozmiar („Małopolska · 111 MB”). Po zgodzie paczka pobiera się sama, z postępem i możliwością wznowienia. Karta „Schron i trasa” po zgodzie na wysłanie współrzędnych do serwisu tras wybiera najbliższy pieszo punkt PSP (A) i zapasowy (B). Pokazuje adres, dostępność, długość i czas dojścia oraz „Trasa przygotowana o 14:32”.
2. **Odświeżanie.** Przy otwarciu aplikacji, powrocie do niej, odzyskaniu sieci, co 30 min przy otwartej aplikacji i po przesunięciu się o ponad 300 m od miejsca, z którego liczono trasę, aplikacja wybiera cel na nowo i odświeża trasy A i B. Bez sieci zostaje ostatnia poprawna trasa.
3. **Kryzys, tryb samolotowy.** Przytrzymanie alarmu otwiera `/alarm` tak samo szybko jak w S-01 (< 2 s, mapa nie jest ładowana przed pierwszym renderem). Strzałka wskazuje punkt kontrolny 40 m dalej na trasie, a odległość to **pozostała długość trasy** („1,2 km trasą”).
4. **Zejście z trasy offline.** Po zejściu z trasy pojawia się „Wróć na trasę” ze strzałką i odległością do najbliższego punktu trasy. Przy ponad 300 m od trasy aplikacja przechodzi na kierunek wprost do celu z S-01 („w linii prostej”) i informuje, że użytkownik jest daleko od zapisanej trasy.
5. **Mapa.** Przycisk „Mapa” otwiera pełnoekranową mapę obracaną według kierunku (heading-up): pozycja i kierunek użytkownika, trasa w kolorze guidance, cel, etykiety z polskimi znakami. Wszystko z OPFS i precache, bez zapytań do sieci. Pasek u góry pokazuje strzałkę i odległość, a „Wróć do strzałki” zamyka mapę.
6. **Fallbacki.** Bez trasy działa prowadzenie wprost z S-01 do celu A albo do ręcznego punktu. Bez mapy przycisku „Mapa” po prostu nie ma.

Weryfikacja: `npm test`, `npm run lint`, `npx astro check`, `npm run build`, `npm run smoke` lokalnie i w CI, plus matryca testów w terenie na obu telefonach (Phase 6).

### Key Discoveries

- **Rozmiar mapy napędza landuse i budynki, nie POI** (pomiar wyżej). Lekka paczka warstwowa wymaga, żeby MapLibre czytał ten sam plik jako trzy źródła z różnym `maxzoom` (`ctx` ≤ 12, `base` ≤ 14, `detail` = 15). W z15 są tylko budynki, a przy przybliżeniu ponad z14 resztę dorysowuje overzoom kafli z14. To główne założenie do potwierdzenia w spike'u (Phase 1).
- **Odczyt mapy nie potrzebuje service workera.** `pmtiles.FileSource` czyta `File` z OPFS (`file.slice().arrayBuffer()`), a `Protocol` obsługuje URL `pmtiles://<file.name>/{z}/{x}/{y}`. Kafle nie przechodzą przez sieć ani SW, więc nie ma problemu z Range w Cache API.
- **Nie ma CORS na danych PSP.** Snapshot przygotowuje skrypt i trafia do `public/data/`, skąd jest precache'owany.
- **Trasa nie należy do `HouseholdPlan`.** Liczy się ją z bieżącej pozycji telefonu, więc jest stanem urządzenia, nie planem rodziny przekazywanym w S-09. Osobny klucz localStorage `wrw.navigation` z własnym `schemaVersion` nie zmusza do migracji `wrw.plan` i nie koliduje z S-05, który rozszerza plan równolegle.
- **iOS wymaga pobrania mapy w zainstalowanej aplikacji.** Mapa pobrana w karcie Safari nie istnieje w PWA z ekranu początkowego, więc karta musi to jasno powiedzieć.
- **`generate-sw.mjs` kończy się błędem przy ostrzeżeniach Workboxa.** Chunk MapLibre (około 1 MB) mieści się w domyślnym limicie 2 MiB precache, ale przy jego przekroczeniu build padnie od razu. To dobra bramka.

## What We're NOT Doing

- Przeliczanie trasy offline: future extension, Parking lot.
- Geolokalizacja i routing w tle przy zamkniętej PWA. Periodic Background Sync trafia do Parking lot (nowy zakres `S-10`).
- Regiony poza Małopolską i automatyczne „wycinanie” regionu wokół użytkownika.
- Własny build Planetilera, MLT, mikro-optymalizacje atrybutów poza tym, co wykaże Phase 1.
- Worker proxy dla R2 i dla serwisu tras (przeglądarka rozmawia z nimi bezpośrednio).
- Przycisk „niedostępne” i przełączanie na trasę B w UI (to S-02; S-04 tylko przygotowuje trasę B i API przełączenia).
- Głos (S-03), onboarding (S-07; S-04 dostarcza karty, które S-07 połączy w kroki).
- Ręczny wybór trasy przez użytkownika, wybór celu na mapie.
- Tryb demo z symulowaną pozycją (decyzja z S-01 obowiązuje). Fixture'y tras są dopuszczalne wyłącznie w testach jednostkowych.

## Implementation Approach

Najpierw bramka: spike potwierdza na prawdziwych telefonach trzy najdroższe założenia (lekka paczka z trzema źródłami, pobranie około 110 MB do OPFS na iOS, renderowanie heading-up offline). Dopiero potem inwestujemy w kod produkcyjny. Dalej idziemy od środka na zewnątrz, jak w S-01:

```
                ┌───────────── przygotowanie (online) ─────────────┐
 PSP snapshot ─►│ shortlist (haversine, lokalnie) ─► OSRM /table   │
 (public/data)  │   ─► A, B ─► OSRM /route ─► SavedRoute A/B ──────┼──► localStorage "wrw.navigation"
                └──────────────────────────────────────────────────┘          │ (sync read)
 R2 *.pmtiles ──► worker (Range, createSyncAccessHandle) ──► OPFS ──┐          ▼
                                    metadane ─► "wrw.map" (sync) ───┼──► /alarm: useGuidance
                                                                    │     (S-01 hooki + deriveGuidance)
                                                                    │        ├─► DirectionArrow + odległość (primary)
                                                                    └────────┴─► ExecutionMap (lazy, secondary)
```

- **Navigation core zostaje jeden.** Logika z `GuidanceScreen.tsx:92-110` przechodzi do czystej funkcji `deriveGuidance` (`src/lib/navigation.ts`, testy w Vitest) i hooka `useGuidance`. Hook używa istniejących `useGeolocation`, `useHeading`, `useNow`. Ekran strzałki i mapa konsumują ten sam wynik.
- **Trasa jest niezależna od dostawcy.** `SavedRoute` to GeoJSON-owa linia, długość, czas, `createdAt`, `origin` i cel. Adapter OSRM to jedyne miejsce, które zna API. Navigation core nie importuje niczego z `routing/`.
- **Mapa jest zawsze opcjonalna.** Ładuje się dynamicznym `import()` dopiero po pierwszym renderze `/alarm` (prefetch w `requestIdleCallback`). Jej brak czy błąd nie zmienia prowadzenia.

## Critical Implementation Details

**Timing & lifecycle.** Na `/alarm` pierwszy render czyta synchronicznie `wrw.plan`, `wrw.navigation` i `wrw.map`, po czym od razu pokazuje cel, strzałkę z ostatniej znanej pozycji i odległość trasą. `import("maplibre-gl")` startuje dopiero w `requestIdleCallback` po zamontowaniu (fallback `setTimeout(…, 1500)`, bo Safari nie ma `requestIdleCallback`). Mapa tworzy instancję dopiero po stuknięciu „Mapa”. GuidanceScreen nie może statycznie importować niczego z `maplibre-gl`, `pmtiles` ani `@protomaps/basemaps`. Phase 5 sprawdza to w buildzie: chunk wejściowy `/alarm` nie zawiera tych modułów.

**State sequencing (pobieranie mapy).** Status `ready` w `wrw.map` ustawiamy dopiero po zapisaniu całego pliku, sprawdzeniu rozmiaru i udanym otwarciu nagłówka PMTiles z OPFS. Odwrotna kolejność da na `/alarm` przycisk „Mapa” bez działającej mapy. Przy wznowieniu najpierw porównujemy rozmiar pliku w OPFS z `receivedBytes` i URL wersji. Jeśli wersja w manifeście się zmieniła, zaczynamy od zera.

**Performance.** `useHeading` aktualizuje stan z częstotliwością czujnika (S-01 impl-review F8d). Mapa nie może wywoływać `jumpTo` przy każdym evencie: obracamy ją dopiero przy zmianie kursu o co najmniej 3° albo pozycji o co najmniej 2 m, najwyżej raz na klatkę (`requestAnimationFrame`). Przy `prefers-reduced-motion` używamy `jumpTo` bez animacji. `deriveGuidance` wołamy przy każdym renderze, więc linię trasy (`lineString` Turfa) i jej długość tworzymy raz na trasę (memo po `createdAt`), a nie przy każdym fixie.

**Debug & observability.** Na stronie `/czujniki` (ekran techniczny z S-01) dodajemy sekcję „Mapa i trasa”: status paczki, rozmiar w OPFS, `navigator.storage.estimate()` i `persisted()`, wiek tras A/B, ostatnia próba odświeżenia z powodem błędu. To jedyna rzetelna metoda diagnozy na iPhonie bez kabla.

## Phase 1: Spike gate — lekka paczka, R2, OPFS i mapa offline na telefonach

### Overview

Bramka go/no-go przed kodem produkcyjnym, time-box około pół dnia w dwóch częściach: **1A przy biurku** (pipeline, pomiar cięć, CORS i upload R2, sprawdzenia `curl`; około 2 h) i **1B na telefonach** (OPFS, mapa offline, heading-up, OSRM; około 2 h, w tym wyjście na zewnątrz). Prerequisite: `wrangler login` na koncie z uprawnieniami R2 Edit i Workers (CORS, upload, deploy preview). Spike sprawdza pięć rzeczy:
- czy lekką paczkę da się zmniejszyć jeszcze bez utraty priorytetów,
- czy R2 podaje ją poprawnie przez CORS i Range,
- czy około 110 MB zapisze się do OPFS w zainstalowanej PWA na iPhonie i Androidzie,
- czy MapLibre renderuje trzy źródła z jednego pliku offline z lokalnymi fontami, obracane według kierunku,
- czy trasy OSRM foot są sensowne w Krakowie.

Kod spike'a to jedna tymczasowa strona `/spike-mapa` (bez linku z UI), usuwana w Phase 6. Pipeline danych od razu ląduje w repo w docelowej postaci.

### Changes Required:

#### 1. Pipeline lekkiej paczki

**File**: `scripts/map/build-region.sh`, `scripts/map/lean_filter.py`, `scripts/map/requirements.txt`, `scripts/map/regions/malopolska.geojson`, `scripts/map/README.md`

**Intent**: Odtwarzalna budowa wersjonowanej lekkiej paczki z oficjalnego builda Protomaps, bez własnego silnika map. Prototyp z planowania (`lean.py`) przechodzi do repo jako `lean_filter.py` z jednym profilem `evacuation`.

**Contract**:
- `build-region.sh <region> <protomaps-build-date>` wykonuje kolejno: `pmtiles extract https://build.protomaps.com/<date>.pmtiles --region=regions/<region>.geojson --maxzoom=15`, potem `lean_filter.py`, potem `pmtiles verify`. Wynik to `dist-map/<region>-<date>-lean<N>.pmtiles`. Katalog `dist-map/` jest w `.gitignore`, `pmtiles` CLI pobiera się z releases go-pmtiles.
- Profil `evacuation`:
  - usuń warstwę `pois`;
  - w `landuse` zostaw tylko rodzaje: forest, wood, park, cemetery, pedestrian, nature_reserve, national_park, hospital, school, university, college, military, railway, platform, zoo, garden, i tylko do z12;
  - w `boundaries` zostaw tylko country i region;
  - w z15 zostaw tylko warstwę `buildings`.
- Plik GeoJSON granicy pochodzi z Nominatim (`polygon_threshold=0.005`), z atrybucją OSM w README.
- Python działa wyłącznie jako narzędzie offline. Nie jest częścią builda aplikacji ani CI. `scripts/map/` dodajemy do ignorów ESLint, jeśli lint tego wymaga.

#### 2. Pomiar dodatkowych cięć (polecenie zespołu: nie zamrażać 111 MB)

**File**: `scripts/map/lean_filter.py` (flagi eksperymentalne), wynik w `scripts/map/README.md`

**Intent**: Sprawdzić, czy proste cięcia na poziomie atrybutów zmniejszą paczkę istotnie bez utraty dróg, ścieżek, budynków i etykiet.

**Contract**: Mierzymy osobno, każdy wariant to osobne archiwum:
- (a) usunięcie wielojęzycznych atrybutów `name:*` poza `name`, `name:pl` i polami, których używa `@protomaps/basemaps` dla `lang: "pl"`;
- (b) usunięcie atrybutów budynków, których styl 2D nie używa (`height`, `min_height`; `sort_rank` zostaje, jeśli używa go styl);
- (c) woda: strumienie i rowy tylko od z13.

Reguła przyjęcia: cięcie zostaje, jeśli oszczędza co najmniej 5 MB, a porównanie zrzutów (Kraków-Rynek, Kraków-Nowa Huta, Tarnów, Nowy Sącz; z13, z15, z17) nie pokazuje utraty żadnej pozycji z listy: drogi, ścieżki, schody, przejścia, budynki, numery, nazwy ulic, nazwy miejscowości, woda. Wynikowy rozmiar i lista przyjętych cięć trafiają do README i do `regions` manifestu (Phase 4).

#### 3. R2: CORS i upload

**File**: `scripts/map/r2-cors.json`, konfiguracja bucketu `turbo-defence-maps` (`npx wrangler r2 bucket cors set turbo-defence-maps --file scripts/map/r2-cors.json`), `scripts/map/README.md`

**Intent**: Uzupełnić CORS pod faktyczne żądania (pobieranie Range przez nasz worker i ewentualne odczyty przez `pmtiles.FetchSource`) i wrzucić paczkę wersjonowaną, niezmienną nazwą.

**Contract**: Docelowa reguła CORS:

```json
[{
  "AllowedOrigins": ["https://w-razie-w.jzogala.workers.dev", "http://localhost:4321", "https://spike-w-razie-w.jzogala.workers.dev"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["range"],
  "ExposeHeaders": ["Content-Range", "Content-Length", "Accept-Ranges", "ETag"],
  "MaxAgeSeconds": 86400
}]
```

- Originy wpisujemy bez końcowego `/`. Origin preview spike'a usuwamy w Phase 6.
- Upload: `npx wrangler r2 object put turbo-defence-maps/<plik>.pmtiles --file dist-map/<plik>.pmtiles --remote --content-type application/vnd.pmtiles --cache-control "public, max-age=31536000, immutable"`.
- Wrangler 4 domyślnie zapisuje obiekty R2 lokalnie, dlatego `--remote` jest konieczne. Nazwa pliku zawiera wersję, więc pliku nigdy nie nadpisujemy.

#### 4. Strona spike'a i preview HTTPS

**File**: `src/pages/spike-mapa.astro`, `src/components/spike/MapSpike.tsx` (tymczasowe), `package.json` (`maplibre-gl`, `pmtiles`, `@protomaps/basemaps`), `public/map/fonts/**`

**Intent**: Minimalny przepływ na prawdziwym telefonie: pobranie z R2 do OPFS przez worker, otwarcie z OPFS przez `FileSource`, styl z trzema źródłami i lokalnymi fontami, obrót według `useHeading`, test w trybie samolotowym.

**Contract**:
- Fonty: zakresy glifów `0-255`, `256-511` i `8192-8447` dla `Noto Sans Regular`, `Noto Sans Medium` i `Noto Sans Italic` z `protomaps/basemaps-assets` (licencja OFL, plik licencji obok). Katalogi **bez spacji**: `public/map/fonts/noto-sans-regular/`, `noto-sans-medium/`, `noto-sans-italic/`, a styl dostaje te nazwy przez pola `regular`, `bold`, `italic` w `Flavor` z `@protomaps/basemaps`. Dzięki temu URL glifu żądany przez MapLibre jest identyczny z wpisem w precache (bez rozjazdu kodowania `%20`).
- Telefony potrzebują HTTPS, więc deploy wersji preview to `npx wrangler versions upload --preview-alias spike`. Daje to adres `https://spike-w-razie-w.jzogala.workers.dev`, który musi być w CORS R2. Jeśli preview URLs są wyłączone na koncie, alternatywą jest tymczasowy tunel HTTPS do `astro preview` z originem dopisanym do CORS.

### Success Criteria:

#### Automated Verification:

- Paczka przechodzi weryfikację: `pmtiles verify dist-map/<plik>.pmtiles`
- R2 HEAD zwraca 200 z `Content-Length` i `Accept-Ranges: bytes`: `curl -sI <r2-url>`
- R2 GET z `Range: bytes=0-16383` zwraca 206 i `Content-Range`: `curl -s -D - -o /dev/null -H "Range: bytes=0-16383" <r2-url>`
- Preflight z `Origin: https://w-razie-w.jzogala.workers.dev` i z `Origin: http://localhost:4321` (`Access-Control-Request-Headers: range`) zwraca 204, a GET zwraca `Access-Control-Expose-Headers` z `ETag`
- Lint i typy przechodzą: `npm run lint`, `npx astro check`
- Build przechodzi, a fonty `.pbf` są w `dist/map/fonts/`: `npm run build`

#### Manual Verification:

- Rozmiar po cięciach z §2 zapisany w README razem z porównaniem zrzutów; lista przyjętych cięć zatwierdzona przez zespół
- Android (zainstalowana PWA): pobranie paczki do OPFS, czas pobrania zapisany, `storage.persisted()` = true, plik przeżywa zabicie aplikacji
- iPhone (PWA z ekranu początkowego): to samo przez worker z `createSyncAccessHandle`; zapisane: wersja iOS, czas, wynik `persist()`, `estimate()`
- Oba telefony w trybie samolotowym: mapa renderuje drogi, ścieżki, budynki, numery i polskie etykiety na z13–z18; w Tarnowie są budynki (potwierdzenie triku trzech źródeł); zero żądań sieciowych (Android: zdalne DevTools; iOS: Web Inspector z Maca)
- Heading-up: obrót płynny przy chodzeniu, bez zauważalnego przycinania; pierwszy render strony nie czeka na MapLibre
- OSRM foot: 3 trasy w Krakowie (Rynek→Kazimierz, Nowa Huta→osiedle, przez tory) prowadzą chodnikami i przejściami, czas odpowiedzi zapisany
- Decyzja go/no-go zapisana w Notes w `change.md`; przy no-go zastosowany fallback z tabeli niżej

**Fallbacki przy no-go:**

| Problem | Fallback |
| --- | --- |
| Trzy źródła z jednego pliku nie działają | Lekka z14 + Kraków z15 (91 MB, jedno źródło) |
| Pobranie ~110 MB do OPFS zawodne na iOS | Paczka tylko z Krakowem (około 30 MB) na iOS; na Androidzie Małopolska |
| MapLibre za wolny na telefonie | Brak heading-up (north-up), mniejszy maxzoom wyświetlania |

**Implementation Note**: Po zaliczeniu automatów zatrzymaj się na ręczny test na obu telefonach i decyzję go/no-go zespołu przed Phase 2.

---

## Phase 2: Navigation core z trasą

### Overview

Wydzielamy navigation core z `GuidanceScreen` do czystej funkcji i hooka, dodajemy model i magazyn tras oraz logikę postępu na trasie. `GuidanceScreen` prowadzi po trasie, gdy ta istnieje. Bez trasy zachowuje się dokładnie jak w S-01.

### Changes Required:

#### 1. Typy

**File**: `src/types.ts`

**Intent**: Model celu i trasy niezależny od dostawcy routingu.

**Contract**:

```ts
/** GeoJSON order [longitude, latitude] — used only inside route geometry, consumed by Turf and MapLibre. */
export type LngLat = [number, number];

export interface Destination {
  id: string;                 // PSP "Identyfikator publiczny" or "manual"
  label: string;              // UI title, e.g. "Schron · ul. Stańczyka 18"
  coords: Coordinates;
  source: "psp" | "manual";
  address?: string;
  availability?: string;      // PSP "Dostepnosc", shown as-is
}

export interface SavedRoute {
  destination: Destination;
  origin: Coordinates;        // where the route was computed from
  geometry: LngLat[];         // ≥ 2 points
  distanceMeters: number;
  durationSeconds: number | null;
  createdAt: string;          // ISO 8601 — route freshness in UI
  provider: string;           // informational only, e.g. "osrm-fossgis-foot"
}

export interface NavigationState {
  schemaVersion: 1;
  primary: SavedRoute | null;
  alternate: SavedRoute | null;
  active: "primary" | "alternate";   // S-02 "niedostępne" flips this
  routingConsent: boolean;           // user agreed to send coordinates to the routing service
  lastRefresh: { at: string; ok: boolean; reason?: "offline" | "no-position" | "no-candidates" | "routing-error" } | null;
}
```

`Coordinates` pozostaje jedynym typem współrzędnych poza geometrią trasy. `LngLat` występuje wyłącznie w `SavedRoute.geometry`.

#### 2. Magazyn nawigacji

**File**: `src/lib/services/navigation-storage.ts`, `src/lib/services/navigation-storage.test.ts`

**Intent**: Synchroniczny odczyt i zapis `wrw.navigation` według wzorca `plan-storage.ts`: walidacja pole po pole, uszkodzony podobiekt zamienia się w `null`, funkcja nigdy nie rzuca wyjątku.

**Contract**:
- Funkcje: `readNavigation()`, `writeNavigation(state)`, `parseNavigation(value)`, `createEmptyNavigation()`, `activeRoute(state): SavedRoute | null`, `setActiveRoute(role)`.
- Trasa z geometrią krótszą niż 2 punkty albo z liczbami poza zakresem zamienia się w `null`.
- Testy: poprawny zapis i odczyt, uszkodzona geometria daje `null`, nieznana wersja daje pusty stan, `active` wskazujące na pustą trasę wraca do `primary`.

#### 3. Postęp na trasie

**File**: `src/lib/route-progress.ts`, `src/lib/route-progress.test.ts`, `package.json` (`@turf/nearest-point-on-line`, `@turf/along`, `@turf/length`, `@turf/helpers`)

**Intent**: Dojrzała geometria z Turfa zamiast własnej: rzut pozycji na trasę, pozostała długość, punkt kontrolny i odległość od trasy.

**Contract**:
- `prepareRoute(route): PreparedRoute` (linia, długość w metrach i `endGapMeters` = odległość od końca linii do `destination.coords`, liczone raz) oraz `progressOnRoute(prepared, position): { offRouteMeters, traveledMeters, remainingMeters, checkpoint: Coordinates, snapped: Coordinates }`.
- `remainingMeters` = reszta linii + `endGapMeters`. OSRM dociąga cel do najbliższej drogi, a punkty PSP często leżą 20–60 m od niej (w budynku, na podwórzu), więc bez tej poprawki trasa kończy się na „0 m”, a dojścia nie ma.
- `checkpoint = along(line, min(traveled + 40 m, length))`.
- Użycie `nearestPointOnLine(line, point, { units: "meters" })`, pola `properties.totalDistance` i `properties.pointDistance`; nie używamy przestarzałych `location` i `dist`.
- Konwersja `Coordinates` ↔ `LngLat` tylko w tym pliku.
- Testy na stałej trasie w kształcie L: punkt na trasie, obok trasy, za końcem, przed początkiem; pozostała długość maleje monotonicznie przy przesuwaniu punktu wzdłuż trasy; cel 40 m od końca linii jest wliczony do `remainingMeters`.

#### 4. `deriveGuidance` i `useGuidance`

**File**: `src/lib/navigation.ts`, `src/lib/navigation.test.ts`, `src/components/hooks/useGuidance.ts`

**Intent**: Jedno źródło prawdy dla strzałki i mapy. To przeniesienie logiki z `GuidanceScreen.tsx:92-110` rozszerzone o trasę, bez zmiany zachowania S-01.

**Contract**:

```ts
type GuidanceMode = "route" | "rejoin" | "direct";
interface GuidanceInput {
  destination: Coordinates;
  route: PreparedRoute | null;
  origin: Coordinates | null;        // live ?? stale ?? lastKnown (S-01 rules, unchanged)
  accuracyMeters: number | null;
  heading: number | null;
  liveFix: boolean;
  previousMode: GuidanceMode | null; // hysteresis
}
interface Guidance {
  mode: GuidanceMode;
  target: Coordinates | null;        // checkpoint | snapped point | destination
  distanceMeters: number | null;     // remaining route | distance to route | straight line
  distanceKind: "route" | "to-route" | "straight";
  rotation: number | null;
  arrived: boolean;                  // live fix && straight distance to destination < 25 m (unchanged)
}
```

- Progi:
  - zejście z trasy przy `offRoute > max(35 m, 1.5 × accuracy)`;
  - powrót na trasę przy `offRoute < max(25 m, accuracy)` (histereza przez `previousMode`);
  - tryb `direct` przy `offRoute > 300 m` albo bez trasy.
- W trybie `rejoin` celem jest najbliższy punkt trasy, a odległość to dystans do trasy.
- **Ostatni odcinek:** w trybie `route`, gdy reszta linii ≤ 40 m, celem strzałki jest sam `destination.coords` (a nie koniec linii). Odległość nadal pokazuje `remainingMeters` (z `endGapMeters`), więc spada płynnie do warunku dojścia.
- `useGuidance()` składa `readPlan`, `readNavigation`, `useGeolocation`, `useHeading` i `useNow`. Liczy `liveFix` / `staleFix` / `isStale` / `locationProblem` jak dziś, trzyma `previousMode` i zapisuje `saveLastKnownPosition` przy każdym fixie (jak dziś).
- Cel: `activeRoute(nav)?.destination ?? plan.evacuationPoint` (ręczny punkt jako fallback, decyzja zespołu).
- Wynik hooka (kontrakt dla `GuidanceScreen` i `ExecutionMap`):

```ts
interface UseGuidanceResult {
  destination: Destination | null;     // null → stan „Nie wskazano punktu” z S-01
  route: SavedRoute | null;
  guidance: Guidance | null;
  position: Coordinates | null;        // origin used for guidance (live ?? stale ?? lastKnown)
  accuracyMeters: number | null;
  heading: number | null;              // raw, for map bearing
  headingSource: HeadingSource | null;
  isStale: boolean;
  staleSince: number | null;           // epoch ms, for „Dane z …”
  straightDistanceMeters: number | null; // to destination; drives S-01 `guiding` / stale-arrival rules
  locationProblem: LocationProblem | null;
}
```
- Testy `deriveGuidance`:
  - bez trasy wynik jest identyczny z formułą S-01 (dystans i obrót);
  - z trasą: tryby `route`, `rejoin`, `direct`;
  - histereza nie migocze przy offRoute równym około 30 m;
  - `arrived` tylko przy żywym fixie;
  - ostatni odcinek: cel 40 m od końca trasy, strzałka przy końcu trasy wskazuje cel, a odległość nie spada do 0 przed dojściem.

#### 5. `GuidanceScreen` na `useGuidance`

**File**: `src/components/GuidanceScreen.tsx`, `src/lib/format.ts` (przeniesione `formatFixTime`, nowe `formatRouteAge`)

**Intent**: Ekran przestaje liczyć sam, renderuje `Guidance`. Zmiany widoczne dla użytkownika dotyczą tylko trasy.

**Contract**:
- Nagłówek: „Idź do schronu” przy celu PSP, „Idź do punktu ewakuacji” przy ręcznym.
- Podpis pod odległością: `route` → „trasą”, `to-route` → „do trasy” z nagłówkiem „Wróć na trasę”, `straight` → „w linii prostej”. Przy `direct` z dostępną trasą dodatkowa linia „Jesteś daleko od zapisanej trasy — idź w kierunku celu”.
- Mała linia `text-muted-foreground`: „Trasa z 14:32” (z datą, jeśli nie dziś).
- Stany S-01 (brak celu, szukam GPS, problem z lokalizacją, przygaszone dane, na miejscu) bez zmian.
- `DirectionArrow` bez zmian.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą, w tym nowe `navigation-storage`, `route-progress`, `navigation`: `npm test`
- Lint przechodzi: `npm run lint`
- Typy przechodzą: `npx astro check`
- Build i smoke przechodzą: `npm run build && npm run smoke` (na `astro preview`)

#### Manual Verification:

- Regresja S-01 na telefonie bez trasy (pusty `wrw.navigation`): strzałka, odległość „w linii prostej”, przygaszone dane i „Jesteś na miejscu” działają jak przed zmianą
- `/alarm` w trybie samolotowym nadal pokazuje pierwszy krok w < 2 s (stoper)

**Implementation Note**: Prowadzenie po prawdziwej trasie testujemy w terenie po Phase 3, kiedy będą realne trasy.

---

## Phase 3: Schrony PSP, routing i automatyczny wybór celu

### Overview

Snapshot punktów PSP, adapter OSRM, wybór A i B, zapis tras, odświeżanie w realistycznych momentach i karta „Schron i trasa” w Preparation Mode.

### Changes Required:

#### 1. Snapshot PSP

**File**: `scripts/prepare-shelters.mjs`, `public/data/shelters-malopolska.json`, `package.json` (skrypt `data:shelters`)

**Intent**: Dane PSP lokalnie, bo źródło nie ma CORS. Snapshot jest commitowany, żeby build był deterministyczny i dane działały offline.

**Contract**:
- Skrypt Node bez zależności: pobiera CSV, parsuje go z obsługą cudzysłowów, filtruje `Wojewodztwo === "małopolskie"` i zapisuje JSON `{ generatedAt, source, license: "CC BY 4.0", attribution: "Komenda Główna PSP, dane.gov.pl", points: [[id, lat, lon, address, availability], …] }` (współrzędne zaokrąglone do 5 miejsc).
- Odświeżanie ręczne: `npm run data:shelters`.
- `scripts/generate-sw.mjs`: dopisać `data/*.json` i `map/fonts/**/*.pbf` do precache.

#### 2. Wybór kandydatów

**File**: `src/lib/shelters.ts`, `src/lib/shelters.test.ts`

**Intent**: Lokalna lista najbliższych kandydatów w linii prostej i reguła wyboru A/B. Czysta logika, z testami.

**Contract**:
- `shortlist(points, origin, { k: 5, maxRadiusMeters: 15_000 })` korzysta z `distanceMeters` z `geo.ts` i zwraca do 5 najbliższych.
- `pickDestinations(candidates, walkingSeconds, previousPrimaryId)`: A to minimum czasu pieszo, **z lepkością** (decyzja zespołu z review): dotychczasowy A zostaje, dopóki nowy najlepszy nie jest szybszy o co najmniej 10% i co najmniej 60 s albo A nie wypadł z krótkiej listy. Dzięki temu adres w planie rodziny nie przeskakuje przy wahaniach czasów z routingu. B to kolejny w rankingu, oddalony od A o co najmniej 150 m. Pomija kandydatów z `null`, czyli niedostępnych w routingu.
- Wszystkie kategorie dostępności są dopuszczalne, decyduje tylko czas dojścia (decyzja zespołu). Dostępność pokazujemy w UI.
- Brak kandydata w 15 km oznacza brak celu PSP i fallback na ręczny punkt.
- Testy: wybór A/B, B ≥ 150 m od A, kandydaci `null`, lepkość (nowy szybszy o 5% → A bez zmian; o 15% i 90 s → zmiana; A poza listą → zmiana).

#### 3. Adapter routingu

**File**: `src/lib/services/routing/types.ts`, `src/lib/services/routing/osrm.ts`, `src/lib/services/routing/osrm.test.ts`

**Intent**: Jedyne miejsce znające API. Zamiana dostawcy (np. na Valhallę w P1) nie dotyka navigation core.

**Contract**:
- `interface WalkingRouter { matrix(origin, targets): Promise<(number | null)[]>; route(origin, target): Promise<{ geometry: LngLat[]; distanceMeters: number; durationSeconds: number }> }`.
- Implementacja OSRM:
  - macierz: `GET /routed-foot/table/v1/foot/{lon,lat;…}?sources=0&annotations=duration`;
  - trasa: `GET /routed-foot/route/v1/foot/{lon,lat;lon,lat}?overview=full&geometries=geojson&steps=false`.
- Timeout 10 s (`AbortController`). Wysyłamy wyłącznie współrzędne startu i kandydatów.
- Czyste parsery `parseOsrmTable` i `parseOsrmRoute` testowane na zapisanych odpowiedziach z planowania.

#### 4. Odświeżanie tras

**File**: `src/lib/services/route-refresh.ts`, `src/components/hooks/useRouteRefresh.ts`

**Intent**: Realistyczne zastępstwo „co 30 min”: aplikacja odświeża się tylko wtedy, gdy jest otwarta.

**Contract**:
- `refreshRoutes(origin, router, shelters): Promise<NavigationState>` wykonuje kolejno shortlist, `matrix`, `pickDestinations`, a potem `route` dla A i B równolegle. Zapis tylko przy sukcesie trasy A. Przy błędzie zostaje poprzednia trasa i zapisujemy `lastRefresh` z powodem.
- `useRouteRefresh()` startuje wyłącznie przy `routingConsent === true` i `navigator.onLine`. Wyzwalacze:
  - zamontowanie,
  - `visibilitychange` → visible,
  - zdarzenie `online`,
  - interwał 30 min,
  - jednorazowy fix (`requestCurrentPosition`) pokazujący przesunięcie o ponad 300 m od `primary.origin`.
- Warunek odświeżenia: brak trasy albo wiek ≥ 30 min albo przesunięcie o ponad 300 m.
- Pozycję pobieramy tylko przy stanie zgody `granted`, żeby nie wywoływać promptu bez gestu. Bez Permissions API (iOS < 16) decyduje `routingConsent`, ustawiane gestem razem z pierwszym przygotowaniem trasy, które samo prosi o lokalizację (review F8). Każde udane wywołanie zapisuje też `lastKnownPosition` w planie.
- Hook montujemy na `/` (i `/czujniki`). Na `/alarm` w P0 nie odświeżamy; reroute online to P1.

#### 5. Karta „Schron i trasa”

**File**: `src/components/RouteCard.tsx`, `src/components/HomeScreen.astro`, `src/components/EvacuationPointCard.tsx` (zmiana tekstów)

**Intent**: Część setupu: zgoda na routing, potem automatyczny wybór i widoczna aktualność trasy.

**Contract**:
- Stany karty:
  - brak zgody: „Wybierzemy najbliższy schron i przygotujemy trasę. Do serwisu tras trafiają tylko współrzędne: Twoja pozycja i kandydaci. Plan rodziny zostaje na telefonie.” z przyciskiem „Wybierz schron i przygotuj trasę”;
  - liczenie: „Szukam najbliższego schronu…”;
  - gotowe: A z adresem, dostępnością, „1,2 km · 15 min pieszo” i „Trasa przygotowana o 14:32”, plus „Zapasowy: …” dla B;
  - offline: „Bez internetu — używam trasy z …”;
  - błąd: komunikat z kolejnym krokiem.
- Atrybucja „Punkty schronienia: KG PSP, dane.gov.pl (CC BY 4.0)”.
- `EvacuationPointCard` zmienia nazwę na „Własny punkt (zapasowy)”, z opisem, że działa, gdy w pobliżu nie ma punktu PSP.
- Karta to island `client:only="react"` (czyta localStorage).

#### 6. Diagnostyka tras na `/czujniki`

**File**: `src/components/SensorCheck.tsx`

**Intent**: Jedyna rzetelna metoda sprawdzenia stanu tras na iPhonie bez kabla (Critical Implementation Details → Debug).

**Contract**: Sekcja „Trasa”: cel A/B (adres), wiek tras, `origin`, ostatnia próba odświeżenia z powodem błędu, `routingConsent`. Tylko odczyt `wrw.navigation`, bez akcji.

### Success Criteria:

#### Automated Verification:

- Testy `shelters`, `osrm` i `route-progress` przechodzą: `npm test`
- `npm run data:shelters` tworzy `public/data/shelters-malopolska.json` z ponad 6000 punktów
- Lint i typy przechodzą: `npm run lint`, `npx astro check`
- Build przechodzi, a `sw.js` zawiera `data/shelters-malopolska.json`: `npm run build`
- Smoke przechodzi i sprawdza obecność snapshotu w precache: `npm run smoke`

#### Manual Verification:

- Online w Krakowie: po zgodzie karta pokazuje A i B (B ≥ 150 m od A), trasy zapisane w `wrw.navigation` (podgląd na `/czujniki`)
- Powrót do aplikacji po ponad 30 min albo po przejechaniu ponad 300 m odświeża trasę; bez sieci karta mówi, z której godziny jest trasa
- W trybie samolotowym na `/alarm`: strzałka wskazuje punkt kontrolny na trasie, odległość „trasą” maleje przy marszu
- Zejście z trasy o około 60 m pokazuje „Wróć na trasę”, powrót wraca do „trasą”; oddalenie o ponad 300 m przełącza na „w linii prostej” z informacją o oddaleniu od trasy
- W DevTools (Android) do routingu trafiają wyłącznie współrzędne w URL, bez żadnych danych planu

---

## Phase 4: Paczka mapy offline — manifest, pobieranie do OPFS, karta setupu

### Overview

Produkcyjna wersja pobierania ze spike'a: manifest regionów, worker zapisujący Range'ami do OPFS ze wznawianiem, `persist`, karta „Mapa offline” ze zgodą i postępem.

### Changes Required:

#### 1. Manifest regionów

**File**: `src/lib/map-regions.ts`

**Intent**: Aplikacja proponuje właściwy region i rozmiar bez dodatkowego zapytania sieciowego.

**Contract**:
- `MAP_REGIONS: MapRegion[]`, gdzie `MapRegion` to `{ id, name, version, url, bytes, osmDate, bounds: [w, s, e, n] }`.
- `proposeRegion(position | null)`: przy pozycji wewnątrz `bounds` zwraca ten region. Bez pozycji albo poza `bounds` zwraca jedyny region MVP z dopiskiem, że to obecnie jedyny obsługiwany region. Poligon granicy (i `@turf/boolean-point-in-polygon`) dodajemy dopiero przy drugim regionie (review F7).

#### 2. Pobieranie do OPFS

**File**: `src/workers/map-download.worker.ts`, `src/lib/services/map-storage.ts`, `src/lib/services/map-storage.test.ts` (czysta logika stanu i wznowienia)

**Intent**: Niezawodny zapis około 110 MB na iOS (przed 26) i na Androidzie jedną ścieżką kodu.

**Contract**:
- Worker (`new Worker(new URL(…), { type: "module" })`) pobiera paczkę kawałkami po 8 MiB (`Range: bytes=a-b`, oczekuje 206) i zapisuje przez `createSyncAccessHandle().write(buf, { at })`. Wysyła `progress`, `done` i `error`. Wznawia od `getSize()` istniejącego pliku.
- Zwykły GET z 200 i pełnym ciałem traktujemy jako błąd konfiguracji (brak Range).
- Przy `ETag` innym niż zapisany przy starcie (wymaga `ExposeHeaders: ETag`) zaczynamy od nowa.
- Main thread (`map-storage.ts`):
  - sprawdza `navigator.storage.estimate()` przed startem (wymaga ≥ 1,2 × `bytes` wolnego);
  - po zgodzie woła `navigator.storage.persist()`;
  - zapisuje `wrw.map = { schemaVersion: 1, regionId, version, fileName, bytes, receivedBytes, etag, status: "downloading" | "ready" | "failed", completedAt }`.
- `ready` ustawiamy dopiero po sprawdzeniu rozmiaru i otwarciu nagłówka `new PMTiles(new FileSource(file)).getHeader()`.
- Przy nowej wersji w manifeście karta proponuje aktualizację (P1). Stary plik usuwamy dopiero po gotowości nowego.
- Brak `navigator.storage.getDirectory` albo `createSyncAccessHandle` daje stan „Ta przeglądarka nie zapisze mapy offline — prowadzenie strzałką działa bez niej”.

#### 3. Karta „Mapa offline”

**File**: `src/components/MapPackageCard.tsx`, `src/components/HomeScreen.astro`

**Intent**: Pobranie mapy jako część setupu: propozycja, zgoda, automatyczne pobranie.

**Contract**:
- Stany karty:
  - propozycja: „Małopolska · 111 MB · najlepiej przez Wi-Fi” z przyciskiem „Pobierz mapę”;
  - pobieranie: pasek postępu (MB z MB), „Możesz zamknąć aplikację — dokończymy przy następnym otwarciu”;
  - gotowe: „Mapa offline gotowa · dane OpenStreetMap z 03.10.2026”;
  - błąd z kolejnym krokiem.
- Na iOS w karcie Safari (nie standalone) karta pokazuje najpierw: „Dodaj aplikację do ekranu początkowego i pobierz mapę tam — mapa pobrana w Safari nie będzie widoczna w aplikacji”.
- Po ponownym otwarciu ze stanem `downloading` pobieranie wznawia się samo, bo zgoda już była.
- Atrybucja „© OpenStreetMap, Protomaps”.

#### 4. Diagnostyka mapy na `/czujniki`

**File**: `src/components/SensorCheck.tsx`

**Intent**: Stan paczki widoczny na telefonie bez narzędzi deweloperskich.

**Contract**: Sekcja „Mapa offline”: `wrw.map` (wersja, status, `receivedBytes`/`bytes`), rozmiar pliku w OPFS, `navigator.storage.estimate()` i `persisted()`.

### Success Criteria:

#### Automated Verification:

- Testy logiki wznowienia i stanu `wrw.map` przechodzą: `npm test`
- Lint i typy przechodzą: `npm run lint`, `npx astro check`
- Build przechodzi, a chunk workera jest w `dist/` i w precache: `npm run build`
- Smoke przechodzi: `npm run smoke`

#### Manual Verification:

- Android i iPhone (zainstalowana PWA): pobranie z postępem, przerwanie (tryb samolotowy w połowie, zamknięcie aplikacji), wznowienie bez pobierania od zera
- Po zakończeniu `/czujniki` pokazuje rozmiar pliku zgodny z manifestem i `persisted: true` (albo zapisany wynik na iOS)
- iPhone w karcie Safari: karta pokazuje instrukcję instalacji zamiast pobierania

---

## Phase 5: Mapa w Execution Mode

### Overview

Pełnoekranowa mapa pod przyciskiem „Mapa” na `/alarm`, ładowana leniwie, obracana według kierunku, z trasą, pozycją i celem, w całości offline.

### Changes Required:

#### 1. Styl mapy

**File**: `src/lib/map-style.ts`

**Intent**: Styl z gotowych warstw Protomaps, dopasowany do lekkiej paczki i tokenów Execution Mode, bez nowych kolorów w komponentach.

**Contract**:
- `buildMapStyle({ fileKey, colors })`: `layers("base", { ...namedFlavor("dark"), regular: "noto-sans-regular", bold: "noto-sans-medium", italic: "noto-sans-italic" }, { lang: "pl" })`, bez warstw z `source-layer: "pois"` i bez warstw z `icon-image`.
- Każdej warstwie przypisujemy źródło według `source-layer`: `landuse` → `ctx`, `buildings` → `detail`, reszta → `base`.
- Źródła `{ type: "vector", tiles: ["pmtiles://<fileKey>/{z}/{x}/{y}"] }` z jawnymi zakresami: `ctx` maxzoom 12, `base` maxzoom 14, `detail` minzoom 15 / maxzoom 15.
- `glyphs: "/map/fonts/{fontstack}/{range}.pbf"`, bez `sprite`.
- Kolory nakładek (trasa = `--guidance`, cel = `--safe`, użytkownik = `--foreground`, tło = `--background`) czytamy z CSS custom properties przez `getComputedStyle`. W kodzie nie ma heksów.

#### 2. Komponent mapy

**File**: `src/components/map/ExecutionMap.tsx`, `src/components/map/useMapFile.ts`

**Intent**: Drugi poziom prowadzenia. Konsumuje ten sam `Guidance` co strzałka.

**Contract**:
- `useMapFile()`: przy `wrw.map.status === "ready"` otwiera plik z OPFS (`getFile()`) i rejestruje `Protocol` z `FileSource`.
- Nakładki:
  - trasa (`SavedRoute.geometry`, GeoJSON source),
  - cel,
  - użytkownik (kropka plus stożek kierunku), przygaszony przy `isStale`.
- Heading-up: `bearing = heading` i środek na użytkowniku z paddingiem dolnym (użytkownik w dolnej 1/3). Aktualizacja według progów z „Critical Implementation Details”.
- Przy `heading === null` mapa jest ustawiona na północ, z dopiskiem „Kierunek nieznany — mapa z północą u góry”.
- Gesty: zoom dozwolony, obrót gestem i pitch wyłączone (kierunek steruje obrotem).
- Atrybucja w trybie kompaktowym.

#### 3. Integracja z `/alarm`

**File**: `src/components/GuidanceScreen.tsx`, `src/components/map/MapOverlay.tsx`

**Intent**: Mapa nie opóźnia startu i nie konkuruje ze strzałką (FR-014, `JEZYK_WIZUALNY.md` §5).

**Contract**:
- Przycisk drugorzędny „Mapa” (wariant `secondary`, ikona Lucide `Map`) widoczny tylko przy `wrw.map.status === "ready"` i istniejącym celu. Leży nad „Wyjdź z trybu alarmu”.
- `MapOverlay` to warstwa pełnoekranowa:
  - górny pasek: mała `DirectionArrow`, odległość, podpis trybu;
  - dolny przycisk „Wróć do strzałki”.
- Moduł mapy importowany przez `React.lazy` i prefetchowany w `requestIdleCallback` (fallback `setTimeout`).
- Błąd ładowania mapy daje komunikat „Mapa niedostępna — prowadź strzałką” i powrót do strzałki.

#### 4. Precache i smoke

**File**: `scripts/smoke.mjs`

**Intent**: Pilnować, żeby wszystko, czego mapa potrzebuje offline, było w precache.

**Contract**: Smoke sprawdza, że `sw.js` zawiera `map/fonts/noto-sans-regular/0-255.pbf` i `data/shelters-malopolska.json`. Sprawdzenie, że chunk wejściowy `/alarm` nie zawiera `maplibre`, robi skrypt w buildzie albo ręczna weryfikacja w 5.x.

### Success Criteria:

#### Automated Verification:

- Lint, typy i testy przechodzą: `npm run lint`, `npx astro check`, `npm test`
- Build przechodzi bez ostrzeżeń Workboxa (rozmiar chunków MapLibre poniżej limitu precache): `npm run build`
- Smoke przechodzi z nowymi asercjami precache: `npm run smoke`
- Skrypt wejściowy `alarm.html` nie importuje statycznie chunku `maplibre-gl` (grep w `dist/`)

#### Manual Verification:

- Oba telefony w trybie samolotowym: „Mapa” otwiera mapę z trasą, celem i pozycją; mapa obraca się z telefonem; etykiety mają polskie znaki; zero żądań sieciowych
- `/alarm` z prefetchowaną mapą nadal pokazuje pierwszy krok w < 2 s (stoper, 3 próby na telefon)
- Telefon bez pobranej mapy: brak przycisku „Mapa”, prowadzenie działa
- Kontrast nakładek na ciemnym tle czytelny w słońcu (test na zewnątrz)

---

## Phase 6: Test w terenie, dokumenty, sprzątanie

### Overview

Pełna matryca testów na obu telefonach, minimalne zmiany w PRD, roadmapie i `CLAUDE.md`, usunięcie spike'a.

### Changes Required:

#### 1. PRD

**File**: `context/foundation/prd.md`

**Intent**: Dopisać decyzje S-04 bez przepisywania dokumentu.

**Contract**:
- **FR-004**: dopisać zdanie: „Punkt ewakuacji (schron) wybiera system automatycznie spośród oficjalnych punktów schronienia PSP, według najkrótszego dojścia pieszo, i przygotowuje trasę do niego oraz do punktu zapasowego. Ręcznie wskazany punkt działa jako cel zapasowy, gdy w zasięgu nie ma punktu PSP.” Notka Sokratesa zostaje.
- **FR-007** i „Mapa i nawigacja offline w MVP” pkt 3: zamienić „okresowo (docelowo mniej więcej co 30 min)” na „przy otwarciu aplikacji, powrocie do niej, odzyskaniu sieci i co około 30 min, gdy aplikacja jest otwarta; przeglądarki nie pozwalają na to przy zamkniętej aplikacji”.
- **„Mapa i nawigacja offline w MVP”**: nowy pkt 8 — po zejściu z trasy bez sieci aplikacja prowadzi z powrotem do zapisanej trasy, a przy dużym oddaleniu kieruje wprost do celu; z siecią może wyznaczyć nową trasę.
- **NFR „Dane nie opuszczają urządzenia”**: dopisać wyjątek: „Przy przygotowaniu trasy do serwisu tras trafiają wyłącznie współrzędne (bieżąca pozycja i kandydaci na punkt), za zgodą użytkownika; dane planu i domowników nie opuszczają urządzenia.”
- **Non-Goals**: „Bez własnej bazy i propozycji schronów” zamienić na „Bez własnej bazy schronów — korzystamy z oficjalnego zbioru PSP (dane.gov.pl, CC BY 4.0)”; odnośnik do `S-10` zaktualizować.
- **Open Questions pkt 3**: przenieść do „Rozstrzygnięte 2026-10-03” z jednym zdaniem rozstrzygnięcia.

#### 2. Roadmapa

**File**: `context/foundation/roadmap.md`

**Intent**: Odzwierciedlić przesunięcie automatycznego wyboru schronu z S-10 do S-04. Zmiana `Status` w osobnym małym commicie (`WORKFLOW.md`).

**Contract**:
- S-04: Outcome uzupełnione o automatyczny wybór schronu PSP i trasę zapasową; PRD refs dodane o FR-004; Unknowns zamienione na rozstrzygnięcia (Protomaps i lekka paczka na R2, OSRM FOSSGIS, wyjątek prywatności, odświeżanie przy otwartej aplikacji).
- S-10: Outcome zawężony do „(po MVP) odświeżanie trasy w tle (Periodic Background Sync, Chromium) i kolejne regiony”; Change ID zostaje, żeby nie łamać odnośników; Unknowns o danych PSP oznaczone jako rozstrzygnięte w S-04.
- Parked: dopisać „Przeliczanie trasy offline (future extension, decyzja S-04)” do istniejącej pozycji; zaktualizować „Własna baza i propozycje schronów”.
- Baseline: dopisać mapę offline (OPFS), trasy (`wrw.navigation`) i snapshot PSP.

#### 3. `CLAUDE.md`

**File**: `CLAUDE.md` (sekcja PWA / offline i Commands)

**Intent**: Reguły dla kolejnych agentów.

**Contract**:
- Paczka mapy nie trafia do `dist/`; leży na R2 i jest pobierana do OPFS przez `src/workers/map-download.worker.ts`.
- Fonty mapy i `data/*.json` są precache'owane.
- `npm run data:shelters` odświeża snapshot PSP.
- `scripts/map/README.md` opisuje budowę i upload paczki (`--remote`).
- Navigation core to `src/lib/navigation.ts` i `useGuidance`; nie liczyć prowadzenia w komponentach.

#### 4. Sprzątanie

**File**: `src/pages/spike-mapa.astro`, `src/components/spike/` (usunięcie), CORS R2 (usunięcie originu preview), `public/template.png` (usunięcie — pozostałość startera, około 1,2 MB w precache, `MAP_HANDOVER_LOCAL.md` §5)

**Intent**: Brak martwego kodu i zbędnych bajtów w precache przed mergem.

### Success Criteria:

#### Automated Verification:

- Pełny zestaw przechodzi: `npm test && npm run lint && npx astro check && npm run build && npm run smoke`
- CI na PR do `main` zielone (joby `ci` i `smoke`)
- Po merge deploy i smoke na żywym adresie (`EXPECT_HEADERS=1`) przechodzą

#### Manual Verification:

- Matryca testów w terenie (sekcja „Manual Testing Steps”) zaliczona na Androidzie i iPhonie, z zapisanym modelem telefonu i wersją systemu
- Dokumenty zaktualizowane zgodnie z §1–§3; zespół potwierdza brzmienie wyjątku w NFR

---

## Phase 7: P1 — po zaliczeniu P0 (opcjonalne, jeśli zostanie czas)

### Overview

Rozszerzenia, które poprawiają doświadczenie, ale nie są potrzebne do vertical slice'a. Każdy punkt jest niezależny i może zostać pominięty bez wpływu na P0.

### Changes Required:

#### 1. Reroute online na `/alarm`

**File**: `src/components/hooks/useGuidance.ts`, `src/lib/services/route-refresh.ts`

**Intent**: Zamrożona decyzja dopuszcza nową trasę online po istotnym zejściu z trasy.

**Contract**: Gdy tryb `rejoin` albo `direct` trwa ≥ 15 s i `navigator.onLine`, wyznaczamy nową trasę do **tego samego** celu (bez ponownego wyboru celu w kryzysie). Najwyżej raz na 60 s. Porażka zostawia starą trasę.

#### 2. North-up

**File**: `src/components/map/ExecutionMap.tsx`

**Intent**: Tania opcja dodatkowa.

**Contract**: Przełącznik „Północ u góry” / „Kierunek u góry” w pasku mapy, zapamiętany w localStorage.

#### 3. Podgląd trasy w Preparation Mode, aktualizacja paczki, zapasowy router

**File**: `src/components/RouteCard.tsx`, `src/components/MapPackageCard.tsx`, `src/lib/services/routing/valhalla.ts`

**Intent**: Mapa w jasnym wariancie na karcie trasy (ten sam komponent, `namedFlavor("light")`). Propozycja aktualizacji przy nowej wersji w manifeście. Adapter Valhalli (`/sources_to_targets`, `/route` z `costing: "pedestrian"`) jako zapasowy, gdy OSRM nie odpowiada.

**Contract**: Interfejs `WalkingRouter` bez zmian; wybór routera to lista prób w `route-refresh.ts`.

### Success Criteria:

#### Automated Verification:

- Lint, typy, testy, build i smoke przechodzą: `npm run lint && npx astro check && npm test && npm run build && npm run smoke`

#### Manual Verification:

- Reroute online po zejściu z trasy działa w terenie i nie zmienia celu
- North-up przełącza się i zostaje zapamiętany
- Wyłączenie OSRM (zablokowany host w DevTools) przełącza routing na Valhallę

---

## Priorytety

**P0** (vertical slice; Phase 1–6):
- spike gate z pomiarem dodatkowych cięć;
- navigation core z trasą (punkt kontrolny, pozostała długość, zejście z trasy offline z powrotem i fallbackiem wprost);
- snapshot PSP i automatyczny wybór A/B przez OSRM, zapis tras A i B;
- odświeżanie przy otwartej aplikacji, wiek trasy w UI;
- pobranie paczki do OPFS ze wznowieniem;
- mapa heading-up offline na `/alarm`;
- dokumenty i test w terenie.

**P1** (Phase 7): reroute online na `/alarm`, north-up, podgląd mapy w przygotowaniu, aktualizacja paczki, zapasowy router Valhalla, sumy kontrolne części paczki, pozostałe schrony na mapie, okienkowe szukanie postępu dla tras z pętlami.

**Parking lot:**
- przeliczanie trasy offline (future extension: routing na urządzeniu na lokalnym grafie);
- odświeżanie w tle (Periodic Background Sync, Chromium) → `S-10`;
- regiony poza Małopolską i paczka „wokół użytkownika”;
- własny build Planetilera i MLT;
- ranking schronów z uwzględnieniem dostępności;
- przycisk „niedostępne” → S-02; głos → S-03.

## Testing Strategy

### Unit Tests:

- `navigation-storage`: walidacja, uszkodzone podobiekty, nieznana wersja, `active` bez trasy.
- `route-progress`: rzut na trasę, pozostała długość, punkt kontrolny, końce trasy.
- `navigation`: równoważność z S-01 bez trasy, tryby `route` / `rejoin` / `direct`, histereza, `arrived` tylko na żywym fixie.
- `shelters`: shortlist (k, promień), wybór A/B z odległością ≥ 150 m, kandydaci `null`, lepkość A (10% i 60 s).
- `osrm`: parsery na zapisanych odpowiedziach (sukces, `code != "Ok"`, pusta trasa).
- `map-storage`: przejścia stanu, wznowienie od `receivedBytes`, zmiana wersji lub ETag.

### Integration Tests:

- `npm run smoke`: strony, precache fontów mapy i snapshotu PSP.
- Build: brak ostrzeżeń Workboxa; brak statycznego importu MapLibre w wejściu `/alarm`.

### Manual Testing Steps:

Każdy krok na **Androidzie (Chrome, zainstalowana PWA)** i **iPhonie (PWA z ekranu początkowego)**. Zapisujemy model telefonu i wersję systemu.

1. Online: instalacja PWA, „Gotowe do pracy offline”, pobranie mapy (czas, rozmiar), przerwanie i wznowienie.
2. Online: zgoda na routing, A i B na karcie, wiek trasy.
3. Zamknięcie aplikacji, tryb samolotowy, ponowne otwarcie z ekranu początkowego: karta mówi „Bez internetu — używam trasy z …”.
4. Przytrzymanie alarmu: pierwszy krok w < 2 s (stoper, 3 próby); odległość „trasą”.
5. Marsz po trasie około 300 m: odległość maleje, strzałka prowadzi przez zakręty trasy (punkt kontrolny).
6. Zejście z trasy o około 60 m: „Wróć na trasę”; powrót: „trasą”.
7. Oddalenie o ponad 300 m (albo start z innego miejsca niż `origin` trasy): „w linii prostej” plus informacja o oddaleniu od trasy.
8. „Mapa”: trasa, cel, pozycja, obrót z telefonem, polskie etykiety, budynki z numerami; zero żądań sieciowych (zdalne DevTools / Web Inspector).
9. Dojście do celu: „Jesteś na miejscu” tylko na żywym fixie, poniżej 25 m.
10. Restart telefonu po co najmniej 12 h: mapa i trasy nadal są, `persisted` bez zmian.

**Ograniczenia platformowe (jawnie, bez obiecywania):**

| Temat | Android (Chrome) | iPhone (Safari / PWA) |
| --- | --- | --- |
| Zapis do OPFS | `createSyncAccessHandle` w workerze (też `createWritable`) | tylko `createSyncAccessHandle` w workerze przed iOS 26 |
| Magazyn karty vs PWA | wspólny | **osobny** — mapę pobieramy w zainstalowanej PWA |
| Trwałość danych | `persist()` przyznawane zwykle zainstalowanej PWA | PWA z ekranu początkowego nie podlega 7-dniowemu kasowaniu ITP; wynik `persist()` zapisujemy w teście |
| Lokalizacja i routing w tle | brak przy zamkniętej PWA; Periodic Background Sync = Parking lot | brak |
| Kompas | `deviceorientationabsolute` | `webkitCompassHeading`, zgoda z gestu (z S-01) |

## Performance Considerations

- Chunk wejściowy `/alarm` zyskuje tylko Turfa (`nearest-point-on-line`, `along`, `length`, w sumie kilkanaście KB). MapLibre, pmtiles i basemaps są w osobnym chunku ładowanym w idle.
- Precache rośnie o chunk MapLibre (około 1 MB), fonty (poniżej 1 MB) i snapshot PSP (696 KB). Usunięcie `public/template.png` (około 1,2 MB) prawie to kompensuje.
- Mapa: aktualizacja obrotu dławiona progami i rAF; geometria trasy przygotowana raz na `createdAt`.
- Odświeżanie tras: maksymalnie 3 żądania do FOSSGIS na odświeżenie (1 macierz i 2 trasy), nie częściej niż co 30 min. To mieści się w polityce niskiego wolumenu FOSSGIS (do potwierdzenia lekturą polityki w Phase 1).

## Migration Notes

- `wrw.plan` bez zmian (nadal `schemaVersion: 1`), więc nie trzeba migracji. Dotychczasowy `evacuationPoint` staje się ręcznym celem zapasowym.
- `wrw.navigation` i `wrw.map` to nowe klucze. Brak klucza oznacza zachowanie z S-01.
- Rollback: usunięcie kart i przycisku „Mapa” przywraca S-01. Pliki w OPFS zostają niegroźnie, ewentualne czyszczenie dopisuje kolejny change.
- Koordynacja z S-02: S-02 przełącza `NavigationState.active` przez `setActiveRoute("alternate")` i rozszerza teksty w `GuidanceScreen`. Mergujemy po kolei, a drugi branch rebase'ujemy.

## References

- Zamrożone decyzje: `context/changes/offline-map-and-route/change.md`
- S-01: `context/archive/2026-10-03-guided-to-point-offline/plan.md`, `reviews/impl-review.md` (F8d: częstotliwość `useHeading`)
- Handover S-01 (lokalny): `MAP_HANDOVER_LOCAL.md` (SEAM-A…G)
- Navigation core dziś: `src/components/GuidanceScreen.tsx:92-110`
- Wzorzec magazynu: `src/lib/services/plan-storage.ts`
- Precache: `scripts/generate-sw.mjs:5`; smoke: `scripts/smoke.mjs`
- PRD: FR-004, FR-007, FR-014, NFR, Non-Goals, Open Question 3
- Dane PSP: https://dane.gov.pl/pl/dataset/28058,punkty-schronienia-w-polsce
- Protomaps builds: https://build-metadata.protomaps.dev/builds.json; go-pmtiles v1.31.2

## Progress

> Konwencja: `- [ ]` do zrobienia, `- [x]` zrobione. Po zakończeniu kroku dopisz ` — <commit sha>`. Nie zmieniaj tytułów kroków. Patrz `references/progress-format.md`.

### Phase 1: Spike gate — lekka paczka, R2, OPFS i mapa offline na telefonach

#### Automated

- [x] 1.1 Paczka przechodzi weryfikację: `pmtiles verify dist-map/<plik>.pmtiles`
- [ ] 1.2 R2 HEAD zwraca 200 z `Content-Length` i `Accept-Ranges: bytes`
- [ ] 1.3 R2 GET z `Range` zwraca 206 i `Content-Range`
- [ ] 1.4 Preflight z obu originów zwraca 204, a GET eksponuje `ETag`
- [x] 1.5 Lint i typy przechodzą: `npm run lint`, `npx astro check`
- [x] 1.6 Build przechodzi, fonty `.pbf` są w `dist/map/fonts/`

#### Manual

- [ ] 1.7 Rozmiar po dodatkowych cięciach i porównanie zrzutów zapisane; lista cięć zatwierdzona
- [ ] 1.8 Android: pobranie do OPFS, czas, `persisted`, przeżycie zabicia aplikacji
- [ ] 1.9 iPhone: pobranie przez worker z `createSyncAccessHandle`, wersja iOS, `persist()`, `estimate()`
- [ ] 1.10 Oba telefony offline: renderowanie z13–z18, budynki w Tarnowie, polskie etykiety, zero żądań sieciowych
- [ ] 1.11 Heading-up płynny; pierwszy render nie czeka na MapLibre
- [ ] 1.12 OSRM foot: 3 trasy w Krakowie sensowne, czasy zapisane
- [ ] 1.13 Decyzja go/no-go zapisana w `change.md`

### Phase 2: Navigation core z trasą

#### Automated

- [x] 2.1 Testy przechodzą: `npm test`
- [x] 2.2 Lint przechodzi: `npm run lint`
- [x] 2.3 Typy przechodzą: `npx astro check`
- [x] 2.4 Build i smoke przechodzą: `npm run build && npm run smoke`

#### Manual

- [ ] 2.5 Regresja S-01 bez trasy na telefonie
- [ ] 2.6 `/alarm` w trybie samolotowym: pierwszy krok < 2 s

### Phase 3: Schrony PSP, routing i automatyczny wybór celu

#### Automated

- [ ] 3.1 Testy `shelters`, `osrm`, `route-progress` przechodzą: `npm test`
- [ ] 3.2 `npm run data:shelters` tworzy snapshot z ponad 6000 punktów
- [ ] 3.3 Lint i typy przechodzą: `npm run lint`, `npx astro check`
- [ ] 3.4 Build przechodzi, `sw.js` zawiera snapshot PSP
- [ ] 3.5 Smoke przechodzi z asercją snapshotu: `npm run smoke`

#### Manual

- [ ] 3.6 Online w Krakowie: A i B na karcie, trasy w `wrw.navigation`
- [ ] 3.7 Odświeżenie po 30 min albo 300 m; komunikat offline z godziną trasy
- [ ] 3.8 Tryb samolotowy: strzałka po trasie, odległość „trasą” maleje
- [ ] 3.9 Zejście z trasy: „Wróć na trasę”; ponad 300 m: „w linii prostej”
- [ ] 3.10 Do routingu trafiają wyłącznie współrzędne

### Phase 4: Paczka mapy offline — manifest, pobieranie do OPFS, karta setupu

#### Automated

- [ ] 4.1 Testy logiki wznowienia i stanu `wrw.map` przechodzą: `npm test`
- [ ] 4.2 Lint i typy przechodzą: `npm run lint`, `npx astro check`
- [ ] 4.3 Build przechodzi, chunk workera w `dist/` i w precache
- [ ] 4.4 Smoke przechodzi: `npm run smoke`

#### Manual

- [ ] 4.5 Oba telefony: pobranie z postępem, przerwanie i wznowienie
- [ ] 4.6 `/czujniki`: rozmiar pliku zgodny z manifestem, wynik `persist`
- [ ] 4.7 iPhone w karcie Safari: instrukcja instalacji zamiast pobierania

### Phase 5: Mapa w Execution Mode

#### Automated

- [ ] 5.1 Lint, typy i testy przechodzą
- [ ] 5.2 Build bez ostrzeżeń Workboxa: `npm run build`
- [ ] 5.3 Smoke z asercjami precache fontów i snapshotu: `npm run smoke`
- [ ] 5.4 Wejście `alarm.html` nie importuje statycznie `maplibre-gl`

#### Manual

- [ ] 5.5 Oba telefony offline: mapa z trasą, celem, pozycją, heading-up, polskie etykiety, zero żądań
- [ ] 5.6 `/alarm` z prefetchem mapy: pierwszy krok < 2 s (3 próby na telefon)
- [ ] 5.7 Bez pobranej mapy: brak przycisku „Mapa”, prowadzenie działa
- [ ] 5.8 Kontrast nakładek czytelny w słońcu

### Phase 6: Test w terenie, dokumenty, sprzątanie

#### Automated

- [ ] 6.1 Pełny zestaw przechodzi lokalnie
- [ ] 6.2 CI na PR do `main` zielone
- [ ] 6.3 Deploy i smoke na żywym adresie po merge

#### Manual

- [ ] 6.4 Matryca testów w terenie zaliczona na Androidzie i iPhonie
- [ ] 6.5 PRD, roadmapa i `CLAUDE.md` zaktualizowane; brzmienie wyjątku w NFR potwierdzone

### Phase 7: P1 — po zaliczeniu P0 (opcjonalne, jeśli zostanie czas)

#### Automated

- [ ] 7.1 Lint, typy, testy, build i smoke przechodzą

#### Manual

- [ ] 7.2 Reroute online po zejściu z trasy, bez zmiany celu
- [ ] 7.3 North-up przełącza się i jest zapamiętany
- [ ] 7.4 Zablokowany OSRM przełącza routing na Valhallę

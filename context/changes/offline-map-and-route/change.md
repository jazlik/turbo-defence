---
change_id: offline-map-and-route
title: Mapa i trasa offline jako drugi poziom prowadzenia (S-04)
status: impl_reviewed
created: 2026-10-03
updated: 2026-10-04
archived_at: null
---

## Notes

Branch: `feature/mapa` (decyzja zespołu, zamiast `change/offline-map-and-route`).

Zamrożone decyzje zespołu (2026-10-03, start S-04):

- S-01 jest działającym navigation core. S-04 ma go rozszerzyć, nie tworzyć drugiego GPS/heading/bearing/navigation systemu.
- Strzałka pozostaje primary view. Mapa jest secondary view i nie może opóźniać startu Execution Mode.
- Gdy nie ma poprawnej mapy/trasy, obecny direct-bearing S-01 pozostaje fallbackiem.
- Docelowy basemap offline: preferujemy gotowe rozwiązanie oparte o OSM; MapLibre + PMTiles/Protomaps jest obecnie preferowanym kierunkiem, ale zweryfikuj go technicznie przed związaniem implementacji.
- Najpierw zmierz realne rozmiary Krakowa i Małopolski. Docelowo chcemy Małopolskę, o ile paczka pozostaje rozsądna; orientacyjny budżet downloadu to ~100 MB.
- Jeśli trzeba zmniejszać mapę, priorytetem są: drogi/ciągi piesze, budynki, ulice/adresy i podstawowa geografia. POI typu sklepy/restauracje nie są istotne.
- Pobranie mapy ma być częścią setupu: aplikacja proponuje właściwy region i rozmiar, użytkownik wyraża zgodę, potem download wykonuje się automatycznie.
- Oficjalne punkty schronienia PSP są osobną warstwą danych, nie zakładamy, że przychodzą z basemapu.
- Użytkownik nie wybiera ręcznie trasy. System ma automatycznie wybrać odpowiedni punkt/schron i trasę.
- Sensowny kierunek wyboru celu: lokalnie shortlist kilku najbliższych kandydatów, a następnie walking routing/matrix wybiera najlepszy pieszo. Dobierz szczegóły na podstawie danych i API.
- MVP routing jest online. Po utracie sieci realizujemy ostatnią poprawnie zapisaną trasę. Pełne offline route recalculation traktujemy jako przyszłe rozszerzenie.
- Jeśli korzystamy z zewnętrznego routingu, mogą opuścić urządzenie wyłącznie dane konieczne do routingu (np. start/destination coordinates); household data nie opuszczają urządzenia.
- Zapisana trasa ma być provider-independent i nie może uzależniać navigation core od konkretnego API.
- Gdy SavedRoute istnieje, główna strzałka prowadzi po trasie, nie bezpośrednio do final destination.
- Odległość przy SavedRoute = pozostała długość trasy. Straight-line distance pozostaje fallbackiem.
- Do geometrii trasy używaj dojrzałych bibliotek/utilities, zamiast pisać własny geometry engine.
- ONLINE po istotnym zejściu z trasy możemy reroutować.
- OFFLINE w MVP nie liczymy nowej trasy. System ma sensownie prowadzić użytkownika z powrotem do zapisanej trasy / zakomunikować zejście; przy dużym rozjeździe może użyć direct-bearing S-01 jako degraded fallback.
- Offline rerouting zapisz jako potencjalne future extension.
- UX ma jedną aktywną trasę. Model/storage powinien jednak umożliwiać trasę główną A oraz przygotowaną trasę do alternatywnego punktu B, żeby użytkownik nie musiał podejmować tej decyzji w panice.
- Mapa w Execution Mode ma preferencyjnie działać heading-up. North-up może być tanią opcją dodatkową.
- Nie obiecujemy geolokalizacji/routingu co 30 minut przy zamkniętej PWA. Zaprojektuj zachowanie realistyczne dla obecnej platformy, ale tak, żeby UX możliwie przypominał finalny produkt.
- Route checkpoint powinien mieć informację o wieku/createdAt, tak aby UI mogło pokazać aktualność trasy.
- Wszystkie assety wymagane do renderowania mapy muszą faktycznie działać offline.
- Demo ma działać przynajmniej niezawodnie na rzeczywistym telefonie używanym przez zespół; mamy dostęp do Androida i iPhone'a. Plan ma jasno oddzielić ewentualne ograniczenia platformowe.
- Nie rób dużego rewrite S-01. Refactor tylko tam, gdzie jest potrzebny do współdzielenia navigation state/logiki.

Najważniejszy vertical slice:

- ONLINE: mapa regionu jest lokalnie → punkty dostępne → system wybiera destination → walking route jest przygotowana i zapisana.
- OFFLINE / AIRPLANE MODE: `/alarm` odpala natychmiast → istniejący navigation core prowadzi po zapisanej trasie → secondary map pokazuje użytkownika, trasę i cel → mapa działa bez network dependency.

Po zakończeniu S-04: lokalny `S04_HANDOVER_LOCAL.md` (nie commitować).

## Phase 1 — spike gate (2026-10-03)

1A (desk) results:

- Lean package v2: `malopolska-20261003-lean2.pmtiles` = **99.1 MB** (99 077 239 B), `pmtiles verify` OK. Extra cut vs plan: buildings dropped below z15 (style draws them only from the z15 `detail` source) → −12 MB. Attribute whitelist −1.9 MB and streams-from-z13 0 MB → not adopted (< 5 MB rule). Details: `scripts/map/README.md`.
- Desktop (Chrome, local Range+CORS server standing in for R2): worker download into OPFS OK (resume: complete file detected via 416), MapLibre 6 renders the OPFS file through `pmtiles.FileSource`, three sources from one file work (Tarnów: z14 streets + z15 buildings + Polish labels; Kraków z18: house numbers), zero network requests after the map opens.
- MapLibre 6 is ESM-only and resolves its worker with `new URL(variable, import.meta.url)`; fix: `setWorkerUrl()` with `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url`. Chunks: map 1.08 MB, MapLibre worker 0.51 MB (under the 2 MiB precache limit).
- Dark flavor has very low contrast on the Execution background → Phase 5 must brighten roads/labels (style overrides from tokens).
- OSRM foot (FOSSGIS): Rynek→Kazimierz 1532 m (×1.22 straight line), Nowa Huta 1324 m (×1.37), Mogilskie→Dąbie 1694 m (×1.46); routes use pedestrian streets and footways; 32–189 ms; destination snap up to 53 m (confirms review F1). Usage policy: max 1 request/s, valid UA/Referer, OSM attribution with a "fix the map" link → Phase 3 sends matrix, route A, route B **sequentially ≥ 1 s apart** (plan said parallel) and RouteCard carries the OSM attribution link.
- Blocked on team: logged-in Wrangler account (`Piwciax@gmail.com's Account`) has neither R2 nor Worker `w-razie-w`. CORS, upload and preview deploy are packaged in `scripts/map/publish-spike.sh`.

## Phase 3 — implementation notes (2026-10-03)

- Router requests are sequential with a 1.1 s gap (FOSSGIS policy), not parallel as the plan said.
- Shortlist = 5 nearest + up to 3 nearest at least 150 m from the nearest one. Live check: in Kraków's Rynek the 5 nearest PSP points all sit within 150 m of A, so without the spread there was no route B. One matrix request either way.
- Live end-to-end (real OSRM + PSP snapshot): Rynek → A "Rynek Główny 1" 80 m, B "Rynek Główny 46" 163 m; Nowa Huta → A "Osiedle Centrum A 1" 195 m, B 241 m; Tarnów → A "ul. Rynek 16" 15 m, B "ul. Kupiecka 3" 267 m. 2.5–10 s per refresh (FOSSGIS throttles bursts).
- Snapshot is 532 KB (6 097 points); `public/data/` is in `.prettierignore` so lint-staged does not pretty-print it.

## Phase 5 — implementation notes (2026-10-03)

- Map palette comes only from Execution tokens (no new colours): background/earth `--background`, buildings `--surface-secondary` (`--surface` was indistinguishable from the background), roads `--secondary-pressed`, labels `--muted-foreground`, route `--guidance`, destination `--safe`, user `--foreground` (dimmed when stale).
- Desktop: /alarm shows the "Mapa" button only with a ready package; the map chunk (1.08 MB) is prefetched in idle after the first render; GuidanceScreen chunk is 21.7 KB with no MapLibre. Overlay renders route, destination, user, Polish labels and buildings from OPFS; north-up note without heading.
- Testing artefact, not a product bug: the automation tab is `visibilityState: hidden`, so requestAnimationFrame never fires and MapLibre only paints when a screenshot forces a frame (the "blank map" seen in the Phase 1 spike too).

## Phase 7 (P1) — implementation notes (2026-10-04)

- Camera (team decision 2026-10-03): default map view is pedestrian navigation — heading-up, pitch 45° (max 50°), zoom 17, user puck flat in the lower quarter; north-up is a flat fallback (toggle remembered per device, or no heading). Stability first: ≥ 5° / ≥ 2 m thresholds, 250 ms ease.
- Backup router: Valhalla (FOSSGIS) behind `withFallback([osrm, valhalla])`. That instance ignores `shape_format: "geojson"`, so shapes are decoded with `@googlemaps/polyline-codec` (zero dependencies; `@mapbox/polyline` pulled 51 packages and was dropped).
- Online reroute on /alarm: live fix, online, ≥ 15 s off the route, at most once per 60 s, same destination; offline nothing changes. Adds ~7 KB to the /alarm chunk.
- Not done (P1 leftovers): map preview in Preparation Mode; package update flow (needs a separate pending record so /alarm keeps the old ready package while the new one downloads).

## Decyzje zespołu po mergu z S-02/S-03 (2026-10-04)

Zastępują wcześniejsze punkty o „primary/secondary view”:

- **Happy path = mapa.** Przy poprawnej SavedRoute i gotowej mapie offline krok „schron” na `/alarm` otwiera od razu nawigacyjny widok mapy (heading-up, bursztynowa trasa w `--guidance`, przebyty odcinek przygaszony). Duża strzałka S-01 to fallback (brak mapy, brak trasy, błąd mapy/storage/WebGL) i widok „więcej opcji”.
- **Cel kroku „schron”:** automatycznie wybrany schron PSP z trasą A (B po „niedostępne”); ręcznie wskazany schron z planu działa jako zapas, gdy trasy PSP nie ma. Kroki spotkania/zapasowe (S-02) bez zmian.
- **Alarm bez celu nigdy nie kończy się ślepym ekranem.** „Znajdź najbliższy schron teraz”: online — trasa przez istniejące przygotowanie (bez zapisu stałej zgody na routing), start od kroku schronu; offline lub błąd/timeout routingu — najbliższy punkt PSP z lokalnego snapshotu, prowadzenie awaryjne w linii prostej z jawnym komunikatem. Błąd tylko bez pozycji, bez danych PSP albo bez punktu w 15 km.
- **Mapa offline a przeglądarka:** na iOS poza zainstalowaną PWA nie oferujemy ani nie wznawiamy pobierania (osobny storage Safari) — instrukcja „Do ekranu początkowego”; alarm działa także w przeglądarce.
- **Gotowość:** Home pokazuje stan mapy, trasy i lokalizacji; nigdy nie blokuje alarmu.
- Otwarte (P1): reroute online na `/alarm` po zejściu z trasy — funkcja `rerouteActive` istnieje, niepodpięta po integracji z S-02.

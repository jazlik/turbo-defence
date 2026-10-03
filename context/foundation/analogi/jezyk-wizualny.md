# Język wizualny analogów

Styl i paleta kolorów aplikacji z analizy analogów (branch `feature/competitor-analysis`, katalog `analogi-screeny/` (po przeniesieniu: `context/foundation/analogi/screeny/`)). Dokument opisuje, jak wyglądają rozwiązania podobne do Household Resilience App i co z tego wynika dla naszego UI.

## Metoda i ograniczenia

- Źródło: jeden screen ze sklepu App Store na aplikację. Kolory zmierzono z obrazów (udział powierzchni, kwantyzacja), więc **hex jest przybliżony (±8 na kanał)**.
- **Core** to kolor dominujący lub nośnik marki. **Support** to tła, tekst i stany. **Akcent** to kolor akcji i alertów.
- Część screenów to grafiki marketingowe (mObywatel), więc pokazują styl marki, a nie dokładny UI. Jest oznaczona.
- Gdzie się ukryć nie ma screenu i nie jest opisane.
- Siedem pozycji usunięto z listy (patrz `analiza-zbiorcza.md`). Jedna z nich, Air Alert, została jako wzorzec UX poniżej.
- Wartości z `~` to oszacowanie wzrokiem tam, gdzie kolor zajmuje za mało pikseli, żeby go wiarygodnie zmierzyć.

## Podsumowanie

| # | Aplikacja | Tryb | Core | Akcent | Charakter |
|---|---|---|---|---|---|
| 01 | #wGotowości | jasny | biel `#FFFFFF` | czerwień `#DC2424` | urzędowy, wojskowy |
| 03 | mObywatel (marketing) | jasny | błękit `#BCDCF4` | czerwień logo, kolory kart | czysty, rządowy |
| 04 | RSO | jasny | biel `#FFFFFF` | czerwień `#CC1C2C` | minimalny, ostrzegawczy |
| 07 | NomadCore | ciemny | granat `#1C2434` | czerwień `#FC4454`, żółć `#FCBC04` | dashboard kryzysowy |
| 09 | Watchtower Survival Pro | ciemny | czerń `#141414` | skala czerwień-żółć-zieleń | taktyczny |
| 10 | Ready | jasny | niebieski `#2464EC` | niebieski jaśniejszy `#8CACF4` | przyjazny, konsumencki |
| 13 | Bridgefy | jasny | biel `#FFFFFF` | koral `#FC4C4C` | lekki, komunikatorowy |

## Karty

### 01. #wGotowości (MON)
- **Układ:** biała, czysta karta, duże zaokrąglone przyciski CTA na całą szerokość, dolna nawigacja z 5 ikonami. Zdjęcia żołnierzy z ciemną nakładką i rysunkowa ilustracja rodziny w poradniku. Pogrubione, duże nagłówki.
- **Core:** biel `#FFFFFF` (ok. 48% powierzchni).
- **Support:** szary tekst `~#646464`, ciemna czerwień `#5C0C0C` (pas pod poradnikiem), granat ikon aktywnych `~#262B36`, szary ikon nieaktywnych `~#ACAFB8`.
- **Akcent:** czerwień `#DC2424` (przyciski, logo).

### 03. mObywatel (grafika marketingowa)
- **Układ:** jasne niebieskie gradienty, białe karty, duży bezszeryfowy nagłówek. Karty dokumentów w różnych kolorach.
- **Core:** błękit `#BCDCF4` / `#C4E4FC` (tło), `#F4F4FC` (biel).
- **Support:** granat/czerń tekstu, pomarańcz `#E48C3C` (karta pojazdów), błękit `#048CEC`.
- **Akcent:** czerwień logo (herb) `~#D4213D`.

### 04. Regionalny System Ostrzegania (MSWiA)
- **Układ:** ekran startowy: bardzo dużo bieli (ok. 81%), duże logo (trójkąt ostrzegawczy w konturze Polski), tekst w jednej kolumnie, dwa tekstowe przyciski u dołu bez wypełnienia. Bez ozdób.
- **Core:** biel `#FFFFFF`.
- **Support:** czerń tekstu, szarości `#949494`.
- **Akcent:** czerwień ostrzegawcza `#CC1C2C`.

### 07. NomadCore
- **Układ:** ciemny dashboard „Emergency Center”. Duże kolorowe kafle akcji (czerwono-różowy do numeru alarmowego, żółty beacon), mniejsze ciemne kafle z cyjanowymi ikonami, dolny pasek zakładek. Kolor oznacza wagę akcji.
- **Core:** granat `#1C2434` (ok. 52%) i prawie czerń `#0C141C` (ok. 29%).
- **Support:** jasny szary tekst `~#E5E7EB`, cyjan ikon `~#00BFFF`, zieleń aktywnej zakładki `~#3DDC84`.
- **Akcent:** czerwono-różowy `#FC4454` (krytyczne), żółć `#FCBC04` (alert).

### 09. Watchtower Survival Pro
- **Układ:** czarny interfejs, logo wieży w zniszczonej stylizacji, dwa półokrągłe mierniki („Preparedness” i „Current Risk”) w gradiencie czerwień-żółć-zieleń. Pod nimi karta z tekstowym podsumowaniem i rekomendacją. Taktyczny, grywalizowany wskaźnik gotowości.
- **Core:** czerń `#141414` (ok. 51%).
- **Support:** grafit kart `#1C1C1C`, jasny szary i biały tekst.
- **Akcent:** skala wskaźnika: czerwień `#FC1C04`, żółć `~#F5D90A`, zieleń `#24FC04`.

### 10. Ready: Emergency Kit Planner
- **Układ:** niebieski gradient w górnej połowie onboardingu, białe zaokrąglone kafelki z emoji, duży niebieski przycisk. Przyjazny, bez „mrocznej” estetyki preppersów.
- **Core:** niebieski `#2464EC`.
- **Support:** jasne tło `#F4F4F4`, jasny błękit `#8CACF4` / `#E4ECFC`, ciemny tekst `~#111827`.
- **Akcent:** niebieski przycisku `#2563EA`.

### 13. Bridgefy
- **Układ:** jasny, minimalny. Logo-dymek w koralu, koncentryczne okręgi sygnału Bluetooth, duży koralowy przycisk, ciemnogranatowy nagłówek.
- **Core:** biel `#FFFFFF`.
- **Support:** jasnoszare tło `#E4ECE4`, granat nagłówka `~#2A2A6B`.
- **Akcent:** koral `#FC4C4C`.

## Wzorzec spoza listy: Air Alert

Usunięty z listy analogów, ale zachowany jako odniesienie wizualne dla Execution Mode. (Screen marketingowy, nie UI.)
- **Układ:** jeden symbol (megafon) na czarnym tle, bez dodatkowych elementów.
- **Kolory:** czerń `#040404`, flaga: niebieski `#2C74DC` i żółty `#FCD404`.
- **Wniosek:** w alarmie obowiązuje jeden symbol i największy możliwy kontrast.

## Wzorce, które się powtarzają (7 aplikacji)

1. **Czerwień to język państwa i alarmu:** #wGotowości i RSO używają jej jako koloru marki, mObywatel w logo. Dla zaufania bezpieczna, ale słabo nas odróżni od aplikacji państwowych.
2. **Ciemnych jest tylko dwóch** (NomadCore, Watchtower). Wcześniejsze „aplikacje preppersowe są ciemne” opierało się na pozycjach, które usunęliśmy, więc nie wolno tego uogólniać.
3. **Jasny, przyjazny styl** mają Ready, Bridgefy i trzy aplikacje państwowe. Ciemny styl służy tam, gdzie liczy się czytelność w słabym świetle (NomadCore, Watchtower).
4. **Niebieski jest wolny od skojarzenia z alarmem:** Ready (core `#2464EC`) i mObywatel (tło `#BCDCF4`). To jedyny kolor core, który nie jest ani czerwony, ani ciemny.
5. **Kolor jako znaczenie** działa najlepiej, gdy jest ograniczony: NomadCore (czerwień = akcja krytyczna, żółć = alert) i Watchtower (skala gotowości czerwień-żółć-zieleń).

## Kolorystyka dla Household Resilience App (propozycja)

To **propozycja do decyzji**, a nie ustalenie. Oparta na pomiarach z analogów i na zasadzie „kolor to znaczenie, nie dekoracja”.

### Zasady
- **Dwa tryby, dwie palety.** Tryb przygotowania jest jasny i spokojny. Execution Mode jest ciemny i skrajnie uproszczony (jeden kolor akcji).
- **Czerwień tylko dla zagrożenia.** Nie używamy jej jako koloru marki, żeby nie zlać się z aplikacjami państwowymi i żeby czerwień zachowała znaczenie alarmu.
- **Stała semantyka w obu trybach:** czerwień = zagrożenie, żółć = ostrzeżenie lub uwaga, zieleń = gotowe lub bezpieczne, niebieski = akcja i nawigacja w przygotowaniu.

### Paleta

| Rola | Tryb przygotowania | Execution Mode | Źródło odniesienia |
|---|---|---|---|
| Tło | `#F5F6F8` | `#0C141C` | Ready (`#F4F4F4`), NomadCore (`#0C141C`) |
| Tekst | `#111827` | `#FFFFFF` | Ready, NomadCore |
| Core / akcja | niebieski `#2464EC` | żółć `#FCBC04` | Ready, NomadCore |
| Zagrożenie | `#DC2424` | `#FF5A5F` | wGotowości (`#DC2424`) |
| Ostrzeżenie | `#FCBC04` | `#FCBC04` | NomadCore |
| Gotowe / bezpieczne | `#1E9E4A` | `#3FD068` | skala Watchtower |

### Kontrast WCAG (obliczony)

| Para | Kontrast | Ocena |
|---|---:|---|
| tekst `#111827` na tle `#F5F6F8` | 16,4 | bardzo dobry |
| biel na niebieskim `#2464EC` | 5,1 | dobry (AA) |
| niebieski `#2464EC` na `#F5F6F8` | 4,7 | dobry (AA) |
| czerwień `#DC2424` na `#F5F6F8` | 4,5 | granica AA |
| biel na czerwieni `#DC2424` | 4,9 | dobry (AA) |
| biel na `#0C141C` | 18,5 | bardzo dobry |
| żółć `#FCBC04` na `#0C141C` | 10,9 | bardzo dobry |
| ciemny tekst na żółci `#FCBC04` | 10,4 | bardzo dobry |
| czerwień `#DC2424` na `#0C141C` | 3,8 | **za niski**, stąd jaśniejsza `#FF5A5F` (6,1) |
| zieleń `#1E9E4A` na `#0C141C` | 5,3 | dobry |
| biel na zieleni `#1E9E4A` | 3,5 | **za niski** dla małego tekstu |

### Uwagi
- Biały tekst na zieleni `#1E9E4A` nie spełnia AA dla małego tekstu. Do przycisków i znaczków w tym kolorze użyć ciemnego tekstu.
- Kontrast liczono dla pojedynczych par kolorów. Nie testowano na realnym UI, w słabym świetle ani przy zaburzeniach widzenia barw. Samo kodowanie kolorem (np. gotowe/zagrożenie) wymaga dodatkowego sygnału (ikona, tekst).
- Execution Mode: strzałka i odległość w kolorze akcji (żółć) na ciemnym tle, jedno wyjście awaryjne w kolorze zagrożenia, reszta biała. Zgodnie z PRD (FR-013, FR-014) bez wibracji i z dużymi komunikatami.

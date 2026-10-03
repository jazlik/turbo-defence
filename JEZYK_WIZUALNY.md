# Język wizualny Household Resilience App

- **Status:** v0
- **Rola:** obowiązujące źródło prawdy dla warstwy wizualnej produktu
- **Zakres:** aplikacja, UI, komponenty, prototypy, mockupy, wizualizacje, prezentacje i grafiki przedstawiające produkt

Ten dokument definiuje domyślny kierunek wizualny Household Resilience App. Każde zadanie dotyczące wyglądu produktu powinno zacząć od jego przeczytania.

### Źródła referencyjne v0

Kierunek powstał na podstawie [`analizy zbiorczej analogów`](context/foundation/analogi/analiza-zbiorcza.md), screenów w `context/foundation/analogi/screeny/` oraz wizualnego przeglądu własnej palety v0. Analogi służą do rozpoznania wzorców i antywzorców; nie są źródłem wartości do kopiowania. Przyjęte tokeny i reguły w tym pliku zastępują wcześniejsze robocze propozycje.

## Jak czytać dokument

- **FOUNDATION** — trwała zasada kierunku. Nie zmieniaj jej bez jawnej decyzji produktowej lub projektowej.
- **TOKEN** — aktualnie przyjęta wartość v0. Można ją iterować po weryfikacji, ale nie zastępuj jej samowolnie.
- **GUIDELINE** — domyślne zalecenie. Odstępstwo wymaga konkretnego uzasadnienia w zadaniu.
- **OPEN** — obszar jeszcze nieustalony. Nie przedstawiaj własnego wyboru jako zatwierdzonego standardu.

## 1. Cel języka wizualnego

**FOUNDATION:** Produkt ma pomagać rodzinie zachować kontrolę przed kryzysem i działać bez wahania w jego trakcie.

Język wizualny ma realizować dwa komunikaty:

- Preparation Mode: „mam sytuację pod kontrolą”,
- Execution Mode: „wiem dokładnie, co mam teraz zrobić”.

Warstwa wizualna ma skracać czas rozpoznania stanu, porządkować informacje i zmniejszać liczbę decyzji. Nie jest dekoracją ani próbą budowania napięcia.

## 2. Charakter produktu

Produkt znajduje się pomiędzy rodzinną aplikacją do przygotowania planu a bardzo prostym instrumentem działania podczas realnego kryzysu.

**FOUNDATION:** Produkt jest spokojny, wiarygodny, chłodny i uporządkowany, ale nie bezosobowy. Nie używa estetyki:

- militarnej ani survivalowej,
- gamingowej ani cyberpunkowej,
- typowego dashboardu SaaS,
- rządowego systemu alarmowego,
- aplikacji medycznej lub interfejsu dla służb.

Preparation Mode może być bardziej rodzinny i wspierający. Execution Mode jest maksymalnie funkcjonalny, lecz nadal należy do tego samego produktu.

## 3. Zasady nadrzędne

1. **FOUNDATION — kolor oznacza znaczenie, nie dekorację.** Nie twórz przypadkowych kolorowych kart.
2. **FOUNDATION — dwa tryby, jeden system.** Łączą je typografia, geometria, ikony, spacing i logika informacji.
3. **FOUNDATION — czerwień nie jest kolorem marki ani domyślnym CTA.** Oznacza zagrożenie lub pilną reakcję.
4. **FOUNDATION — najpierw informacja i działanie.** Ozdoby nie mogą konkurować z kolejnym krokiem użytkownika.
5. **FOUNDATION — znaczenie nie zależy od samego koloru.** Stan uzupełnia tekst, ikona, etykieta lub układ.
6. **GUIDELINE — ogranicz liczbę akcentów.** Jeden widok powinien mieć jeden dominujący kolor działania.
7. **GUIDELINE — preferuj prostotę nad gęstością.** Nie buduj dashboardów, jeśli wystarczy komunikat i jedna akcja.

## 4. Preparation Mode

Preparation Mode służy do spokojnego planowania, uzupełniania danych, przeglądania gotowości i ćwiczeń.

**FOUNDATION:** Bazą są neutralne, chłodne szarości. Stalowo-niebieski core jest oszczędnym sygnałem interakcji, a nie kolorem dominującym powierzchnie.

### Charakter i hierarchia

- spokojny, neutralny, rodzinny i wiarygodny,
- więcej przestrzeni i możliwość eksplorowania,
- lekkie powierzchnie i jasne grupowanie treści,
- wyraźny kolejny krok, ale bez poczucia alarmu,
- stalowy akcent tylko dla CTA, focusu, aktywnego elementu, zaznaczenia i wybranej pozycji nawigacji.

### Wzorzec widoku

1. Czytelny tytuł i krótki kontekst.
2. Najważniejszy stan lub postęp.
3. Zadania i dane pogrupowane według celu.
4. Jedna dominująca akcja na sekcję.
5. Informacje wspierające i edukacyjne na dalszym planie.

**DON'T:** Nie zalewaj ekranu niebieskim tłem, wieloma barwnymi kaflami ani alarmową czerwienią.

## 5. Execution Mode

Execution Mode służy do wykonywania wcześniej przygotowanego planu podczas realnego zagrożenia.

**FOUNDATION:** Tryb musi być natychmiast odróżnialny od Preparation Mode przez ciemność, kontrast, redukcję treści i silniejszą hierarchię — nie przez „taktyczny” styl.

### Charakter i hierarchia

- głęboko ciemne powierzchnie i wysoki kontrast,
- jedna dominująca informacja operacyjna,
- jedna dominująca następna czynność,
- bardzo ograniczona liczba wyborów,
- duża typografia dla kierunku, odległości, czasu i instrukcji,
- najważniejsze dane widoczne bez przewijania, jeśli pozwala na to ekran,
- bursztynowy jako prowadzenie i następny krok,
- czerwony wyłącznie dla realnego zagrożenia, krytycznego ostrzeżenia lub awaryjnej akcji.

### Wzorzec widoku

1. Aktualny krok lub cel.
2. Dominujący kierunek, odległość, czas albo instrukcja.
3. Jedna główna akcja w kolorze guidance.
4. Jedna jawna akcja awaryjna, jeśli jest potrzebna.
5. Tylko informacje konieczne do wykonania kroku.

**DON'T:** Nie projektuj siatki wskaźników, mierników gotowości, wielu równorzędnych CTA ani estetyki inspirowanej grą lub sprzętem wojskowym.

## 6. Paleta i tokeny

Nazwy poniżej są kanonicznymi nazwami pojęciowymi. **TOKEN:** Implementacja webowa przechowuje wartości jako CSS custom properties w `src/styles/global.css`, mapuje je do Tailwind przez `@theme inline` i wykorzystuje w komponentach shadcn/CVA. Inne platformy mogą używać własnej składni, ale muszą mapować się do tych samych ról i wartości.

### Core

| Token                   | Wartość   | Status | Użycie                                            |
| ----------------------- | --------- | ------ | ------------------------------------------------- |
| `color.core.steel`      | `#536B75` | TOKEN  | neutralna akcja, focus, aktywny wybór             |
| `color.core.steel.soft` | `#E3E7E9` | TOKEN  | delikatne zaznaczenie i powierzchnia wspierająca  |
| `color.core.steel.deep` | `#2F3E45` | TOKEN  | mocniejszy tekst lub akcent na jasnej powierzchni |

### Support całego systemu

| Token                     | Wartość   | Status | Użycie                                   |
| ------------------------- | --------- | ------ | ---------------------------------------- |
| `color.support.danger`    | `#B6484E` | TOKEN  | zagrożenie i błąd w Preparation Mode     |
| `color.support.attention` | `#C89A43` | TOKEN  | uwaga i stan wymagający działania        |
| `color.support.safe`      | `#347157` | TOKEN  | bezpieczeństwo, gotowość i poprawny stan |

### Preparation Mode

| Token                                    | Wartość   | Status                                                    |
| ---------------------------------------- | --------- | --------------------------------------------------------- |
| `color.preparation.background`           | `#F1F2F3` | TOKEN                                                     |
| `color.preparation.surface`              | `#FAFAFA` | TOKEN                                                     |
| `color.preparation.surface-secondary`    | `#E7E9EA` | TOKEN                                                     |
| `color.preparation.text-primary`         | `#202427` | TOKEN                                                     |
| `color.preparation.text-secondary`       | `#646B70` | TOKEN                                                     |
| `color.preparation.border`               | `#D3D6D8` | TOKEN                                                     |
| `color.preparation.action`               | `#536B75` | TOKEN; alias do core                                      |
| `color.preparation.focus`                | `#536B75` | TOKEN; alias do core                                      |
| `color.preparation.border-control`       | `#7A8287` | TOKEN; korekta dostępności dla istotnych granic kontrolek |
| `color.preparation.attention-foreground` | `#775516` | TOKEN; tekst uwagi na jasnym tle                          |

`color.preparation.border` jest subtelnym separatorem. Nie może być jedynym sygnałem granicy pola lub kontrolki, ponieważ ma za niski kontrast względem jasnych powierzchni.

### Execution Mode

| Token                            | Wartość   | Status                                  |
| -------------------------------- | --------- | --------------------------------------- |
| `color.execution.background`     | `#0B1117` | TOKEN                                   |
| `color.execution.surface-1`      | `#121B24` | TOKEN                                   |
| `color.execution.surface-2`      | `#1B2732` | TOKEN                                   |
| `color.execution.text-primary`   | `#F3F7FA` | TOKEN                                   |
| `color.execution.text-secondary` | `#A8B5C0` | TOKEN                                   |
| `color.execution.guidance`       | `#F2C15C` | TOKEN                                   |
| `color.execution.danger`         | `#FF747A` | TOKEN                                   |
| `color.execution.safe`           | `#6BC49B` | TOKEN                                   |
| `color.execution.on-signal`      | `#0B1117` | TOKEN; tekst na guidance, danger i safe |

## 7. Semantyka kolorów

| Kolor                     | Znaczenie                            | Do                                               | Don't                                              |
| ------------------------- | ------------------------------------ | ------------------------------------------------ | -------------------------------------------------- |
| stalowy / niebiesko-szary | neutralna akcja, wybór, focus        | CTA i aktywne elementy Preparation Mode          | dominujące tła i dekoracyjne kafle                 |
| czerwony                  | zagrożenie, błąd, pilna reakcja      | realne stany krytyczne i awaryjne działania      | podstawowe CTA, branding i zwykłe anulowanie       |
| bursztynowy               | uwaga, prowadzenie, następny krok    | guidance w Execution Mode, stan wymagający uwagi | tekst na jasnym tle bez ciemniejszego wariantu     |
| zielony                   | bezpieczeństwo, gotowość, poprawność | potwierdzenie zakończenia lub bezpiecznego stanu | dekoracyjne „pozytywne” powierzchnie bez znaczenia |

**FOUNDATION:** Nie rozszerzaj palety o nowe barwy tylko po to, by rozróżnić kategorie. Najpierw użyj tekstu, ikony, kształtu, położenia lub poziomu powierzchni.

## 8. Typografia

Priorytety: czytelność, hierarchia, szybkość skanowania.

- **FOUNDATION:** Oba tryby korzystają z tej samej rodziny i tej samej logiki skali.
- **GUIDELINE:** Używaj neutralnego kroju bezszeryfowego o dobrych polskich znakach; unikaj krojów technicznych, wojskowych, skondensowanych i dekoracyjnych.
- **TOKEN:** Rodziną produktu jest lokalnie bundlowany variable font [**Commissioner**](https://github.com/kosbarts/Commissioner) z zakresem `latin-ext`.
- **TOKEN:** Używaj wag 400 dla tekstu, 500 dla etykiet i kontrolek oraz 600 dla nagłówków i instrukcji.
- **TOKEN:** Większe nagłówki mogą używać osi `FLAR: 18`. Tekst podstawowy, etykiety i informacje operacyjne używają `FLAR: 0`.
- **GUIDELINE:** Liczby operacyjne, takie jak czas i odległość, powinny używać cyfr tabularnych, jeśli krój je obsługuje.
- **GUIDELINE:** W Execution Mode żadna istotna informacja nie powinna używać bardzo drobnego tekstu. Instrukcja i dane operacyjne muszą być wyraźnie większe od tekstu pomocniczego.

### Skala typograficzna

| Token          | Rozmiar / line-height | Domyślne użycie                        |
| -------------- | --------------------- | -------------------------------------- |
| `text.xs`      | `12 / 16px`           | metadane i krótkie etykiety pomocnicze |
| `text.sm`      | `14 / 20px`           | etykiety, statusy i tekst pomocniczy   |
| `text.base`    | `16 / 24px`           | tekst podstawowy                       |
| `text.lg`      | `18 / 28px`           | lead i ważniejsze instrukcje           |
| `text.xl`      | `20 / 28px`           | mocniejszy lead                        |
| `text.2xl`     | `24 / 32px`           | tytuł sekcji                           |
| `text.3xl`     | `30 / 36px`           | tytuł widoku                           |
| `text.4xl`     | `36 / 40px`           | duży nagłówek                          |
| `text.display` | `48 / 52px`           | hero i informacja operacyjna           |

## 9. Layout i spacing

- **FOUNDATION:** Preparation i Execution korzystają z tej samej geometrii, siatki i zasad wyrównania.
- **GUIDELINE:** Projektuj mobile-first i respektuj safe areas urządzenia.
- **GUIDELINE:** Preparation Mode może używać większych przerw między sekcjami i pozwalać na eksplorację.
- **GUIDELINE:** Execution Mode koncentruje treść wokół jednego kroku; mniej elementów nie oznacza ciaśniejszego interfejsu.
- **GUIDELINE:** Używaj jednego współdzielonego systemu spacingu. Nie dodawaj lokalnych, przypadkowych odstępów.
- **TOKEN:** Skala spacingu to `4, 8, 12, 16, 24, 32, 48, 64px`.
- **TOKEN:** Breakpointy webowe korzystają z wartości Tailwind: `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`.
- **TOKEN:** Maksymalna szerokość głównej treści to `1024px`, a ciągłego tekstu `672px`.

## 10. Karty i powierzchnie

### Zaokrąglenia

Oba tryby korzystają z jednego, umiarkowanego systemu radiusów:

| Token         | Wartość | Użycie                                                      |
| ------------- | ------: | ----------------------------------------------------------- |
| `radius.sm`   |   `6px` | małe kontrolki, tagi i zwarte elementy                      |
| `radius.md`   |  `10px` | przyciski, pola i standardowe karty                         |
| `radius.lg`   |  `14px` | duże powierzchnie, dialogi i panele nadrzędne               |
| `radius.full` | `999px` | wyłącznie koła, status dots, przełączniki i prawdziwe pills |

**FOUNDATION:** Nie używaj `radius.full` dla zwykłych kart i przycisków. Nie dodawaj radiusów spoza skali bez udokumentowanej potrzeby. Execution Mode może być bardziej surowy przez kolor i gęstość informacji, ale nie zmienia geometrii na ostre militarne panele.

### Preparation Mode

- jasne powierzchnie na neutralnym tle,
- subtelne granice i minimalny cień,
- grupowanie tylko wtedy, gdy karta ma własny sens lub działanie,
- brak „card everywhere”.

**TOKEN — elevation:**

- `shadow.sm`: `0 1px 2px rgb(32 36 39 / 6%)`,
- `shadow.md`: `0 6px 18px rgb(32 36 39 / 8%)`.

Nie dodawaj kolejnych poziomów bez rzeczywistej potrzeby hierarchicznej.

### Execution Mode

- ciemne powierzchnie różnicowane przede wszystkim jasnością,
- obramowania tylko wtedy, gdy poprawiają rozpoznanie elementu,
- bez dekoracyjnych cieni, połysków i gradientów,
- komponent jest funkcjonalny, nie ozdobny.

**TOKEN:** Cienie w Execution Mode są wyłączone.

## 11. Przyciski i akcje

### Preparation Mode

- Primary: stalowe wypełnienie `color.preparation.action` i biały tekst.
- Secondary: neutralna powierzchnia, czytelna etykieta i granica odpowiednia do znaczenia kontrolki.
- Destructive: czerwony wyłącznie dla działania o realnie destrukcyjnym skutku.
- Jedna dominująca akcja na sekcję lub etap.

### Execution Mode

- Primary/guidance: bursztynowe wypełnienie i ciemny tekst `color.execution.on-signal`.
- Danger: czerwony tylko dla pilnego ostrzeżenia lub awaryjnej czynności.
- Użytkownik nie powinien porównywać kilku równorzędnych CTA.
- Etykieta opisuje czynność, nie ogólny stan, np. „Idź do punktu zapasowego”, nie „OK”.

### Stany interakcji

| Kontekst                     | Default   | Hover     | Pressed   | Foreground |
| ---------------------------- | --------- | --------- | --------- | ---------- |
| Preparation primary          | `#536B75` | `#465B64` | `#394B53` | `#FFFFFF`  |
| Preparation destructive      | `#B6484E` | `#9D3E44` | `#84343A` | `#FFFFFF`  |
| Execution primary / guidance | `#F2C15C` | `#F5CB72` | `#D9A744` | `#0B1117`  |
| Execution destructive        | `#FF747A` | `#FF8E92` | `#E85D64` | `#0B1117`  |

- **TOKEN:** Focus używa pierścienia `3px`, odstępu `2px` od komponentu i koloru focus/guidance właściwego dla trybu.
- **TOKEN:** Minimalny rozmiar przycisku i akcji ikonowej to `44 × 44px`.
- **TOKEN:** Disabled używa neutralnej powierzchni oraz tekstu drugorzędnego; nie reaguje na hover i nie ma cienia.
- **TOKEN:** Loading zachowuje rozmiar i etykietę komponentu, ustawia `aria-busy="true"`, blokuje ponowne uruchomienie akcji i pokazuje jednoznaczny wskaźnik postępu.

## 12. Ikony i ilustracje

- **FOUNDATION:** Ikony są proste, jednoznaczne i należą do jednej spójnej rodziny.
- Ikona stanu zawsze ma etykietę lub jednoznaczny kontekst.
- Execution Mode używa ikon tylko do działania, kierunku, statusu lub ostrzeżenia.
- Preparation Mode może używać spokojnych ilustracji wspierających zrozumienie i rodzinny charakter.
- Nie używaj ozdobnych ilustracji, maskotek ani metafor w sytuacji awaryjnej.
- **TOKEN:** Biblioteką ikon jest **Lucide**, domyślnie z obrysem `2px` i bez dekoracyjnego wypełnienia.
- **GUIDELINE:** Ilustracje są dopuszczone wyłącznie w Preparation Mode, dla konkretnej potrzeby — pierwszą jest poradnik onboardingu (5 kart: domownicy, plecak, miejsca, udostępnienie, prowadzenie). W Execution Mode ilustracji nie ma. Poza aplikacją ilustracje w tym stylu mogą wystąpić w materiałach prezentujących produkt (§20).
- **GUIDELINE — styl ilustracji „kontur”:**
  - jedna równa kreska `#2F3E45` o grubości jak obrys ikony Lucide; wszystko inne białe w zamkniętym konturze — skóra, włosy, ubrania, meble, drzewa;
  - jedyny kolor wypełnienia to stal `#536B75` na **jednym** kluczowym obiekcie sceny (drzwi, plecak, ławka, telefon); żadnych innych kolorów, szarości, cieni ani gradientów;
  - smukłe postacie z małą głową; przyjazna twarz: dwie kropki oczu, mała kreska nosa, delikatny uśmiech — bez kreskówkowych proporcji;
  - mało detali, dużo pustej przestrzeni; bez tekstu, interfejsu, mundurów, flag i motywów militarnych; przezroczyste tło.
- **Pochodzenie:** ilustracje są generowane przez AI (dla zgłoszenia oznaczyć zgodnie z §20); źródła, warianty i proces: [`context/foundation/ilustracje/README.md`](context/foundation/ilustracje/README.md). Nową ilustrację generuje się z gotowymi kartami jako referencją stylu, żeby postacie i kreska pozostały spójne.
- **TOKEN — ikona aplikacji:** dach nad dwoma znakami „W” (nazwa „W razie W”: dom chroni domowników), biała kreska na stali `#536B75`. Źródła SVG w `public/icons/` (`icon.svg`, `icon-maskable.svg` ze znakiem w strefie bezpiecznej 80%, `icon-favicon.svg` z jednym „W” dla 16–32 px); pliki PNG generuje `npm run icon:export`.

## 13. Stany i feedback

- Sukces, uwaga, błąd i zagrożenie muszą mieć tekst oraz ikonę lub inną wskazówkę poza kolorem.
- Komunikat opisuje stan i kolejny krok; nie kończy się na „Coś poszło nie tak”.
- Stan offline, zapis lokalny i dostępność planu powinny być jawne, gdy wpływają na działanie.
- Focus musi być widoczny na klawiaturze i nie może polegać wyłącznie na zmianie koloru tła.
- **TOKEN:** `selected` w Preparation łączy `steel.soft`, tekst `steel.deep` i stalowy wskaźnik; w Execution używa `surface-2`, tekstu primary i wskaźnika guidance.
- **TOKEN:** `success` używa roli safe, `warning` roli attention/guidance, a `error` i zagrożenie roli danger. Każdy stan ma tekst i ikonę.
- **TOKEN:** `disabled` i `loading` zachowują czytelną etykietę oraz nie polegają na samej zmianie opacity.

## 14. Motion

### Preparation Mode

- subtelne przejścia i spokojny feedback,
- ruch pomaga zrozumieć zmianę stanu lub relację przestrzenną,
- brak dekoracyjnych, zapętlonych animacji.

### Execution Mode

- minimalna animacja,
- żadnych efektów odciągających uwagę,
- ruch tylko wtedy, gdy przekazuje zmianę stanu, kierunek działania lub potwierdzenie,
- respektuj `prefers-reduced-motion` i odpowiedniki platformowe.

**TOKEN:** Feedback komponentu trwa `160ms`, a przejście widoku `220ms`. Oba używają `cubic-bezier(0.2, 0, 0, 1)`. Nie stosuj `transition-all`; animuj tylko właściwości potrzebne do przekazania zmiany.

## 15. Accessibility

**FOUNDATION:** Minimum to WCAG 2.2 AA. Interfejs musi pozostać czytelny w stresie, ruchu, słabym świetle i przy gorszej jakości ekranu.

### Zweryfikowane pary

| Para                                         | Kontrast | Wniosek                     |
| -------------------------------------------- | -------: | --------------------------- |
| Preparation text-primary / background        |  13,95:1 | AA/AAA                      |
| Preparation text-secondary / background      |   4,83:1 | AA dla zwykłego tekstu      |
| biały / Preparation action                   |   5,63:1 | AA                          |
| Preparation action / background              |   5,03:1 | AA dla tekstu i komponentów |
| biały / support danger                       |   5,22:1 | AA                          |
| support danger / Preparation background      |   4,65:1 | AA dla zwykłego tekstu      |
| Preparation text-primary / support attention |   6,08:1 | AA                          |
| support safe / Preparation background        |   5,14:1 | AA                          |
| Execution text-primary / background          |  17,61:1 | AA/AAA                      |
| Execution text-secondary / background        |   9,07:1 | AA/AAA                      |
| Execution on-signal / guidance               |  11,35:1 | AA/AAA                      |
| Execution danger / background                |   7,26:1 | AA/AAA                      |
| Execution safe / background                  |   9,03:1 | AA/AAA                      |

### Ograniczenia i korekty

- `color.support.attention` ma tylko 2,30:1 na jasnym tle. Używaj go jako wypełnienia z ciemnym tekstem. Jeśli bursztynowy ma być małym tekstem na jasnym tle, użyj `color.preparation.attention-foreground` (`#775516`, 6,05:1).
- `color.preparation.border` ma 1,40:1 względem `surface`. Nadaje się do subtelnego podziału, ale nie jako jedyny obrys istotnej kontrolki. Dla takiej granicy użyj `color.preparation.border-control` (`#7A8287`, 3,75:1).
- Biały tekst na `color.execution.danger` ma 2,61:1, a na `color.execution.safe` 2,10:1. Na tych jasnych wypełnieniach używaj `color.execution.on-signal`.
- `color.preparation.text-secondary` na `color.preparation.surface-secondary` ma 4,44:1, czyli poniżej AA dla zwykłego tekstu. Na `surface-secondary` używaj `text-primary` albo `color.core.steel.deep`, a `text-secondary` zostaw dla `background` i `surface`.
- Sprawdzone dodatkowo (≥ AA): Execution `text-secondary`, `guidance`, `danger`, `safe` na `surface-1` i `surface-2` (5,81–14,10:1); Preparation `danger`, `safe`, `attention-foreground`, `action` na `surface` (5,00–6,50:1).
- Stany hover i pressed przycisków zachowują kontrast tekstu od 5,58:1 do 12,35:1 w obu trybach.

### Wymagania interakcji

- minimalny target dotykowy: 44 × 44 px,
- widoczny focus z wyraźnym odcięciem od tła,
- obsługa powiększenia tekstu bez utraty treści i akcji,
- brak informacji przekazywanej wyłącznie kolorem,
- krytyczne treści w Execution Mode nie mogą wymagać hovera ani bardzo drobnego tekstu,
- kierunek, odległość, czas i następny krok powinny być możliwe do odczytania jednym spojrzeniem.

## 16. Zasady dla wizualizacji, mockupów i prezentacji

**FOUNDATION:** Ten dokument obowiązuje nie tylko implementację aplikacji.

Przed tworzeniem mockupu, prototypu, wizualizacji ekranu, diagramu pokazującego UI, prezentacji produktu, materiału hackathonowego, grafiki przedstawiającej aplikację, przykładu komponentu lub konceptu funkcji agent albo projektant ma przeczytać `JEZYK_WIZUALNY.md` i zastosować go jako domyślny kierunek.

Dotyczy to również poleceń typu:

- „zwizualizuj ekran”,
- „zaprojektuj funkcję”,
- „pokaż, jak mogłaby wyglądać aplikacja”,
- „stwórz prezentację produktu”.

Wyjątek: zadanie jawnie prosi o eksplorację zupełnie nowego kierunku. Taki materiał oznacz jako eksplorację nienormatywną; nie zmieniaj tego dokumentu ani domyślnego kierunku bez osobnej decyzji.

## 17. Do / Don't

### Do

- buduj Preparation Mode z neutralnych szarości,
- używaj core oszczędnie i konsekwentnie,
- pokazuj jeden dominujący następny krok,
- wykorzystuj bursztynowy do prowadzenia w Execution Mode,
- łącz kolor z tekstem, ikoną lub hierarchią,
- zachowuj wspólną geometrię i typografię obu trybów,
- sprawdzaj kontrast na rzeczywistym tle komponentu.

### Don't

- nie kopiuj NomadCore ani innych aplikacji survivalowych,
- nie zmieniaj Execution Mode w taktyczny dashboard,
- nie używaj czerwieni jako podstawowego CTA,
- nie dominuj Preparation Mode niebieskim,
- nie koloruj każdej karty innym kolorem,
- nie stosuj ekstremalnego bubble UI ani ostrych militarnych paneli,
- nie twórz dwóch niezależnych design systemów,
- nie dodawaj tokenów i barw bez realnej roli semantycznej.

## 18. Przykładowe zastosowania

### Ekran gotowości

- neutralne tło Preparation Mode,
- jasna powierzchnia grupująca plan rodziny,
- stalowy pasek postępu lub CTA,
- zielony status „gotowe” wraz z ikoną i tekstem,
- bursztynowa uwaga „uzupełnij trasę zapasową” z czytelną etykietą.

### Prowadzenie do punktu

- tło Execution Mode,
- duża strzałka i odległość w kolorze guidance,
- nazwa celu białym tekstem,
- jedna główna instrukcja,
- awaryjna akcja „punkt niedostępny” w czerwieni, wyraźnie drugorzędna wobec prowadzenia.

### Onboarding planu rodzinnego

- jedna decyzja na krok,
- proste ilustracje dopuszczalne tylko jako wsparcie zrozumienia,
- stalowy przycisk kontynuacji,
- brak czerwieni, jeśli nie ma faktycznego błędu lub zagrożenia.

## 19. Reguły rozszerzania systemu

1. Najpierw nazwij potrzebę semantyczną, dopiero potem dodaj token.
2. Sprawdź, czy istniejący core, support lub poziom powierzchni nie rozwiązuje problemu.
3. Dla nowego koloru udokumentuj rolę, kontekst, parę foreground/background i kontrast.
4. Nie zmieniaj `FOUNDATION` w ramach zwykłego zadania implementacyjnego.
5. Zmianę wartości `TOKEN` poprzedź wizualną oceną i testem kontrastu; zaktualizuj ten dokument w tym samym zadaniu.
6. Element `OPEN` można rozstrzygnąć dopiero na podstawie realnej potrzeby produktu. Po decyzji zmień jego status na `TOKEN`, `GUIDELINE` lub `FOUNDATION`.
7. Nie duplikuj specyfikacji w innych plikach. Pozostałe dokumenty mają linkować do `JEZYK_WIZUALNY.md`.

### Rozstrzygnięcia implementacyjne v0

- font: Commissioner, lokalnie bundlowany `latin-ext`, wagi 400/500/600 i kontrolowane użycie osi `FLAR`,
- spacing: skala 4–64px oraz breakpointy Tailwind,
- elevation: dwa subtelne poziomy w Preparation, brak cieni w Execution,
- interakcje: jawne tokeny hover, pressed, focus, disabled i loading,
- ikony: Lucide, obrys 2px; ilustracje w stylu „kontur” tylko w Preparation Mode (§12); ikona aplikacji: dach nad „WW” (§12),
- dystrybucja web: CSS custom properties → Tailwind `@theme inline` → komponenty shadcn/CVA.

## 20. Hackathon HackYeah „Defence"

Źródło wymagań: `wymagania/defence-hackyeah-wymagania-regulamin.md`. Regulamin nie narzuca stylu wizualnego. Design (UI, wygląd) to 20% oceny, a wąski, dobrze pokazany scenariusz jest lepszy niż wiele niedokończonych funkcji.

### Slajdy i materiały zgłoszenia

- **GUIDELINE:** Prezentacja PDF ma maksymalnie 10 slajdów. Slajdy używają tych samych tokenów, typografii i radiusów co aplikacja; nie powstaje osobny styl prezentacji.
- **GUIDELINE:** Pokaż oba tryby obok siebie na jednym slajdzie, żeby kontrast Preparation → Execution był widoczny od razu. To najmocniejszy wizualnie element produktu.
- **GUIDELINE:** Zrzuty ekranu i demo pokazują stan offline lub brak danych (§13), bo regulamin oczekuje działania przy ograniczonych zasobach i niedostępnych usługach.
- **GUIDELINE:** Mockupy w prezentacji muszą odpowiadać temu, co działa w demie. Nie pokazuj ekranów, których nie ma w prototypie, bez oznaczenia „koncepcja".
- **GUIDELINE:** Ilustracje na slajdach wyłącznie w stylu „kontur” z §12: funkcje produktu pokazują karty poradnika, nowa scena powstaje tylko tam, gdzie slajd pokazuje problem (np. nadmiar informacji zamiast planu). Małe znaki funkcji to ikony Lucide, nie osobne ilustracje.
- **GUIDELINE:** Wyróżnienie liczby lub hasła na slajdzie robi stal albo pogrubienie tekstu. Bursztyn i czerwień zachowują znaczenie z §7 (uwaga, prowadzenie, zagrożenie) także w prezentacji.

### Pochodzenie materiałów

Regulamin wymaga oddzielenia pracy sprzed startu od pracy w trakcie hackathonu oraz ujawnienia użycia AI i źródeł.

- Ten dokument (v0) i analiza analogów w `context/foundation/analogi/` powstały **przed** startem hackathonu. Deklaruj je jako materiał istniejący.
- Zrzuty ekranu analogów w `context/foundation/analogi/screeny/` służą do analizy. Jeśli trafią do prezentacji, podaj źródło.
- Obrazy, ikony i ilustracje wygenerowane AI oznacz w opisie zgłoszenia.
- Regulamin każe też zweryfikować godzinę startu (3.10, 23:00 wygląda na błąd) i platformę zgłoszeń (Challenge Rocket vs HackTribe).

### Ustalenia obowiązujące w demie

Demo korzysta z rozstrzygnięć implementacyjnych v0 z §19: Commissioner, Lucide, wspólnej skali spacingu, jawnych stanów interakcji i tokenów trybów. Ilustracje tylko w stylu „kontur” z §12; nie wprowadzaj innego stylu ilustracji ani nowego języka prezentacji bez osobnej decyzji.

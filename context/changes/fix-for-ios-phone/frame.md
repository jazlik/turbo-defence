# Frame Brief: Przytrzymanie przycisku nie działa na iPhonie

> Etap ramowania przed /10x-plan. Ten dokument przedstawia, co *faktycznie*
> jest problemem, oddzielone od tego, co początkowo zakładano.

## Zgłoszona obserwacja

Na iPhonie: „Przycisk do alarmu wciska sie ale nie odlicza 2 sekund. Na innym telefonie dziala."
Uzupełnione w Kroku 4: „Po wcisnieciu, po jakiejs 1 sekundzie jest wcisniety, nic sie nie odlicza",
trzymanie 3–4 s **nigdy** nie przechodzi na ekran alarmu, drugi telefon to **Android**,
funkcje dostępności dotyku na iPhonie są **wyłączone**.

## Początkowe ramy (zachowane)

- **Podana przyczyna lub podejście użytkownika**: brak. Wejściem był wyłącznie change-id
  `fix-for-ios-phone` — nazwa platformy docelowej, nie objaw i nie teoria.
- **Proponowany kierunek działania użytkownika**: „napraw to dla iPhone'a".
- **Zawężenie przed wysyłką**: użytkownik odrzucił wszystkie cztery podane klasy objawów
  (ucięty layout / niedziałająca funkcja / instalacja i offline / „nie rozdzieliłem") i wpisał
  własną obserwację: „Przycisk do alarmu wciska sie ale nie odlicza 2 sekund. Na innym telefonie
  dziala." Zakres: **jeden konkretny objaw**. Kontekst: „Tylko na iPhone".

## Mapa wymiarów

Obserwacja może pochodzić z któregokolwiek z tych wymiarów:

1. **Dostarczanie zdarzeń wskaźnika do Reacta** — `onPointerDown` nigdy nie dociera, więc
   `start()` się nie wykonuje. Jedyne wejście dotykowe do automatu nie odpala.
2. **Wyścig przechwycenia wskaźnika** — `releasePointerCapture` w `onPointerDown`
   (`useHoldAction.ts:78-80`) wywołuje natychmiastowe `pointerout`/`pointerleave`, a
   `onPointerLeave: cancel` zeruje postęp w tej samej chwili.  ← początkowe ramy (moje, nie użytkownika)
3. **Systemowy gest iOS → `pointercancel`** — WebKit unieważnia wskaźnik w trakcie
   przytrzymania (long-press, zaznaczanie, lupa, gest krawędziowy), `onPointerCancel: cancel`.
4. **Stan dostępności urządzenia** — VoiceOver / AssistiveTouch / Dostosowania dotyku
   zamieniają przytrzymanie w `click`, którego automat nie obsługuje; albo dławienie rAF.
5. **Rozjazd wersji** — service worker podaje na iPhonie starszy bundel niż na drugim telefonie.

## Badanie hipotez

| Hipoteza | Dowody | Werdykt |
| --- | --- | --- |
| **1. `pointerdown` nie dociera: root Reacta to `<astro-island>` z `display: contents`** | **Potwierdzone na urządzeniu** — zob. „Kontrola na urządzeniu" poniżej: zdjęcie `display: contents` z wyspy natychmiast przywraca odliczanie i wejście w alarm. Łańcuch zweryfikowany lokalnie: `client:only` → `createRoot(element)`, gdzie `element` to sam custom element (`node_modules/@astrojs/react/dist/client.js`, gałąź `client === "only"`; runtime wyspy woła `this.hydrator(this)(...)`) · `astro-island,astro-slot,astro-static-slot{display:contents}` obecne w `dist/index.html` · react-dom 19.3.0 deleguje `pointerdown` do kontenera roota (`nonDelegatedEvents` to tylko `beforetoggle cancel close invalid load scroll scrollend toggle` + media; `listenToAllSupportedEvents(container)`) · [React #29890](https://github.com/facebook/react/issues/29890) **otwarte**, „onPointerDown not called when rendered in 'display: contents' root", iOS Safari dotknięte, macOS/Windows działa, zgłoszone **z raportu Astro**; komentarze dosłownie: „it doesn't work unless the `<button>` has a pointer event listener", „Only the container. It works just fine for intermediate elements.", „ran into this in react 19" | **POTWIERDZONE** |
| 2. Wyścig `releasePointerCapture` | Dowody idą w przeciwną stronę: [WebKit 199803](https://bugs.webkit.org/show_bug.cgi?id=199803) to defekt **brakujących** zdarzeń brzegowych po zwolnieniu (RESOLVED FIXED, r250182, iOS 13.2), a „Process Pending Pointer Capture" w specyfikacji nakazuje *nie* wysyłać zdarzeń brzegowych przy zwolnieniu i wprost błogosławi ten wzorzec. Linia nietknięta od `766f23e`. Dodatkowo przechwycenie niejawne siada na celu `pointerdown`, czyli zwykle na dziecku `<svg>`, nie na `<button>` będącym `currentTarget` — więc blok to najczęściej no-op | SŁABE |
| 3. Systemowy gest iOS → `pointercancel` | Mechanizm realny i udokumentowany ([pointerevents#503](https://github.com/w3c/pointerevents/issues/503): long-tap kończy się `pointercancel` także przy `-webkit-touch-callout: none`), ale zestaw zabezpieczeń CSS jest **kompletny** i poprawnie wyemitowany w `dist/_astro/Layout.JdrFqH1A.css` (`touch-action:none`, `-webkit-user-select:none`, `-webkit-touch-callout:none`, `-webkit-tap-highlight-color:transparent`). Co ważniejsze: `cancel()` po starcie dałby **mignięcie** „Trzymaj jeszcze 2 s" i częściowo wypełniony pierścień — użytkownik raportuje, że odliczanie nie pojawia się **nigdy** | SŁABE |
| 4. Stan dostępności urządzenia / dławienie rAF | Użytkownik potwierdził, że wszystko wyłączone. Niezależnie: `timer.current` (`useHoldAction.ts:62-67`) to zwykły `setTimeout`, **niezależny od rAF** — gdyby rAF stanął, pierścień by zamarł, ale po 2000 ms alarm i tak by się odpalił. Nie odpala się | BRAK |
| 5. Rozjazd wersji / stary bundel | Rozstrzygnięte historią gita: `AlarmButton.tsx` ma dwie funkcjonalne postacie — `766f23e` (logika inline) i `481ee72` (wydzielenie 1:1 do `useHoldAction`), obie przodkowie `origin/main`, obie z działającym odliczaniem; wcześniej **nie ma przycisku wcale**. Nie istnieje build dający wciskalny przycisk bez odliczania. Dodatkowo od iOS 14 Safari i aplikacja z ekranu początkowego **dzielą** rejestrację SW i CacheStorage, więc nie mogą być na różnych buildach | BRAK |

## Sygnały zawężające

- **„Nigdy nie przechodzi" po 3–4 s trzymania.** `cancel()` czyści rAF **i** `setTimeout` razem
  (`useHoldAction.ts:46-50`), więc brak nawigacji oznacza albo wykonane `cancel()`, albo
  niewykonane `start()`. To jednym pytaniem zabiło całą rodzinę „renderowanie/rAF".
- **Odliczanie nie pojawia się ani na jedną klatkę.** To rozróżnia wymiar 1 od wymiarów 2 i 3:
  anulowanie *po* starcie dałoby krótkie mignięcie etykiety. Brak mignięcia wskazuje, że
  `start()` nigdy nie wystartował.
- **`:active` z opóźnieniem ~1 s.** Ciemniejsze tło to czysty CSS (`AlarmButton.tsx:25`), ścieżka
  niezależna od Reacta. Opóźnienie mówi, że WebKit nie traktuje tego obszaru jako obsługiwanego
  przez nasłuch dotyku i aktywuje przycisk dopiero przez natywny rozpoznawacz gestów.
- **Drugi telefon to Android.** Różnica jest platformowa, nie urządzeniowa — co wyklucza
  wymiary 4 i 5, a wskazuje defekt specyficzny dla WebKita.
- **Dostępność dotyku wyłączona.** Zamyka wymiar 4 od strony konfiguracji urządzenia.
- **`:active` się zakleszcza.** Po dotknięciu w stanie zepsutym przycisk zostaje ciemny i nie
  wraca do stanu normalnego — WebKit nałożył `:active` i nigdy go nie zdjął, czyli nie przetworzył
  dla tego elementu zamkniętej sekwencji dotyku. Zgłoszone niezależnie dwa razy.

## Kontrola na urządzeniu (iPhone, Safari 26.6.2 przez Web Inspector)

Sonda z nasłuchami na `window` (`capture: true, passive: true`) pokazała, że przy zepsutym
geście **`pointerdown` nie dociera nawet do nasłuchu w fazie przechwytywania na `window`** —
a ten jest pierwszy w całej ścieżce propagacji. Zdarzenie nie jest więc wysyłane do dokumentu
wcale; nasłuch Reacta na `<astro-island>` nie ma czego nie dostać. `touchstart` jednocześnie
dociera, czyli dotyk trafia do strony, tylko nie jako zdarzenie wskaźnika. Bicie serca
(`setInterval`) przeżywa cały gest, co wykluczyło zawieszenie procesu renderującego.

Kontrola A/B/C/D — każdy test po przeładowaniu strony, gest: przytrzymanie „Uruchom alarm" ~3 s:

| Test | Zmiana wstrzyknięta przed gestem | Wynik |
| --- | --- | --- |
| **A** | nic (stan wyjściowy) | nie odlicza, nie wchodzi, `:active` po ~1 s i zostaje |
| **B** | `window.addEventListener('pointerdown', function(){}, {passive:true})` | **bez zmian** — nie odlicza |
| **C** | `document.body.appendChild(document.createElement('div'))` | **bez zmian** — nie odlicza |
| **D** | `document.querySelector('astro-island').style.display = 'block'` | **działa** — odlicza od razu, po 2 s wchodzi `/alarm` |

Co ta kontrola wyklucza, a co nie:

- **B eliminuje** „brakuje rozpoznawalnego nasłuchu wskaźnika" jako wyjaśnienie. Uwaga: test B
  dotyczył `window`, **nie** samego `<button>`. Obejście z React #29890 („dać przyciskowi własny
  nasłuch") pozostaje więc **niesprawdzone** — nie wolno go wpisać do planu jako pewne.
- **C eliminuje** „nieaktualna adnotacja regionu, którą naprawia dowolne przeliczenie stylu".
- **D potwierdza** przyczynę wprost: liczy się to, że element będący rootem Reacta nie ma
  renderera.
- **Anomalia, świadomie niewyjaśniona:** wcześniejsza sonda nakładkowa (`position: fixed`,
  `z-index: 2147483647`) też przywróciła działanie, choć ani B, ani C tego nie robią.
  Prawdopodobnie przez utworzenie warstwy kompozycji i przeliczenie regionów zdarzeń, ale tego
  nie sprawdziłem. Dla ram bez znaczenia; dla planu to wskazówka, że obejść może być więcej niż
  jedno.

## Konwencja między systemami

Ta klasa objawu („interaktywność wyspy martwa tylko na iOS") jest w ekosystemie Astro znana
i zgłoszona właśnie z Astro — `astro-island` jest kanoniczną ofiarą, bo jest jednocześnie
kontenerem roota Reacta i elementem `display: contents`. Udokumentowane obejście jest po
stronie aplikacji, nie frameworka: **dać przyciskowi własny natywny nasłuch wskaźnika** (wtedy
element ma renderer, więc jego własna unieważnienie stylu działa), albo nie czynić elementu
`display: contents` rootem Reacta. Hipoteza prowadząca zgadza się z tą konwencją.

Osobno: **PRD i PROJECT.md nie wymieniają ani iOS, ani Safari, ani żadnego docelowego
urządzenia** — jedyna wzmianka o iOS w dokumentacji dotyczy kompasu (`roadmap.md:61`),
a `package.json` nie ma `browserslist`. Komentarz „sprawdzony w terenie" (`useHoldAction.ts:23`)
jest prawdziwy, ale **nie ma w repo ani jednego zapisu, że ktoś kiedykolwiek przytrzymał ten
przycisk na iPhonie**: testy S-01 (3.7, 3.8) nie nazywają platformy, S-03 jest wprost androidowy
(`context/archive/2026-10-03-voice-guidance/change.md:16`), a jedyny stempel iOS w całym repo
dotyczy zgody na kompas (3.14).

## Przeformułowane (lub potwierdzone) sformułowanie problemu

> **Rzeczywisty problem do zaplanowania to**: jedynym dotykowym wejściem do automatu
> przytrzymania jest delegowany przez Reacta `onPointerDown`, a nasłuch tej delegacji siedzi na
> elemencie `<astro-island>` z `display: contents` — do którego iOS Safari nie dostarcza zdarzeń
> wskaźnika pochodzących z dotyku.

Początkowe ramy były czyste (użytkownik nie podał przyczyny), ale **moje** pierwsze ramy —
wyścig `releasePointerCapture` — były błędne i zostały obalone przez własne badanie. Gdyby plan
powstał na nich, zmieniłby poprawną linię kodu i nie naprawił niczego.

Co się zmienia, gdy problem zostanie rozwiązany: `HoldButton` dzieli ten sam hook i jest
kontrolką potwierdzenia na `/alarm` (`GuidanceScreen.tsx:458,483`), w kolejnej wyspie
`client:only`. Czyli dziś **każda akcja chroniona przytrzymaniem — uruchomienie alarmu,
przełączenie na miejsce zapasowe, potwierdzenie dojścia — jest na iPhonie nieosiągalna dotykiem.**
To nie jest usterka kosmetyczna jednego przycisku, to połowa rynku telefonów bez dostępu do
trybu alarmowego w aplikacji ratunkowej.

## Pewność

**WYSOKA** — przyczyna odtworzona i wyłączona na urządzeniu użytkownika (test D), dwie
konkurencyjne „naprawy" aktywnie wykluczone (testy B i C), zgodność z konwencją
(udokumentowany, otwarty defekt zgłoszony właśnie z Astro), decydujący sygnał zawężający
(brak `pointerdown` nawet na `window` w fazie przechwytywania).

Co **nie** jest potwierdzone i należy to wiedzieć przed planowaniem:

- **Obejście „własny nasłuch na `<button>`" jest niesprawdzone.** Test B dotyczył `window`
  i nie pomógł. To, że React #29890 opisuje nasłuch na samym przycisku jako skuteczny, nie
  zostało zweryfikowane na tym urządzeniu. Plan musi to sprawdzić, zanim się na tym oprze.
- **Mechanizm opóźnienia `:active` o ~1 s pozostaje wnioskowaniem.** Pierwsze wyjaśnienie
  („brak renderera ⇒ niewidoczny nasłuch") obalono przy czytaniu źródeł WebKita, bo
  `eventListenerRegionTypes` dziedziczy po drzewie stylu. Druga wersja (późne dodanie nasłuchu
  przez `createRoot` nie unieważnia adnotacji regionu na warstwach potomnych) jest lepiej
  zakotwiczona, ale niepotwierdzona. Dla ram to bez znaczenia — opóźnione i zakleszczone
  `:active` to objaw towarzyszący, nie przyczyna.
- **Dedykowany agent testujący pod presją nie wykonał się** (limit sesji API). Jego rolę
  przejęła kontrola A/B/C/D na urządzeniu, która jest mocniejszym dowodem niż kolejne czytanie
  źródeł.

## Co zmienia się dla /10x-plan

Plan nie powinien dotykać `releasePointerCapture`, zabezpieczeń CSS, pierścienia postępu ani
czasu 2000 ms — wszystkie są poprawne i żadne nie jest przyczyną. Przedmiotem planu jest
**to, że root Reacta dla wyspy nie ma renderera (`display: contents`), więc iOS Safari nie
dostarcza do niego zdarzeń wskaźnika pochodzących z dotyku.**

Zakres, który plan musi objąć:

- **Oba** konsumenty `useHoldAction` — `AlarmButton` i `HoldButton` (`GuidanceScreen.tsx:458,483`),
  bo dziś na iOS martwe są wszystkie trzy akcje chronione przytrzymaniem.
- **Wszystkie wyspy**, nie tylko te z przytrzymaniem. Każda interakcja oparta na zdarzeniach
  wskaźnika w dowolnej wyspie `client:only`/`client:load` jest na iOS podatna. Interakcje na
  `onClick` działają (iOS syntezuje kliknięcie), co maskowało problem.
- **Regresja musi być wykrywalna.** Dziś nic w CI ani w `npm test` nie dotyka tej warstwy
  (`npm test` to wyłącznie funkcje czyste w `src/lib/`), a jedyny zapis „sprawdzony w terenie"
  pochodzi z testów androidowych.

Do rozstrzygnięcia w planie, nie tutaj: czy naprawiać punktowo w hooku (własny natywny nasłuch
na elemencie), czy globalnie na poziomie wyspy (nadpisanie `display` dla `astro-island`), oraz
jak domknąć brak zapisanego targetu platformowego — iOS nigdzie nie jest wymieniony jako
wspierany, a każdy nazwany po platformie test w terenie był androidowy.

**Znalezisko poboczne, świadomie poza zakresem:** `context/archive/2026-10-03-guided-to-point-offline/reviews/impl-review.md:118-131`
zawiera przyjętą lukę F9 — brak ścieżki `onClick` dla aktywacji z czytnika ekranu — załataną
podpowiedzią `sr-only` w `AlarmButton.tsx:59`. Ta podpowiedź radzi gest, który na iOS Safari
otwiera menu kontekstowe, a nie trzyma przycisku. Osobna decyzja produktowa, nie ten objaw.
Podobnie martwy jest `onContextMenu: preventDefault` (`useHoldAction.ts:94-96`) — Safari iOS
nigdy nie wysyła `contextmenu`.

## Referencje

- Kod: `src/components/hooks/useHoldAction.ts:46-50,58-68,76-82,94-96` ·
  `src/components/AlarmButton.tsx:12,15,25,48,54,58-59` ·
  `src/components/HoldButton.tsx:44` · `src/components/HomeScreen.astro:45` ·
  `src/components/GuidanceScreen.tsx:458,483` · `src/components/ui/button.tsx:8`
- Weryfikacja łańcucha: `node_modules/@astrojs/react/dist/client.js` ·
  `node_modules/react-dom/cjs/react-dom-client.production.js` (`nonDelegatedEvents`,
  `listenToAllSupportedEvents`) · `dist/index.html` (0 wystąpień `<button>`, 4 × `astro-island`)
- Zewnętrzne: [React #29890](https://github.com/facebook/react/issues/29890) ·
  [WebKit 199803](https://bugs.webkit.org/show_bug.cgi?id=199803) ·
  [w3c/pointerevents#503](https://github.com/w3c/pointerevents/issues/503) ·
  [WebKit: More Responsive Tapping on iOS](https://webkit.org/blog/5610/more-responsive-tapping-on-ios/)
- Powiązane badania: brak `research.md` dla tej zmiany
- Zadania badawcze: 5 agentów — wymiary 1–5 równolegle (Krok 3), niezależne wyszukiwanie
  kontrolne bez nazwania hipotez (Krok 5); dedykowany test pod presją przerwany limitem sesji

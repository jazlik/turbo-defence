# Przytrzymanie przycisku nie działa na iPhonie — plan implementacji

## Overview

Root Reacta dla każdej wyspy to element `<astro-island>` z `display: contents`, a iOS Safari nie
dostarcza do takiego elementu zdarzeń wskaźnika pochodzących z dotyku. Ponieważ jedynym dotykowym
wejściem do automatu przytrzymania jest delegowany przez Reacta `onPointerDown`, wszystkie trzy
akcje chronione przytrzymaniem — uruchomienie alarmu, przełączenie na miejsce zapasowe,
potwierdzenie dojścia — są na iPhonie nieosiągalne dotykiem.

Plan zdejmuje `display: contents` z roota wysp regułą o wystarczającej specyficzności, przenosi
odstępy kart miejsc na jawne elementy generujące boks, zabezpiecza tę warstwę asercjami w smoke
teście i zapisuje iOS Safari jako wspierany target.

Ramowanie: `context/changes/fix-for-ios-phone/frame.md` — pewność WYSOKA, przyczyna **odtworzona
i wyłączona na urządzeniu użytkownika** (kontrola A/B/C/D, Safari 26.6.2 przez Web Inspector).

## Current State Analysis

**Co istnieje dziś.** `useHoldAction` (`src/components/hooks/useHoldAction.ts`) to poprawny,
sprawdzony w terenie automat przytrzymania: `start()` odpala `requestAnimationFrame` dla pierścienia
postępu i niezależny `setTimeout(holdMs)` dla akcji; `cancel()` czyści oba razem
(`useHoldAction.ts:46-50`). Konsumenci: `AlarmButton` (`HomeScreen.astro:45`) i `HoldButton`
w dwóch miejscach na `/alarm` (`GuidanceScreen.tsx:458,483`).

**Czego brakuje.** Dotykowego wejścia innego niż delegacja Reacta. W całym `src/` nie ma ani jednego
`onTouch*`, a żaden `addEventListener` nie dotyczy zdarzeń wskaźnika — wyszukiwanie zwraca wyłącznie
`useHeading.ts` (orientacja), `useVoiceGuidance.ts` i `useScreenWakeLock.ts` (`visibilitychange`,
`pagehide`) oraz `speech.ts`. Nie ma ścieżki zapasowej: gdy `onPointerDown` nie dociera, automat nie
startuje wcale.

**Zasięg: 6 punktów montowania wysp, wszystkie `client:only="react"`**, więc każda jest tym samym
rootem bez renderera:

| Punkt montowania | Plik | Kontener | Istotna layoutowo? |
| --- | --- | --- | --- |
| `AlarmButton` | `HomeScreen.astro:45` | `<div class="mt-4">` | nie |
| `PlaceCard` ×3 | `HomeScreen.astro:61,68,75` | `<section class="space-y-4">` | **tak** |
| `SensorCheck` | `czujniki.astro:23` | `<div class="mt-8">` | nie |
| `GuidanceScreen` | `alarm.astro:8` | `<div class="mx-auto min-h-screen max-w-lg">` | nie |

**Kluczowe ograniczenia odkryte w tej sesji** — oba wywracają naiwną implementację:

1. **Kolejność i warstwy CSS.** Astro wstawia `<style>astro-island,astro-slot,astro-static-slot{display:contents}</style>`
   inline w `<head>`, **po** linku do naszego arkusza (bajt 2206 vs 586 w `dist/index.html`). Przy
   identycznej specyficzności (0-0-1) wygrywa reguła późniejsza, więc `astro-island { display: block }`
   w `global.css` **przegrałoby**. Dodatkowo reguła Astro jest **niewarstwowa**, a reguły
   niewarstwowe biją wszystkie warstwowe niezależnie od specyficzności — więc nasza reguła nie może
   trafić do `@layer base` ani `@layer utilities`.
2. **Bezwładne marginesy `space-y-4`.** Tailwind emituje `.space-y-4 > :not(:last-child) { margin-block-end: 1rem }`
   (potwierdzone w `dist/_astro/*.css`). Ten selektor celuje dziś w elementy `astro-island`, których
   marginesy są bezwładne, bo `display: contents` nie generuje boksu — a `PlaceCard` ma root
   `<section>` bez własnego marginesu (`PlaceCard.tsx:105`). **Dziś między kartami miejsc nie ma
   odstępu 1rem.** Zdjęcie `display: contents` aktywowałoby te marginesy.

**Warstwa jest dziś niewykrywalna regresyjnie.** `npm test` to 6 plików, wszystkie w `src/lib/`,
środowisko node bez jsdom. Nie ma `.claude/rules/`. Żaden test nie dotyka DOM-u ani wysp. Jedyny
zapis „sprawdzony w terenie" (`useHoldAction.ts:23`) jest prawdziwy, ale w repo nie ma ani jednego
zapisu, że ktoś przytrzymał ten przycisk na iPhonie: S-03 jest wprost androidowy
(`context/archive/2026-10-03-voice-guidance/change.md`), a jedyny stempel iOS dotyczy zgody na kompas.

## Desired End State

Na iPhonie przytrzymanie „Uruchom alarm" odlicza od pierwszej klatki, pokazuje pierścień postępu
i po 2 s wchodzi na `/alarm`; oba `HoldButton` na `/alarm` zachowują się tak samo. Na Androidzie nic
się nie zmienia. Karty miejsc na stronie głównej mają odstęp 1rem pochodzący z jawnego elementu
generującego boks, nie z wyspy. `npm run smoke` pada, jeśli nadpisanie zniknie z wysyłanego CSS-u
albo jeśli Astro przestanie emitować regułę, którą nadpisujemy. `CLAUDE.md` i PRD nazywają iOS
Safari wspieranym targetem, a zapis testu w terenie dla tej zmiany nazywa platformę.

Weryfikacja: `npm run lint`, `astro check`, `npm test`, `npm run build`, `npm run smoke` zielone;
plus potwierdzenie na iPhonie i na Androidzie (faza 2 i 4).

### Key Discoveries:

- Przyczyna potwierdzona na urządzeniu: test D (`astro-island.style.display = 'block'`) natychmiast
  przywraca odliczanie i wejście na `/alarm`; testy B (nasłuch na `window`) i C (wymuszone
  przeliczenie stylu) nie pomagają — `frame.md`, „Kontrola na urządzeniu".
- `pointerdown` nie dociera nawet do nasłuchu w fazie przechwytywania na `window`, podczas gdy
  `touchstart` dociera — zdarzenie wskaźnika nie jest wysyłane do dokumentu wcale.
- Reguła Astro jest inline w `<head>`, **po** naszym arkuszu, i jest niewarstwowa → nasza reguła
  potrzebuje specyficzności ≥ 0-0-2 i musi być poza `@layer` (`dist/index.html`, bajty 586 i 2206).
- `global.css` ma już niewarstwowy blok na końcu (`@media (prefers-reduced-motion)`, linie 253-262)
  — wzorzec dla reguły poza warstwami istnieje.
- Wszystkie roothy `GuidanceScreen` używają `min-h-screen` (`GuidanceScreen.tsx:53,290,334,363`),
  czyli jednostki względem viewportu, nie rodzica → zamiana wyspy w boks blokowy nie zmienia
  wysokości na `/alarm`.
- `JEZYK_WIZUALNY.md:200` (GUIDELINE): „Używaj jednego współdzielonego systemu spacingu. Nie
  dodawaj lokalnych, przypadkowych odstępów." → odstęp ma zostać w `space-y-4` na jawnym elemencie,
  nie być zerowany lokalną regułą.
- `scripts/smoke.mjs` już pobiera `/` i asercjonuje podłańcuchy HTML-a (`smoke.mjs:15-22`), jest
  bezzależnościowy i chodzi w CI po buildzie oraz na żywym adresie — jedyne miejsce w projekcie,
  które widzi faktycznie wysłany CSS.

## What We're NOT Doing

- **Nie dotykamy `useHoldAction`** — ani `releasePointerCapture` (`:76-82`), ani czasu 2000 ms, ani
  pierścienia postępu, ani `cancel()`. Frame aktywnie wykluczył je jako przyczynę; moje własne
  pierwsze ramy (wyścig `releasePointerCapture`) zostały obalone w badaniu.
- **Nie dodajemy natywnego nasłuchu wskaźnika na `<button>`** — frame oznacza to obejście jako
  NIESPRAWDZONE na tym urządzeniu (test B dotyczył `window`, nie przycisku). Wybrany mechanizm jest
  potwierdzony testem D, więc druga, niesprawdzona naprawa tej samej przyczyny tylko utrudniłaby
  orzeczenie, która działa.
- **Nie dotykamy zabezpieczeń CSS dotyku** (`touch-action: none`, `-webkit-user-select`,
  `-webkit-touch-callout`, `-webkit-tap-highlight-color`) — zestaw jest kompletny i poprawnie
  wyemitowany.
- **Nie dodajemy Playwrighta ani żadnego runnera przeglądarkowego.** WebKit na Linuksie to nie iOS
  Safari — ten defekt może się tam nie odtworzyć, więc zielony test dałby fałszywe poczucie
  bezpieczeństwa przy koszcie ciężkiej zależności.
- **Nie zmieniamy `onPointerUp`/`onPointerLeave`/`onPointerCancel` ani nie usuwamy martwego
  `onContextMenu`** (`useHoldAction.ts:94-96`, Safari iOS nigdy nie wysyła `contextmenu`) — frame
  świadomie zostawił to poza zakresem.
- **Nie ruszamy podpowiedzi `sr-only`** (`AlarmButton.tsx:59`, `HoldButton.tsx:76`), która radzi
  gest otwierający na iOS menu kontekstowe. Frame nazwał to osobną decyzją produktową (luka F9).
- **Nie nadpisujemy `astro-slot` ani `astro-static-slot`** — nie są rootami Reacta, a zmiana ich
  `display` ruszyłaby layout treści slotowanej bez żadnego powodu.

## Implementation Approach

Mechanizm: **globalne nadpisanie `display` dla `astro-island`**, czyli dokładnie to, co test D
potwierdził na urządzeniu. Jedna reguła leczy wszystkie 6 punktów montowania i każdą przyszłą wyspę,
bez dotykania sprawdzonego w terenie automatu. Wybrany świadomie zamiast naprawy punktowej
w hooku, bo ta opierałaby się na obejściu niesprawdzonym na tym urządzeniu i zostawiłaby pozostałe
wyspy podatne.

Kolejność „najpierw rozstrzygnij niewiadomą": faza 1 potwierdza mechanizm **w prawdziwym buildzie
na iPhonie**, zanim kod wyląduje. To nie jest powtórzenie testu D — test D był wstrzyknięciem stylu
w Web Inspectorze, a sonda domyka różnicę między tym dowodem a wysyłanym arkuszem, na którym stoi
cała reszta planu (specyficzność, warstwy, kolejność w `<head>`).

Rozpoznane ryzyko mechanizmu: nadpisujemy selektor wewnętrzny frameworka, więc zmiana znaczników
wysp w przyszłym Astro mogłaby cicho usunąć naprawę. Dlatego faza 3 asercjonuje **obie** strony
zależności — i naszą regułę, i regułę Astro, którą nadpisujemy.

## Critical Implementation Details

**Specyficzność i warstwy — reguła musi wygrać z inline'em Astro.** Astro emituje
`astro-island,astro-slot,astro-static-slot{display:contents}` jako `<style>` inline w `<head>`,
po linku do naszego arkusza, i niewarstwowo. Nasza reguła musi mieć specyficzność ≥ 0-0-2
(selektor typu nie wystarczy) **i** leżeć poza jakimkolwiek `@layer`, bo reguły warstwowe przegrywają
z niewarstwowymi niezależnie od specyficzności. Oba warunki muszą być spełnione jednocześnie —
spełnienie jednego daje regułę, która cicho nic nie robi.

**Kolejność faz 2 i 3 jest wiążąca.** Opakowanie punktów montażu `PlaceCard` musi trafić do tego
samego commita co reguła CSS albo przed nią. Sama reguła bez opakowania daje stronę główną
z odstępem pochodzącym z wyspy — stan, który faza 2 ma właśnie wyeliminować, i który łamie
`JEZYK_WIZUALNY.md:200`.

## Phase 1: Sonda na urządzeniu

### Overview

Potwierdzić, że reguła o wybranej specyficzności, wysłana jako część prawdziwego arkusza, wygrywa
z inline'em Astro i przywraca przytrzymanie na iPhonie. Faza nie zostawia po sobie kodu — jej
produktem jest dowód albo decyzja o zmianie mechanizmu.

### Changes Required:

#### 1. Tymczasowa reguła do sondy

**File**: `src/styles/global.css` (zmiana **nietrwała** — wycofywana na koniec fazy)

**Intent**: Dodać kandydata na regułę nadpisującą, zbudować projekt i podać go na iPhone'a, żeby
sprawdzić mechanizm na wysyłanym CSS-ie, a nie na wstrzyknięciu w Web Inspectorze.

**Contract**: Reguła niewarstwowa, specyficzność ≥ 0-0-2, ustawia `display: block` na
`astro-island`. Kandydat: selektor `html astro-island` (0-0-2, bez `!important`). Umieszczona na
końcu `global.css`, poza `@layer` — obok istniejącego bloku `@media (prefers-reduced-motion)`.

#### 2. Podanie builda na urządzenie

**File**: brak zmian w repo

**Intent**: Udostępnić zbudowaną aplikację iPhone'owi w sieci lokalnej, żeby gest był wykonany na
tej samej ścieżce, którą pójdzie produkcja (service worker, pełny arkusz, minifikacja).

**Contract**: `npm run build`, następnie `npm run preview -- --host`; iPhone wchodzi na adres LAN
maszyny. Service worker rejestruje się tylko w produkcyjnym buildzie, więc `preview` jest właściwym
trybem — a nie `astro dev`. Jeśli wcześniejsza sesja `preview` na tym porcie zostawiła stary SW,
trzeba go odrejestrować (DevTools → Application → Service Workers), inaczej zamaskuje zmianę.

### Success Criteria:

#### Automated Verification:

- Build przechodzi: `npm run build`
- Reguła jest obecna w zbudowanym arkuszu: `grep -r 'astro-island' dist/_astro/*.css`
- Lint przechodzi: `npm run lint`

#### Manual Verification:

- Na iPhonie przytrzymanie „Uruchom alarm" odlicza od pierwszej klatki i po 2 s wchodzi na `/alarm`
- Na iPhonie `:active` (ciemniejsze tło) pojawia się natychmiast i zwalnia po puszczeniu, bez
  zakleszczenia i bez opóźnienia ~1 s
- Oba `HoldButton` na `/alarm` (przełączenie na miejsce zapasowe, potwierdzenie dojścia) też
  odliczają
- W Web Inspectorze panel stylów pokazuje `display: block` jako regułę wygrywającą na
  `<astro-island>`, a regułę Astro jako przekreśloną

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie
sondy na iPhonie, zanim przejdziesz do fazy 2. Jeśli sonda **nie** przywróci przytrzymania, nie
przechodź dalej — wróć do wyboru mechanizmu: niewykluczone, że wygrywa reguła o innej
specyficzności, a przy powtórzonej porażce w grę wchodzi punktowy natywny nasłuch na `<button>`
(obejście z React #29890, w frame oznaczone jako niesprawdzone). Tymczasową regułę wycofaj przed
fazą 2, żeby faza 2 wprowadziła ją w docelowej formie i kolejności.

---

## Phase 2: Naprawa — reguła CSS i opakowanie punktów montażu

### Overview

Wprowadzić potwierdzoną regułę na trwałe i przenieść odstępy kart miejsc na jawne elementy
generujące boks, tak aby wyspa przestała być istotna layoutowo.

### Changes Required:

#### 1. Nadpisanie `display` dla roota wyspy

**File**: `src/styles/global.css`

**Intent**: Zdjąć `display: contents` z elementu będącego rootem Reacta, bo iOS Safari nie dostarcza
do elementu bez renderera zdarzeń wskaźnika pochodzących z dotyku. Komentarz przy regule musi
nazywać przyczynę, specyficzność i warstwę — bez tego następna osoba „uprości" selektor do
`astro-island` i cicho przywróci defekt.

**Contract**: Reguła niewarstwowa na końcu pliku (poza `@layer base` i `@layer utilities`),
selektor o specyficzności ≥ 0-0-2 celujący wyłącznie w `astro-island` (nie `astro-slot`, nie
`astro-static-slot`), `display: block`. Forma potwierdzona w fazie 1.

#### 2. Opakowanie trzech punktów montażu `PlaceCard`

**File**: `src/components/HomeScreen.astro`

**Intent**: Sprawić, by odstęp 1rem między kartami miejsc pochodził z elementu, który naprawdę
generuje boks, a nie z wyspy. Dziś `space-y-4` celuje w `astro-island` o `display: contents`, więc
margines jest bezwładny i karty są sklejone; po fazie 2 wyspa generuje boks, więc bez opakowania
odstęp zacząłby zależeć od jej `display`. Po tej zmianie wszystkie 6 punktów montowania ma ten sam
wzorzec: wyspa zawsze w jawnym kontenerze.

**Contract**: Każdy z trzech `<PlaceCard client:only="react" …>` (`HomeScreen.astro:61,68,75`)
owinięty jawnym elementem blokowym, który staje się bezpośrednim dzieckiem
`<section aria-labelledby="places-title" class="space-y-4">`. Odstęp nadal pochodzi z `space-y-4`
— bez nowych klas odstępu i bez zerowania marginesów (`JEZYK_WIZUALNY.md:200`). Propsy `kind`,
`title`, `description`, `emphasis` i nagłówek sekcji bez zmian.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Typy i diagnostyka Astro przechodzą: `npx astro check`
- Testy jednostkowe przechodzą: `npm test`
- Build przechodzi: `npm run build`
- Reguła jest w zbudowanym arkuszu: `grep -r 'astro-island' dist/_astro/*.css`
- Smoke przechodzi: `npm run preview` + `npm run smoke`

#### Manual Verification:

- Na iPhonie wszystkie trzy akcje chronione przytrzymaniem działają (alarm, miejsce zapasowe,
  potwierdzenie dojścia)
- Na Androidzie przytrzymanie działa tak jak dotąd — brak regresji na platformie, która była sprawna
- Strona główna: karty miejsc mają odstęp 1rem, układ sekcji „Miejsca" zgodny z `JEZYK_WIZUALNY.md`
- `/alarm` i `/czujniki` renderują się bez zmiany wysokości ani przesunięć względem stanu przed zmianą
- Edycja miejsca w jednej karcie nadal nie nadpisuje rodzeństwa (trzy wyspy, jeden klucz `wrw.plan`)

**Implementation Note**: Po zaliczeniu weryfikacji automatycznej zatrzymaj się na potwierdzenie
testów na iPhonie i na Androidzie, zanim przejdziesz do fazy 3.

---

## Phase 3: Zabezpieczenie regresji

### Overview

Sprawić, by zniknięcie naprawy padało w CI. Guard idzie do `scripts/smoke.mjs`, bo to jedyne
miejsce w projekcie, które widzi faktycznie wysłany CSS — test w Vitest musiałby czytać `dist/`,
co łamie konwencję `npm test` („czyste funkcje w `src/lib/`", środowisko node) i padałby bez builda.

### Changes Required:

#### 1. Asercje obu stron zależności

**File**: `scripts/smoke.mjs`

**Intent**: Wyłapać dwie realne ścieżki regresji: usunięcie lub „uproszczenie" naszej reguły oraz
zmianę znaczników wysp przy aktualizacji Astro. Dlatego asercjonujemy nie tylko nasze nadpisanie,
ale też obecność reguły Astro — jeśli Astro przestanie emitować `display: contents`, nadpisanie
staje się bezczynne i założenie trzeba przemyśleć od nowa, a nie przeoczyć.

**Contract**: Dwie nowe asercje w istniejącym stylu `fail(...)` (`smoke.mjs:4-7`), na tej samej
odpowiedzi `/`, której skrypt już używa (`smoke.mjs:15-22`): (a) wysłany HTML zawiera regułę Astro
`display:contents` dla `astro-island`; (b) arkusz podlinkowany z `/` zawiera nasze nadpisanie
`display` dla `astro-island`. Adres arkusza wyciągany z HTML-a, nie zapisany na sztywno — nazwa
pliku zawiera hash builda. Komunikaty `fail` nazywają przyczynę i wskazują `frame.md`, bo
asercja o wewnętrznym selektorze frameworka jest bez tego nieczytelna. Bez nowych zależności.

### Success Criteria:

#### Automated Verification:

- Build przechodzi: `npm run build`
- Smoke przechodzi na lokalnym podglądzie: `npm run preview` + `npm run smoke`
- Smoke z asercjami nagłówków przechodzi: `EXPECT_HEADERS=1 npm run smoke`
- Guard faktycznie łapie regresję: po tymczasowym usunięciu reguły z `global.css` i przebudowaniu
  `npm run smoke` **pada** z komunikatem nazywającym przyczynę (po czym reguła wraca)
- Lint przechodzi: `npm run lint`

#### Manual Verification:

- Treść komunikatu `fail` jest zrozumiała dla kogoś, kto nie zna tej zmiany — nazywa, że to defekt
  iOS Safari, i wskazuje `frame.md`
- CI na gałęzi jest zielone (joby `ci` i `smoke`)

**Implementation Note**: Weryfikacja „guard łapie regresję" jest obowiązkowa — asercja, której nigdy
nie zobaczono w stanie czerwonym, bywa asercją zawsze zieloną. Po zaliczeniu weryfikacji
automatycznej zatrzymaj się na potwierdzenie, zanim przejdziesz do fazy 4.

---

## Phase 4: Target platformowy i zapis testu w terenie

### Overview

Domknąć lukę, która pozwoliła uznać „sprawdzony w terenie" za dowód dla obu platform: iOS nigdzie
nie był wymieniony jako wspierany, a każdy nazwany platformowo test w terenie był androidowy.

### Changes Required:

#### 1. Zapisany target platformowy

**File**: `CLAUDE.md` (sekcja `## Architecture` → `### Environment`)

**Intent**: Nazwać iOS Safari wspieranym targetem, żeby następna usterka platformowa miała
odpowiedź na pytanie „czy to defekt blokujący, czy platforma poza zakresem". Bez tego wpisu ta
decyzja jest podejmowana od nowa przy każdym objawie.

**Contract**: Wpis nazywający iOS Safari i Androida/Chrome jako wspierane targety, z jednozdaniowym
ostrzeżeniem o klasie defektu: wyspy `client:only` są rootami Reacta, więc interakcje oparte na
zdarzeniach wskaźnika wymagają potwierdzenia na iOS — `onClick` działa (iOS syntezuje kliknięcie)
i właśnie dlatego maskuje problem. Odnośnik do `frame.md`.

#### 2. Wymóg nazwania platformy w zapisie testu w terenie

**File**: `PROJECT.md` albo `context/foundation/prd.md` — w tym, który opisuje zasady testów
w terenie (do ustalenia przy implementacji; wpis idzie do jednego, nie do obu)

**Intent**: Sprawić, by zapis „sprawdzone w terenie" bez nazwy platformy przestał być dopuszczalny.
Zawód, który przepuścił ten defekt, to nie brak testu, a zapis testu niemówiący, czego nie objął.

**Contract**: Jedno zdanie: zapis testu w terenie podaje urządzenie i przeglądarkę; interakcja
dotykowa potwierdzona na jednej platformie nie liczy się jako potwierdzona na drugiej.

#### 3. Zapis testu w terenie dla tej zmiany

**File**: `context/changes/fix-for-ios-phone/change.md`

**Intent**: Zamknąć zmianę dowodem w nowym formacie — i mieć pierwszy w repo zapis przytrzymania
przycisku na iPhonie.

**Contract**: `status: done`, `updated` na dzień zamknięcia, notka z wynikami z faz 2 i 4 nazywająca
oba urządzenia i przeglądarki (iPhone/Safari i model Androida/przeglądarka) oraz wszystkie trzy
akcje chronione przytrzymaniem.

#### 4. Komentarz przy automacie przytrzymania

**File**: `src/components/hooks/useHoldAction.ts`

**Intent**: Doprecyzować komentarz „sprawdzony w terenie" (`:23`), który był prawdziwy, ale
niejawnie androidowy, i wskazać, że jedyne dotykowe wejście do automatu zależy od tego, że root
wyspy generuje boks. Następna osoba czytająca ten hook ma zobaczyć zależność, której dziś nie widać.

**Contract**: Komentarz — bez zmiany kodu. Nazywa platformy, na których automat potwierdzono,
i wskazuje regułę w `global.css` jako warunek działania `onPointerDown` na iOS.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Formatowanie przechodzi: `npm run format` nie zgłasza zmian
- Testy jednostkowe przechodzą: `npm test`
- Build przechodzi: `npm run build`

#### Manual Verification:

- `CLAUDE.md` nazywa iOS Safari wspieranym targetem i ostrzega o klasie defektu wysp
- Zasada zapisu testu w terenie jest w dokumencie źródłowym i nie dubluje się w drugim
- `change.md` ma `status: done` i zapis z obu platform z nazwami urządzeń
- CI zielone na `main` po merge'u; `npm run smoke` zielony na żywym adresie
  (`https://w-razie-w.jzogala.workers.dev`) z `EXPECT_HEADERS=1`

**Implementation Note**: Weryfikacja na żywym adresie jest ostatnim krokiem — potwierdza, że
naprawa przeszła przez pełną ścieżkę wdrożenia (Worker, service worker, nagłówki cache), a nie
tylko przez lokalny build.

---

## Testing Strategy

### Unit Tests:

Brak nowych testów jednostkowych. Zmiana nie dotyka żadnej czystej funkcji w `src/lib/` — jest
w całości w warstwie CSS, znacznikach Astro i skrypcie smoke. Zgodnie z konwencją projektu (`npm test`
to wyłącznie funkcje czyste, środowisko node bez jsdom, bez testów komponentów Reacta) dodawanie
tu testu jednostkowego wymagałoby zmiany środowiska testowego — koszt nieproporcjonalny do tego, co
taki test by orzekał. Istniejące 6 plików musi dalej przechodzić bez zmian.

### Integration Tests:

`scripts/smoke.mjs` — rola guardu regresji dla tej warstwy (faza 3). Chodzi w CI w jobie `smoke`
po buildzie i ponownie na żywym adresie po deployu, więc łapie zarówno regresję w kodzie, jak
i rozjazd między buildem a wdrożeniem.

### Manual Testing Steps:

1. **iPhone, Safari, strona główna**: przytrzymaj „Uruchom alarm" ~3 s → odliczanie od pierwszej
   klatki, pierścień rośnie, po 2 s wejście na `/alarm`.
2. **iPhone, puszczenie przed czasem**: przytrzymaj ~1 s i puść → postęp wraca do zera, brak
   nawigacji, `:active` zwalnia natychmiast (bez zakleszczenia).
3. **iPhone, `/alarm`**: przytrzymaj „przełącz na miejsce zapasowe" i „potwierdzam dojście" →
   oba odliczają i kończą akcję.
4. **iPhone, zjechanie palcem**: zacznij przytrzymanie i zsuń palec z przycisku → postęp zeruje się
   (`onPointerLeave` nadal działa — nie zmieniamy `releasePointerCapture`).
5. **Android**: powtórz kroki 1–4 → brak regresji na platformie, która była sprawna.
6. **Strona główna, układ**: karty miejsc mają odstęp 1rem, sekcja „Miejsca" zgodna z
   `JEZYK_WIZUALNY.md`; porównaj ze zrzutem przed zmianą.
7. **Trzy wyspy, jeden klucz**: zapisz miejsce w jednej karcie, odśwież, zapisz w drugiej → żadne
   nie nadpisuje rodzeństwa (`readPlan()` przed `writePlan`).
8. **Offline**: wejdź na `/alarm` z wyłączoną siecią → ekran działa z precache, przytrzymanie też.
9. **Klawiatura**: Tab na przycisk, Space/Enter przytrzymane → odliczanie (ścieżka `onKeyDown`
   niezależna od wskaźnika, nie może ucierpieć).

## Performance Considerations

Reguła CSS nie zmienia rozmiaru bundle'a w sposób mierzalny (jedna deklaracja) i nie dodaje pracy
w czasie wykonania. Zamiana `display: contents` na `display: block` dodaje po jednym boksie na
wyspę — 6 dodatkowych boksów na całą aplikację, bez wpływu na NFR pierwszego renderu `/alarm`
(2 s). Opakowanie trzech `PlaceCard` dodaje trzy elementy do statycznego HTML-a strony głównej.
Brak nowych zasobów do precache, więc zakres service workera bez zmian.

## Migration Notes

Brak migracji danych — zmiana nie dotyka `wrw.plan` ani `wrw.run`, więc `schemaVersion` nie rośnie
i nie trzeba dodawać gałęzi w `parsePlan`.

Uwaga wdrożeniowa: urządzenia z zainstalowaną aplikacją mają precache'owany stary arkusz. Naprawa
dojdzie do nich po aktualizacji service workera — przy weryfikacji na iPhonie po deployu trzeba
wymusić aktualizację (zamknięcie i ponowne otwarcie aplikacji z ekranu początkowego, a w razie
potrzeby odrejestrowanie SW), inaczej test potwierdzi stary build. Od iOS 14 Safari i aplikacja
z ekranu początkowego dzielą rejestrację SW i CacheStorage, więc nie mogą rozjechać się na różne
buildy.

## References

- Ramowanie: `context/changes/fix-for-ios-phone/frame.md` (pewność WYSOKA, kontrola A/B/C/D)
- Powiązane badania: brak `research.md` dla tej zmiany
- Kod: `src/components/hooks/useHoldAction.ts:23,46-50,58-68,76-82` ·
  `src/components/AlarmButton.tsx:11,19-28` · `src/components/HoldButton.tsx:35,39-47` ·
  `src/components/HomeScreen.astro:45,61,68,75` · `src/components/GuidanceScreen.tsx:53,458,483` ·
  `src/components/PlaceCard.tsx:105` · `src/pages/alarm.astro:8` · `src/pages/czujniki.astro:23` ·
  `src/styles/global.css:217,238,253-262` · `scripts/smoke.mjs:4-7,15-22`
- Dowód kolejności CSS: `dist/index.html` (link do arkusza bajt 586, inline `display:contents`
  bajt 2206) · `dist/_astro/*.css` (`.space-y-4 > :not(:last-child)`)
- Zewnętrzne: [React #29890](https://github.com/facebook/react/issues/29890) („onPointerDown not
  called when rendered in 'display: contents' root", otwarte, zgłoszone z raportu Astro)
- Wzorzec fazowania i bramek na testy w terenie:
  `context/archive/2026-10-03-voice-guidance/plan.md:59,264`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Sonda na urządzeniu

#### Automated

- [x] 1.1 Build przechodzi: `npm run build`
- [x] 1.2 Reguła jest obecna w zbudowanym arkuszu: `grep -r 'astro-island' dist/_astro/*.css`
- [x] 1.3 Lint przechodzi: `npm run lint`

#### Manual

- [ ] 1.4 Na iPhonie przytrzymanie „Uruchom alarm" odlicza od pierwszej klatki i po 2 s wchodzi na `/alarm`
- [ ] 1.5 Na iPhonie `:active` pojawia się natychmiast i zwalnia po puszczeniu, bez zakleszczenia
- [ ] 1.6 Oba `HoldButton` na `/alarm` też odliczają
- [ ] 1.7 Web Inspector pokazuje `display: block` jako regułę wygrywającą, regułę Astro jako przekreśloną

### Phase 2: Naprawa — reguła CSS i opakowanie punktów montażu

#### Automated

- [x] 2.1 Lint przechodzi: `npm run lint`
- [x] 2.2 Typy i diagnostyka Astro przechodzą: `npx astro check`
- [x] 2.3 Testy jednostkowe przechodzą: `npm test`
- [x] 2.4 Build przechodzi: `npm run build`
- [x] 2.5 Reguła jest w zbudowanym arkuszu: `grep -r 'astro-island' dist/_astro/*.css`
- [x] 2.6 Smoke przechodzi: `npm run preview` + `npm run smoke`

#### Manual

- [ ] 2.7 Na iPhonie wszystkie trzy akcje chronione przytrzymaniem działają
- [ ] 2.8 Na Androidzie przytrzymanie działa tak jak dotąd — brak regresji
- [ ] 2.9 Karty miejsc mają odstęp 1rem, sekcja „Miejsca" zgodna z `JEZYK_WIZUALNY.md`
- [ ] 2.10 `/alarm` i `/czujniki` bez zmiany wysokości ani przesunięć
- [ ] 2.11 Edycja miejsca w jednej karcie nie nadpisuje rodzeństwa

### Phase 3: Zabezpieczenie regresji

#### Automated

- [ ] 3.1 Build przechodzi: `npm run build`
- [ ] 3.2 Smoke przechodzi na lokalnym podglądzie: `npm run preview` + `npm run smoke`
- [ ] 3.3 Smoke z asercjami nagłówków przechodzi: `EXPECT_HEADERS=1 npm run smoke`
- [ ] 3.4 Guard łapie regresję: po usunięciu reguły `npm run smoke` pada z nazwaną przyczyną
- [ ] 3.5 Lint przechodzi: `npm run lint`

#### Manual

- [ ] 3.6 Komunikat `fail` jest zrozumiały bez znajomości zmiany i wskazuje `frame.md`
- [ ] 3.7 CI na gałęzi zielone (joby `ci` i `smoke`)

### Phase 4: Target platformowy i zapis testu w terenie

#### Automated

- [ ] 4.1 Lint przechodzi: `npm run lint`
- [ ] 4.2 Formatowanie przechodzi: `npm run format` nie zgłasza zmian
- [ ] 4.3 Testy jednostkowe przechodzą: `npm test`
- [ ] 4.4 Build przechodzi: `npm run build`

#### Manual

- [ ] 4.5 `CLAUDE.md` nazywa iOS Safari wspieranym targetem i ostrzega o klasie defektu wysp
- [ ] 4.6 Zasada zapisu testu w terenie jest w jednym dokumencie źródłowym, bez dublowania
- [ ] 4.7 `change.md` ma `status: done` i zapis z obu platform z nazwami urządzeń
- [ ] 4.8 CI zielone na `main`; `npm run smoke` zielony na żywym adresie z `EXPECT_HEADERS=1`

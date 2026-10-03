---
project: "Household Resilience App"
version: 1
status: draft
created: 2026-10-03
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 1          # faktycznie 24 godziny (hackathon)
  hard_deadline: null
  after_hours_only: true
---

# PRD: Household Resilience App

Źródło: `context/foundation/shape-notes.md` (seed: `PROJECT.md`, hackathon HackYeah).

## Vision & Problem Statement

Ludzie mają dostęp do poradników i informacji kryzysowych, ale nie przekładają ich na konkretny plan działania dla własnego gospodarstwa domowego. Nie wiedzą, jak się przygotować, a obecne rozwiązania ich do tego nie zachęcają. Kłopot ujawnia się w momencie kryzysu: domownicy są w różnych miejscach, nie mogą się skontaktować, nie ma sieci, brakuje przygotowanych rzeczy i ustaleń, a każdy improwizuje pod presją.

Insight: istniejące narzędzia (RSO, Gdziesieukryć, poradnik GOV) informują, ale nie planują. Wymagają sieci dokładnie wtedy, gdy jej nie ma. Decyzje trzeba podjąć przed kryzysem, a w kryzysie tylko je wykonać. Plan to indywidualna ewakuacja spersonalizowana pod konkretną rodzinę. W kryzysie aplikacja przejmuje kontrolę i prowadzi za rękę.

Skala ×100: reguła domenowa się nie zmienia, bo każda rodzina ma własny plan.

Główny ból, który demo ma udowodnić, ma dwie części: (1) zachęcić i poprowadzić przez przygotowanie, (2) w kryzysie przejąć kontrolę i prowadzić krok po kroku.

## User & Persona

**Organizator rodziny.** Rodzic lub opiekun, który przygotowuje plan kryzysowy za całe gospodarstwo domowe. Sięga po aplikację w spokojnym czasie, żeby przygotować plan. Ponownie sięga po nią w kryzysie, żeby go wykonać.

### Secondary persona

**Domownik.** Otrzymuje kopię planu od organizatora i wykonuje go w kryzysie. Nie tworzy planu, może jedynie poprawić własne dane.

## Success Criteria

### Primary
- Cały przepływ (kroki 1–8) przechodzi na żywo na scenie, a Execution Mode prowadzi do punktu w trybie samolotowym.

### Secondary
- Domownik na drugim telefonie otrzymuje plan i wykonuje go.

### Guardrails
- Brak guardrails w MVP. To świadoma decyzja zespołu na hackathon.

## User Stories

### US-01: Organizator przygotowuje plan, a w kryzysie aplikacja prowadzi go do punktu

- **Given** organizator przeszedł onboarding (domownicy, spersonalizowany plecak, miejsce spotkania, miejsce zapasowe, schron), a mapa i trasa są pobrane offline
- **When** w kryzysie, bez sieci, przytrzymuje przycisk alarmu
- **Then** Execution Mode prowadzi go krok po kroku do punktu

#### Acceptance Criteria
- Główny widok to duża strzałka z odległością do punktu, a mapa z trasą jest drugim poziomem.
- Każdy ekran pokazuje dokładnie jeden następny krok.
- Głos czyta kroki domyślnie i można go wyłączyć.
- Bez wibracji. To odstępstwo od `PROJECT.md` 4.1 pkt 6, decyzja zespołu.
- Przycisk „niedostępne” przełącza prowadzenie na miejsce zapasowe.
- Całość działa w trybie samolotowym.

## Functional Requirements

Przepływ MVP (źródło: `PROJECT.md`, sekcje 5 i 8; zatwierdzony przez zespół):

1. Organizator uruchamia aplikację po raz pierwszy, startuje onboarding.
2. Dodaje domowników i kontakty awaryjne.
3. Przechodzi checklistę plecaka ewakuacyjnego.
4. Wskazuje miejsce spotkania, miejsce zapasowe i punkt ewakuacji (schron).
5. Plan zapisuje się lokalnie, mapa i trasa pobierają się offline.
6. Ekran gotowości pokazuje luki w przygotowaniu.
7. Organizator udostępnia plan domownikom.
8. Kryzys: przycisk alarmu włącza Execution Mode, który prowadzi krok po kroku do punktu.

Decyzje zakresowe:
- **Zakres:** pełny, wszystkie 8 kroków, łącznie z mapą i routingiem offline oraz voice guidance.
- **Udostępnianie planu:** w MVP, w najprostszej formie, bez szyfrowanego transferu.
- **Zachęta do przygotowań:** poziom gotowości (jakościowy) w MVP, jako część ekranu gotowości. Milestones zostają w nice-to-have, punkty i streaki odrzucone (FR-016).
- **Voice:** po rundzie sokratejskiej wraca do MVP jako must-have (FR-015).

### Onboarding i plan
- FR-001: Organizator może przejść interaktywny onboarding przygotowań (plecak, dokąd się ewakuować, plan dla rodziny). Priority: must-have
  > Socrates: Zarzut: „onboarding powtarza poradnik GOV, czyli to, co według tezy nie działa”. Rozstrzygnięcie: treść poradnika GOV jest dobra, słaba jest jego forma, bo nie jest interaktywna. Onboarding zostaje i przekazuje tę treść interaktywnie.
- FR-002: Organizator może dodać domowników i kontakty awaryjne. Priority: must-have
  > Socrates: Zarzut: „kontakty są bezużyteczne, skoro scenariusz zakłada brak łączności”. Rozstrzygnięcie: zostaje, bo brak łączności to tylko jeden ze scenariuszy.
- FR-003: Organizator może odhaczać pozycje checklisty plecaka ewakuacyjnego, dopasowanej do składu rodziny (np. dzieci, leki, zwierzęta). Priority: must-have
  > Socrates: Zarzut: „statyczna checklista to papierowa lista w aplikacji i do niczego nie zachęca”. Rozstrzygnięcie: zmodyfikowane, checklista jest personalizowana pod rodzinę.
- FR-004: Organizator może ręcznie wskazać miejsce spotkania, miejsce zapasowe i punkt ewakuacji (schron). Priority: must-have
  > Socrates: Zarzut: „organizator nie wie, które miejsce jest bezpieczne, więc wybierze źle”. Rozstrzygnięcie: w MVP wybór ręczny, propozycje schronów dopiero po MVP.
- FR-005: Organizator może przypisać domownikom role i podstawowe scenariusze. Priority: nice-to-have
  > Socrates: Zarzut: „bez ról dziecko dostaje ten sam plan co dorosły”. Rozstrzygnięcie: zostaje nice-to-have, w MVP jest jeden wspólny plan.

### Offline
- FR-006: Organizator może zapisać plan lokalnie i korzystać z niego bez sieci. Priority: must-have
  > Socrates: Zarzut: „plan jest na jednym telefonie, więc gdy telefon padnie, plan znika”. Rozstrzygnięcie: przekazanie planu domownikom (FR-010) pełni rolę kopii zapasowej.
- FR-007: Organizator może pobrać mapę i trasę do punktu ewakuacji do użytku offline. Priority: must-have
  > Socrates: Zarzut: „to najdroższy element, a trasa może być nieaktualna w dniu kryzysu”. Rozstrzygnięcie: zostaje bez zmian jako rdzeń demo.

### Gotowość
- FR-008: Organizator widzi następny krok albo grupę kroków podnoszących gotowość, przedstawione jako quick wins (micro-missions), a nie jako lista braków. Priority: must-have
  > Socrates: Zarzut: „lista luk demotywuje, bo pokazuje porażkę zamiast postępu”. Rozstrzygnięcie: zmodyfikowane, luki są pokazywane jako quick wins. FR-018 (micro-missions) zostało tu wchłonięte.
- FR-009: Organizator widzi poziom gotowości (Readiness level) wyrażony jakościowo (np. „72H Ready”), a nie procentem. Priority: must-have
  > Socrates: Zarzut: „procent daje fałszywe poczucie bezpieczeństwa”. Rozstrzygnięcie: zmodyfikowane, poziomy jakościowe zamiast procentów.

### Udostępnianie
- FR-010: Organizator może przekazać plan domownikowi. Każda kopia pokazuje datę wersji, a nieprzekazane zmiany pojawiają się jako krok do wykonania na ekranie gotowości. Priority: must-have
  > Socrates: Zarzut: „domownik może mieć w kryzysie starą wersję planu”. Rozstrzygnięcie: zmodyfikowane, plan ma datę wersji i wykrywane są nieprzekazane zmiany.
- FR-011: Domownik może otworzyć otrzymany plan tylko do odczytu, z wyjątkiem własnych danych, które może poprawić. Priority: must-have
  > Socrates: Zarzut: „domownik nie może poprawić oczywistego błędu we własnych danych”. Rozstrzygnięcie: zmodyfikowane, domownik może edytować własne dane.

### Execution Mode
- FR-012: Organizator lub domownik może ręcznie uruchomić Execution Mode przyciskiem alarmu, chronionym przed przypadkowym uruchomieniem (przytrzymanie albo potwierdzenie). Priority: must-have
  > Socrates: Zarzut: „przypadkowe naciśnięcie w kieszeni uruchamia tryb kryzysowy”. Rozstrzygnięcie: zmodyfikowane, start wymaga przytrzymania albo potwierdzenia.
- FR-013: W Execution Mode użytkownik jest prowadzony krok po kroku, z dużymi komunikatami (bez wibracji). Jedno wyjście awaryjne („niedostępne”) przełącza go na miejsce zapasowe. Priority: must-have
  > Socrates: Zarzut: „sztywna sekwencja nie pasuje, gdy miejsce spotkania jest niedostępne”. Rozstrzygnięcie: zmodyfikowane, dodane wyjście awaryjne do miejsca zapasowego.
- FR-014: W Execution Mode użytkownik widzi przede wszystkim dużą strzałkę i odległość do punktu, a mapa z trasą offline jest dostępna jako drugi poziom. Priority: must-have
  > Socrates: Zarzut: „w stresie mapa jest za trudna do odczytania”. Rozstrzygnięcie: zmodyfikowane, główny widok to strzałka, mapa jest pod spodem.
- FR-015: W Execution Mode użytkownik słyszy kolejne kroki głosem. Głos jest domyślnie włączony, ale użytkownik może go wyłączyć. Priority: must-have
  > Socrates: Zarzut: „w kryzysie użytkownik idzie i nie patrzy w ekran”. Rozstrzygnięcie: wraca do MVP jako must-have.

### Nice-to-have
- FR-016: Organizator osiąga milestones gotowości (np. „72H Ready”), bez punktów i streaków. Priority: nice-to-have
  > Socrates: Zarzut: „gamifikacja ewakuacji może trywializować zagrożenie”. Rozstrzygnięcie: zmodyfikowane, zostają tylko poważne kamienie milowe.
- FR-017: Organizator może przeprowadzić emergency drill i zobaczyć wykryte luki w planie. Priority: nice-to-have
  > Socrates: Zarzut: „drill będzie jednorazowy, więc wykryte luki szybko się dezaktualizują”. Rozstrzygnięcie: stoi bez zmian.

## Non-Functional Requirements

- Cały interfejs i komunikaty głosowe są po polsku.
- Execution Mode pokazuje pierwszy krok w mniej niż 2 s od zwolnienia przycisku alarmu.
- Świadomie odpuszczone w MVP: pełne działanie offline i gwarancja, że dane nie opuszczają urządzenia, nie są twardymi wymaganiami. To rozjazd z zasadami projektowymi z `PROJECT.md` (sekcja 3) i z głównym kryterium sukcesu (demo w trybie samolotowym). Patrz Open Questions.

## Business Logic

Aplikacja przenosi wszystkie decyzje ewakuacyjne rodziny na czas spokoju, a w kryzysie odtwarza je jako jedyny następny krok do wykonania.

Wejścia, które podaje organizator w spokojnym czasie: skład rodziny i jej potrzeby (np. dzieci, leki, zwierzęta), kontakty, miejsce spotkania, miejsce zapasowe i punkt ewakuacji. Na tej podstawie aplikacja podejmuje cztery decyzje: dobiera checklistę plecaka i plan do rodziny (rekomendacja), wybiera następny quick win, który najbardziej podnosi gotowość (priorytetyzacja), przypisuje rodzinie jakościowy poziom gotowości, np. „72H Ready” (ocena), i zamienia plan w sekwencję kroków ewakuacji (workflow).

W kryzysie użytkownik nie podejmuje decyzji. Widzi i słyszy tylko jeden następny krok. Jedyne dopuszczone odstępstwo to przejście „niedostępne”, które przełącza prowadzenie na miejsce zapasowe ustalone wcześniej.

## Access Control

Profil lokalny. Brak kont i serwera, dane żyją wyłącznie na urządzeniu.

- **Organizator:** tworzy i edytuje plan.
- **Domownik:** otrzymuje kopię planu tylko do odczytu (poza własnymi danymi, które może poprawić) i wykonuje ją w Execution Mode.

Uwaga: model ról zakłada przekazanie planu domownikom. `PROJECT.md` ma tu sprzeczność: 4.1 pkt 3 (must-have) kontra 4.3 „Family plan sharing” (po hackathonie). Rozstrzygnięte w fazie 3: udostępnianie zostaje w MVP w najprostszej formie (na korzyść 4.1).

## Non-Goals

- **Bez własnej bazy i propozycji schronów.** Organizator wskazuje punkt ręcznie. Propozycje schronów i integracja z danymi państwowymi przychodzą po MVP (FR-004).
- **Bez automatycznego startu z alertów.** Execution Mode uruchamia się tylko ręcznie. Integracja z RSO i innymi alertami przychodzi po MVP (`PROJECT.md` 4.1 pkt 7).
- **Bez warstwy społeczności.** Brak punktów pomocy, zasobów sąsiedzkich i koordynacji lokalnej, bo MVP obsługuje jedno gospodarstwo domowe.
- **Bez szyfrowanego transferu planu.** Przekazanie odbywa się w najprostszej formie (FR-010).
- **Bez gwarancji pełnego offline i prywatności jako twardych wymagań.** Świadoma decyzja, patrz Non-Functional Requirements i Open Questions.
- **Bez punktów i streaków.** Odrzucone w decyzjach zakresowych; zostają tylko poważne kamienie milowe (FR-016).
- **Poza MVP: role domowników, milestones, emergency drill.** FR-005, FR-016 i FR-017 mają priorytet nice-to-have; w MVP jest jeden wspólny plan.

## Open Questions

1. **Offline i prywatność poza NFR:** zespół świadomie nie uznał ich za twarde wymagania MVP. Kłóci się to z zasadami z `PROJECT.md` (sekcja 3), z głównym kryterium sukcesu (demo w trybie samolotowym), z kryterium akceptacji US-01 („Całość działa w trybie samolotowym”) i z profilem lokalnym bez serwera. Do potwierdzenia: czy `PROJECT.md` aktualizujemy, czy wracamy do tych NFR. Owner: zespół.
2. **„72H Ready” jako poziom gotowości (FR-009, must-have) i jako milestone (FR-016, nice-to-have):** ten sam przykład występuje w obu wymaganiach. Do rozstrzygnięcia, czym w MVP różni się poziom gotowości od kamienia milowego. Owner: zespół.

# Zaimplementowane funkcjonalności – aplikacja mobilna (Suwalska Liga Darta)

Dokument opisuje dotychczas zaimplementowane funkcje aplikacji mobilnej (React Native / Expo). Przydatny przy planowaniu kolejnych kroków.

---

## 1. Nawigacja i ekrany

- **Stack Navigator** – jedna lista ekranów zależna od stanu logowania.
- **Przed zalogowaniem:** Home, TournamentLogin.
- **Po zalogowaniu:** MatchList, Match, QuickGameLobby.
- **Nagłówek** – HeaderTitle, LogoutButton, spójne kolory (np. #363062, #F99417).

---

## 2. Autentykacja

- **Home** – wybór trybu: „Turniej” lub „Szybki mecz” (obecnie oba prowadzą do TournamentLogin).
- **TournamentLogin** – logowanie przez kod turnieju (POST `/api/login`); po sukcesie zapis tokena + `tournamentId` w kontekście (AuthProvider).
- **Wylogowanie** – LogoutButton (np. wyczyszczenie tokena w AuthProvider).

---

## 3. Mecze turniejowe

- **MatchList** – lista aktywnych meczów turnieju (GET `/api/game/active?tournamentId=...`), grupowanie po numerze grupy, odświeżanie.
- **Wybór meczu** – modal z listą meczów w grupie, przejście do ekranu Match z danymi meczu.
- **Match** – rozgrywka pojedynczego meczu (2 graczy): wprowadzanie wyników legów, wygrany leg/mecz, wysyłka wyniku (POST `/api/game/update`), achievementy.
- **Counter / Stats** – licznik punktów i statystyki w trakcie meczu.

---

## 4. Szybkie mecze – Lobby

- **QuickGameLobby** – pełny flow lobby szybkiego meczu (2–6 graczy).
- **Tryby:** wybór „Utwórz” / „Dołącz”, tworzenie lobby (POST `/api/quick-game/lobby/create`), dołączenie po kodzie (GET `/api/quick-game/lobby/code/{code}`, POST `/api/quick-game/lobby/join`).
- **W lobby:** lista graczy, status „Gotowy”, opuszczenie lobby (Leave), odświeżanie co kilka sekund (polling).
- **Host:** przycisk „Rozpocznij mecz” gdy co najmniej 2 graczy i wszyscy gotowi (POST `/api/quick-game/lobby/{id}/start`).
- **Goście (bez konta):** podanie nazwy przy dołączeniu; cache nazw w AsyncStorage (`tempPlayerCache.js`) dla wygody.
- **Znajomi:** panel boczny (drawer) z listą znajomych (GET `/api/friends`), zaproszenie do lobby (POST `/api/quick-game/lobby/{id}/invite`).
- **Start meczu** – po „Rozpocznij mecz” przejście do ekranu Match z listą graczy z lobby.

---

## 5. Szybki mecz – rozgrywka (Match)

- **Wielu graczy (3–6)** – stan per gracz (wyniki legów, kolejność), dynamiczna logika gry.
- **Zakończenie meczu** – wysłanie wyników na POST `/api/quick-game/update` (lista graczy: `playerId`, wyniki, średnie, achievementy dla zarejestrowanych).
- **Counter / Stats** – dostosowane do wielu graczy (podświetlenie aktualnego gracza, podsumowanie).

---

## 6. Konfiguracja API

- **apiConfig.js** – `API_BASE_URL` oraz stałe URL-e dla: logowania, gier turniejowych (active, update), quick game (create, active, inProgress, update), lobby (create, join, code, leave, ready, start, invite), znajomych (`/friends`).
- **Uwaga:** dla emulatora Android często `10.0.2.2:8000`; dla fizycznego urządzenia adres IP komputera z backendem.

---

## 7. Stan i kontekst

- **AuthProvider** – token, `tournamentId`, stan zalogowania; udostępniany przez `useAuth()`.
- **Reducery (helpers/reducers)** – np. achievementy, wyniki graczy – używane przy zbieraniu danych do wysłania wyniku szybkiego meczu.

---

## 8. Komponenty pomocnicze

- **Counter** – punkty / stan w meczu (2 lub wielu graczy).
- **Stats / StatsRow / StatsTitleRow** – wyświetlanie statystyk w meczu.
- **QuickGameStartPanel** – panel startowy szybkiego meczu (jeśli używany w flow).
- **tempPlayerCache** – cache tymczasowych nazw graczy (AsyncStorage).

---

## 9. Czego brakuje (przykłady do rozważenia)

- **Profil użytkownika** – podgląd statystyk, historia (odczyt z API/web).
- **Lista znajomych** – dedykowany ekran zamiast tylko panelu w lobby.
- **Powiadomienia** – zaproszenia do znajomych / do lobby (push lub polling).
- **Historia szybkich meczów** – lista rozegranych meczów, szczegóły.
- **Ustawienia** – zmiana adresu API, theme, powiadomienia.
- **Offline / synchronizacja** – zapis lokalny i wysyłka gdy jest sieć (opcjonalnie).

---

## Zależności od backendu

Aplikacja korzysta z API Laravel (DartScore):

- Auth: `/api/login`, `/api/register`.
- Turniej: `/api/game/active`, `/api/game/update`, `/api/game/inProgress`.
- Quick game: `/api/quick-game/create`, `/api/quick-game/active`, `/api/quick-game/inProgress`, `/api/quick-game/update`.
- Lobby: `/api/quick-game/lobby/*` (create, join, code, leave, ready, start, invite).
- Znajomi: `/api/friends`, `/api/quick-game/lobby/{id}/invite`.

Szczegóły endpointów i wymaganej autentykacji opisane są w pliku **IMPLEMENTED_FEATURES.md** w projekcie API (DartScore).

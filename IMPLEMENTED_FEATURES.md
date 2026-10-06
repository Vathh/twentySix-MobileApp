# twentySix — stan implementacji (mobile) vs MVP

Mapa zgodności z [`../twentysix-backend/docs/product.md`](../twentysix-backend/docs/product.md).  
**Legenda:** ✅ gotowe · ⚠️ częściowo · ❌ brak

Backend: [`../twentysix-backend/IMPLEMENTED_FEATURES.md`](../twentysix-backend/IMPLEMENTED_FEATURES.md)

Ostatnia aktualizacja: październik 2026. Kryteria MVP v1 (tag `v1.0.0-mvp`) są spełnione. Otwarte tematy: [`../twentysix-backend/docs/NEXT_STEPS.md`](../twentysix-backend/docs/NEXT_STEPS.md).

---

## Podsumowanie

| Obszar | Stan |
|--------|------|
| Tablet turniejowy | ✅ kod, lista, lock, scoring H2H; grupy i playoff (w tym pocieszenie, etykiety DE) |
| Quick game online | ✅ FFA 2–8, `one_device` i `each_own` |
| Trening | ✅ 1–8, solo, bez konta; slot JA zalogowanego idzie na konto |
| Znajomi / zaproszenia | ✅ |
| Liga | ✅ lista kolejek, lobby, scoring na jednym telefonie |
| Profil | ✅ ten sam zestaw co web: przegląd, historia, kariera, checkouty |

---

## Ekrany i nawigacja

| Wymaganie | Status | Pliki |
|-----------|--------|-------|
| Wybór: Turniej / Quick game online / Trening | ✅ | `Home.jsx` |
| Logowanie kodem / QR turnieju | ✅ | `TournamentCode.jsx`, `parseTabletLoginCode` |
| Logowanie kontem (quick game online) | ✅ | `TournamentLogin.jsx` |
| Trening bez konta | ✅ | `TrainingMatchSetup.jsx` → `GameScoringScreen` |

---

## Quick game online

| Wymaganie | Status | Pliki |
|-----------|--------|-------|
| Lobby: tworzenie, zaproszenia | ✅ | `QuickGameLobby.jsx` |
| Tylko znajomi, invite-only | ✅ | API + lobby |
| Max 8 graczy | ✅ | `GameScoringScreen` N≤8 |
| `one_device` / `each_own` + sync FFA | ✅ | `useGameScoring` + `createFfaTransport` |
| Ujednolicony moduł scoringu | ✅ | `helpers/gameScoring/` — normalize, apply, transporty, offline/online visit flow |
| Format gry (`MatchFormat`) | ✅ | `MatchFormatPicker`, AsyncStorage; domyślnie 501 · 1 set · 2 legi |
| Rotacja openera lega | ✅ | `computeNextLegOpener.js` |
| Achievementy po meczu | ✅ | `POST /api/quick-game/update` + `gameId` |
| Presence (connected / disconnected / left) | ✅ | `POST .../ffa/presence`, banner w `GameScoringScreen` |
| Walkower 2P (`each_own`, przeciwnik wyszedł) | ✅ | backend `QuickGameFfaPresenceService` |
| Powrót do trwającego meczu | ✅ | `GET /api/quick-game/active-match`, banner na `Home.jsx` |
| Overlay „Czekaj na swoją kolejkę” / koniec meczu | ✅ | `useGameScoring`, `GameScoringScreen` |

---

## Trening

| Wymaganie | Status | Pliki |
|-----------|--------|-------|
| 1–8 graczy, imiona lokalne, solo | ✅ | `TrainingMatchSetup.jsx` (`MIN_PLAYERS = 1`) |
| Bez internetu / bez konta | ✅ | brak wywołań API |
| Wynik nie zapisywany | ✅ | alert po meczu |
| `one_device` — jeden telefon | ✅ | domyślnie w treningu |
| Format gry (`MatchFormat`) | ✅ | `MatchFormatPicker` + offline sety w reducerze |

---

## Tablet turniejowy

| Wymaganie | Status |
|-----------|--------|
| Kod + lista meczów + H2H scoring API/WS | ✅ |
| Lock meczu | ✅ |
| Playoff UI + `roundLabel` | ✅ |

---

## Znajomi

| Wymaganie | Status |
|-----------|--------|
| Lista znajomych | ✅ |
| Wysłanie zaproszenia (UI) | ✅ | `FriendsScreen` — wyszukiwanie + `POST /friends/invite` |
| Akceptacja zaproszenia znajomego | ✅ | `InvitationsScreen` — tab Znajomi |
| Usuwanie znajomego | ✅ | `FriendsScreen` |
| Zaproszenie turniejowe | ✅ |
| Push przy zaproszeniach | ✅ | `expo-notifications`, tap → `Zaproszenia` + tab |

---

## Scenariusze manualne — quick game

Patrz: [`../twentysix-backend/docs/scenariusze_manualne_quick_game_mvp_4e.md`](../twentysix-backend/docs/scenariusze_manualne_quick_game_mvp_4e.md)

Scenariusze A–F (lobby, trening, 2P/4P) + **G–I** (presence, walkover, powrót do meczu).

---

## Scenariusze manualne — turniej

Pełna checklista: [`../twentysix-backend/docs/scenariusze_manualne_turniej_mvp.md`](../twentysix-backend/docs/scenariusze_manualne_turniej_mvp.md).

Skrót:

1. Grupa BO3 na tablecie → tabela na webie.
2. Playoff → awans w drabince.
3. Live web + achievementy po meczu.
4. Korekta / walkower na webie.

---

## Scenariusze manualne — web gość

[`../twentysix-backend/docs/scenariusze_manualne_web_gosc_krok3.md`](../twentysix-backend/docs/scenariusze_manualne_web_gosc_krok3.md)

---

## Po tagu `v1.0.0-mvp`

| Obszar | Status | Pliki |
|--------|--------|-------|
| Mecz ligowy | ✅ | `components/League/LeagueGameLobby.jsx`, scoring H2H |
| Profil = web | ✅ | `PlayerProfileScreen.jsx`, `ProfileCareerDashboard.jsx` |
| Playoff: główna i pocieszenie | ✅ | kafelki na liście tabletu |
| Etykiety rund DE | ✅ | polskie nazwy rund na scoringu |
| Średnia 3-dartowa w turnieju i lidze | ✅ | licznik na ekranie meczu |
| Zmiana zaczynającego przed pierwszą wizytą | ✅ | H2H |
| Outbox wizyty po powrocie sieci | ✅ | sędzia nie gubi komendy, gdy serwer już ją ma |
| Cricket i pozostałe tryby quick/trening | ✅ | wtyczki padu w `helpers/gameScoring/`; brak tych trybów w turnieju |

Otwarte zadania: [`../twentysix-backend/docs/NEXT_STEPS.md`](../twentysix-backend/docs/NEXT_STEPS.md).

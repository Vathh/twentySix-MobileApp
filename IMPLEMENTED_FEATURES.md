# twentySix — stan implementacji (mobile) vs MVP

Mapa zgodności z [`../twentysix-backend/docs/product.md`](../twentysix-backend/docs/product.md).  
**Legenda:** ✅ gotowe · ⚠️ częściowo · ❌ brak

Backend: [`../twentysix-backend/IMPLEMENTED_FEATURES.md`](../twentysix-backend/IMPLEMENTED_FEATURES.md)

Ostatnia aktualizacja: lipiec 2026 — MVP v1 otagowane. Zadania: [`../twentysix-backend/docs/NEXT_STEPS.md`](../twentysix-backend/docs/NEXT_STEPS.md).

---

## Podsumowanie

| Obszar | Postęp |
|--------|--------|
| Tablet turniejowy | ~95% |
| Quick game online | ~95% |
| Trening (local) | ✅ |
| Znajomi / zaproszenia | ✅ |

---

## Ekrany i nawigacja

| Wymaganie | Status | Pliki |
|-----------|--------|-------|
| Wybór: Turniej / Quick game online / Trening | ✅ | `Home.jsx` |
| Logowanie kodem turnieju | ✅ | `TournamentCode.jsx` |
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
| 2–8 graczy, imiona lokalne | ✅ | `TrainingMatchSetup.jsx` |
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

## Po MVP v1

Aktywne zadania: [`../twentysix-backend/docs/NEXT_STEPS.md`](../twentysix-backend/docs/NEXT_STEPS.md).

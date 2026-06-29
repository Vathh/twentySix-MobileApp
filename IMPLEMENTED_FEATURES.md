# twentySix — stan implementacji (mobile) vs MVP

Mapa zgodności z [`../twentysix-backend/docs/product.md`](../twentysix-backend/docs/product.md).  
**Legenda:** ✅ gotowe · ⚠️ częściowo · ❌ brak

Backend: [`../twentysix-backend/IMPLEMENTED_FEATURES.md`](../twentysix-backend/IMPLEMENTED_FEATURES.md)

Ostatnia aktualizacja: czerwiec 2026 (unifikacja scoringu).

---

## Podsumowanie

| Obszar | Postęp |
|--------|--------|
| Tablet turniejowy | ~90% |
| Quick game online | ~85% |
| Trening (local) | ✅ |
| Znajomi / zaproszenia | ~90% |

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
| Ujednolicony moduł scoringu | ✅ | `helpers/gameScoring/` — normalize, apply, transporty |
| BO3 — pierwszy do 2 legów | ✅ | domyślnie 2 |
| Rotacja openera lega | ✅ | `computeNextLegOpener.js` |
| Achievementy po meczu | ✅ | `POST /api/quick-game/update` + `gameId` |

---

## Trening

| Wymaganie | Status | Pliki |
|-----------|--------|-------|
| 2–8 graczy, imiona lokalne | ✅ | `TrainingMatchSetup.jsx` |
| Bez internetu / bez konta | ✅ | brak wywołań API |
| Wynik nie zapisywany | ✅ | alert po meczu |
| `one_device` — jeden telefon | ✅ | domyślnie w treningu |

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

---

## Scenariusze manualne — quick game (krok 4E)

Patrz: [`../twentysix-backend/docs/scenariusze_manualne_quick_game_mvp_4e.md`](../twentysix-backend/docs/scenariusze_manualne_quick_game_mvp_4e.md)

1. **2P each_own** — sync FFA, BO3.
2. **4P one_device** — host wpisuje, rotacja openera A→B→C→D.
3. **Trening offline** — brak zapisu w bazie.
4. **Trening online** — celowo bez zapisu mimo sieci.

---

## Scenariusze manualne — turniej (krok 2)

Pełna checklista: [`../twentysix-backend/docs/scenariusze_manualne_turniej_mvp.md`](../twentysix-backend/docs/scenariusze_manualne_turniej_mvp.md).

Skrót:

1. Grupa BO3 na tablecie → tabela na webie.
2. Playoff → awans w drabince.
3. Live web + achievementy po meczu.
4. Korekta / walkower na webie.

---

## Priorytet mobile (po kroku 4)

1. ~~Zaproszenia znajomych (wysyłka + akceptacja UI)~~ ✅
2. ~~Spójna marka twentySix we wszystkich tytułach~~ ✅
3. Krykiet (poza MVP).

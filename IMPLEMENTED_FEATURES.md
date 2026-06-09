# twentySix — stan implementacji (mobile) vs MVP

Mapa zgodności z [`../twentysix-backend/docs/product.md`](../twentysix-backend/docs/product.md).  
**Legenda:** ✅ gotowe · ⚠️ częściowo · ❌ brak

Backend (API): [`../twentysix-backend/IMPLEMENTED_FEATURES.md`](../twentysix-backend/IMPLEMENTED_FEATURES.md)

---

## Podsumowanie

| Obszar | Postęp |
|--------|--------|
| Tablet turniejowy | ~90% |
| Quick game | ~55% |
| Znajomi / zaproszenia | ~40% |
| Offline / solo | 0% |

---

## Ekrany i nawigacja

| Wymaganie | Status | Pliki |
|-----------|--------|-------|
| Gość: wybór trybu (turniej / quick) | ✅ | `components/Core/Home.jsx`, `Screens.jsx` |
| Logowanie kodem turnieju | ✅ | `components/Tournament/TournamentLogin.jsx` |
| Logowanie kontem (quick game) | ✅ | `TournamentLogin.jsx` (email+hasło) |
| Menu po zalogowaniu | ✅ | `components/Core/MenuScreen.jsx` |
| Marka **twentySix** w nagłówku | ⚠️ | `HeaderTitle.jsx` — tylko część ekranów |
| Offline / solo ćwiczenia | ❌ | Brak flow |

---

## Tablet turniejowy

| Wymaganie | Status | Pliki / uwagi |
|-----------|--------|---------------|
| Kod bez konta | ✅ | `TournamentCode.jsx`, `POST /api/login` |
| Faza grupowa: kafelki grup → mecze | ✅ | `GameList.jsx` — sekcja „Faza grupowa” |
| Playoff: płaska lista + runda | ✅ | `GameList.jsx` — sekcja „Playoff” z `roundLabel` z API |
| Tylko mecze `oczekujący` | ⚠️ | Lista z API active; brak jawnych statusów w UI |
| Lock → `w trakcie` przy wyborze | ✅ | `lockTournamentGame.js`, `GameList.jsx` → `POST /api/game/inProgress` |
| Sędziowanie 501 H2H | ✅ | `GameScoringScreen.jsx` — scoring API + WS (`useGameScoring`) |
| Scoring API + WebSocket (turniej) | ✅ | `group-games` / `playoff-games` + Reverb `group-game.*` / `playoff-game.*` |
| Achievementy do API | ✅ | Po meczu: tylko achievementy (`POST /api/game/update` na `FINISHED`) |

---

## Quick game

| Wymaganie | Status | Pliki / uwagi |
|-----------|--------|---------------|
| Lobby: tworzenie, zaproszenia | ✅ | `QuickGameLobby.jsx` |
| Akceptacja zaproszenia lobby | ✅ | `LobbyInvitationsScreen.jsx` |
| Tylko znajomi (MVP) | ❌ | `add-guest` w lobby |
| Max 8 graczy | ⚠️ | Cap **6** w UI |
| Kolejność graczy (drag) | ✅ | `QuickGameLobby.jsx` |
| `one_device` / `each_own` | ⚠️ | ✅ dla 2P online; ❌ 3+ multi-device |
| FFA 3+ (każdy gra sam) | ⚠️ | Lokalnie w `Match.jsx`; brak live sync 3+ |
| BO3 — pierwszy do **2** legów | ⚠️ | Domyślnie `legsCount=3` |
| Rotacja startu legów (po openerze) | ❌ | Offline: `(winnerIdx+1)` zamiast opener+1 |
| Wyniki w statystykach gracza | ⚠️ | Zależy od API po meczu |
| Min. 2 do startu | ✅ | Walidacja w lobby |

---

## Znajomi

| Wymaganie | Status | Pliki / uwagi |
|-----------|--------|---------------|
| Lista znajomych | ✅ | `FriendsScreen.jsx` |
| Wysłanie zaproszenia do znajomego | ❌ | Brak UI `POST /friends/invite` |
| Akceptacja / odrzucenie zaproszenia | ❌ | Brak ekranu `invitations/received` |
| Zaproszenie turniejowe (akceptacja mobile) | ✅ | `InvitationsScreen` — zakładka Turniej |

---

## Offline / ćwiczenia

| Wymaganie | Status |
|-----------|--------|
| Mecz offline bez zapisu | ❌ |
| Solo ćwiczenia | ❌ |

---

## Konfiguracja / marka

| Element | Status |
|---------|--------|
| `app.json` → `name: twentySix` | ✅ |
| `HeaderTitle` → twentySix | ✅ |
| Tytuły ekranów, Home | ⚠️ |
| Ikona z logo **26** | ⚠️ | Assets bez rebrandu graficznego (tekst wszędzie: twentySix) |

---

## Scenariusze manualne — scoring turniejowy (krok 3)

1. **Grupa BO3:** lock meczu w `GameList` → 2 legi przez tablet → tabela grupy na webie się aktualizuje.
2. **Playoff:** ćwierćfinał → zwycięzca w następnym slocie drabinki.
3. **Live web:** `/games/playoff/{id}/live` odświeża się przy wizytach z tabletu (Reverb).
4. **Achievementy:** 180 / HF zapisane po meczu (`POST /api/game/update` achievements-only).
5. **Regresja quick:** lobby 2P online scoring bez zmian (`useQuickGameScoring` → `useGameScoring`).

---

## Priorytet mobile (sugerowane)

1. Zaproszenia znajomych (wysyłka + akceptacja) — mobile only MVP.
2. ~~Zaproszenia turniejowe — akceptacja na mobile.~~ ✅
3. ~~Lock meczu tablet + playoff UI + scoring API/WS.~~ ✅ *(czerwiec 2026)*
4. Quick game: rotacja legów, BO3=2, FFA do 8, friends-only.
5. Offline + solo ćwiczenia.
6. Spójna marka twentySix w UI.

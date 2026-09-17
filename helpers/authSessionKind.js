/**
 * Dwie sesje mobile: konto gracza (email/hasło) i sędziowanie kodem turnieju.
 * Nie wolno ich mylić przy 401 / wylogowaniu / refreshu.
 */
export function isTabletRefereeSession(auth) {
	return Boolean(auth?.accessToken) && auth?.tournamentId != null;
}

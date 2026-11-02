import * as SecureStore from 'expo-secure-store';

const TABLET_SESSION_KEY = 'twentysix_tablet_referee_session';

/**
 * Sesja sędziowania kodem turnieju. Osobno od konta gracza, żeby wygaszenie
 * tabletu (system zamyka aplikację) nie wyrzucało z listy meczów.
 *
 * @typedef {object} TabletRefereeSession
 * @property {string} accessToken
 * @property {number} tournamentId
 */

/** @returns {Promise<TabletRefereeSession|null>} */
export async function loadTabletRefereeSession() {
	try {
		const raw = await SecureStore.getItemAsync(TABLET_SESSION_KEY);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw);
		const tournamentId = Number(parsed?.tournamentId);
		if (!parsed?.accessToken || !Number.isInteger(tournamentId)) {
			return null;
		}
		return {
			accessToken: String(parsed.accessToken),
			tournamentId,
		};
	} catch {
		return null;
	}
}

/** @param {TabletRefereeSession|null} session */
export async function saveTabletRefereeSession(session) {
	if (!session?.accessToken || session.tournamentId == null) {
		await clearTabletRefereeSession();
		return;
	}
	await SecureStore.setItemAsync(
		TABLET_SESSION_KEY,
		JSON.stringify({
			accessToken: session.accessToken,
			tournamentId: Number(session.tournamentId),
		}),
	);
}

export async function clearTabletRefereeSession() {
	try {
		await SecureStore.deleteItemAsync(TABLET_SESSION_KEY);
	} catch {
		// ignore
	}
}

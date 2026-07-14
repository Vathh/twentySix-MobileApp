import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'twentysix_auth_session';

/**
 * @typedef {object} StoredAuthSession
 * @property {string} accessToken
 * @property {number|null} userId
 * @property {number|null} playerId
 * @property {string|null} playerName
 * @property {string|null} email
 * @property {boolean} rememberMe
 */

/** @param {object} auth — stan z AuthProvider */
export function buildStoredSession(auth, rememberMe) {
	if (!auth?.accessToken || !rememberMe) {
		return null;
	}
	return {
		accessToken: auth.accessToken,
		userId: auth.userId ?? null,
		playerId: auth.playerId ?? null,
		playerName: auth.playerName ?? null,
		email: auth.email ?? null,
		rememberMe: true,
	};
}

/** @returns {Promise<StoredAuthSession|null>} */
export async function loadStoredSession() {
	try {
		const raw = await SecureStore.getItemAsync(SESSION_KEY);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw);
		if (!parsed?.accessToken || parsed.rememberMe !== true) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

/** @param {StoredAuthSession|null} session */
export async function saveStoredSession(session) {
	if (!session?.accessToken) {
		await clearStoredSession();
		return;
	}
	await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
	try {
		await SecureStore.deleteItemAsync(SESSION_KEY);
	} catch {
		// ignore
	}
}

/** @param {StoredAuthSession} stored */
export function storedSessionToAuth(stored) {
	return {
		accessToken: stored.accessToken,
		tournamentId: null,
		userId: stored.userId ?? null,
		playerId: stored.playerId ?? null,
		playerName: stored.playerName ?? null,
		email: stored.email ?? null,
	};
}

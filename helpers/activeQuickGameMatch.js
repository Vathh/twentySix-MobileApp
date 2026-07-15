import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchActiveFfaMatch } from './quickGameFfaApi';

const STORAGE_KEY = '@twentysix/active_ffa_lobby';

export async function saveActiveFfaLobby(lobbyId) {
	if (!lobbyId) return;
	await AsyncStorage.setItem(STORAGE_KEY, String(lobbyId));
}

export async function clearActiveFfaLobby() {
	await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Aktywny mecz tylko z API — brak fallbacku z pamięci lokalnej (unika „wróć do meczu” po left).
 */
export async function resolveActiveFfaMatch(accessToken) {
	if (!accessToken) {
		await clearActiveFfaLobby();
		return null;
	}

	try {
		const match = await fetchActiveFfaMatch(accessToken);
		if (match?.lobbyId) {
			await saveActiveFfaLobby(match.lobbyId);
			return match;
		}
		await clearActiveFfaLobby();
		return null;
	} catch {
		return null;
	}
}

export function buildGameScoringParamsFromActiveMatch(match) {
	if (!match?.lobbyId) return null;

	const players = (match.players ?? []).map((p) => ({
		id: p.id,
		name: p.name,
	}));

	return {
		quickGame: {
			players,
			lobbyId: match.lobbyId,
			matchFormat: match.matchFormat,
			gameType: match.gameType ?? 'x01',
			scoringMode: match.scoringMode ?? 'each_own',
			isHost: !!match.isHost,
			myPlayerIndex: match.myPlayerIndex ?? 0,
		},
	};
}

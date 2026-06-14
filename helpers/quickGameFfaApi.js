import { API_BASE_URL } from './apiConfig';

const lobbyFfaPath = (lobbyId) =>
	`${API_BASE_URL}/quick-game/lobby/${lobbyId}/ffa`;

export const getQuickGameFfaStateUrl = (lobbyId) =>
	`${lobbyFfaPath(lobbyId)}/state`;

export const getQuickGameFfaVisitUrl = (lobbyId) =>
	`${lobbyFfaPath(lobbyId)}/visits`;

export const getQuickGameFfaUndoUrl = (lobbyId) =>
	`${lobbyFfaPath(lobbyId)}/visits/undo`;

export async function fetchFfaScoringState(lobbyId, accessToken) {
	const res = await fetch(getQuickGameFfaStateUrl(lobbyId), {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data?.message || 'Nie udało się pobrać stanu meczu');
	}
	return data;
}

export async function recordFfaVisit(lobbyId, accessToken, payload) {
	const res = await fetch(getQuickGameFfaVisitUrl(lobbyId), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(payload),
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data?.message || 'Nie udało się zapisać wizyty');
	}
	return data;
}

export async function undoFfaVisit(lobbyId, accessToken) {
	const res = await fetch(getQuickGameFfaUndoUrl(lobbyId), {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data?.message || 'Nie udało się cofnąć wizyty');
	}
	return data;
}

export function newFfaClientVisitId() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

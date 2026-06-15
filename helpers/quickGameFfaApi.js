import {
	getQuickGameFfaStateUrl,
	getQuickGameFfaUndoUrl,
	getQuickGameFfaVisitUrl,
} from './apiConfig';

export { getQuickGameFfaStateUrl, getQuickGameFfaVisitUrl, getQuickGameFfaUndoUrl };

export async function fetchFfaScoringState(lobbyId, accessToken) {
	const url = getQuickGameFfaStateUrl(lobbyId);
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/json',
		},
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
			Accept: 'application/json',
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
			Accept: 'application/json',
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

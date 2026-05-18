import {
	getMatchScoringCloseLegUrl,
	getMatchScoringStartLegUrl,
	getMatchScoringStateUrl,
	getMatchScoringUndoUrl,
	getMatchScoringVisitUrl,
} from './apiConfig';

const jsonHeaders = (accessToken) => ({
	'Content-Type': 'application/json',
	...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

async function parseJsonResponse(res) {
	const text = await res.text();
	try {
		return { data: JSON.parse(text), text };
	} catch {
		return { data: null, text };
	}
}

export async function fetchMatchScoringState(baseUrl, accessToken) {
	const res = await fetch(getMatchScoringStateUrl(baseUrl), {
		headers: jsonHeaders(accessToken),
	});
	const { data, text } = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error((data && data.message) || text || 'Nie udało się pobrać stanu meczu');
	}
	return data;
}

export async function startMatchLeg(
	baseUrl,
	accessToken,
	player1DoubleTracked,
	player2DoubleTracked,
) {
	const res = await fetch(getMatchScoringStartLegUrl(baseUrl), {
		method: 'POST',
		headers: jsonHeaders(accessToken),
		body: JSON.stringify({ player1DoubleTracked, player2DoubleTracked }),
	});
	const { data, text } = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error((data && data.message) || text || 'Nie udało się rozpocząć lega');
	}
	return data;
}

export async function recordMatchVisit(baseUrl, legId, accessToken, payload) {
	const res = await fetch(getMatchScoringVisitUrl(baseUrl, legId), {
		method: 'POST',
		headers: jsonHeaders(accessToken),
		body: JSON.stringify(payload),
	});
	const { data, text } = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error((data && data.message) || text || 'Nie udało się zapisać wizyty');
	}
	return data;
}

export async function undoMatchVisit(baseUrl, legId, accessToken) {
	const res = await fetch(getMatchScoringUndoUrl(baseUrl, legId), {
		method: 'POST',
		headers: jsonHeaders(accessToken),
	});
	const { data, text } = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error((data && data.message) || text || 'Nie udało się cofnąć wizyty');
	}
	return data;
}

export async function closeMatchLeg(baseUrl, legId, accessToken, payload) {
	const res = await fetch(getMatchScoringCloseLegUrl(baseUrl, legId), {
		method: 'POST',
		headers: jsonHeaders(accessToken),
		body: JSON.stringify(payload),
	});
	const { data, text } = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error((data && data.message) || text || 'Nie udało się zamknąć lega');
	}
	return data;
}

/** Prosty UUID v4 (bez zależności expo-crypto). */
export function newClientVisitId() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

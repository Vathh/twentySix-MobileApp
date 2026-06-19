import {
	getGameScoringCloseLegUrl,
	getGameScoringStartLegUrl,
	getGameScoringStateUrl,
	getGameScoringUndoUrl,
	getGameScoringVisitUrl,
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

export async function fetchGameScoringState(baseUrl, accessToken) {
	const res = await fetch(getGameScoringStateUrl(baseUrl), {
		headers: jsonHeaders(accessToken),
	});
	const { data, text } = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error((data && data.message) || text || 'Nie udało się pobrać stanu meczu');
	}
	return data;
}

export async function startGameLeg(
	baseUrl,
	accessToken,
	player1DoubleTracked,
	player2DoubleTracked,
) {
	const res = await fetch(getGameScoringStartLegUrl(baseUrl), {
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

export async function recordGameVisit(baseUrl, legId, accessToken, payload) {
	const res = await fetch(getGameScoringVisitUrl(baseUrl, legId), {
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

export async function undoGameVisit(baseUrl, legId, accessToken) {
	const res = await fetch(getGameScoringUndoUrl(baseUrl, legId), {
		method: 'POST',
		headers: jsonHeaders(accessToken),
	});
	const { data, text } = await parseJsonResponse(res);
	if (!res.ok) {
		throw new Error((data && data.message) || text || 'Nie udało się cofnąć wizyty');
	}
	return data;
}

export async function closeGameLeg(baseUrl, legId, accessToken, payload) {
	const res = await fetch(getGameScoringCloseLegUrl(baseUrl, legId), {
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

import {
	getQuickGameFfaStateUrl,
	getQuickGameFfaUndoUrl,
	getQuickGameFfaVisitUrl,
	getQuickGameFfaPresenceUrl,
	getQuickGameFfaAbortUrl,
	getQuickGameFfaCricketVisitUrl,
	getQuickGameFfaCricketUndoUrl,
	getQuickGameFfaBob27DartUrl,
	getQuickGameFfaBob27UndoUrl,
	getQuickGameFfaAtcVisitUrl,
	getQuickGameFfaAtcUndoUrl,
	getQuickGameFfaCatch40VisitUrl,
	getQuickGameFfaCatch40UndoUrl,
	getQuickGameFfaCricket56VisitUrl,
	getQuickGameFfaCricket56UndoUrl,
	QUICK_GAME_LOBBY_ACTIVE_MATCH_URL,
} from './apiConfig';
import { throwIfScoringResponseNotOk } from './gameScoring/scoringRequestError.js';

export {
	getQuickGameFfaStateUrl,
	getQuickGameFfaVisitUrl,
	getQuickGameFfaUndoUrl,
	getQuickGameFfaPresenceUrl,
	getQuickGameFfaCricketVisitUrl,
	getQuickGameFfaCricketUndoUrl,
	QUICK_GAME_LOBBY_ACTIVE_MATCH_URL,
};

async function parseJson(res) {
	const text = await res.text();
	try {
		return { data: JSON.parse(text), text };
	} catch {
		return { data: null, text };
	}
}

async function ffaGet(url, accessToken, fallbackMessage) {
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/json',
		},
	});
	const { data, text } = await parseJson(res);
	throwIfScoringResponseNotOk(res, data, text, fallbackMessage);
	return data;
}

async function ffaPost(url, accessToken, fallbackMessage, payload = undefined) {
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${accessToken}`,
			...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}),
		},
		body: payload !== undefined ? JSON.stringify(payload) : undefined,
	});
	const { data, text } = await parseJson(res);
	throwIfScoringResponseNotOk(res, data, text, fallbackMessage);
	return data;
}

export async function fetchFfaScoringState(lobbyId, accessToken) {
	return ffaGet(
		getQuickGameFfaStateUrl(lobbyId),
		accessToken,
		'Nie udało się pobrać stanu meczu',
	);
}

export async function recordFfaVisit(lobbyId, accessToken, payload) {
	return ffaPost(
		getQuickGameFfaVisitUrl(lobbyId),
		accessToken,
		'Nie udało się zapisać wizyty',
		payload,
	);
}

export async function undoFfaVisit(lobbyId, accessToken) {
	return ffaPost(
		getQuickGameFfaUndoUrl(lobbyId),
		accessToken,
		'Nie udało się cofnąć wizyty',
	);
}

export async function abortFfaGame(lobbyId, accessToken) {
	return ffaPost(
		getQuickGameFfaAbortUrl(lobbyId),
		accessToken,
		'Nie udało się skasować gry',
	);
}

export async function postFfaPresence(lobbyId, accessToken, status) {
	return ffaPost(
		getQuickGameFfaPresenceUrl(lobbyId),
		accessToken,
		'Nie udało się zaktualizować obecności',
		{ status },
	);
}

export async function recordFfaCricketVisit(lobbyId, accessToken, payload) {
	return ffaPost(
		getQuickGameFfaCricketVisitUrl(lobbyId),
		accessToken,
		'Nie udało się zapisać wizyty',
		payload,
	);
}

export async function undoFfaCricketVisit(lobbyId, accessToken) {
	return ffaPost(
		getQuickGameFfaCricketUndoUrl(lobbyId),
		accessToken,
		'Nie udało się cofnąć wizyty',
	);
}

export async function recordFfaBob27Dart(lobbyId, accessToken, payload) {
	return ffaPost(
		getQuickGameFfaBob27DartUrl(lobbyId),
		accessToken,
		'Nie udało się zapisać wizyty',
		payload,
	);
}

export async function undoFfaBob27Dart(lobbyId, accessToken) {
	return ffaPost(
		getQuickGameFfaBob27UndoUrl(lobbyId),
		accessToken,
		'Nie udało się cofnąć rzutu',
	);
}

export async function recordFfaAtcVisit(lobbyId, accessToken, payload) {
	return ffaPost(
		getQuickGameFfaAtcVisitUrl(lobbyId),
		accessToken,
		'Nie udało się zapisać wizyty',
		payload,
	);
}

export async function undoFfaAtcVisit(lobbyId, accessToken) {
	return ffaPost(
		getQuickGameFfaAtcUndoUrl(lobbyId),
		accessToken,
		'Nie udało się cofnąć wizyty',
	);
}

export async function recordFfaCatch40Visit(lobbyId, accessToken, payload) {
	return ffaPost(
		getQuickGameFfaCatch40VisitUrl(lobbyId),
		accessToken,
		'Nie udało się zapisać wizyty',
		payload,
	);
}

export async function undoFfaCatch40Visit(lobbyId, accessToken) {
	return ffaPost(
		getQuickGameFfaCatch40UndoUrl(lobbyId),
		accessToken,
		'Nie udało się cofnąć wizyty',
	);
}

export async function recordFfaCricket56Visit(lobbyId, accessToken, payload) {
	return ffaPost(
		getQuickGameFfaCricket56VisitUrl(lobbyId),
		accessToken,
		'Nie udało się zapisać wizyty',
		payload,
	);
}

export async function undoFfaCricket56Visit(lobbyId, accessToken) {
	return ffaPost(
		getQuickGameFfaCricket56UndoUrl(lobbyId),
		accessToken,
		'Nie udało się cofnąć wizyty',
	);
}

export async function fetchActiveFfaGame(accessToken) {
	const data = await ffaGet(
		QUICK_GAME_LOBBY_ACTIVE_MATCH_URL,
		accessToken,
		'Nie udało się pobrać aktywnego meczu',
	);
	return data?.match ?? null;
}

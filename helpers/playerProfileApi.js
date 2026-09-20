import { getPlayerCareerUrl, getPlayerGamesUrl, getPlayerProfileUrl } from './apiConfig';
import { apiRequest } from './apiClient';
import { CONNECTION_ERROR_MESSAGE, userFacingErrorMessage } from './userFacingError';

function failMessage(status, data, fallback, error) {
	return userFacingErrorMessage({ error, status, data, fallback });
}

/**
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, message: string }>}
 */
export async function fetchPlayerProfile(playerId, accessToken) {
	if (!playerId || !accessToken) {
		return { ok: false, status: 0, message: 'Brak danych logowania.' };
	}

	try {
		const { ok, status, data, error } = await apiRequest(getPlayerProfileUrl(playerId), { accessToken });
		if (!ok) {
			return {
				ok: false,
				status,
				message: failMessage(status, data, 'Nie udało się wczytać profilu.', error),
			};
		}
		return { ok: true, data };
	} catch (error) {
		return {
			ok: false,
			status: 0,
			message: failMessage(0, null, CONNECTION_ERROR_MESSAGE, error),
		};
	}
}

/**
 * @returns {Promise<{ ok: true, data: { items: array, has_more: boolean } } | { ok: false, message: string }>}
 */
export async function fetchPlayerGames(playerId, accessToken, page = 1) {
	if (!playerId || !accessToken) {
		return { ok: false, message: 'Brak danych logowania.' };
	}

	try {
		const { ok, status, data, error } = await apiRequest(getPlayerGamesUrl(playerId, page), { accessToken });
		if (!ok) {
			return {
				ok: false,
				message: failMessage(status, data, 'Nie udało się wczytać historii.', error),
			};
		}
		return { ok: true, data };
	} catch (error) {
		return { ok: false, message: failMessage(0, null, CONNECTION_ERROR_MESSAGE, error) };
	}
}

/**
 * @returns {Promise<{ ok: true, data: object } | { ok: false, message: string }>}
 */
export async function fetchPlayerCareer(playerId, accessToken, windowKey = '90d', source = 'all') {
	if (!playerId || !accessToken) {
		return { ok: false, message: 'Brak danych logowania.' };
	}

	try {
		const { ok, status, data, error } = await apiRequest(
			getPlayerCareerUrl(playerId, windowKey, source),
			{ accessToken },
		);
		if (!ok) {
			return {
				ok: false,
				message: failMessage(status, data, 'Nie udało się wczytać kariery.', error),
			};
		}
		return { ok: true, data };
	} catch (error) {
		return { ok: false, message: failMessage(0, null, CONNECTION_ERROR_MESSAGE, error) };
	}
}

/**
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, data: object }>}
 */
export async function updatePlayerProfile(playerId, accessToken, { description }) {
	if (!playerId || !accessToken) {
		return { ok: false, status: 0, data: { message: 'Brak danych logowania.' } };
	}

	try {
		return await apiRequest(getPlayerProfileUrl(playerId), {
			method: 'PUT',
			accessToken,
			json: true,
			body: { description },
		});
	} catch (error) {
		return {
			ok: false,
			status: 0,
			data: { message: failMessage(0, null, CONNECTION_ERROR_MESSAGE, error) },
		};
	}
}

import { getGameDetailUrl } from './apiConfig';
import { apiRequest } from './apiClient';
import { CONNECTION_ERROR_MESSAGE, userFacingErrorMessage } from './userFacingError';

function failMessage(status, data, error) {
	return userFacingErrorMessage({
		error,
		status,
		data,
		fallback: 'Nie udało się wczytać meczu.',
	});
}

/**
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, message: string }>}
 */
export async function fetchGameDetail(type, gameId, accessToken) {
	if (!type || !gameId || !accessToken) {
		return { ok: false, status: 0, message: 'Brak danych meczu.' };
	}

	try {
		const { ok, status, data, error } = await apiRequest(getGameDetailUrl(type, gameId), {
			accessToken,
		});
		if (!ok) {
			return {
				ok: false,
				status,
				message: failMessage(status, data, error),
			};
		}
		return { ok: true, data };
	} catch (error) {
		return {
			ok: false,
			status: 0,
			message: failMessage(0, null, error) || CONNECTION_ERROR_MESSAGE,
		};
	}
}

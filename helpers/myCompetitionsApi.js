import { getOrganizationLeaveUrl, ME_COMPETITIONS_URL } from './apiConfig';
import { apiRequest } from './apiClient';
import { SESSION_EXPIRED_MESSAGE } from './sessionExpired';

/**
 * Hub „Gdzie gram”: sezony turniejowe, ligi i organizacje użytkownika.
 *
 * @returns {Promise<{
 *   ok: true,
 *   data: { seasons: Array, leagues: Array, organizations: Array }
 * } | { ok: false, status: number, message: string }>}
 */
export async function fetchMyCompetitions(accessToken) {
	if (!accessToken) {
		return { ok: false, status: 0, message: 'Brak autoryzacji.' };
	}

	try {
		const { ok, status, data } = await apiRequest(ME_COMPETITIONS_URL, { accessToken });
		if (!ok) {
			return {
				ok: false,
				status,
				message:
					status === 401
						? SESSION_EXPIRED_MESSAGE
						: data.message || 'Nie udało się wczytać rozgrywek.',
			};
		}

		return {
			ok: true,
			data: {
				seasons: Array.isArray(data?.seasons) ? data.seasons : [],
				leagues: Array.isArray(data?.leagues) ? data.leagues : [],
				organizations: Array.isArray(data?.organizations) ? data.organizations : [],
			},
		};
	} catch {
		return { ok: false, status: 0, message: 'Błąd połączenia.' };
	}
}

export async function leaveOrganization(organizationId, accessToken) {
	if (!accessToken) {
		return { ok: false, status: 0, message: 'Brak autoryzacji.' };
	}

	try {
		const { ok, status, data } = await apiRequest(getOrganizationLeaveUrl(organizationId), {
			method: 'POST',
			accessToken,
			json: true,
			body: {},
		});
		if (!ok) {
			return {
				ok: false,
				status,
				message: data?.message || 'Nie udało się wypisać z organizacji.',
			};
		}

		return { ok: true, message: data?.message || 'Wypisano ze składu organizacji.' };
	} catch {
		return { ok: false, status: 0, message: 'Błąd połączenia.' };
	}
}

import { GAME_IN_PROGRESS_API_URL, GAME_RELEASE_API_URL } from './apiConfig';
import { notifyIfUnauthorized } from './sessionExpired';
import { userFacingErrorMessage } from './userFacingError';

/**
 * Blokuje grę turniejową (status in_progress) przed wejściem w scoring.
 * @returns {Promise<{ ok: true } | { ok: false, message: string, status: number }>}
 */
export async function lockTournamentGame({ gameId, type, accessToken }) {
	try {
		const res = await fetch(GAME_IN_PROGRESS_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				gameId,
				type,
			}),
		});

		if (res.ok) {
			return { ok: true };
		}

		notifyIfUnauthorized(res.status);

		let data = {};
		try {
			data = await res.json();
		} catch {
			// ignore
		}

		return {
			ok: false,
			message: userFacingErrorMessage({
				status: res.status,
				data,
				fallback: 'Nie udało się rozpocząć meczu.',
			}),
			status: res.status,
		};
	} catch (error) {
		return {
			ok: false,
			message: userFacingErrorMessage({
				error,
				fallback: 'Nie udało się rozpocząć meczu.',
			}),
			status: 0,
		};
	}
}

/**
 * Odblokowuje mecz bez wyniku (status scheduled) po opuszczeniu scoringu.
 */
export async function releaseTournamentGame({ gameId, type, accessToken }) {
	try {
		const res = await fetch(GAME_RELEASE_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				gameId,
				type,
			}),
		});

		notifyIfUnauthorized(res.status);

		if (res.ok) {
			return { ok: true };
		}
	} catch {
		// ignore — wyjście z ekranu i tak dozwolone
	}

	return { ok: false };
}

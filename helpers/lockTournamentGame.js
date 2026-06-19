import { GAME_IN_PROGRESS_API_URL, GAME_RELEASE_API_URL } from './apiConfig';

/**
 * Blokuje grę turniejową (status in_progress) przed wejściem w scoring.
 * @returns {Promise<{ ok: true } | { ok: false, message: string, status: number }>}
 */
export async function lockTournamentGame({ gameId, type, accessToken }) {
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

	let message = 'Nie udało się rozpocząć meczu.';
	try {
		const data = await res.json();
		if (data?.message) {
			message = data.message;
		}
	} catch {
		// ignore
	}

	return { ok: false, message, status: res.status };
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

		if (res.ok) {
			return { ok: true };
		}
	} catch {
		// ignore — wyjście z ekranu i tak dozwolone
	}

	return { ok: false };
}

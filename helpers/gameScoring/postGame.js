import { Alert } from 'react-native';
import { QUICK_GAME_UPDATE_API_URL } from '../apiConfig';
import { GAME_MODE } from './resolveGameContext.js';
import { notifyIfUnauthorized } from '../sessionExpired.js';

import {
	findWinnerIndex as findWinnerIndexByFormat,
	isMatchFinished,
	normalizeMatchFormat,
} from '../matchFormat/matchFormat.js';

export function findWinnerIndex(playerStates, matchFormat) {
	const format = normalizeMatchFormat(matchFormat);
	const idx = findWinnerIndexByFormat(playerStates, format);
	return idx >= 0 ? idx : -1;
}

export function mapAchievementsForQuick(achievementsState) {
	return (achievementsState?.achievements || []).map((a) => ({
		playerId: a.playerId,
		value: a.value ?? null,
		type: a.type,
	}));
}

export async function sendQuickGameAchievements({
	accessToken,
	gameId,
	achievementsPayload,
}) {
	if (!gameId || !accessToken) {
		return { ok: true, skipped: true };
	}

	const body = {
		gameId,
		achievements: achievementsPayload || [],
	};

	const attempt = async () => {
		const response = await fetch(QUICK_GAME_UPDATE_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify(body),
		});
		if (!response.ok) {
			notifyIfUnauthorized(response.status);
			const text = await response.text();
			const err = new Error(text || 'Błąd achievementów quick');
			err.status = response.status;
			err.retryable = response.status >= 500 || response.status === 429;
			throw err;
		}
		return { ok: true };
	};

	try {
		return await attempt();
	} catch (error) {
		console.error('Blad przy wysylaniu achievementow quick game', error);
		if (error?.retryable || error instanceof TypeError) {
			try {
				return await attempt();
			} catch (retryErr) {
				console.error('Retry achievementów quick nieudany', retryErr);
				return { ok: false, error: retryErr };
			}
		}
		return { ok: false, error };
	}
}

export function showGameFinishedAlert(winnerName, { title = 'MECZ ZAKOŃCZONY' } = {}) {
	// Legacy — UI końca meczu jest w GameFinishedModal.
	Alert.alert(title, `${winnerName ?? 'Zwycięzca'} wygrywa mecz.`, [
		{ text: 'OK', style: 'default' },
	]);
}

export function showTrainingFinishedAlert(winnerName) {
	// Legacy — UI końca meczu jest w GameFinishedModal.
	Alert.alert(
		'Trening',
		`Trening zakończony. ${winnerName ?? 'Zwycięzca'} wygrywa mecz.\n\nWynik zapisano w historii treningów.`,
		[{ text: 'OK', style: 'default' }],
	);
}

export function shouldHandleLocalTrainingWin({
	mode,
	syncEnabled,
	playerStates,
	matchFormat,
}) {
	if (mode !== GAME_MODE.TRAINING || syncEnabled) {
		return false;
	}
	const format = normalizeMatchFormat(matchFormat);
	return isMatchFinished(playerStates, format);
}

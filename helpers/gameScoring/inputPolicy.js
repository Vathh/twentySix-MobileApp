import { GAME_MODE } from './resolveGameContext.js';

/**
 * Czy użytkownik może wpisywać wynik na Counterze.
 */
export function canCounterInput({
	mode,
	gameClosed,
	scoringBusy,
	lobbyScoringMode,
	isHost,
	myPlayerIndex,
	currentPlayerIndex,
	ffaPresence = null,
	players = [],
}) {
	if (gameClosed || scoringBusy) {
		return false;
	}

	if (mode === GAME_MODE.TRAINING) {
		return true;
	}

	if (mode === GAME_MODE.TOURNAMENT) {
		return true;
	}

	if (mode === GAME_MODE.QUICK_FFA) {
		if (Array.isArray(ffaPresence)) {
			const myPlayerId =
				myPlayerIndex != null ? players[myPlayerIndex]?.id : null;
			if (
				myPlayerId != null &&
				ffaPresence.some(
					(row) => row.playerId === myPlayerId && row.status === 'left',
				)
			) {
				return false;
			}
			const currentPlayerId =
				currentPlayerIndex != null
					? players[currentPlayerIndex]?.id
					: null;
			if (
				currentPlayerId != null &&
				ffaPresence.some(
					(row) =>
						row.playerId === currentPlayerId && row.status === 'left',
				)
			) {
				return false;
			}
		}

		if (lobbyScoringMode === 'one_device' && !isHost) {
			return false;
		}
		if (
			lobbyScoringMode === 'each_own' &&
			myPlayerIndex !== null &&
			myPlayerIndex !== currentPlayerIndex
		) {
			return false;
		}
	}

	return true;
}

export function isOneDeviceSpectator({ mode, lobbyScoringMode, isHost }) {
	return (
		mode === GAME_MODE.QUICK_FFA &&
		lobbyScoringMode === 'one_device' &&
		!isHost
	);
}

export function checkoutLegPrompt({ mode, lobbyScoringMode, playerName }) {
	if (mode === GAME_MODE.QUICK_FFA && lobbyScoringMode === 'each_own') {
		return 'Czy wygrałeś lega?';
	}
	return `Czy ${playerName ?? 'Gracz'} wygrał lega?`;
}

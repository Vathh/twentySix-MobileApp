import {
	isSingleSetFormat,
	normalizeMatchFormat,
} from './matchFormat.js';

/**
 * Główny wynik meczu do wyświetlenia (legi przy 1 secie, sety przy wielu).
 */
export function matchScoreForDisplay(playerState, format) {
	const f = normalizeMatchFormat(format);
	if (isSingleSetFormat(f)) {
		return playerState?.legsWon ?? playerState?.legsWonInSet ?? 0;
	}

	return playerState?.setsWon ?? 0;
}

export function legScoreInSetForDisplay(playerState) {
	return playerState?.legsWonInSet ?? playerState?.legsWon ?? 0;
}

export function scoreUnitLabel(format) {
	const f = normalizeMatchFormat(format);
	return isSingleSetFormat(f) ? 'legi' : 'sety';
}

export function scoreToWin(format) {
	const f = normalizeMatchFormat(format);
	return isSingleSetFormat(f) ? f.legsToWinSet : f.setsToWinMatch;
}

export function wouldCloseSet(playerState, format) {
	const f = normalizeMatchFormat(format);
	if (isSingleSetFormat(f)) {
		return false;
	}

	const legsInSet = legScoreInSetForDisplay(playerState);

	return legsInSet + 1 >= f.legsToWinSet;
}

/**
 * Po LEG_WIN zwycięzcy — aktualizacja legsWonInSet / setsWon (offline trening).
 *
 * @returns {{ legsWon: number, legsWonInSet: number, setsWon: number }}
 */
export function applyLegWinScores(playerState, format) {
	const f = normalizeMatchFormat(format);
	const legsWonInSet = legScoreInSetForDisplay(playerState) + 1;
	let setsWon = playerState?.setsWon ?? 0;

	if (isSingleSetFormat(f)) {
		return {
			legsWon: legsWonInSet,
			legsWonInSet,
			setsWon: 0,
		};
	}

	if (legsWonInSet >= f.legsToWinSet) {
		setsWon += 1;

		return {
			legsWon: setsWon,
			legsWonInSet: 0,
			setsWon,
		};
	}

	return {
		legsWon: setsWon,
		legsWonInSet,
		setsWon,
	};
}

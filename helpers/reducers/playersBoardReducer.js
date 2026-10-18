import {
	createInitialPlayerResultState,
} from './playerResultActions.js';
import { playerResultReducer } from './playerResultReducer.js';

export const RESET_PLAYERS_BOARD = 'RESET_PLAYERS_BOARD';
export const ADOPT_STARTING_SCORE = 'ADOPT_STARTING_SCORE';

export function createInitialPlayersBoard(playerCount, startingScore = 501) {
	const n = Math.max(0, Number(playerCount) || 0);
	return Array.from({ length: n }, () =>
		createInitialPlayerResultState(startingScore),
	);
}

export function resetPlayersBoard(playerCount, startingScore = 501) {
	return {
		type: RESET_PLAYERS_BOARD,
		playerCount,
		startingScore,
	};
}

/** Świeża tablica przejmuje punkt startowy z formatu meczu (np. 501 → 101). */
export function adoptStartingScore(startingScore, previousStartingScore) {
	return {
		type: ADOPT_STARTING_SCORE,
		startingScore,
		previousStartingScore,
	};
}

function stillOnPreviousStart(player, previousStartingScore) {
	const untouched =
		(player?.dartsThrown ?? 0) === 0
		&& (player?.totalDartsThrown ?? 0) === 0
		&& (player?.legsWon ?? 0) === 0
		&& (player?.legsWonInSet ?? 0) === 0
		&& (player?.setsWon ?? 0) === 0
		&& (player?.currentLegScores?.length ?? 0) === 0;
	if (!untouched) {
		return false;
	}
	const score = Number(player?.score);
	const ownStart = Number(player?.startingScore);
	const previous = Number(previousStartingScore);
	return score === previous || score === ownStart;
}

/**
 * Tablica N stanów graczy — ten sam playerResultReducer, akcja z playerIndex.
 */
export function playersBoardReducer(state, action) {
	if (action?.type === RESET_PLAYERS_BOARD) {
		return createInitialPlayersBoard(
			action.playerCount,
			action.startingScore,
		);
	}
	if (action?.type === ADOPT_STARTING_SCORE) {
		const nextStart = Number(action.startingScore);
		if (!Number.isFinite(nextStart)) {
			return state;
		}
		let changed = false;
		const next = state.map((player) => {
			const resetScore = stillOnPreviousStart(player, action.previousStartingScore);
			if (player.startingScore === nextStart && (!resetScore || player.score === nextStart)) {
				return player;
			}
			changed = true;
			return {
				...player,
				startingScore: nextStart,
				score: resetScore ? nextStart : player.score,
			};
		});
		return changed ? next : state;
	}
	const i = action?.playerIndex;
	if (i == null || i < 0 || i >= state.length) {
		return state;
	}
	const nextPlayer = playerResultReducer(state[i], action);
	if (nextPlayer === state[i]) {
		return state;
	}
	const next = state.slice();
	next[i] = nextPlayer;
	return next;
}

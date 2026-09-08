import {
	createInitialPlayerResultState,
} from './playerResultActions.js';
import { playerResultReducer } from './playerResultReducer.js';

export const RESET_PLAYERS_BOARD = 'RESET_PLAYERS_BOARD';

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

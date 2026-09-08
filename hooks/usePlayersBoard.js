import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
	createInitialPlayersBoard,
	playersBoardReducer,
	resetPlayersBoard,
} from '../helpers/reducers/playersBoardReducer';

/**
 * Jeden reducer dla N graczy. Na zewnątrz ta sama tablica dispatchy:
 * playerDispatches[i](action) — bez zmiany useGameScoring / visit flow.
 */
export function usePlayersBoard(playerCount, startingScore = 501) {
	const n = Math.max(0, Number(playerCount) || 0);
	const [playerStates, dispatchBoard] = useReducer(
		playersBoardReducer,
		{ playerCount: n, startingScore },
		({ playerCount: count, startingScore: score }) =>
			createInitialPlayersBoard(count, score),
	);

	const playerCountRef = useRef(n);
	useEffect(() => {
		if (playerCountRef.current === n) {
			return;
		}
		playerCountRef.current = n;
		dispatchBoard(resetPlayersBoard(n, startingScore));
	}, [n, startingScore]);

	const playerDispatches = useMemo(
		() =>
			Array.from({ length: n }, (_, i) => (action) =>
				dispatchBoard({ ...action, playerIndex: i }),
			),
		[n],
	);

	return [playerStates, playerDispatches];
}

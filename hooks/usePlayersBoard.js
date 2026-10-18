import { useEffect, useMemo, useReducer, useRef } from 'react';
import {
	adoptStartingScore,
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
	const appliedStartRef = useRef(startingScore);
	useEffect(() => {
		if (playerCountRef.current !== n) {
			playerCountRef.current = n;
			appliedStartRef.current = startingScore;
			dispatchBoard(resetPlayersBoard(n, startingScore));
			return;
		}
		if (appliedStartRef.current === startingScore) {
			return;
		}
		const previous = appliedStartRef.current;
		appliedStartRef.current = startingScore;
		dispatchBoard(adoptStartingScore(startingScore, previous));
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

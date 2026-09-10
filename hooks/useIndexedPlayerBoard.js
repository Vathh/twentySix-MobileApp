import { useEffect, useMemo, useReducer, useRef } from 'react';

/**
 * N niezależnych stanów gracza (cricket / ATC / …) z tym samym kontraktem dispatchy
 * co osiem osobnych useReducer: dispatches[i](action).
 */
export function useIndexedPlayerBoard(playerReducer, createInitial, playerCount) {
	const n = Math.max(0, Number(playerCount) || 0);

	const boardReducer = (state, action) => {
		if (action?.type === '@@board/reset') {
			return Array.from({ length: action.n }, () => createInitial());
		}
		const i = action.playerIndex;
		if (i == null || i < 0 || i >= state.length) {
			return state;
		}
		const { playerIndex: _playerIndex, ...playerAction } = action;
		const next = state.slice();
		next[i] = playerReducer(state[i], playerAction);
		return next;
	};

	const [playerStates, dispatchBoard] = useReducer(
		boardReducer,
		n,
		(count) => Array.from({ length: count }, () => createInitial()),
	);

	const playerCountRef = useRef(n);
	useEffect(() => {
		if (playerCountRef.current === n) {
			return;
		}
		playerCountRef.current = n;
		dispatchBoard({ type: '@@board/reset', n });
	}, [n]);

	const playerDispatches = useMemo(
		() =>
			Array.from({ length: n }, (_, i) => (action) =>
				dispatchBoard({ ...action, playerIndex: i }),
			),
		[n],
	);

	return [playerStates, playerDispatches];
}

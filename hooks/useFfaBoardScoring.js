import { useCallback, useRef } from 'react';
import { useFfaScoringSync } from './useFfaScoringSync';

/**
 * Sync FFA z tablicą graczy: GET/WS/poll w `useFfaScoringSync`, mapowanie stanu w `mapPlayer`.
 */
export function useFfaBoardScoring({
	enabled,
	transport,
	N,
	dispatches,
	mapPlayer,
	afterApply = null,
	setCurrentPlayerIndex,
	setGameClosed,
	legOpenerIndexRef,
	onFinishedQuickGameId,
	onAborted,
	reloadKey = null,
	logLabel = 'useFfaBoardScoring',
}) {
	const dispatchesRef = useRef(dispatches);
	dispatchesRef.current = dispatches;
	const mapPlayerRef = useRef(mapPlayer);
	mapPlayerRef.current = mapPlayer;

	const applyPlayers = useCallback((state) => {
		const nextDispatches = dispatchesRef.current;
		const map = mapPlayerRef.current;
		for (let i = 0; i < N; i += 1) {
			const p = state.players[i];
			if (!p || !nextDispatches[i]) continue;
			nextDispatches[i](map(p));
		}
	}, [N]);

	const { busy, canInputFromServer, runWrite, loadState, submitUndo } = useFfaScoringSync({
		enabled,
		transport,
		applyPlayers,
		afterApply,
		setCurrentPlayerIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId,
		onAborted,
		reloadKey,
		logLabel,
	});

	return {
		busy,
		canInputFromServer,
		runWrite,
		submitUndo,
		reload: loadState,
	};
}

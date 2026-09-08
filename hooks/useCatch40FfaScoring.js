import { useCallback, useRef } from 'react';
import { CATCH40_APPLY } from '../helpers/catch40';
import { useFfaScoringSync } from './useFfaScoringSync';

/**
 * Sync Catch 40 FFA. Stan gry jest tu; GET/WS/poll/kolejka w `useFfaScoringSync`.
 */
export function useCatch40FfaScoring({
	enabled,
	transport,
	N,
	catch40Dispatches,
	setCurrentPlayerIndex,
	setGameClosed,
	legOpenerIndexRef,
	onFinishedQuickGameId,
	onAborted,
	reloadKey = null,
}) {
	const dispatchesRef = useRef(catch40Dispatches);
	dispatchesRef.current = catch40Dispatches;

	const applyPlayers = useCallback((state) => {
		const dispatches = dispatchesRef.current;
		for (let i = 0; i < N; i += 1) {
			const p = state.players[i];
			if (!p || !dispatches[i]) continue;
			dispatches[i]({
				type: CATCH40_APPLY,
				outNumber: Number(p.outNumber ?? 61),
				remaining: Number(p.remaining ?? 61),
				dartsUsed: Number(p.dartsUsed ?? 0),
				catch40Score: Number(p.catch40Score ?? 0),
				finished: !!p.finished,
				legsWon: Number(p.legsWon ?? 0),
			});
		}
	}, [N]);

	const { busy, canInputFromServer, runWrite, loadState, submitUndo } = useFfaScoringSync({
		enabled,
		transport,
		applyPlayers,
		setCurrentPlayerIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId,
		onAborted,
		reloadKey,
		logLabel: 'useCatch40FfaScoring',
	});

	const submitVisit = useCallback(
		(payload) => {
			if (!transport?.recordVisit) return Promise.resolve();
			return runWrite(
				() => transport.recordVisit({
					...payload,
					clientVisitId: payload.clientVisitId ?? transport.newClientVisitId(),
				}),
				'Nie udało się zapisać wizyty',
			);
		},
		[runWrite, transport],
	);

	return {
		busy,
		canInputFromServer,
		submitVisit,
		submitUndo,
		reload: loadState,
	};
}

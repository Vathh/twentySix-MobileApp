import { useCallback, useRef } from 'react';
import { CRICKET56_APPLY } from '../helpers/cricket56';
import { useFfaScoringSync } from './useFfaScoringSync';

/**
 * Sync Cricket 56 FFA. Stan gry jest tu; GET/WS/poll/kolejka w `useFfaScoringSync`.
 */
export function useCricket56FfaScoring({
	enabled,
	transport,
	N,
	cricket56Dispatches,
	setCurrentPlayerIndex,
	setCurrentRoundIndex,
	setGameClosed,
	legOpenerIndexRef,
	onFinishedQuickGameId,
	onAborted,
	reloadKey = null,
}) {
	const dispatchesRef = useRef(cricket56Dispatches);
	dispatchesRef.current = cricket56Dispatches;

	const applyPlayers = useCallback((state) => {
		const dispatches = dispatchesRef.current;
		for (let i = 0; i < N; i += 1) {
			const p = state.players[i];
			if (!p || !dispatches[i]) continue;
			dispatches[i]({
				type: CRICKET56_APPLY,
				score: Number(p.score ?? 0),
				legsWon: Number(p.legsWon ?? 0),
			});
		}
	}, [N]);

	const afterApply = useCallback((state) => {
		setCurrentRoundIndex?.(Number(state.turn?.currentRoundIndex
			?? state.session.currentRoundIndex
			?? 0));
	}, [setCurrentRoundIndex]);

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
		logLabel: 'useCricket56FfaScoring',
	});

	const submitVisit = useCallback(
		(playerId, points, marks = null) => {
			if (!transport?.recordVisit) return Promise.resolve();
			return runWrite(
				() => transport.recordVisit({
					playerId,
					points,
					marks: Array.isArray(marks) ? marks : undefined,
					clientVisitId: transport.newClientVisitId?.() ?? transport.newClientDartId?.(),
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

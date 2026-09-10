import { useCallback } from 'react';
import { CRICKET56_APPLY } from '../helpers/cricket56';
import { useFfaBoardScoring } from './useFfaBoardScoring';

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
	const mapPlayer = useCallback((p) => ({
		type: CRICKET56_APPLY,
		score: Number(p.score ?? 0),
		legsWon: Number(p.legsWon ?? 0),
	}), []);

	const afterApply = useCallback((state) => {
		setCurrentRoundIndex?.(Number(state.turn?.currentRoundIndex
			?? state.session.currentRoundIndex
			?? 0));
	}, [setCurrentRoundIndex]);

	const { busy, canInputFromServer, runWrite, submitUndo, reload } = useFfaBoardScoring({
		enabled,
		transport,
		N,
		dispatches: cricket56Dispatches,
		mapPlayer,
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
		reload,
	};
}

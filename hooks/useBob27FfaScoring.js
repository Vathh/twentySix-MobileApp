import { useCallback } from 'react';
import { BOB27_APPLY } from '../helpers/bob27';
import { useFfaBoardScoring } from './useFfaBoardScoring';

/**
 * Sync Bob's 27 FFA. Stan gry jest tu; GET/WS/poll/kolejka w `useFfaScoringSync`.
 */
export function useBob27FfaScoring({
	enabled,
	transport,
	N,
	bob27Dispatches,
	setCurrentPlayerIndex,
	setDartsInVisit,
	setHitsInVisit,
	setCurrentTargetIndex,
	setGameClosed,
	legOpenerIndexRef,
	onFinishedQuickGameId,
	onAborted,
	reloadKey = null,
}) {
	const mapPlayer = useCallback((p) => ({
		type: BOB27_APPLY,
		score: Number(p.score ?? 27),
		eliminated: !!p.eliminated,
		legsWon: Number(p.legsWon ?? 0),
	}), []);

	const afterApply = useCallback((state) => {
		setDartsInVisit(Number(state.turn?.dartsInVisit
			?? state.session.dartsInVisit
			?? 0));
		setHitsInVisit?.(Number(state.turn?.hitsInVisit
			?? state.session.hitsInVisit
			?? 0));
		setCurrentTargetIndex?.(Number(state.turn?.currentTargetIndex
			?? state.session.currentTargetIndex
			?? 0));
	}, [setCurrentTargetIndex, setDartsInVisit, setHitsInVisit]);

	const { busy, canInputFromServer, runWrite, submitUndo, reload } = useFfaBoardScoring({
		enabled,
		transport,
		N,
		dispatches: bob27Dispatches,
		mapPlayer,
		afterApply,
		setCurrentPlayerIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId,
		onAborted,
		reloadKey,
		logLabel: 'useBob27FfaScoring',
	});

	const submitVisit = useCallback(
		(playerId, hits) => {
			if (!transport?.recordVisit) return Promise.resolve();
			return runWrite(
				() => transport.recordVisit({
					playerId,
					hits,
					clientDartId: transport.newClientDartId(),
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

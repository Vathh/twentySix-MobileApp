import { useCallback, useRef } from 'react';
import { ATC_APPLY } from '../helpers/atc';
import { useFfaScoringSync } from './useFfaScoringSync';

/**
 * Sync Around the Clock FFA. Stan gry jest tu; GET/WS/poll/kolejka w `useFfaScoringSync`.
 */
export function useAtcFfaScoring({
	enabled,
	transport,
	N,
	atcDispatches,
	setCurrentPlayerIndex,
	setGameClosed,
	legOpenerIndexRef,
	onFinishedQuickGameId,
	onAborted,
	reloadKey = null,
}) {
	const dispatchesRef = useRef(atcDispatches);
	dispatchesRef.current = atcDispatches;

	const applyPlayers = useCallback((state) => {
		const dispatches = dispatchesRef.current;
		for (let i = 0; i < N; i += 1) {
			const p = state.players[i];
			if (!p || !dispatches[i]) continue;
			dispatches[i]({
				type: ATC_APPLY,
				targetIndex: Number(p.targetIndex ?? 0),
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
		logLabel: 'useAtcFfaScoring',
	});

	const submitVisit = useCallback(
		(playerId, hits) => {
			if (!transport?.recordVisit) return Promise.resolve();
			return runWrite(
				() => transport.recordVisit({
					playerId,
					hits,
					clientVisitId: transport.newClientVisitId(),
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

import { useCallback } from 'react';
import { ATC_APPLY } from '../helpers/atc';
import { useFfaBoardScoring } from './useFfaBoardScoring';

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
	const mapPlayer = useCallback((p) => ({
		type: ATC_APPLY,
		targetIndex: Number(p.targetIndex ?? 0),
		finished: !!p.finished,
		legsWon: Number(p.legsWon ?? 0),
	}), []);

	const { busy, canInputFromServer, runWrite, submitUndo, reload } = useFfaBoardScoring({
		enabled,
		transport,
		N,
		dispatches: atcDispatches,
		mapPlayer,
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
		reload,
	};
}

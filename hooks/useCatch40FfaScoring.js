import { useCallback } from 'react';
import { CATCH40_APPLY } from '../helpers/catch40';
import { useFfaBoardScoring } from './useFfaBoardScoring';

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
	const mapPlayer = useCallback((p) => ({
		type: CATCH40_APPLY,
		outNumber: Number(p.outNumber ?? 61),
		remaining: Number(p.remaining ?? 61),
		dartsUsed: Number(p.dartsUsed ?? 0),
		catch40Score: Number(p.catch40Score ?? 0),
		finished: !!p.finished,
		legsWon: Number(p.legsWon ?? 0),
	}), []);

	const { busy, canInputFromServer, runWrite, submitUndo, reload } = useFfaBoardScoring({
		enabled,
		transport,
		N,
		dispatches: catch40Dispatches,
		mapPlayer,
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
		reload,
	};
}

import { useCallback } from 'react';
import {
	CRICKET_APPLY,
	normalizeCricketHits,
} from '../helpers/cricket';
import { useFfaBoardScoring } from './useFfaBoardScoring';

/**
 * Sync cricket FFA. Stan gry (hits/points) jest tu; GET/WS/poll/kolejka w `useFfaScoringSync`.
 */
export function useCricketFfaScoring({
	enabled,
	transport,
	N,
	cricketDispatches,
	setCurrentPlayerIndex,
	setDartsInVisit,
	setGameClosed,
	legOpenerIndexRef,
	onFinishedQuickGameId,
	onAborted,
	reloadKey = null,
}) {
	const mapPlayer = useCallback((p) => ({
		type: CRICKET_APPLY,
		hits: normalizeCricketHits(p.hits),
		points: Number(p.points ?? 0),
		legsWon: Number(p.legsWon ?? 0),
	}), []);

	const afterApply = useCallback((state) => {
		setDartsInVisit(Number(state.turn?.dartsInVisit
			?? state.session.dartsInVisit
			?? 0));
	}, [setDartsInVisit]);

	const { busy, canInputFromServer, runWrite, submitUndo, reload } = useFfaBoardScoring({
		enabled,
		transport,
		N,
		dispatches: cricketDispatches,
		mapPlayer,
		afterApply,
		setCurrentPlayerIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId,
		onAborted,
		reloadKey,
		logLabel: 'useCricketFfaScoring',
	});

	const submitVisit = useCallback(
		(playerId, darts) => {
			if (!transport?.recordVisit) return Promise.resolve();
			return runWrite(
				() => transport.recordVisit({
					playerId,
					clientVisitId: transport.newClientVisitId(),
					darts,
				}),
				'Nie udało się zapisać wizyty',
				{ reloadOnError: false },
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

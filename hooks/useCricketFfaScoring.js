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

	const submitHit = useCallback(
		(playerId, segment, multiplier) => {
			if (!transport?.recordDart) return Promise.resolve();
			return runWrite(
				() => transport.recordDart({
					playerId,
					kind: 'hit',
					segment: segment === 'bull' ? 'bull' : String(segment),
					multiplier,
					clientDartId: transport.newClientDartId(),
				}),
				'Nie udało się zapisać rzutu',
			);
		},
		[runWrite, transport],
	);

	const submitMiss = useCallback(
		(playerId) => {
			if (!transport?.recordDart) return Promise.resolve();
			return runWrite(
				() => transport.recordDart({
					playerId,
					kind: 'miss',
					clientDartId: transport.newClientDartId(),
				}),
				'Nie udało się zapisać rzutu',
			);
		},
		[runWrite, transport],
	);

	return {
		busy,
		canInputFromServer,
		submitHit,
		submitMiss,
		submitUndo,
		reload,
	};
}

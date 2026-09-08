import { useCallback, useRef } from 'react';
import {
	CRICKET_APPLY,
	normalizeCricketHits,
} from '../helpers/cricket';
import { useFfaScoringSync } from './useFfaScoringSync';

/**
 * Sync cricket FFA. Stan gry (hits/points) jest tu; GET/WS/poll/kolejka w `useFfaScoringSync`.
 * Osobny od `useGameScoring` (X01) — inny kształt stanu, bez normalizeScoringState.
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
	const cricketDispatchesRef = useRef(cricketDispatches);
	cricketDispatchesRef.current = cricketDispatches;

	const applyPlayers = useCallback((state) => {
		const dispatches = cricketDispatchesRef.current;
		for (let i = 0; i < N; i += 1) {
			const p = state.players[i];
			if (!p || !dispatches[i]) continue;
			dispatches[i]({
				type: CRICKET_APPLY,
				hits: normalizeCricketHits(p.hits),
				points: Number(p.points ?? 0),
				legsWon: Number(p.legsWon ?? 0),
			});
		}
	}, [N]);

	const afterApply = useCallback((state) => {
		setDartsInVisit(Number(state.turn?.dartsInVisit
			?? state.session.dartsInVisit
			?? 0));
	}, [setDartsInVisit]);

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
		reload: loadState,
	};
}

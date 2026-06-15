import { syncFromServer } from './reducers/playerResultActions';

/**
 * Mapuje stan FFA z API na reducery graczy (jeden silnik N=2..8).
 */
export function applyFfaScoringState(state, ctx) {
	const {
		players,
		N,
		dispatches,
		currentPlayerIndexRef,
		setCurrentPlayerIndex,
		setGameClosed,
		lastStateKeyRef,
		legOpenerIndexRef,
		lastLegNumberRef,
		onFinishedQuickGameId,
	} = ctx;

	if (!state) {
		return { finishedQuickGameId: null };
	}

	const key = JSON.stringify(state);
	if (lastStateKeyRef && key === lastStateKeyRef.current) {
		return {
			finishedQuickGameId: state.session?.quickGameId ?? null,
		};
	}
	if (lastStateKeyRef) {
		lastStateKeyRef.current = key;
	}

	const pid = (id) => (id != null ? Number(id) : null);

	const visits = state.visits || [];

	(state.players || []).forEach((sp) => {
		const spId = pid(sp.playerId);
		const idx = players.findIndex(
			(p) => pid(p.playerId ?? p.id) === spId,
		);
		if (idx >= 0 && idx < N) {
			const playerVisits = visits.filter(
				(v) => pid(v.playerId) === spId && !v.bust,
			);
			const currentLegScores = playerVisits.map((v) => v.score);
			const dartsThrown = playerVisits.reduce(
				(sum, v) => sum + (v.dartsInVisit ?? 3),
				0,
			);

			dispatches[idx](
				syncFromServer({
					score: sp.remaining ?? 501,
					legsWon: sp.legsWon ?? 0,
					matchAverage: sp.gameAverage ?? null,
					currentLegAverage: sp.legAverage ?? null,
					currentLegScores,
					dartsThrown,
					totalPointsEarned: sp.matchPointsEarned ?? 0,
					totalDartsThrown: sp.matchDartsThrown ?? 0,
					legByLegScores: sp.legByLegScores ?? [],
					legsAverages: sp.legsAverages ?? [],
					dartsPerLeg: sp.dartsPerLeg ?? [],
				}),
			);
		}
	});

	const legNumber = state.session?.currentLegNumber ?? state.currentLeg?.legNumber ?? null;
	if (
		legOpenerIndexRef &&
		lastLegNumberRef &&
		legNumber != null &&
		lastLegNumberRef.current !== legNumber
	) {
		if (state.session?.legOpenerIndex != null) {
			legOpenerIndexRef.current = state.session.legOpenerIndex;
		}
		lastLegNumberRef.current = legNumber;
	}

	let nextPlayerIndex = state.session?.currentPlayerIndex ?? 0;
	if (state.session?.currentPlayerIndex == null) {
		if (visits.length > 0) {
			const last = visits[visits.length - 1];
			const lastPid = pid(last.playerId);
			const lastIdx = players.findIndex(
				(p) => pid(p.playerId ?? p.id) === lastPid,
			);
			if (lastIdx >= 0) {
				nextPlayerIndex = last.bust ? lastIdx : (lastIdx + 1) % N;
			}
		} else if (legOpenerIndexRef && state.currentLeg?.open) {
			nextPlayerIndex = legOpenerIndexRef.current ?? 0;
		}
	}

	if (currentPlayerIndexRef) {
		currentPlayerIndexRef.current = nextPlayerIndex;
	}
	setCurrentPlayerIndex?.(nextPlayerIndex);

	const finishedQuickGameId = state.session?.quickGameId ?? null;
	if (state.game?.status === 'finished') {
		setGameClosed?.(true);
		onFinishedQuickGameId?.(finishedQuickGameId);
	}

	return { finishedQuickGameId };
}

import { syncFromServer } from './reducers/playerResultActions';

/**
 * Mapuje stan z API scoringu na reducery graczy.
 * @returns {{ currentLegId: number|null, currentPlayerIndex: number|null }}
 */
export function applyGameScoringState(state, ctx) {
	const {
		players,
		N,
		dispatches,
		currentPlayerIndexRef,
		setCurrentPlayerIndex,
		setGameClosed,
		lastStateKeyRef,
	} = ctx;

	if (!state) {
		return { currentLegId: null, currentPlayerIndex: null };
	}

	const key = JSON.stringify(state);
	if (lastStateKeyRef && key === lastStateKeyRef.current) {
		return {
			currentLegId: state.currentLeg?.id ?? null,
			currentPlayerIndex: currentPlayerIndexRef?.current ?? null,
		};
	}
	if (lastStateKeyRef) {
		lastStateKeyRef.current = key;
	}

	const pid = (id) => (id != null ? Number(id) : null);

	(state.players || []).forEach((sp) => {
		const spId = pid(sp.playerId);
		const idx = players.findIndex(
			(p) => pid(p.playerId ?? p.id) === spId,
		);
		if (idx >= 0 && idx < N) {
			dispatches[idx](
				syncFromServer({
					score: sp.remaining ?? 501,
					legsWon: sp.legsWon ?? 0,
				}),
			);
		}
	});

	const visits = state.visits || [];
	let nextPlayerIndex = currentPlayerIndexRef?.current ?? 0;
	if (visits.length > 0) {
		const last = visits[visits.length - 1];
		const lastPid = pid(last.playerId);
		const lastIdx = players.findIndex(
			(p) => pid(p.playerId ?? p.id) === lastPid,
		);
		if (lastIdx >= 0) {
			if (last.bust) {
				nextPlayerIndex = lastIdx;
			} else {
				nextPlayerIndex = (lastIdx + 1) % N;
			}
		}
	}
	if (currentPlayerIndexRef) {
		currentPlayerIndexRef.current = nextPlayerIndex;
	}
	setCurrentPlayerIndex?.(nextPlayerIndex);

	if (state.game?.status === 'finished') {
		setGameClosed?.(true);
	}

	return {
		currentLegId: state.currentLeg?.id ?? null,
		currentPlayerIndex: nextPlayerIndex,
	};
}

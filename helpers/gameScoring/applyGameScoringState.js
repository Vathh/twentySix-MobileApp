import { computeNextLegOpener } from '../computeNextLegOpener.js';
import { syncFromServer } from '../reducers/playerResultActions.js';
import { computeStateRevision } from './computeStateRevision.js';
import { inferCurrentPlayerIndex } from './inferCurrentPlayerIndex.js';
import {
	isNormalizedScoringState,
	normalizeScoringState,
} from './normalizeScoringState.js';
import { pid } from './pid.js';
import { isVisitComplete } from './visitUtils.js';

function buildH2hPlayerSync(sp, openLegVisits) {
	const spId = pid(sp.playerId);
	const myVisits = (openLegVisits || []).filter(
		(v) => pid(v.playerId) === spId,
	);
	const completedVisits = myVisits.filter(isVisitComplete);
	const partialVisit = myVisits.find((v) => !isVisitComplete(v));
	const completedLegScores = completedVisits.map((v) => v.score);
	const dartsThrown = myVisits.reduce(
		(sum, v) => sum + (v.dartsInVisit ?? 3),
		0,
	);

	return {
		score: sp.remaining ?? 501,
		legsWon: sp.legsWon ?? 0,
		matchAverage:
			sp.gameAverage != null ? Number(sp.gameAverage).toFixed(2) : undefined,
		currentLegAverage:
			sp.legAverage != null ? Number(sp.legAverage).toFixed(2) : undefined,
		currentLegScores: partialVisit ? undefined : completedLegScores,
		dartsThrown: partialVisit ? undefined : dartsThrown,
		totalDartsThrown: partialVisit ? undefined : dartsThrown,
	};
}

function buildFfaPlayerSync(sp, visits) {
	const spId = pid(sp.playerId);
	const playerVisits = visits.filter(
		(v) => pid(v.playerId) === spId && !v.bust,
	);
	const completeVisits = playerVisits.filter(
		(v) => v.closedLeg || (v.dartsInVisit ?? 3) >= 3,
	);
	const currentLegScores = completeVisits.map((v) => v.score);
	const dartsThrown = playerVisits.reduce(
		(sum, v) => sum + (v.dartsInVisit ?? 3),
		0,
	);

	return {
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
	};
}

function syncPlayersH2h(state, ctx) {
	const { players, N, dispatches, lastPlayerSnapRef } = ctx;
	const openLegVisits = state.visits ?? [];

	state.players.forEach((sp) => {
		const spId = pid(sp.playerId);
		const idx = players.findIndex(
			(p) => pid(p.playerId ?? p.id) === spId,
		);
		if (idx < 0 || idx >= N) {
			return;
		}

		const snap = buildH2hPlayerSync(sp, openLegVisits);
		const prev = lastPlayerSnapRef?.current?.[spId];
		let legByLegScores = prev?.legByLegScores ?? [];
		let legsAverages = prev?.legsAverages ?? [];
		let dartsPerLeg = prev?.dartsPerLeg ?? [];

		if (prev && snap.legsWon > prev.legsWon) {
			if (prev.currentLegScores?.length) {
				legByLegScores = [...legByLegScores, prev.currentLegScores];
			}
			if (prev.currentLegAverage) {
				legsAverages = [...legsAverages, prev.currentLegAverage];
			}
			if (prev.dartsThrown) {
				dartsPerLeg = [...dartsPerLeg, prev.dartsThrown];
			}
		}

		dispatches[idx](
			syncFromServer({
				...snap,
				legByLegScores,
				legsAverages,
				dartsPerLeg,
			}),
		);

		if (lastPlayerSnapRef) {
			lastPlayerSnapRef.current[spId] = {
				legsWon: snap.legsWon,
				currentLegScores: snap.currentLegScores,
				currentLegAverage: snap.currentLegAverage,
				dartsThrown: snap.dartsThrown,
				legByLegScores,
				legsAverages,
				dartsPerLeg,
			};
		}
	});
}

function syncPlayersFfa(state, ctx) {
	const { players, N, dispatches } = ctx;
	const visits = state.visits ?? [];

	state.players.forEach((sp) => {
		const spId = pid(sp.playerId);
		const idx = players.findIndex(
			(p) => pid(p.playerId ?? p.id) === spId,
		);
		if (idx < 0 || idx >= N) {
			return;
		}

		dispatches[idx](syncFromServer(buildFfaPlayerSync(sp, visits)));
	});
}

function updateLegOpenerRefs(state, ctx) {
	const {
		legOpenerIndexRef,
		lastLegNumberRef,
		useLegOpenerRotation,
		N,
	} = ctx;

	const legNumber = state.turn?.legNumber ?? state.currentLeg?.legNumber ?? null;
	if (legNumber == null || !legOpenerIndexRef || !lastLegNumberRef) {
		return;
	}

	if (lastLegNumberRef.current === legNumber) {
		return;
	}

	if (state.format === 'ffa') {
		if (state.turn?.legOpenerIndex != null) {
			legOpenerIndexRef.current = state.turn.legOpenerIndex;
		}
	} else if (useLegOpenerRotation) {
		if (lastLegNumberRef.current != null) {
			legOpenerIndexRef.current = computeNextLegOpener(
				legOpenerIndexRef.current,
				N,
			);
		} else {
			legOpenerIndexRef.current = 0;
		}
	}

	lastLegNumberRef.current = legNumber;
}

function resolveNextPlayerIndex(state, ctx) {
	const { players, N, legOpenerIndexRef, useLegOpenerRotation } = ctx;
	const visits = state.visits ?? [];
	const legOpen = state.currentLeg?.open ?? false;

	if (state.format === 'ffa') {
		return state.turn?.currentPlayerIndex ?? 0;
	}

	const legOpenerIndex =
		state.format === 'ffa'
			? (state.turn?.legOpenerIndex ?? legOpenerIndexRef?.current ?? 0)
			: useLegOpenerRotation
				? (legOpenerIndexRef?.current ?? 0)
				: 0;

	return inferCurrentPlayerIndex({
		players,
		N,
		visits,
		explicitIndex: null,
		legOpenerIndex,
		legOpen,
	});
}

/**
 * Mapuje znormalizowany stan meczu na reducery graczy.
 * Akceptuje też surową odpowiedź API — zostanie znormalizowana w locie.
 *
 * @returns {{
 *   currentLegId: number|null,
 *   currentPlayerIndex: number|null,
 *   finishedQuickGameId: number|null,
 * }}
 */
export function applyGameScoringState(inputState, ctx) {
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
		useLegOpenerRotation = false,
		lastPlayerSnapRef,
		onFinishedQuickGameId,
	} = ctx;

	if (!inputState) {
		return {
			currentLegId: null,
			currentPlayerIndex: null,
			finishedQuickGameId: null,
		};
	}

	const state = isNormalizedScoringState(inputState)
		? inputState
		: normalizeScoringState(inputState, players);

	const revisionKey = String(state.revision ?? computeStateRevision(state));
	if (lastStateKeyRef && revisionKey === lastStateKeyRef.current) {
		return {
			currentLegId: state.currentLeg?.id ?? null,
			currentPlayerIndex: currentPlayerIndexRef?.current ?? null,
			finishedQuickGameId: state.meta?.quickGameId ?? null,
		};
	}
	if (lastStateKeyRef) {
		lastStateKeyRef.current = revisionKey;
	}

	if (state.format === 'ffa') {
		syncPlayersFfa(state, ctx);
	} else {
		syncPlayersH2h(state, ctx);
	}

	updateLegOpenerRefs(state, ctx);

	const nextPlayerIndex = resolveNextPlayerIndex(state, ctx);
	if (currentPlayerIndexRef) {
		currentPlayerIndexRef.current = nextPlayerIndex;
	}
	setCurrentPlayerIndex?.(nextPlayerIndex);

	const finishedQuickGameId = state.meta?.quickGameId ?? null;
	if (state.meta?.status === 'finished') {
		setGameClosed?.(true);
		onFinishedQuickGameId?.(finishedQuickGameId);
	}

	return {
		currentLegId: state.currentLeg?.id ?? null,
		currentPlayerIndex: nextPlayerIndex,
		finishedQuickGameId,
	};
}

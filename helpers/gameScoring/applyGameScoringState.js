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
	const noLegActivity = completedVisits.length === 0 && !partialVisit;

	return {
		score: sp.remaining ?? 501,
		legsWon: sp.legsWon ?? 0,
		matchAverage:
			sp.gameAverage != null ? Number(sp.gameAverage).toFixed(2) : undefined,
		currentLegAverage: noLegActivity
			? '0.00'
			: sp.legAverage != null
				? Number(sp.legAverage).toFixed(2)
				: undefined,
		currentLegScores: partialVisit ? undefined : completedLegScores,
		dartsThrown: partialVisit ? undefined : noLegActivity ? 0 : dartsThrown,
		totalDartsThrown: partialVisit ? undefined : noLegActivity ? 0 : dartsThrown,
	};
}

function buildFfaPlayerSync(sp, visits) {
	const spId = pid(sp.playerId);
	const playerVisits = visits.filter(
		(v) => pid(v.playerId) === spId && !v.bust,
	);
	const partialVisit = playerVisits.find((v) => !isVisitComplete(v));
	const completeVisits = playerVisits.filter(isVisitComplete);
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
		currentLegScores: partialVisit ? undefined : currentLegScores,
		dartsThrown: partialVisit ? undefined : dartsThrown,
		totalPointsEarned: sp.matchPointsEarned ?? 0,
		totalDartsThrown: sp.matchDartsThrown ?? 0,
		legByLegScores: sp.legByLegScores ?? [],
		legsAverages: sp.legsAverages ?? [],
		dartsPerLeg: sp.dartsPerLeg ?? [],
	};
}

function archiveClosedLegFromSnap(prevSnap, legByLegScores, legsAverages, dartsPerLeg, { wonLeg = false } = {}) {
	const baseScores = [...(prevSnap?.currentLegScores ?? [])];
	if (baseScores.length === 0 && !(wonLeg && (prevSnap?.score ?? 0) > 0)) {
		return { legByLegScores, legsAverages, dartsPerLeg };
	}

	let scores = baseScores;
	let darts = prevSnap?.dartsThrown ?? scores.length * 3;

	if (wonLeg && prevSnap?.score > 0 && prevSnap.score <= 180) {
		const checkoutScore = prevSnap.score;
		if (scores.length === 0 || scores[scores.length - 1] !== checkoutScore) {
			scores = [...scores, checkoutScore];
			darts += 3;
		}
	}

	const totalPoints = scores.reduce((sum, value) => sum + value, 0);
	const legAvg =
		darts > 0 ? ((totalPoints / darts) * 3).toFixed(2) : null;

	return {
		legByLegScores: [...legByLegScores, scores],
		legsAverages:
			legAvg && legAvg !== '0.00'
				? [...legsAverages, legAvg]
				: legsAverages,
		dartsPerLeg: wonLeg && darts > 0 ? [...dartsPerLeg, darts] : dartsPerLeg,
	};
}

function syncPlayersH2h(state, ctx) {
	const { players, N, dispatches, lastPlayerSnapRef, lastLegNumberRef } = ctx;
	const openLegVisits = state.visits ?? [];
	const legNumber = state.currentLeg?.legNumber ?? state.turn?.legNumber ?? null;
	const prevLegNumber = lastLegNumberRef?.current ?? null;
	const legAdvanced =
		legNumber != null &&
		prevLegNumber != null &&
		legNumber > prevLegNumber;
	const matchFinished = state.meta?.status === 'finished';

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

		if (prev) {
			const wonLeg = snap.legsWon > prev.legsWon;
			const legEndedForLoser =
				legAdvanced ||
				(matchFinished &&
					(snap.currentLegScores?.length ?? 0) === 0 &&
					(prev.currentLegScores?.length ?? 0) > 0);

			if (wonLeg || legEndedForLoser) {
				const archived = archiveClosedLegFromSnap(
					prev,
					legByLegScores,
					legsAverages,
					dartsPerLeg,
					{ wonLeg },
				);
				legByLegScores = archived.legByLegScores;
				legsAverages = archived.legsAverages;
				dartsPerLeg = archived.dartsPerLeg;
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
		if (state.turn?.legOpenerIndex != null) {
			legOpenerIndexRef.current = state.turn.legOpenerIndex;
		} else if (lastLegNumberRef.current != null) {
			legOpenerIndexRef.current = computeNextLegOpener(
				legOpenerIndexRef.current,
				N,
			);
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
		if (state.meta?.status === 'finished') {
			setGameClosed?.(true);
			onFinishedQuickGameId?.(state.meta?.quickGameId ?? null);
		}
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

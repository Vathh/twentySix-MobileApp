/**
 * Checkout Bull 81+. 8 minut. Podejście zawsze 3 lotki (per-dart).
 * Lotki 1–2 ustawiają pełną wartością z tarczy. Trzecia celuje w Inner.
 * 50 + Inner = +10 i awans. Inner bez 50 = +4. Ścieżka 81→90→…→81.
 */

import { dartFromPad } from './catch20Exercise.js';

export { dartFromPad };
export const CHECKOUT_BULL_81_MECHANIC = 'checkout_bull_81';
export const CHECKOUT_BULL_81_FIRST = 81;
export const CHECKOUT_BULL_81_LAST = 90;
export const CHECKOUT_BULL_81_PATH_LEN = 19;
export const CLOSE_POINTS = 10;
export const BONUS_POINTS = 4;
export const DEFAULT_DURATION_MS = 480000;
export const INNER_AIM = 'Inner';
export const INNER_LABEL = 'Bull';
export const VISIT_SIZE = 3;

export function canPlayCheckoutBull81(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === CHECKOUT_BULL_81_MECHANIC
		&& definition.inactive !== true,
	);
}

export function checkoutBull81DurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

/** Wartość checkoutu na pozycji ścieżki (0 = 81 w górę, 9 = 90, 18 = 81 w dół). */
export function checkoutBull81PathValue(pathIndex) {
	const len = CHECKOUT_BULL_81_PATH_LEN;
	const pos = ((Number(pathIndex) % len) + len) % len;
	if (pos <= 9) {
		return CHECKOUT_BULL_81_FIRST + pos;
	}
	return CHECKOUT_BULL_81_LAST - (pos - 9);
}

export function isCheckoutBull81Inner(dart) {
	return Boolean(dart && dart.label === INNER_LABEL && dart.points === 50);
}

export function startCheckoutBull81Session(definition, clientSessionId, now = Date.now()) {
	const durationMs = checkoutBull81DurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		actions: [],
		durationMs,
		endsAt: now + durationMs,
	};
}

function blankView() {
	const checkout = CHECKOUT_BULL_81_FIRST;
	return {
		pathIndex: 0,
		checkout,
		remaining: checkout,
		dartsInVisit: 0,
		openLabels: [],
		score: 0,
		inners: [],
		carousel: {
			left: null,
			center: checkout,
			right: checkoutBull81PathValue(1),
		},
	};
}

function resetVisit(state) {
	state.checkout = checkoutBull81PathValue(state.pathIndex);
	state.remaining = state.checkout;
	state.dartsInVisit = 0;
	state.openLabels = [];
	state.carousel = {
		left: state.pathIndex > 0 ? checkoutBull81PathValue(state.pathIndex - 1) : null,
		center: state.checkout,
		right: checkoutBull81PathValue(state.pathIndex + 1),
	};
}

function settleThird(state, dart) {
	const setupOk = state.remaining === 50;
	const inner = isCheckoutBull81Inner(dart);
	state.inners.push({ hit: inner });
	if (setupOk && inner) {
		state.score += CLOSE_POINTS;
		state.pathIndex += 1;
	} else if (!setupOk && inner) {
		state.score += BONUS_POINTS;
	}
	resetVisit(state);
}

export function checkoutBull81View(session) {
	const state = blankView();
	for (const action of session?.actions ?? []) {
		if (action?.kind !== 'dart') {
			continue;
		}
		if (state.dartsInVisit < 2) {
			state.remaining -= action.points;
			state.dartsInVisit += 1;
			state.openLabels = [...state.openLabels, action.label];
			continue;
		}
		settleThird(state, action);
	}
	return state;
}

function commit(session, action) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	return {
		...session,
		actions: [...session.actions, action],
		status: 'playing',
	};
}

export function recordCheckoutBull81Dart(session, dart) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	if (!dart || !Number.isInteger(dart.points) || dart.points < 0 || dart.points > 60 || !dart.label) {
		return session;
	}
	return commit(session, { kind: 'dart', points: dart.points, label: dart.label });
}

export function undoCheckoutBull81(session) {
	if (!session || session.actions.length === 0) {
		return session;
	}
	return {
		...session,
		actions: session.actions.slice(0, -1),
		status: 'playing',
	};
}

/** Koniec czasu odrzuca otwarte podejście (0–2 lotki). */
export function expireCheckoutBull81(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const open = checkoutBull81View(session).dartsInVisit;
	const actions = open > 0 ? session.actions.slice(0, -open) : session.actions;
	return {
		...session,
		actions,
		status: 'completed',
	};
}

export function checkoutBull81Stats(session) {
	const view = checkoutBull81View(session);
	const attempts = view.inners.length;
	const hits = view.inners.filter((row) => row.hit).length;
	const aims = attempts > 0
		? [{ aim: INNER_AIM, attempts, hits }]
		: [];
	return {
		score: view.score,
		aims,
	};
}

export function checkoutBull81Completion(session, completedAt) {
	const stats = checkoutBull81Stats(session);
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: stats.score,
		stats,
		sync: 'pending',
	};
}

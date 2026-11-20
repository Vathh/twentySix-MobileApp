/**
 * Checkout 41+. Jedna wizyta (max 3 lotki) na wartość. Sukces +1, porażka -1 (nie poniżej 41).
 * Tryb sumy: Fail / Check bez wpisywania punktów. Tryb lotek: klawiatura X01 + skuteczność dubli.
 */

import {
	dartFromPad,
	doubleTarget,
	INPUT_PER_DART,
	INPUT_SUM,
	VISIT_SIZE,
} from './catch20Exercise.js';
import { evaluatePerDartVisitAfterDart } from '../perDartVisitRules.js';

export { dartFromPad, doubleTarget, INPUT_PER_DART, INPUT_SUM };
export const CHECKOUT_41_MECHANIC = 'checkout_41';
export const CHECKOUT_41_FIRST = 41;
export const DEFAULT_DURATION_MS = 600000;

export function canPlayCheckout41(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === CHECKOUT_41_MECHANIC
		&& definition.inactive !== true,
	);
}

export function checkout41DurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function checkout41InputMode(mode) {
	return mode === INPUT_PER_DART ? INPUT_PER_DART : INPUT_SUM;
}

/** Wynik z najwyższego zamkniętego checkoutu. Brak zamknięcia to 0. */
export function checkout41ScoreFromHighest(highest) {
	if (!Number.isInteger(highest) || highest < CHECKOUT_41_FIRST) {
		return 0;
	}
	if (highest <= 50) {
		return 1 + (highest - CHECKOUT_41_FIRST) * 5;
	}
	return 46 + (highest - 50) * 7;
}

export function startCheckout41Session(definition, clientSessionId, now = Date.now(), inputMode = INPUT_SUM) {
	const durationMs = checkout41DurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		inputMode: checkout41InputMode(inputMode),
		actions: [],
		durationMs,
		endsAt: now + durationMs,
	};
}

function blankView() {
	return {
		checkout: CHECKOUT_41_FIRST,
		remaining: CHECKOUT_41_FIRST,
		visitStart: CHECKOUT_41_FIRST,
		dartsInVisit: 0,
		openLabels: [],
		highest: null,
		doubles: [],
		carousel: {
			left: null,
			center: CHECKOUT_41_FIRST,
			right: CHECKOUT_41_FIRST + 1,
		},
	};
}

function resetVisit(state) {
	state.remaining = state.checkout;
	state.visitStart = state.checkout;
	state.dartsInVisit = 0;
	state.openLabels = [];
	state.carousel = {
		left: state.checkout > CHECKOUT_41_FIRST ? state.checkout - 1 : null,
		center: state.checkout,
		right: state.checkout + 1,
	};
}

function succeed(state) {
	state.highest = state.highest == null
		? state.checkout
		: Math.max(state.highest, state.checkout);
	state.checkout += 1;
	resetVisit(state);
}

function fail(state) {
	state.checkout = Math.max(CHECKOUT_41_FIRST, state.checkout - 1);
	resetVisit(state);
}

export function checkout41View(session) {
	const state = blankView();
	const perDart = session?.inputMode === INPUT_PER_DART;
	for (const action of session?.actions ?? []) {
		if (action?.kind === 'check') {
			succeed(state);
			continue;
		}
		if (action?.kind === 'fail') {
			fail(state);
			continue;
		}
		if (action?.kind === 'dart') {
			const target = doubleTarget(state.remaining);
			if (perDart && target) {
				state.doubles.push({
					number: target,
					hit: action.label === `D${target}`,
				});
			}
			const outcome = evaluatePerDartVisitAfterDart(state.remaining, action.points, action.label);
			if (outcome.checkout) {
				succeed(state);
				continue;
			}
			if (outcome.bust) {
				fail(state);
				continue;
			}
			state.remaining -= action.points;
			state.dartsInVisit += 1;
			state.openLabels = [...state.openLabels, action.label];
			if (state.dartsInVisit >= VISIT_SIZE) {
				fail(state);
			}
		}
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

export function recordCheckout41Dart(session, dart) {
	if (!session || session.inputMode !== INPUT_PER_DART) {
		return session;
	}
	if (!dart || !Number.isInteger(dart.points) || dart.points < 0 || dart.points > 60 || !dart.label) {
		return session;
	}
	return commit(session, { kind: 'dart', points: dart.points, label: dart.label });
}

/** Tryb sumy: zawodnik zgłasza zamknięcie wskazanego checkoutu. */
export function recordCheckout41Check(session) {
	if (!session || session.status !== 'playing' || session.inputMode !== INPUT_SUM) {
		return session;
	}
	return commit(session, { kind: 'check' });
}

/** Tryb sumy: zawodnik zgłasza nieudaną próbę. */
export function recordCheckout41Fail(session) {
	if (!session || session.status !== 'playing' || session.inputMode !== INPUT_SUM) {
		return session;
	}
	return commit(session, { kind: 'fail' });
}

/** Cofanie zdejmuje ostatnią akcję: lotkę albo Fail / Check. */
export function undoCheckout41(session) {
	if (!session || session.actions.length === 0) {
		return session;
	}
	return {
		...session,
		actions: session.actions.slice(0, -1),
		status: 'playing',
	};
}

/** Koniec czasu odrzuca otwartą wizytę lotek. */
export function expireCheckout41(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const open = checkout41View(session).dartsInVisit;
	const actions = open > 0 ? session.actions.slice(0, -open) : session.actions;
	return {
		...session,
		actions,
		status: 'completed',
	};
}

export function checkout41Stats(session) {
	const view = checkout41View(session);
	const buckets = new Map();
	view.doubles.forEach((row) => {
		const current = buckets.get(row.number) ?? { attempts: 0, hits: 0 };
		current.attempts += 1;
		if (row.hit) {
			current.hits += 1;
		}
		buckets.set(row.number, current);
	});
	const doubles = [...buckets.entries()]
		.sort((left, right) => left[0] - right[0])
		.map(([number, bucket]) => ({
			label: `D${number}`,
			attempts: bucket.attempts,
			hits: bucket.hits,
		}));
	return {
		highest: view.highest,
		inputMode: checkout41InputMode(session?.inputMode),
		doubles,
	};
}

export function checkout41Completion(session, completedAt) {
	const stats = checkout41Stats(session);
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: checkout41ScoreFromHighest(stats.highest),
		inputMode: stats.inputMode,
		stats,
		sync: 'pending',
	};
}

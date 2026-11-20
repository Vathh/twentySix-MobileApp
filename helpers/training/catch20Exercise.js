/**
 * Catch20. Checkouty 41–60, dwie wizyty po najwyżej 3 lotki.
 * Zamknięcie jak w X01. Bust pierwszej wizyty cofa licznik, bust drugiej kończy próbę.
 * Lotki żyją tylko w trakcie. Na serwer idzie liczba zamknięć i, w trybie lotek, skuteczność dubli.
 */

import { canFinishWithCheck } from '../gameScoring/checkoutCheck.js';
import { formatDartLabel } from '../formatDartLabel.js';
import { evaluatePerDartVisitAfterDart } from '../perDartVisitRules.js';

export const CATCH20_MECHANIC = 'catch_20';
export const CATCH20_FIRST = 41;
export const CATCH20_LAST = 60;
export const VISIT_SIZE = 3;
export const DEFAULT_DURATION_MS = 540000;
export const INPUT_SUM = 'sum';
export const INPUT_PER_DART = 'per_dart';

export function canPlayCatch20(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === CATCH20_MECHANIC
		&& definition.inactive !== true,
	);
}

export function catch20DurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function catch20InputMode(mode) {
	return mode === INPUT_PER_DART ? INPUT_PER_DART : INPUT_SUM;
}

export function startCatch20Session(definition, clientSessionId, now = Date.now(), inputMode = INPUT_SUM) {
	const durationMs = catch20DurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		inputMode: catch20InputMode(inputMode),
		actions: [],
		durationMs,
		endsAt: now + durationMs,
	};
}

/** 2 → D1, 40 → D20. Inna wartość nie jest jedną podwójną. */
export function doubleTarget(remaining) {
	if (!Number.isInteger(remaining) || remaining < 2 || remaining > 40 || remaining % 2 !== 0) {
		return null;
	}
	return remaining / 2;
}

/**
 * Lotka z klawiatury X01. 0 to pudło, 25 z dublem to Bull.
 * @returns {{ points: number, label: string } | null}
 */
export function dartFromPad(baseValue, modifier) {
	if (baseValue === 0) {
		return { points: 0, label: '0' };
	}
	if (baseValue === 25 && modifier === 'triple') {
		return null;
	}
	const points = baseValue === 25
		? (modifier === 'double' ? 50 : 25)
		: baseValue * (modifier === 'double' ? 2 : modifier === 'triple' ? 3 : 1);
	if (!Number.isInteger(points) || points < 0 || points > 60) {
		return null;
	}
	return { points, label: formatDartLabel(baseValue, modifier) };
}

/**
 * Suma wizyty. Równa licznikowi czeka na potwierdzenie zamknięcia.
 * @returns {'confirm' | 'bust' | 'score' | null}
 */
export function interpretCatch20Sum(remaining, points) {
	if (!Number.isInteger(points) || points < 0 || points > 180) {
		return null;
	}
	if (!Number.isInteger(remaining) || remaining < 2) {
		return null;
	}
	if (points === remaining) {
		return 'confirm';
	}
	if (points > remaining || remaining - points === 1) {
		return 'bust';
	}
	return 'score';
}

function blankView() {
	return {
		checkout: CATCH20_FIRST,
		visit: 1,
		remaining: CATCH20_FIRST,
		visitStart: CATCH20_FIRST,
		dartsInVisit: 0,
		openLabels: [],
		closed: 0,
		doubles: [],
		finished: false,
	};
}

function advanceCheckout(state, closedNow) {
	if (closedNow) {
		state.closed += 1;
	}
	state.checkout += 1;
	state.finished = state.checkout > CATCH20_LAST;
	state.remaining = state.finished ? 0 : state.checkout;
	state.visitStart = state.remaining;
	state.visit = 1;
	state.dartsInVisit = 0;
	state.openLabels = [];
}

function endVisit(state) {
	if (state.visit === 1) {
		state.visit = 2;
		state.visitStart = state.remaining;
		state.dartsInVisit = 0;
		state.openLabels = [];
		return;
	}
	advanceCheckout(state, false);
}

function bustVisit(state) {
	if (state.visit === 1) {
		state.remaining = state.visitStart;
		state.visit = 2;
		state.dartsInVisit = 0;
		state.openLabels = [];
		return;
	}
	advanceCheckout(state, false);
}

export function catch20View(session) {
	const state = blankView();
	const perDart = session?.inputMode === INPUT_PER_DART;
	for (const action of session?.actions ?? []) {
		if (state.finished) {
			break;
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
				advanceCheckout(state, true);
				continue;
			}
			if (outcome.bust) {
				bustVisit(state);
				continue;
			}
			state.remaining -= action.points;
			state.dartsInVisit += 1;
			state.openLabels = [...state.openLabels, action.label];
			if (state.dartsInVisit >= VISIT_SIZE) {
				endVisit(state);
			}
			continue;
		}
		if (action?.kind === 'sum') {
			if (action.checkout && action.points === state.remaining && state.remaining > 1) {
				advanceCheckout(state, true);
				continue;
			}
			const kind = interpretCatch20Sum(state.remaining, action.points);
			if (kind === 'bust' || kind === 'confirm') {
				bustVisit(state);
				continue;
			}
			if (kind !== 'score') {
				continue;
			}
			state.remaining -= action.points;
			endVisit(state);
		}
	}
	return state;
}

function commit(session, action) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const actions = [...session.actions, action];
	const view = catch20View({ ...session, actions });
	return {
		...session,
		actions,
		status: view.finished ? 'completed' : 'playing',
	};
}

export function recordCatch20Dart(session, dart) {
	if (!dart || !Number.isInteger(dart.points) || dart.points < 0 || dart.points > 60 || !dart.label) {
		return session;
	}
	return commit(session, { kind: 'dart', points: dart.points, label: dart.label });
}

export function recordCatch20Sum(session, points, checkout = false) {
	const remaining = catch20View(session).remaining;
	const kind = interpretCatch20Sum(remaining, points);
	if (kind == null) {
		return session;
	}
	if (kind === 'confirm') {
		if (!checkout || !canFinishWithCheck(remaining)) {
			return session;
		}
		return commit(session, { kind: 'sum', points, checkout: true });
	}
	if (checkout) {
		return session;
	}
	return commit(session, { kind: 'sum', points, checkout: false });
}

export function undoCatch20(session) {
	if (!session || session.actions.length === 0) {
		return session;
	}
	return {
		...session,
		actions: session.actions.slice(0, -1),
		status: 'playing',
	};
}

/** Koniec czasu odrzuca otwartą wizytę lotek. Suma wchodzi dopiero po zatwierdzeniu. */
export function expireCatch20(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const open = catch20View(session).dartsInVisit;
	const actions = open > 0 ? session.actions.slice(0, -open) : session.actions;
	return {
		...session,
		actions,
		status: 'completed',
	};
}

export function catch20Stats(session) {
	const view = catch20View(session);
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
		closed: view.closed,
		inputMode: catch20InputMode(session?.inputMode),
		doubles,
	};
}

export function catch20Completion(session, completedAt) {
	const stats = catch20Stats(session);
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: stats.closed,
		inputMode: stats.inputMode,
		stats,
		sync: 'pending',
	};
}

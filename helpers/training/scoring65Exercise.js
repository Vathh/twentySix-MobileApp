/**
 * Scoring 65. Pięć minut, podejścia po 3 lotki.
 * Suma co najmniej 65 daje 1 punkt. Wynik to suma tych punktów.
 * Średnia to punkty z tarczy podzielone przez liczbę zakończonych podejść.
 * Na serwer idzie wynik, suma punktów i liczba podejść.
 */

export const SCORING_65_MECHANIC = 'scoring_65';
export const VISIT_SIZE = 3;
export const POINT_LINE = 65;
export const MAX_SUM = 180;
export const MAX_DART = 60;
export const DEFAULT_DURATION_MS = 300000;
export const INPUT_SUM = 'sum';
export const INPUT_PER_DART = 'per_dart';

export function canPlayScoring65(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === SCORING_65_MECHANIC
		&& definition.inactive !== true,
	);
}

export function scoring65DurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function scoring65InputMode(mode) {
	return mode === INPUT_PER_DART ? INPUT_PER_DART : INPUT_SUM;
}

export function scoring65Average(total, approaches) {
	if (!Number.isInteger(approaches) || approaches <= 0 || !Number.isInteger(total)) {
		return null;
	}
	return Math.round((total / approaches) * 100) / 100;
}

export function startScoring65Session(definition, clientSessionId, now = Date.now(), inputMode = INPUT_SUM) {
	const durationMs = scoring65DurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		inputMode: scoring65InputMode(inputMode),
		actions: [],
		durationMs,
		endsAt: now + durationMs,
	};
}

function blankView() {
	return {
		points: 0,
		total: 0,
		approaches: 0,
		running: 0,
		openLabels: [],
		dartsInVisit: 0,
		settled: false,
	};
}

function settle(state, visitPoints, keepRunning = false) {
	state.approaches += 1;
	state.total += visitPoints;
	if (visitPoints >= POINT_LINE) {
		state.points += 1;
	}
	state.openLabels = [];
	state.dartsInVisit = 0;
	if (keepRunning) {
		state.running = visitPoints;
		state.settled = true;
		return;
	}
	state.running = 0;
	state.settled = false;
}

function validSum(points) {
	return Number.isInteger(points) && points >= 0 && points <= MAX_SUM;
}

function validDart(action) {
	return Boolean(
		action
		&& Number.isInteger(action.points)
		&& action.points >= 0
		&& action.points <= MAX_DART
		&& action.label,
	);
}

export function scoring65View(session) {
	const state = blankView();
	const perDart = session?.inputMode === INPUT_PER_DART;
	for (const action of session?.actions ?? []) {
		if (!perDart && action?.kind === 'sum' && validSum(action.points)) {
			settle(state, action.points);
			continue;
		}
		if (perDart && action?.kind === 'dart' && validDart(action)) {
			if (state.settled) {
				state.running = 0;
				state.settled = false;
			}
			state.running += action.points;
			state.dartsInVisit += 1;
			state.openLabels = [...state.openLabels, action.label];
			if (state.dartsInVisit >= VISIT_SIZE) {
				settle(state, state.running, true);
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
	};
}

export function recordScoring65Dart(session, dart) {
	if (scoring65InputMode(session?.inputMode) !== INPUT_PER_DART || !validDart(dart)) {
		return session;
	}
	return commit(session, { kind: 'dart', points: dart.points, label: dart.label });
}

export function recordScoring65Sum(session, points) {
	if (scoring65InputMode(session?.inputMode) !== INPUT_SUM || !validSum(points)) {
		return session;
	}
	return commit(session, { kind: 'sum', points });
}

export function undoScoring65(session) {
	if (!session || session.actions.length === 0) {
		return session;
	}
	return {
		...session,
		actions: session.actions.slice(0, -1),
		status: 'playing',
	};
}

/** Koniec czasu odrzuca otwarte lotki. Suma wchodzi dopiero po zatwierdzeniu. */
export function expireScoring65(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const open = scoring65View(session).dartsInVisit;
	const actions = open > 0 ? session.actions.slice(0, -open) : session.actions;
	return {
		...session,
		actions,
		status: 'completed',
	};
}

export function scoring65Stats(session) {
	const view = scoring65View(session);
	return {
		inputMode: scoring65InputMode(session?.inputMode),
		total: view.total,
		approaches: view.approaches,
		average: scoring65Average(view.total, view.approaches),
	};
}

export function scoring65Completion(session, completedAt) {
	const view = scoring65View(session);
	const stats = scoring65Stats(session);
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: view.points,
		inputMode: stats.inputMode,
		stats,
		sync: 'pending',
	};
}

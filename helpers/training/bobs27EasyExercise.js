/**
 * Bob's 27 easy. D1–D20, bez bulla, trzy lotki na cel.
 * Trafienie dodaje wartość dubla, trzy pudła odejmują ją raz.
 * Wynik może zejść poniżej zera. Liczenie wizyty jest wspólne z wolną grą.
 * Lotki żyją tylko w trakcie. Na serwer idzie wynik, trafienia i procent.
 */

import { BOB27_STARTING_SCORE, applyBob27Visit } from '../bob27/bob27Rules.js';

export const BOB27_EASY_MECHANIC = 'bobs_27_easy';
export const BOB27_EASY_TARGETS = 20;
export const VISIT_SIZE = 3;
export const DEFAULT_DURATION_MS = 300000;

export const BOB27_EASY_AIM_TEXT = 'Rzuć trzy lotki w wyświetloną podwójną.';

export function canPlayBob27Easy(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === BOB27_EASY_MECHANIC
		&& definition.inactive !== true,
	);
}

export function bob27EasyDurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function startBob27EasySession(definition, clientSessionId, now = Date.now()) {
	const durationMs = bob27EasyDurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		darts: [],
		durationMs,
		endsAt: now + durationMs,
	};
}

function settledCount(darts) {
	const length = darts?.length ?? 0;
	return length - (length % VISIT_SIZE);
}

/** Wynik z domkniętych trójek. Niedokończona trójka nie rusza licznika. */
export function bob27EasyScore(darts) {
	let score = BOB27_STARTING_SCORE;
	const settled = settledCount(darts);
	const visits = settled / VISIT_SIZE;
	for (let visit = 0; visit < visits; visit += 1) {
		let hits = 0;
		for (let offset = 0; offset < VISIT_SIZE; offset += 1) {
			if (darts[visit * VISIT_SIZE + offset]?.ring !== 'miss') {
				hits += 1;
			}
		}
		score = applyBob27Visit(score, hits, visit, false);
	}
	return score;
}

export function currentBob27EasyVisit(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	const length = session.darts?.length ?? 0;
	const targetIndex = Math.floor(length / VISIT_SIZE);
	if (targetIndex >= BOB27_EASY_TARGETS) {
		return null;
	}
	const number = targetIndex + 1;
	return {
		number,
		label: `D${number}`,
		dartNumber: (length % VISIT_SIZE) + 1,
	};
}

export function recordBob27EasyDart(session, hit) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const visit = currentBob27EasyVisit(session);
	if (!visit) {
		return session;
	}
	const dart = hit
		? { number: visit.number, ring: 'double' }
		: { number: 0, ring: 'miss' };
	const darts = [...session.darts, dart];
	const done = darts.length >= BOB27_EASY_TARGETS * VISIT_SIZE;
	return {
		...session,
		darts,
		status: done ? 'completed' : 'playing',
	};
}

export function undoBob27EasyDart(session) {
	if (!session || session.darts.length === 0) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
		status: 'playing',
	};
}

/** Koniec czasu odrzuca niedokończoną trójkę i zamyka ćwiczenie. */
export function expireBob27Easy(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const settled = settledCount(session.darts);
	return {
		...session,
		darts: session.darts.slice(0, settled),
		status: 'completed',
	};
}

/**
 * Procent zaokrąglony do całości. Liczą się tylko domknięte trójki.
 *
 * @returns {{ hits: number, attempts: number, percent: number }}
 */
export function bob27EasyStats(session) {
	const darts = session?.darts ?? [];
	const attempts = settledCount(darts);
	let hits = 0;
	for (let index = 0; index < attempts; index += 1) {
		if (darts[index]?.ring !== 'miss') {
			hits += 1;
		}
	}
	const percent = attempts === 0 ? 0 : Math.round((hits * 100) / attempts);
	return { hits, attempts, percent };
}

export function bob27EasyCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: bob27EasyScore(session.darts),
		stats: bob27EasyStats(session),
		sync: 'pending',
	};
}

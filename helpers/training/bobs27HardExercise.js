/**
 * Bob's 27 hard. D1–D20, potem inner bull za 50. Outer nie jest trafieniem.
 * Rozliczenie poniżej 1 kończy ćwiczenie wynikiem 0. Inaczej koniec po bullu albo po czasie.
 * Liczenie wizyty jest wspólne z wolną grą. Lista lotek zostaje na telefonie.
 */

import { BOB27_STARTING_SCORE, applyBob27Visit, bob27TargetValue } from '../bob27/bob27Rules.js';

export const BOB27_HARD_MECHANIC = 'bobs_27_hard';
export const BOB27_HARD_DOUBLES = 20;
export const BOB27_HARD_TARGETS = 21;
export const VISIT_SIZE = 3;
export const DEFAULT_DURATION_MS = 300000;
export const BOB27_HARD_INNER_AIM = 'Inner';

export const BOB27_HARD_DOUBLE_AIM_TEXT = 'Rzuć trzy lotki w wyświetloną podwójną.';
export const BOB27_HARD_INNER_AIM_TEXT = 'Rzuć trzy lotki w inner bull';

export function canPlayBob27Hard(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === BOB27_HARD_MECHANIC
		&& definition.inactive !== true,
	);
}

export function bob27HardDurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function startBob27HardSession(definition, clientSessionId, now = Date.now()) {
	const durationMs = bob27HardDurationMs(definition);
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

function visitHits(darts, visit) {
	let hits = 0;
	for (let offset = 0; offset < VISIT_SIZE; offset += 1) {
		if (darts[visit * VISIT_SIZE + offset]?.hit) {
			hits += 1;
		}
	}
	return hits;
}

/**
 * Wynik na liczniku. Trafienie dodaje wartość od razu.
 * Trzy pudła odejmują ją przy trzecim pudle. Poniżej 1 wraca 0.
 */
export function bob27HardScore(darts) {
	let score = BOB27_STARTING_SCORE;
	const settled = settledCount(darts);
	const visits = settled / VISIT_SIZE;
	for (let visit = 0; visit < visits; visit += 1) {
		score = applyBob27Visit(score, visitHits(darts, visit), visit, true);
		if (score < 1) {
			return 0;
		}
	}
	const list = darts ?? [];
	let openHits = 0;
	for (let index = settled; index < list.length; index += 1) {
		if (list[index]?.hit) {
			openHits += 1;
		}
	}
	if (openHits > 0) {
		score += openHits * bob27TargetValue(visits, true);
	}
	return score;
}

function busted(darts) {
	let score = BOB27_STARTING_SCORE;
	const visits = settledCount(darts) / VISIT_SIZE;
	for (let visit = 0; visit < visits; visit += 1) {
		score = applyBob27Visit(score, visitHits(darts, visit), visit, true);
		if (score < 1) {
			return true;
		}
	}
	return false;
}

export function bob27HardAimText(visit) {
	return visit?.aim === BOB27_HARD_INNER_AIM
		? BOB27_HARD_INNER_AIM_TEXT
		: BOB27_HARD_DOUBLE_AIM_TEXT;
}

export function currentBob27HardVisit(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	const length = session.darts?.length ?? 0;
	const targetIndex = Math.floor(length / VISIT_SIZE);
	if (targetIndex >= BOB27_HARD_TARGETS || busted(session.darts)) {
		return null;
	}
	const dartNumber = (length % VISIT_SIZE) + 1;
	if (targetIndex === BOB27_HARD_DOUBLES) {
		return {
			aim: BOB27_HARD_INNER_AIM,
			label: BOB27_HARD_INNER_AIM,
			accessibilityLabel: 'Inner',
			dartNumber,
		};
	}
	const number = targetIndex + 1;
	return {
		aim: `D${number}`,
		label: `D${number}`,
		number,
		accessibilityLabel: `Dubl ${number}`,
		dartNumber,
	};
}

export function recordBob27HardDart(session, hit) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const visit = currentBob27HardVisit(session);
	if (!visit) {
		return session;
	}
	const darts = [...session.darts, { aim: visit.aim, hit: Boolean(hit) }];
	const settled = darts.length % VISIT_SIZE === 0;
	const done = settled && (busted(darts) || darts.length >= BOB27_HARD_TARGETS * VISIT_SIZE);
	return {
		...session,
		darts,
		status: done ? 'completed' : 'playing',
	};
}

export function undoBob27HardDart(session) {
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
export function expireBob27Hard(session) {
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
 * Skuteczność per cel, w kolejności rzutów. Liczą się tylko domknięte trójki.
 *
 * @returns {{ hits: number, attempts: number, percent: number, aims: Array<{ aim: string, attempts: number, hits: number }> }}
 */
export function bob27HardStats(session) {
	const darts = session?.darts ?? [];
	const attempts = settledCount(darts);
	const aims = [];
	const byAim = new Map();
	let hits = 0;
	for (let index = 0; index < attempts; index += 1) {
		const dart = darts[index];
		if (dart?.hit) {
			hits += 1;
		}
		let row = byAim.get(dart?.aim);
		if (!row) {
			row = { aim: dart?.aim, attempts: 0, hits: 0 };
			byAim.set(dart?.aim, row);
			aims.push(row);
		}
		row.attempts += 1;
		if (dart?.hit) {
			row.hits += 1;
		}
	}
	const percent = attempts === 0 ? 0 : Math.round((hits * 100) / attempts);
	return { hits, attempts, percent, aims };
}

export function bob27HardCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: bob27HardScore(session.darts),
		stats: bob27HardStats(session),
		sync: 'pending',
	};
}

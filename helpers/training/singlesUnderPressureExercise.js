/**
 * Singielki z presją. Liczą się tylko single, bull to outer albo inner.
 * Trafienie przesuwa cel od razu, także w tej samej trójce.
 * Trzy pudła w podejściu cofają o jeden sektor. Nie schodzi poniżej 1
 * i nie wraca z S1 na powrocie ani do ukończonej ścieżki.
 * Po bullu ścieżka schodzi 20 → 1. Single 1 na powrocie zamyka ją za 45.
 */

export const SINGLES_MECHANIC = 'singles_under_pressure';
export const SINGLES_AIM_TEXT = 'Celuj w pole pojedyncze wskazanego sektora, jeśli trafisz - celuj w kolejny';
export const VISIT_SIZE = 3;
export const LOOP_LENGTH = 41;
export const DEFAULT_DURATION_MS = 600000;
const PATH_SCORE = 45;

export function canPlaySingles(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === SINGLES_MECHANIC
		&& definition.inactive !== true,
	);
}

export function singlesDurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

/** Cel na pozycji ścieżki. 0 to S1 w górę, 20 to bull, 40 to S1 w dół. Potem pętla od nowa. */
export function pathTarget(index) {
	const step = index % LOOP_LENGTH;
	if (step < 20) {
		const number = step + 1;
		return { kind: 'sector', number, aim: `S${number}` };
	}
	if (step === 20) {
		return { kind: 'bull', aim: 'Bull' };
	}
	const number = LOOP_LENGTH - step;
	return { kind: 'sector', number, aim: `S${number}` };
}

/** Punkty samej pozycji, bez ukończonych ścieżek. */
export function positionPoints(index) {
	const step = index % LOOP_LENGTH;
	if (step < 20) {
		return step + 1;
	}
	if (step === 20) {
		return 25;
	}
	return 25 + (step - 20);
}

function holdsPosition(index) {
	const step = index % LOOP_LENGTH;
	return step === 0 || step === LOOP_LENGTH - 1;
}

/**
 * @param {Array<{ hit?: boolean }>} darts
 * @returns {{ index: number, thrown: Array<{ aim: string, hit: boolean }> }}
 */
function walk(darts) {
	let index = 0;
	let visitHits = 0;
	const thrown = [];
	for (let cursor = 0; cursor < darts.length; cursor += 1) {
		const target = pathTarget(index);
		const hit = darts[cursor]?.hit === true;
		thrown.push({ aim: target.aim, hit });
		if (hit) {
			index += 1;
			visitHits += 1;
		}
		if ((cursor + 1) % VISIT_SIZE === 0) {
			if (visitHits === 0 && !holdsPosition(index)) {
				index -= 1;
			}
			visitHits = 0;
		}
	}
	return { index, thrown };
}

export function singlesScoreAt(index) {
	return Math.floor(index / LOOP_LENGTH) * PATH_SCORE + positionPoints(index);
}

export function startSinglesSession(definition, clientSessionId, now = Date.now()) {
	const durationMs = singlesDurationMs(definition);
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

export function recordSinglesOutcome(session, hit) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	return {
		...session,
		darts: [...session.darts, { hit: hit === true }],
	};
}

export function undoSinglesDart(session) {
	if (!session || (session.darts?.length ?? 0) === 0) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
		status: 'playing',
	};
}

/**
 * Okno stoi przez trzy lotki. Trafienie przesuwa ramkę, pudło jej nie rusza.
 * Po trzeciej lotce aktualny cel staje z lewej. Trzy pudła cofają okno o jeden.
 *
 * @returns {{ targets: Array, activeOffset: number, windowStart: number }|null}
 */
export function currentSinglesVisit(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	const darts = session.darts ?? [];
	const openCount = darts.length % VISIT_SIZE;
	const settled = walk(darts.slice(0, darts.length - openCount));
	const live = walk(darts);
	const windowStart = settled.index;
	const activeOffset = live.index - windowStart;
	const length = Math.max(windowStart, live.index) + VISIT_SIZE + 1;
	const targets = [];
	for (let index = 0; index < length; index += 1) {
		targets.push(pathTarget(index));
	}
	return { targets, windowStart, activeOffset };
}

/** Koniec czasu zostawia rzucone lotki. Niedokończona trójka nie cofa. */
export function expireSingles(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	return {
		...session,
		status: 'completed',
	};
}

function percentOf(hits, attempts) {
	if (attempts === 0) {
		return 0;
	}
	return Math.round((hits * 100) / attempts);
}

/**
 * Skuteczność per cel, w kolejności pierwszego rzutu w ten cel.
 *
 * @returns {{ hits: number, attempts: number, percent: number, aims: Array<{ aim: string, attempts: number, hits: number, percent: number }> }}
 */
export function singlesStats(session) {
	const { thrown } = walk(session?.darts ?? []);
	const aims = [];
	const byAim = new Map();
	let hits = 0;
	for (const dart of thrown) {
		if (dart.hit) {
			hits += 1;
		}
		let row = byAim.get(dart.aim);
		if (!row) {
			row = { aim: dart.aim, attempts: 0, hits: 0 };
			byAim.set(dart.aim, row);
			aims.push(row);
		}
		row.attempts += 1;
		if (dart.hit) {
			row.hits += 1;
		}
	}
	return {
		hits,
		attempts: thrown.length,
		percent: percentOf(hits, thrown.length),
		aims: aims.map((row) => ({ ...row, percent: percentOf(row.hits, row.attempts) })),
	};
}

export function singlesScore(session) {
	return singlesScoreAt(walk(session?.darts ?? []).index);
}

/** Zapis ukończenia. Bez lotek. */
export function singlesCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: singlesScore(session),
		stats: singlesStats(session),
		sync: 'pending',
	};
}

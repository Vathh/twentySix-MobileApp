/**
 * 9/18 lotek. Cztery etapy: środek, 20, 19, potem na zmianę 20, 19, 18.
 * Wariant 9 ma 9 lotek na etap, wariant 18 ma 18. Każde trafienie daje 1 punkt.
 */

export const NINE_DARTS_MECHANIC = 'nine_darts';
export const STAGE_SIZE = 9;
export const EIGHTEEN_STAGE_SIZE = 18;
export const STAGE_COUNT = 4;
export const NINE_DARTS_LENGTH = 36;
export const EIGHTEEN_DARTS_LENGTH = 72;

export const NINE_DARTS_VARIANTS = [
	{ id: '9', label: '9 lotek' },
	{ id: '18', label: '18 lotek' },
];

const ROTATION = [20, 19, 18];
const SECTOR_RINGS = new Set(['single', 'double', 'triple']);
const STAGE_LABELS = ['Środek', 'Sektor 20', 'Sektor 19', '20, 19 i 18'];
const BULL_AIM = 'Bull';

/** Klucz skuteczności: Bull / sektor (cały), etap 4 dolicza do 20/19/18. */
export function aimKeyFor(aim) {
	if (!aim) {
		return null;
	}
	if (aim.kind === 'bull') {
		return BULL_AIM;
	}
	if (aim.kind === 'sector' && aim.number != null) {
		return String(aim.number);
	}
	return null;
}

export function canPlayNineDarts(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === NINE_DARTS_MECHANIC
		&& definition.inactive !== true,
	);
}

export function nineDartsVariant(variant) {
	return variant === '18' || variant === 18 ? '18' : '9';
}

export function stageSizeForVariant(variant) {
	return nineDartsVariant(variant) === '18' ? EIGHTEEN_STAGE_SIZE : STAGE_SIZE;
}

/**
 * Wybrany wariant gra pełne cztery etapy. Bez wariantu liczba lotek z definicji
 * ucina sekwencję od środka, a powyżej 36 zostaje wariant 9.
 */
export function nineDartsLength(dartCount, variant) {
	if (variant === '9' || variant === '18' || variant === 9 || variant === 18) {
		return stageSizeForVariant(variant) * STAGE_COUNT;
	}
	const count = Number(dartCount);
	const requested = Number.isInteger(count) && count > 0 ? count : NINE_DARTS_LENGTH;
	return Math.min(requested, NINE_DARTS_LENGTH);
}

export function aimAt(index, stageSize = STAGE_SIZE) {
	const size = stageSize === EIGHTEEN_STAGE_SIZE ? EIGHTEEN_STAGE_SIZE : STAGE_SIZE;
	const stage = Math.floor(index / size);
	const within = index % size;
	if (stage <= 0) {
		return { stage: 0, kind: 'bull' };
	}
	if (stage === 1) {
		return { stage: 1, kind: 'sector', number: 20 };
	}
	if (stage === 2) {
		return { stage: 2, kind: 'sector', number: 19 };
	}
	return { stage: 3, kind: 'sector', number: ROTATION[within % ROTATION.length] };
}

function instructionPart(text, strong = false) {
	return strong ? { text, strong: true } : { text };
}

/** Fragmenty zdania. Pogrubione są środek oraz numery sektorów. */
export function aimInstruction(aim) {
	if (!aim) {
		return [];
	}
	if (aim.stage === 0) {
		return [
			instructionPart('Celuj w czerwony '),
			instructionPart('środek', true),
			instructionPart('.'),
		];
	}
	if (aim.stage === 1) {
		return [
			instructionPart('Celuj w sektor '),
			instructionPart('20', true),
			instructionPart('.'),
		];
	}
	if (aim.stage === 2) {
		return [
			instructionPart('Celuj w sektor '),
			instructionPart('19', true),
			instructionPart('.'),
		];
	}
	return [
		instructionPart('Celuj kolejno po jednej lotce w sektor '),
		instructionPart('20', true),
		instructionPart(', '),
		instructionPart('19', true),
		instructionPart(' i '),
		instructionPart('18', true),
		instructionPart('.'),
	];
}

export function startNineDartsSession(definition, clientSessionId, variant) {
	const chosen = variant === '9' || variant === '18' || variant === 9 || variant === 18
		? nineDartsVariant(variant)
		: null;
	const stageSize = chosen === '18' ? EIGHTEEN_STAGE_SIZE : STAGE_SIZE;
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		variant: chosen ?? '9',
		stageSize,
		length: chosen ? stageSize * STAGE_COUNT : nineDartsLength(definition?.dartCount),
		darts: [],
	};
}

export function currentAim(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	if (session.darts.length >= session.length) {
		return null;
	}
	return aimAt(session.darts.length, session.stageSize);
}

function missDart() {
	return { number: 0, ring: 'miss' };
}

/**
 * Przycisk z aktualnego etapu. Inny przycisk nie dopisuje lotki.
 *
 * @param {{ ring?: string, number?: number }} dart
 */
export function recordNineDart(session, dart) {
	const aim = currentAim(session);
	if (!aim || !dart) {
		return session;
	}
	const ring = dart.ring;
	let stored = null;
	if (aim.stage === 0) {
		if (ring === 'miss') {
			stored = missDart();
		} else if (ring === 'inner' || ring === 'outer') {
			stored = { number: 25, ring };
		}
	} else if (aim.stage === 1 || aim.stage === 2) {
		if (ring === 'miss') {
			stored = missDart();
		} else if (SECTOR_RINGS.has(ring)) {
			stored = { number: aim.number, ring };
		}
	} else if (ring === 'miss') {
		stored = missDart();
	} else if (SECTOR_RINGS.has(ring) && ROTATION.includes(dart.number)) {
		stored = { number: dart.number, ring };
	}
	if (!stored) {
		return session;
	}
	const darts = [...session.darts, stored];
	return {
		...session,
		darts,
		status: darts.length >= session.length ? 'completed' : 'playing',
	};
}

export function undoNineDart(session) {
	if (!session || session.darts.length === 0) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
		status: 'playing',
	};
}

export function dartHitsAim(aim, dart) {
	if (!aim || !dart || dart.ring === 'miss') {
		return false;
	}
	if (aim.kind === 'bull') {
		return dart.ring === 'inner' || dart.ring === 'outer';
	}
	return dart.number === aim.number && SECTOR_RINGS.has(dart.ring);
}

function percentOf(hits, attempts) {
	if (attempts === 0) {
		return 0;
	}
	return Math.round((hits * 100) / attempts);
}

/** Trafienia i procent: etapy (UI postępu) + aims per cel (pierścienie). */
export function nineDartsStats(session) {
	const darts = session?.darts ?? [];
	const stageSize = session?.stageSize === EIGHTEEN_STAGE_SIZE ? EIGHTEEN_STAGE_SIZE : STAGE_SIZE;
	const buckets = STAGE_LABELS.map((label) => ({ label, hits: 0, attempts: 0 }));
	const aimMap = new Map();
	darts.forEach((dart, index) => {
		const aim = aimAt(index, stageSize);
		const bucket = buckets[aim.stage];
		bucket.attempts += 1;
		const hit = dartHitsAim(aim, dart);
		if (hit) {
			bucket.hits += 1;
		}
		const key = aimKeyFor(aim);
		if (!key) {
			return;
		}
		const row = aimMap.get(key) || { aim: key, hits: 0, attempts: 0 };
		row.attempts += 1;
		if (hit) {
			row.hits += 1;
		}
		aimMap.set(key, row);
	});
	const stages = buckets
		.filter((stage) => stage.attempts > 0)
		.map((stage) => ({
			...stage,
			percent: percentOf(stage.hits, stage.attempts),
		}));
	const aims = [...aimMap.values()]
		.map((row) => ({
			...row,
			percent: percentOf(row.hits, row.attempts),
		}))
		.sort((a, b) => (b.percent - a.percent) || a.aim.localeCompare(b.aim, 'pl'));
	const hits = stages.reduce((sum, stage) => sum + stage.hits, 0);
	return {
		variant: session?.variant === '18' ? '18' : '9',
		hits,
		attempts: darts.length,
		percent: percentOf(hits, darts.length),
		stages,
		aims,
	};
}

/** Zapis ukończenia. Bez lotek. Wynik to liczba trafień. */
export function nineDartsCompletion(session, completedAt) {
	const stats = nineDartsStats(session);
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: stats.hits,
		stats,
		sync: 'pending',
	};
}

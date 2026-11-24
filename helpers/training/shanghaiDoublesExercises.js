/**
 * Ćwiczenia z etapów dawnego 54-Dart: Shanghai 10–15, Doubles, Shanghai 16–20.
 */

export const VISIT_SIZE = 3;

export const SHANGHAI_POINTS = {
	single: 15,
	double: 30,
	triple: 45,
	miss: 0,
};
export const SHANGHAI_BONUS = 100;
export const DOUBLE_HIT = 50;
export const INNER_BULL = 100;

export const SHANGHAI_10_15 = 'shanghai_10_15';
export const DOUBLES_54 = 'doubles_54';
export const SHANGHAI_16_20 = 'shanghai_16_20';

export const SHANGHAI_DOUBLES_KEYS = [SHANGHAI_10_15, DOUBLES_54, SHANGHAI_16_20];

const SPECS = {
	[SHANGHAI_10_15]: {
		label: 'Shanghai 10–15',
		type: 'shanghai',
		targets: ['10', '11', '12', '13', '14', '15'],
		dartCount: 18,
	},
	[DOUBLES_54]: {
		label: 'Doubles',
		type: 'doubles',
		targets: [
			'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10',
			'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20',
			'Bull',
		],
		dartCount: 21,
	},
	[SHANGHAI_16_20]: {
		label: 'Shanghai 16–20',
		type: 'shanghai',
		targets: ['16', '17', '18', '19', '20'],
		dartCount: 15,
	},
};

export function isShanghaiDoublesKey(key) {
	return SHANGHAI_DOUBLES_KEYS.includes(key);
}

export function shanghaiDoublesSpec(exerciseKey) {
	return SPECS[exerciseKey] || null;
}

export function canPlayShanghaiDoubles(definition) {
	const key = definition?.exerciseKey || definition?.id;
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& isShanghaiDoublesKey(key)
		&& definition.inactive !== true,
	);
}

function shanghaiVisitScore(rings) {
	let score = 0;
	const set = { single: false, double: false, triple: false };
	rings.forEach((ring) => {
		score += SHANGHAI_POINTS[ring] ?? 0;
		if (ring === 'single' || ring === 'double' || ring === 'triple') {
			set[ring] = true;
		}
	});
	if (set.single && set.double && set.triple) {
		score += SHANGHAI_BONUS;
	}
	return score;
}

function scoreShanghai(darts, sectorCount) {
	let score = 0;
	for (let visit = 0; visit < sectorCount; visit += 1) {
		const rings = [];
		for (let offset = 0; offset < VISIT_SIZE; offset += 1) {
			const dart = darts[visit * VISIT_SIZE + offset];
			if (!dart) {
				return score;
			}
			rings.push(dart.ring);
		}
		score += shanghaiVisitScore(rings);
	}
	return score;
}

function scoreDoubles(darts, targetCount) {
	let score = 0;
	const limit = Math.min(darts.length, targetCount);
	for (let i = 0; i < limit; i += 1) {
		const dart = darts[i];
		if (dart.target === 'Bull') {
			if (dart.ring === 'inner') {
				score += INNER_BULL;
			}
			continue;
		}
		if (dart.ring === 'double') {
			score += DOUBLE_HIT;
		}
	}
	return score;
}

export function scoreShanghaiDoubles(exerciseKey, darts) {
	const spec = shanghaiDoublesSpec(exerciseKey);
	if (!spec) {
		return 0;
	}
	return spec.type === 'shanghai'
		? scoreShanghai(darts || [], spec.targets.length)
		: scoreDoubles(darts || [], spec.targets.length);
}

export function startShanghaiDoublesSession(definition, clientSessionId) {
	const exerciseKey = definition.exerciseKey || definition.id;
	const spec = shanghaiDoublesSpec(exerciseKey);
	return {
		clientSessionId,
		definitionId: definition.id,
		exerciseKey,
		name: definition.name || spec?.label || exerciseKey,
		kind: 'exercise',
		mechanic: exerciseKey,
		status: 'playing',
		darts: [],
		targets: spec?.targets || [],
		stageType: spec?.type || 'shanghai',
		dartCount: spec?.dartCount || 0,
	};
}

export function shanghaiDoublesAimText(target) {
	if (!target) {
		return '';
	}
	if (target.stageType === 'shanghai') {
		return `Celuj w sektor ${target.targetLabel}`;
	}
	if (target.isBull) {
		return 'Celuj w Inner Bull';
	}
	return `Celuj w ${target.targetLabel}`;
}

export function currentShanghaiDoublesTarget(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	const localIndex = session.darts.length;
	if (localIndex >= session.dartCount) {
		return null;
	}
	if (session.stageType === 'shanghai') {
		const sectorIndex = Math.floor(localIndex / VISIT_SIZE);
		const dartNumber = (localIndex % VISIT_SIZE) + 1;
		const target = session.targets[sectorIndex];
		return {
			stageType: 'shanghai',
			target,
			targetLabel: target,
			dartNumber,
			visitSize: VISIT_SIZE,
			isBull: false,
		};
	}
	const target = session.targets[localIndex];
	return {
		stageType: 'doubles',
		target,
		targetLabel: target,
		dartNumber: (localIndex % VISIT_SIZE) + 1,
		visitSize: VISIT_SIZE,
		isBull: target === 'Bull',
	};
}

export function recordShanghaiDoublesDart(session, ring) {
	if (!session || session.status !== 'playing') {
		return { session, visitClosed: false };
	}
	const target = currentShanghaiDoublesTarget(session);
	if (!target) {
		return { session, visitClosed: false };
	}
	const darts = [...session.darts, { target: target.target, ring }];
	const visitClosed = darts.length % VISIT_SIZE === 0;
	const done = darts.length >= session.dartCount;
	return {
		session: {
			...session,
			darts,
			status: done ? 'completed' : 'playing',
		},
		visitClosed,
	};
}

export function undoShanghaiDoublesDart(session) {
	if (!session || session.status !== 'playing' || !session.darts?.length) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
	};
}

export function shanghaiDoublesCompletion(session, completedAt = new Date().toISOString()) {
	const score = scoreShanghaiDoubles(session.exerciseKey, session.darts);
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		kind: 'exercise',
		name: session.name,
		completedAt,
		score,
		stats: {
			exerciseKey: session.exerciseKey,
			thrown: session.darts.length,
			stageType: session.stageType,
		},
		sync: 'pending',
	};
}

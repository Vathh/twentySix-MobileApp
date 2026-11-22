/**
 * 54-Dart Challenge. Etapy: Shanghai 10–15 → Doubles → Shanghai 16–20.
 * W trakcie bez sumy punktów. Komplet S+D+T liczy aplikacja.
 */

export const FIFTY_FOUR_DART_MECHANIC = 'fifty_four_dart';
export const VISIT_SIZE = 3;
export const MAX_SCORE = 3190;

export const SHANGHAI_POINTS = {
	single: 15,
	double: 30,
	triple: 45,
	miss: 0,
};
export const SHANGHAI_BONUS = 100;
export const DOUBLE_HIT = 50;
export const INNER_BULL = 100;

export const STAGES = [
	{
		id: 'shanghai_10_15',
		label: 'Shanghai 10–15',
		type: 'shanghai',
		targets: ['10', '11', '12', '13', '14', '15'],
	},
	{
		id: 'doubles',
		label: 'Doubles',
		type: 'doubles',
		targets: [
			'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10',
			'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20',
			'Bull',
		],
	},
	{
		id: 'shanghai_16_20',
		label: 'Shanghai 16–20',
		type: 'shanghai',
		targets: ['16', '17', '18', '19', '20'],
	},
];

export function canPlayFiftyFourDart(definition) {
	const key = definition?.challengeKey || definition?.mechanic;
	return Boolean(
		definition
		&& definition.kind === 'challenge'
		&& key === FIFTY_FOUR_DART_MECHANIC
		&& definition.inactive !== true,
	);
}

export function totalDarts() {
	return STAGES.reduce((sum, stage) => (
		sum + (stage.type === 'shanghai'
			? stage.targets.length * VISIT_SIZE
			: stage.targets.length)
	), 0);
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

export function scoreChallenge(darts) {
	const byStage = {};
	(darts || []).forEach((dart) => {
		if (!dart?.stageId) {
			return;
		}
		if (!byStage[dart.stageId]) {
			byStage[dart.stageId] = [];
		}
		byStage[dart.stageId].push(dart);
	});

	const stages = STAGES.map((stage) => {
		const stageDarts = byStage[stage.id] || [];
		const score = stage.type === 'shanghai'
			? scoreShanghai(stageDarts, stage.targets.length)
			: scoreDoubles(stageDarts, stage.targets.length);
		return { id: stage.id, label: stage.label, score };
	});
	const score = stages.reduce((sum, stage) => sum + stage.score, 0);
	return {
		score,
		stages,
		complete: (darts?.length ?? 0) >= totalDarts(),
	};
}

export function startFiftyFourSession(definition, clientSessionId) {
	return {
		clientSessionId,
		definitionId: definition.id,
		name: definition.name,
		challengeKey: FIFTY_FOUR_DART_MECHANIC,
		kind: 'challenge',
		status: 'playing',
		darts: [],
	};
}

/**
 * Aktualny cel i licznik lotki w wizycie UI (1–3).
 * Doubles: jedna lotka na cel, ale licznik UI i dźwięk co 3 wpisy.
 */
/** Krótka wskazówka nad celem w trakcie próby. */
export function fiftyFourAimText(target) {
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

export function currentTarget(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	let offset = 0;
	for (let stageIndex = 0; stageIndex < STAGES.length; stageIndex += 1) {
		const stage = STAGES[stageIndex];
		const stageDartCount = stage.type === 'shanghai'
			? stage.targets.length * VISIT_SIZE
			: stage.targets.length;
		const localIndex = session.darts.length - offset;
		if (localIndex < stageDartCount) {
			if (stage.type === 'shanghai') {
				const sectorIndex = Math.floor(localIndex / VISIT_SIZE);
				const dartNumber = (localIndex % VISIT_SIZE) + 1;
				return {
					stageId: stage.id,
					stageLabel: stage.label,
					stageType: stage.type,
					target: stage.targets[sectorIndex],
					targetLabel: stage.targets[sectorIndex],
					dartNumber,
					visitSize: VISIT_SIZE,
				};
			}
			const target = stage.targets[localIndex];
			const dartNumber = (session.darts.length % VISIT_SIZE) + 1;
			return {
				stageId: stage.id,
				stageLabel: stage.label,
				stageType: stage.type,
				target,
				targetLabel: target,
				dartNumber,
				visitSize: VISIT_SIZE,
				isBull: target === 'Bull',
			};
		}
		offset += stageDartCount;
	}
	return null;
}

export function recordFiftyFourDart(session, ring) {
	if (!session || session.status !== 'playing') {
		return { session, visitClosed: false };
	}
	const target = currentTarget(session);
	if (!target) {
		return { session, visitClosed: false };
	}
	const dart = {
		stageId: target.stageId,
		target: target.target,
		ring,
	};
	const darts = [...session.darts, dart];
	const visitClosed = darts.length % VISIT_SIZE === 0;
	const done = darts.length >= totalDarts();
	return {
		session: {
			...session,
			darts,
			status: done ? 'completed' : 'playing',
		},
		visitClosed,
	};
}

export function undoFiftyFourDart(session) {
	if (!session || session.status !== 'playing' || !session.darts?.length) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
	};
}

export function fiftyFourCompletion(session, completedAt = new Date().toISOString()) {
	const scored = scoreChallenge(session.darts);
	return {
		clientSessionId: session.clientSessionId,
		definitionId: session.definitionId,
		kind: 'challenge',
		name: session.name,
		completedAt,
		score: scored.score,
		stats: {
			challengeKey: FIFTY_FOUR_DART_MECHANIC,
			stages: scored.stages,
			thrown: session.darts.length,
		},
		sync: 'pending',
	};
}

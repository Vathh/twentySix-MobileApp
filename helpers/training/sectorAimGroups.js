/** Minimalna liczba prób, by sektor wszedł do „najlepsze” / „najsłabsze”. */
export const SECTOR_HIGHLIGHT_MIN_ATTEMPTS = 15;

/**
 * @param {{ aim?: string, attempts?: number, hits?: number, percent?: number }} row
 */
export function aimPercent(row) {
	if (Number.isFinite(row?.percent)) {
		return Number(row.percent);
	}
	const attempts = Number(row?.attempts) || 0;
	const hits = Number(row?.hits) || 0;
	if (attempts <= 0) {
		return 0;
	}
	return Math.round((1000 * hits) / attempts) / 10;
}

/**
 * Kategoria celu: całe sektory / single / double / triple.
 * @param {string} aim
 * @returns {'sector' | 'single' | 'double' | 'triple' | null}
 */
export function classifyAim(aim) {
	const label = String(aim || '').trim();
	if (!label) {
		return null;
	}
	if (/^S([1-9]|1[0-9]|20)$/i.test(label)) {
		return 'single';
	}
	if (/^D([1-9]|1[0-9]|20)$/i.test(label) || /^inner$/i.test(label)) {
		return 'double';
	}
	if (/^T([1-9]|1[0-9]|20)$/i.test(label)) {
		return 'triple';
	}
	if (/^([1-9]|1[0-9]|20)$/.test(label) || /^(bull|czerwony środek|outer)$/i.test(label)) {
		return 'sector';
	}
	return 'sector';
}

/**
 * Kolejność na tarczy: 1…20, potem bull / inner.
 * @param {string} aim
 */
export function boardOrderKey(aim) {
	const label = String(aim || '').trim();
	const numbered = label.match(/^[SDT]?([1-9]|1[0-9]|20)$/i);
	if (numbered) {
		return Number(numbered[1]);
	}
	if (/^(bull|czerwony środek|inner|outer)$/i.test(label)) {
		return 25;
	}
	return 100;
}

/**
 * @param {Array<{ aim: string, attempts: number, hits: number, percent?: number }>} aims
 */
export function sortAimsByBoard(aims) {
	return [...(aims || [])].sort((a, b) => {
		const order = boardOrderKey(a.aim) - boardOrderKey(b.aim);
		if (order !== 0) {
			return order;
		}
		return String(a.aim).localeCompare(String(b.aim), 'pl');
	});
}

/**
 * @param {Array<{ aim: string, attempts: number, hits: number, percent?: number }>} aims
 */
export function groupAimsByKind(aims) {
	const groups = {
		sector: [],
		single: [],
		double: [],
		triple: [],
	};
	for (const row of aims || []) {
		if (!row?.aim || !(Number(row.attempts) > 0)) {
			continue;
		}
		const kind = classifyAim(row.aim);
		if (!kind || !groups[kind]) {
			continue;
		}
		groups[kind].push(row);
	}
	return {
		sector: sortAimsByBoard(groups.sector),
		single: sortAimsByBoard(groups.single),
		double: sortAimsByBoard(groups.double),
		triple: sortAimsByBoard(groups.triple),
	};
}

/**
 * @param {Array<{ aim: string, attempts: number, hits: number, percent?: number }>} aims
 */
export function overallAimAccuracy(aims) {
	let attempts = 0;
	let hits = 0;
	for (const row of aims || []) {
		attempts += Math.max(0, Number(row?.attempts) || 0);
		hits += Math.max(0, Number(row?.hits) || 0);
	}
	return {
		attempts,
		hits,
		percent: attempts > 0 ? Math.round((1000 * hits) / attempts) / 10 : 0,
	};
}

/**
 * @param {Array<{ aim: string, attempts: number, hits: number, percent?: number }>} aims
 * @param {number} [minAttempts]
 */
export function highlightAims(aims, minAttempts = SECTOR_HIGHLIGHT_MIN_ATTEMPTS) {
	const eligible = (aims || [])
		.filter((row) => row?.aim && (Number(row.attempts) || 0) >= minAttempts)
		.map((row) => ({ ...row, percent: aimPercent(row) }));

	const byBest = [...eligible].sort((a, b) => {
		const pct = b.percent - a.percent;
		if (pct !== 0) {
			return pct;
		}
		return (b.attempts - a.attempts) || String(a.aim).localeCompare(String(b.aim), 'pl');
	});
	const best = byBest.slice(0, 3);
	const bestAims = new Set(best.map((row) => row.aim));

	const byWorst = eligible
		.filter((row) => !bestAims.has(row.aim))
		.sort((a, b) => {
			const pct = a.percent - b.percent;
			if (pct !== 0) {
				return pct;
			}
			return (b.attempts - a.attempts) || String(a.aim).localeCompare(String(b.aim), 'pl');
		});

	return {
		best,
		worst: byWorst.slice(0, 3),
	};
}

export const AIM_GROUP_LABELS = {
	sector: 'Sektory',
	single: 'Single',
	double: 'Double',
	triple: 'Triple',
};

/** Kolejność przycisków rozwijania. */
export const AIM_GROUP_ORDER = ['sector', 'double', 'triple', 'single'];

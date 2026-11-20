/**
 * Zegar sektory. Pudło zostawia cel, trafienie przechodzi dalej, także w tej samej trójce.
 * Po sektorach 1–20 jest bull. Czas ucina ćwiczenie. Lotki żyją tylko w trakcie.
 * Zamknięcie 21 sektorów bez pudła daje 30. Każde pudło i każdy niezaliczony sektor odejmuje 1.
 */

export const SECTOR_CLOCK_MECHANIC = 'clock_sdt';
export const SECTOR_COUNT = 20;
export const SECTOR_CLOCK_PERFECT = 30;
export const VISIT_SIZE = 3;
export const DEFAULT_DURATION_MS = 300000;
export const TICK_MS = 5000;

export const SECTOR_AIM_TEXT = 'Celuj w podświetlony sektor aż trafisz. Jeżeli Ci się uda to celuj w następny z wyświetlonych.';

export function canPlaySectorClock(definition) {
	return Boolean(
		definition
		&& definition.kind === 'exercise'
		&& definition.exerciseKey === SECTOR_CLOCK_MECHANIC
		&& definition.inactive !== true,
	);
}

/**
 * @returns {Array<{ kind: 'sector', number: number } | { kind: 'bull' }>}
 */
export function sectorTargets() {
	const targets = [];
	for (let number = 1; number <= SECTOR_COUNT; number += 1) {
		targets.push({ kind: 'sector', number });
	}
	targets.push({ kind: 'bull' });
	return targets;
}

export function sectorDurationMs(definition) {
	const seconds = Number(definition?.durationSeconds);
	if (Number.isInteger(seconds) && seconds > 0) {
		return seconds * 1000;
	}
	return DEFAULT_DURATION_MS;
}

export function startSectorClockSession(definition, clientSessionId, now = Date.now()) {
	const durationMs = sectorDurationMs(definition);
	return {
		clientSessionId,
		exerciseKey: definition.exerciseKey,
		name: definition.name,
		status: 'playing',
		targets: sectorTargets(),
		darts: [],
		durationMs,
		endsAt: now + durationMs,
	};
}

/** Ile milisekund zostało do końca, obcięte do długości ćwiczenia. */
export function visibleRemainingMs(session, now) {
	if (!session?.endsAt || !session.durationMs) {
		return 0;
	}
	const left = session.endsAt - now;
	if (left <= 0) {
		return 0;
	}
	return Math.min(session.durationMs, left);
}

/** Odliczanie w górę do pełnej sekundy: 5:00 przez pierwszą sekundę, potem 4:59. */
export function formatRemaining(ms) {
	const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Tykanie trwa 5 sekund i ma wybrzmieć razem z końcem czasu.
 * Krótsze ćwiczenie startuje plik od środka.
 */
export function scheduleCues(endsAt, now, tickMs = TICK_MS) {
	const remaining = Math.max(0, endsAt - now);
	const tickWindow = Math.min(remaining, tickMs);
	return {
		tickDelayMs: remaining - tickWindow,
		tickPositionSeconds: (tickMs - tickWindow) / 1000,
		endDelayMs: remaining,
	};
}

function hitCount(darts) {
	let cleared = 0;
	for (let index = 0; index < darts.length; index += 1) {
		if (darts[index]?.ring !== 'miss') {
			cleared += 1;
		}
	}
	return cleared;
}

/** Ile celów jest już zaliczonych, łącznie z bullem. */
export function clearedCount(session) {
	return hitCount(session?.darts ?? []);
}

export function undoSectorDart(session) {
	if (!session || session.darts.length === 0) {
		return session;
	}
	return {
		...session,
		darts: session.darts.slice(0, -1),
		status: 'playing',
	};
}

/**
 * Okno stoi przez trzy lotki. Pudło nie rusza ramki, trafienie przesuwa ją w prawo.
 * Po trzeciej lotce okno zaczyna się od celu, który został.
 *
 * @returns {{ targets: Array, activeOffset: number, windowStart: number }|null}
 */
export function currentSectorVisit(session) {
	if (!session || session.status !== 'playing') {
		return null;
	}
	const darts = session.darts ?? [];
	const open = darts.length % VISIT_SIZE;
	const settled = open === 0 ? darts : darts.slice(0, darts.length - open);
	const windowStart = hitCount(settled);
	if (windowStart >= session.targets.length) {
		return null;
	}
	return {
		targets: session.targets.slice(windowStart, windowStart + VISIT_SIZE),
		activeOffset: hitCount(darts) - windowStart,
		windowStart,
	};
}

export function recordSectorOutcome(session, hit) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	const index = clearedCount(session);
	const target = session.targets[index];
	if (!target) {
		return session;
	}
	let dart = { number: 0, ring: 'miss' };
	if (hit && target.kind === 'bull') {
		dart = { number: 25, ring: 'outer' };
	} else if (hit) {
		dart = { number: target.number, ring: 'single' };
	}
	const darts = [...session.darts, dart];
	const cleared = index + (hit ? 1 : 0);
	return {
		...session,
		darts,
		status: cleared >= session.targets.length ? 'completed' : 'playing',
	};
}

/** Koniec czasu zostawia rzucone lotki i zamyka ćwiczenie w trakcie celu. */
export function expireSectorClock(session) {
	if (!session || session.status !== 'playing') {
		return session;
	}
	return {
		...session,
		status: 'completed',
	};
}

/**
 * Procent zaokrąglony do całości. Pusta sesja ma 0.
 *
 * @returns {{ hits: number, attempts: number, percent: number }}
 */
export function sectorClockStats(session) {
	const attempts = session?.darts?.length ?? 0;
	const hits = clearedCount(session);
	const percent = attempts === 0 ? 0 : Math.round((hits * 100) / attempts);
	return { hits, attempts, percent };
}

/**
 * 30 za pełne zamknięcie bez pudła.
 * Pudło i sektor, którego nie zaliczono, odejmują po 1.
 */
export function sectorClockScore(session) {
	const hits = clearedCount(session);
	const attempts = session?.darts?.length ?? 0;
	const sectors = session?.targets?.length ?? SECTOR_COUNT + 1;
	const misses = Math.max(0, attempts - hits);
	const open = Math.max(0, sectors - hits);
	return SECTOR_CLOCK_PERFECT - misses - open;
}

/** Zapis ukończenia. Bez lotek. */
export function sectorClockCompletion(session, completedAt) {
	return {
		clientSessionId: session.clientSessionId,
		exerciseKey: session.exerciseKey,
		name: session.name,
		completedAt,
		score: sectorClockScore(session),
		stats: sectorClockStats(session),
		sync: 'pending',
	};
}

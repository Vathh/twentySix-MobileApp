export const DEFAULT_DART_LIMIT = 45;
export const MIN_DART_LIMIT = 15;
export const MAX_DART_LIMIT = 99;
export const DART_LIMIT_STEP = 3;
export const DEFAULT_LOSS_THRESHOLD = 50;
export const MIN_LOSS_THRESHOLD = 2;
export const MAX_LOSS_THRESHOLD = 170;

export const OUTCOME_BULL_OFF = 'bull_off';
export const OUTCOME_AUTO_P1 = 'auto_p1';
export const OUTCOME_AUTO_P2 = 'auto_p2';

export function snapDartLimit(value) {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) {
		return DEFAULT_DART_LIMIT;
	}
	const snapped = Math.round(n / DART_LIMIT_STEP) * DART_LIMIT_STEP;
	return Math.min(MAX_DART_LIMIT, Math.max(MIN_DART_LIMIT, snapped));
}

export function normalizeDartLimit(value) {
	if (value === null || value === undefined || value === '' || value === false) {
		return null;
	}
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) {
		return null;
	}
	return snapDartLimit(n);
}

export function normalizeLossThreshold(value) {
	if (value === null || value === undefined || value === '' || value === false) {
		return null;
	}
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) {
		return null;
	}
	return Math.min(MAX_LOSS_THRESHOLD, Math.max(MIN_LOSS_THRESHOLD, Math.round(n)));
}

export function isDartLimitApplicable(format, scoringMode = null) {
	const limit = normalizeDartLimit(format?.dartLimit ?? format?.dart_limit);
	if (limit == null) {
		return false;
	}
	const gameType = String(format?.gameType ?? format?.game_type ?? 'x01').toLowerCase();
	if (gameType !== 'x01' && gameType !== '501') {
		return false;
	}
	if (String(scoringMode ?? '').toLowerCase() === 'each_own') {
		return false;
	}
	return true;
}

export function isDartLimitReached(dartLimit, dartsByPlayer) {
	const limit = normalizeDartLimit(dartLimit);
	const counts = dartsByPlayer ?? [];
	if (limit == null || counts.length === 0) {
		return false;
	}
	return counts.every((darts) => Number(darts) >= limit);
}

export function resolveH2hLimitOutcome(lossThreshold, player1Remaining, player2Remaining) {
	const threshold = normalizeLossThreshold(lossThreshold);
	if (threshold == null) {
		return OUTCOME_BULL_OFF;
	}
	const p1Above = Number(player1Remaining) >= threshold;
	const p2Above = Number(player2Remaining) >= threshold;
	if (p1Above && !p2Above) {
		return OUTCOME_AUTO_P2;
	}
	if (p2Above && !p1Above) {
		return OUTCOME_AUTO_P1;
	}
	return OUTCOME_BULL_OFF;
}

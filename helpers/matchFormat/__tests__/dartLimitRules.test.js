import {
	isDartLimitApplicable,
	isDartLimitReached,
	normalizeDartLimit,
	OUTCOME_AUTO_P1,
	OUTCOME_AUTO_P2,
	OUTCOME_BULL_OFF,
	resolveH2hLimitOutcome,
	snapDartLimit,
} from '../dartLimitRules.js';

export function runDartLimitRulesTests() {
	if (normalizeDartLimit(null) !== null) {
		throw new Error('null dart limit stays off');
	}
	if (snapDartLimit(14) !== 15 || snapDartLimit(46) !== 45 || snapDartLimit(100) !== 99) {
		throw new Error('snap dart limit');
	}
	if (!isDartLimitApplicable({ gameType: 'x01', dartLimit: 45 }, 'one_device')) {
		throw new Error('x01 one_device should apply');
	}
	if (isDartLimitApplicable({ gameType: 'x01', dartLimit: 45 }, 'each_own')) {
		throw new Error('each_own should ignore limiter');
	}
	if (isDartLimitReached(15, [12, 15])) {
		throw new Error('not all players at limit');
	}
	if (!isDartLimitReached(15, [15, 18])) {
		throw new Error('all players at limit');
	}
	if (resolveH2hLimitOutcome(50, 80, 10) !== OUTCOME_AUTO_P2) {
		throw new Error('p1 above threshold loses');
	}
	if (resolveH2hLimitOutcome(50, 10, 80) !== OUTCOME_AUTO_P1) {
		throw new Error('p2 above threshold loses');
	}
	if (resolveH2hLimitOutcome(50, 80, 80) !== OUTCOME_BULL_OFF) {
		throw new Error('both above → bull-off');
	}
	if (resolveH2hLimitOutcome(null, 80, 10) !== OUTCOME_BULL_OFF) {
		throw new Error('no threshold → bull-off');
	}
}

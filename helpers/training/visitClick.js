/**
 * Kiedy zagrać click po wpisie lotki w treningu (koniec kolejki / wizyty).
 */

import { catch20View } from './catch20Exercise.js';
import { checkout41View } from './checkout41Exercise.js';
import { checkoutBull81View } from './checkoutBull81Exercise.js';
import { scoring65View } from './scoring65Exercise.js';

function dartsVisitClosed(prev, next) {
	const prevLen = prev.darts?.length ?? 0;
	const nextLen = next.darts?.length ?? 0;
	if (nextLen <= prevLen) {
		return false;
	}
	// Bull counter ma success/fail na przyciskach — bez dodatkowego clicka.
	if (next.exerciseKey === 'bull_counter') {
		return false;
	}
	return nextLen % 3 === 0;
}

function actionsVisitClosed(prev, next) {
	const prevLen = prev.actions?.length ?? 0;
	const nextLen = next.actions?.length ?? 0;
	if (nextLen <= prevLen) {
		return false;
	}
	const key = next.exerciseKey;
	if (key === 'catch_20') {
		const before = catch20View(prev);
		const after = catch20View(next);
		// Udany checkout → success_short w handlerze, nie click.
		if (after.closed > before.closed) {
			return false;
		}
		return before.dartsInVisit > 0 && after.dartsInVisit === 0
			|| before.checkout !== after.checkout
			|| before.visit !== after.visit
			|| (after.finished && !before.finished);
	}
	if (key === 'checkout_41') {
		const before = checkout41View(prev);
		const after = checkout41View(next);
		return before.dartsInVisit > 0 && after.dartsInVisit === 0
			|| before.checkout !== after.checkout
			|| (after.finished && !before.finished);
	}
	if (key === 'checkout_bull_81') {
		const before = checkoutBull81View(prev);
		const after = checkoutBull81View(next);
		return before.dartsInVisit > 0 && after.dartsInVisit === 0
			|| before.checkout !== after.checkout
			|| (after.finished && !before.finished);
	}
	if (key === 'scoring_65') {
		// success_short / fail_shortest w handlerze wizyty.
		return false;
	}
	return false;
}

export function shouldPlayVisitClick(prev, next) {
	if (!prev || !next || prev === next) {
		return false;
	}
	if (Array.isArray(next.darts) && dartsVisitClosed(prev, next)) {
		return true;
	}
	if (Array.isArray(next.actions) && actionsVisitClosed(prev, next)) {
		return true;
	}
	return false;
}

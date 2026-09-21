import { pid } from './pid.js';
import { isVisitComplete } from './visitUtils.js';

const EMPTY_CELL = '-';

function visitSide(visit, leftPlayerId, rightPlayerId) {
	const id = pid(visit?.playerId);
	if (id != null && id === pid(leftPlayerId)) {
		return 'left';
	}
	if (id != null && id === pid(rightPlayerId)) {
		return 'right';
	}
	return null;
}

export function formatVisitThrown(visit) {
	if (!visit) {
		return EMPTY_CELL;
	}
	if (visit.bust) {
		return 'Bust';
	}
	return String(visit.score ?? 0);
}

export function formatVisitRemaining(visit) {
	if (!visit) {
		return EMPTY_CELL;
	}
	if (visit.remainingAfter != null && visit.remainingAfter !== '') {
		return String(visit.remainingAfter);
	}
	if (visit.bust && visit.remainingBefore != null && visit.remainingBefore !== '') {
		return String(visit.remainingBefore);
	}
	return EMPTY_CELL;
}

/**
 * Paruje wizyty H2H w rundy: lewy rzucone/pozostało | lotki (3/6/9) | prawe pozostało/rzucone.
 * Najnowsza runda pierwsza (pod nagłówkami). Prawy opener → puste lewe komórki, lotki od razu 3.
 *
 * @param {Array} visits
 * @param {number|string|null} leftPlayerId
 * @param {number|string|null} rightPlayerId
 * @returns {Array<{ key: string, leftThrown: string, leftRemaining: string, darts: number, rightRemaining: string, rightThrown: string, leftBust: boolean, rightBust: boolean }>}
 */
export function buildH2hLegVisitRows(visits, leftPlayerId, rightPlayerId) {
	const rounds = [];
	let current = { left: null, right: null };

	const flush = () => {
		if (current.left || current.right) {
			rounds.push(current);
			current = { left: null, right: null };
		}
	};

	for (const visit of visits ?? []) {
		if (!isVisitComplete(visit)) {
			continue;
		}
		const side = visitSide(visit, leftPlayerId, rightPlayerId);
		if (!side) {
			continue;
		}
		if (current[side]) {
			flush();
		}
		current[side] = visit;
	}
	flush();

	const newestFirst = [...rounds].reverse();
	return newestFirst.map((round, displayIndex) => {
		const roundFromStart = rounds.length - displayIndex;
		return {
			key: `${round.left?.id ?? 'x'}-${round.right?.id ?? 'x'}-${roundFromStart}`,
			leftThrown: formatVisitThrown(round.left),
			leftRemaining: formatVisitRemaining(round.left),
			darts: roundFromStart * 3,
			rightRemaining: formatVisitRemaining(round.right),
			rightThrown: formatVisitThrown(round.right),
			leftBust: Boolean(round.left?.bust),
			rightBust: Boolean(round.right?.bust),
		};
	});
}

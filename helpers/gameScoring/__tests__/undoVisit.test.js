import { resolveUndoLegId } from '../undoVisit.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runUndoVisitTests() {
	const closed = { id: 10, legNumber: 1, open: false };
	const emptyNext = {
		currentLeg: { id: 11, legNumber: 2, open: true },
		visits: [],
		legs: [closed],
	};
	assert(
		resolveUndoLegId(emptyNext, 11) === 10,
		'pusty następny leg cofa ostatni zamknięty',
	);

	const midLeg = {
		currentLeg: { id: 11, legNumber: 2, open: true },
		visits: [{ score: 60 }],
		legs: [closed],
	};
	assert(
		resolveUndoLegId(midLeg, 11) === 11,
		'wizyta w otwartym legu cofa ten leg',
	);

	const pendingClose = {
		currentLeg: null,
		visits: [],
		legs: [],
		pendingClosedLegId: 7,
	};
	assert(
		resolveUndoLegId(pendingClose, null) === 7,
		'niepotwierdzone zamknięcie cofa ten leg',
	);

	const betweenLegs = {
		currentLeg: null,
		visits: [],
		legs: [closed, { id: 12, legNumber: 2, open: false }],
	};
	assert(
		resolveUndoLegId(betweenLegs, null) === 12,
		'między legami cofa ostatni zamknięty',
	);
}

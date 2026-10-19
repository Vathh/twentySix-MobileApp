import { patchRawStateWithEntry } from '../queuedScoringState.js';
import {
	commandAlreadyApplied,
	isLegAlreadyOpenMessage,
	rejectionNotice,
} from '../scoringQueueAck.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runScoringQueueAckTests() {
	assert(
		isLegAlreadyOpenMessage({ message: 'Jest już otwarty leg.' }),
		'otwarty leg',
	);
	assert(!isLegAlreadyOpenMessage({ message: 'Leg jest już zamknięty.' }), 'zamknięty to nie otwarty');

	const openLeg = { currentLeg: { id: 4, open: true }, legs: [], game: { status: 'in_progress' } };
	assert(
		commandAlreadyApplied({ op: 'startLeg' }, openLeg, { legAlreadyOpen: true }),
		'startLeg przy otwartym legu',
	);
	assert(
		!commandAlreadyApplied({ op: 'startLeg' }, openLeg, { legAlreadyOpen: false }),
		'startLeg bez komunikatu o otwartym legu',
	);
	assert(
		commandAlreadyApplied(
			{ op: 'closeLeg', legId: 4 },
			{ currentLeg: null, legs: [{ id: 4 }], game: { status: 'in_progress' } },
		),
		'closeLeg gdy leg jest w zakończonych',
	);
	assert(
		!commandAlreadyApplied(
			{ op: 'recordVisit', clientVisitId: 'x' },
			openLeg,
		),
		'odrzucenie wizyty nie jest uznane za zapis',
	);

	assert(
		rejectionNotice(0).includes('Tablica pokazuje zapisany stan'),
		'komunikat bez ogona',
	);
	assert(
		rejectionNotice(2).includes('Niezapisane kolejne wpisy: 2'),
		'komunikat z ogonem',
	);

	const closed = patchRawStateWithEntry(
		{ currentLeg: { id: 1, open: true }, visits: [], players: [] },
		{ op: 'closeLeg', legId: 1, payload: { winnerId: 1 } },
	);
	assert(closed.currentLeg == null, 'closeLeg czyści lokalny leg');
}

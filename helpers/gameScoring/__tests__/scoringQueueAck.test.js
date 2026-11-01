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
		!commandAlreadyApplied(
			{ op: 'startLeg' },
			openLeg,
			{ legAlreadyOpen: true, reopenedLegId: 4 },
		),
		'startLeg nie dokleja wizyty do lega wznowionego undo',
	);
	assert(
		commandAlreadyApplied(
			{ op: 'startLeg' },
			openLeg,
			{ legAlreadyOpen: true, reopenedLegId: 9 },
		),
		'startLeg przy innym otwartym legu jest już zapisany',
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
	assert(closed.pendingClosedLegId === 1, 'closeLeg pamięta leg do cofnięcia');

	const rotated = patchRawStateWithEntry(
		{
			currentLeg: { id: 7, open: true, legNumber: 1 },
			visits: [{ playerId: 10, score: 141 }],
			players: [
				{ playerId: 10, remaining: 0 },
				{ playerId: 20, remaining: 320 },
			],
			turn: { currentPlayerIndex: 1, legOpenerIndex: 0, legNumber: 1 },
			legOpenerIndex: 0,
			game: { startingScore: 501 },
		},
		{ op: 'closeLeg', legId: 7, payload: { winnerId: 10 } },
	);
	assert(rotated.turn.legOpenerIndex === 1, 'kolejny leg otwiera drugi gracz');
	assert(rotated.turn.currentPlayerIndex === 1, 'tura wskazuje openera');
	assert(rotated.visits.length === 0, 'lokalny leg nie trzyma starych wizyt');
	assert(rotated.players[0].remaining === 501 && rotated.players[1].remaining === 501, 'wynik wraca do 501');
}

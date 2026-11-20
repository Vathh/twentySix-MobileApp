import assert from 'node:assert/strict';
import { createClientSessionId } from '../clientSessionId.js';
import { sessionBody } from '../trainingSessionSync.js';
import {
	CHECKOUT_41_FIRST,
	canPlayCheckout41,
	checkout41Completion,
	checkout41DurationMs,
	checkout41ScoreFromHighest,
	checkout41Stats,
	checkout41View,
	dartFromPad,
	expireCheckout41,
	recordCheckout41Check,
	recordCheckout41Dart,
	recordCheckout41Fail,
	startCheckout41Session,
	undoCheckout41,
} from '../checkout41Exercise.js';

function definition() {
	return {
		kind: 'exercise',
		exerciseKey: 'checkout_41',
		name: 'Checkout 41+',
		durationSeconds: 600,
		inactive: false,
	};
}

function dart(session, base, modifier) {
	return recordCheckout41Dart(session, dartFromPad(base, modifier));
}

export function runCheckout41ExerciseTests() {
	assert(canPlayCheckout41(definition()), 'aktywne Checkout 41+ da się rozpocząć');
	assert(!canPlayCheckout41({ ...definition(), inactive: true }), 'nieaktywne nie startuje');
	assert(!canPlayCheckout41({ ...definition(), exerciseKey: 'catch_20' }), 'Catch20 ma własny silnik');
	assert(checkout41DurationMs({ durationSeconds: 120 }) === 120000, 'czas bierze się z definicji');
	assert(checkout41DurationMs({}) === 600000, 'domyślnie 10 minut');

	assert(checkout41ScoreFromHighest(null) === 0, 'brak zamknięcia to 0');
	assert(checkout41ScoreFromHighest(41) === 1, '41 to 1 punkt');
	assert(checkout41ScoreFromHighest(49) === 41, '49 to 41 punktów');
	assert(checkout41ScoreFromHighest(50) === 46, '50 to 46 punktów');
	assert(checkout41ScoreFromHighest(51) === 53, '51 to 53 punktów');
	assert(checkout41ScoreFromHighest(52) === 60, '52 to 60 punktów');

	const started = startCheckout41Session(definition(), createClientSessionId(), 1_000, 'per_dart');
	assert(started.status === 'playing' && started.actions.length === 0, 'sesja startuje pusta');
	const fresh = checkout41View(started);
	assert(fresh.checkout === 41 && fresh.remaining === 41, 'start od 41');
	assert(fresh.carousel.left == null && fresh.carousel.center === 41 && fresh.carousel.right === 42, 'karuzela startowa');

	let prepared = dart(started, 15, null);
	assert(checkout41View(prepared).remaining === 26, '15 z 41 zostawia 26');
	let doubled = dart(dart(prepared, 0, null), 13, 'double');
	const afterDouble = checkout41View(doubled);
	assert(afterDouble.checkout === 42 && afterDouble.highest === 41, 'zamknięcie 41 otwiera 42');
	assert(afterDouble.remaining === 42 && afterDouble.dartsInVisit === 0, 'nowa wizyta od 42');
	assert(afterDouble.carousel.left === 41 && afterDouble.carousel.center === 42, 'karuzela po sukcesie');
	assert(checkout41Stats(doubled).doubles[0].label === 'D13', 'cel lotki z 26 to D13');
	assert(checkout41Stats(doubled).doubles[0].attempts === 2, 'pudło i trafienie to dwie próby');
	assert(checkout41Stats(doubled).doubles[0].hits === 1, 'tylko D13 jest trafieniem');

	let miss = dart(prepared, 20, null);
	assert(checkout41View(miss).remaining === 6, 'inna lotka z dubla schodzi z licznika');
	assert(checkout41Stats(miss).doubles[0].hits === 0, 'S20 przy 26 jest pudłem na D13');

	let bust = startCheckout41Session(definition(), 'id', 1_000, 'sum');
	bust = recordCheckout41Fail(bust);
	assert(checkout41View(bust).checkout === 41 && checkout41View(bust).highest == null, 'fail na 41 zostawia 41');
	assert(checkout41View(bust).remaining === 41, 'po porażce licznik wraca do checkoutu');

	let up = startCheckout41Session(definition(), 'id', 1_000, 'sum');
	up = recordCheckout41Check(up);
	assert(checkout41View(up).checkout === 42 && checkout41View(up).highest === 41, 'check zamyka 41');
	up = recordCheckout41Fail(up);
	assert(checkout41View(up).checkout === 41, 'fail schodzi o 1');
	assert(checkout41View(up).highest === 41, 'najwyższy zamknięty zostaje mimo zejścia');

	assert(recordCheckout41Check(started) === started, 'check nie działa w trybie lotek');
	assert(recordCheckout41Fail(started) === started, 'fail nie działa w trybie lotek');
	assert(recordCheckout41Dart(up, dartFromPad(20, null)) === up, 'lotka nie działa w trybie sumy');

	let three = startCheckout41Session(definition(), 'id', 1_000, 'per_dart');
	three = dart(three, 1, null);
	three = dart(three, 1, null);
	three = dart(three, 1, null);
	assert(checkout41View(three).checkout === 41 && checkout41View(three).remaining === 41, 'trzy lotki bez zamknięcia to porażka');

	let climb = startCheckout41Session(definition(), 'id', 1_000, 'sum');
	climb = recordCheckout41Check(climb);
	climb = recordCheckout41Check(climb);
	climb = recordCheckout41Check(climb);
	assert(checkout41View(climb).checkout === 44 && checkout41View(climb).highest === 43, 'trzy zamknięcia z rzędu');
	climb = recordCheckout41Fail(climb);
	assert(checkout41View(climb).checkout === 43 && checkout41View(climb).highest === 43, 'porażka schodzi o 1, highest zostaje');

	const undone = undoCheckout41(prepared);
	assert(checkout41View(undone).remaining === 41 && checkout41View(undone).dartsInVisit === 0, 'cofnięcie zdejmuje otwartą lotkę');
	const undoneClose = undoCheckout41(doubled);
	assert(checkout41View(undoneClose).checkout === 41 && checkout41View(undoneClose).remaining === 26, 'cofnięcie zdejmuje lotkę zamykającą wizytę');
	assert(checkout41View(undoneClose).dartsInVisit === 2 && checkout41View(undoneClose).highest == null, 'po cofnięciu zamknięcia wraca otwarta wizyta 41');
	const undoneMiss = undoCheckout41(three);
	assert(checkout41View(undoneMiss).checkout === 41 && checkout41View(undoneMiss).dartsInVisit === 2, 'cofnięcie trzeciej lotki wraca do otwartej wizyty');
	assert(checkout41View(undoneMiss).remaining === 39, 'po cofnięciu trzeciej lotki licznik wraca do stanu po dwóch');
	const undoneFail = undoCheckout41(bust);
	assert(checkout41View(undoneFail).checkout === 41 && undoneFail.actions.length === 0, 'cofnięcie zdejmuje Fail');
	const undoneCheck = undoCheckout41(recordCheckout41Check(startCheckout41Session(definition(), 'id', 1_000, 'sum')));
	assert(checkout41View(undoneCheck).checkout === 41 && undoneCheck.actions.length === 0, 'cofnięcie zdejmuje Check');

	const open = dart(prepared, 0, null);
	const cut = expireCheckout41(open);
	assert(cut.status === 'completed', 'koniec czasu zamyka ćwiczenie');
	assert(cut.actions.length === 0, 'urwana wizyta nie zostawia lotek');
	assert(checkout41Stats(cut).doubles.length === 0, 'urwana próba dubla nie wchodzi do statystyk');
	assert(checkout41Stats(cut).highest == null, 'urwana wizyta nie zamyka checkoutu');

	const kept = expireCheckout41(climb);
	assert(kept.actions.length === climb.actions.length, 'rozliczona wizyta zostaje po czasie');
	assert(checkout41Completion(kept, '2026-11-20T19:00:00.000Z').score === 11, 'wynik z highest 43');

	const body = sessionBody(checkout41Completion(doubled, '2026-11-20T19:00:00.000Z'));
	assert(body.exerciseKey === 'checkout_41', 'zapis wskazuje ćwiczenie');
	assert(body.score === 1, 'wynik z zamknięcia 41');
	assert(body.stats.highest === 41, 'na serwer idzie najwyższy checkout');
	assert(body.stats.doubles[0].label === 'D13', 'na serwer idzie skuteczność dubla');
	assert(body.stats.darts === undefined, 'lista lotek nie idzie na serwer');
	assert(CHECKOUT_41_FIRST === 41, 'start od 41');
}

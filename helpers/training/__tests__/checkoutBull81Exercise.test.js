import assert from 'node:assert/strict';
import { createClientSessionId } from '../clientSessionId.js';
import { sessionBody } from '../trainingSessionSync.js';
import {
	BONUS_POINTS,
	CHECKOUT_BULL_81_FIRST,
	CHECKOUT_BULL_81_LAST,
	CLOSE_POINTS,
	canPlayCheckoutBull81,
	checkoutBull81Completion,
	checkoutBull81DurationMs,
	checkoutBull81PathValue,
	checkoutBull81Stats,
	checkoutBull81View,
	dartFromPad,
	expireCheckoutBull81,
	recordCheckoutBull81Dart,
	startCheckoutBull81Session,
	undoCheckoutBull81,
} from '../checkoutBull81Exercise.js';

function definition() {
	return {
		kind: 'exercise',
		exerciseKey: 'checkout_bull_81',
		name: 'Checkout Bull 81+',
		durationSeconds: 480,
		inactive: false,
	};
}

function dart(session, base, modifier) {
	return recordCheckoutBull81Dart(session, dartFromPad(base, modifier));
}

function closeFrom(session, checkout) {
	const need = checkout - 50;
	let next = dart(session, 20, null);
	next = dart(next, need - 20, null);
	return dart(next, 25, 'double');
}

export function runCheckoutBull81ExerciseTests() {
	assert(canPlayCheckoutBull81(definition()), 'aktywne Checkout Bull 81+ da się rozpocząć');
	assert(!canPlayCheckoutBull81({ ...definition(), inactive: true }), 'nieaktywne nie startuje');
	assert(!canPlayCheckoutBull81({ ...definition(), exerciseKey: 'checkout_41' }), '41+ ma własny silnik');
	assert(checkoutBull81DurationMs({ durationSeconds: 120 }) === 120000, 'czas bierze się z definicji');
	assert(checkoutBull81DurationMs({}) === 480000, 'domyślnie 8 minut');
	assert(checkoutBull81PathValue(0) === 81 && checkoutBull81PathValue(9) === 90, 'ścieżka w górę');
	assert(checkoutBull81PathValue(10) === 89 && checkoutBull81PathValue(18) === 81, 'ścieżka w dół');

	const started = startCheckoutBull81Session(definition(), createClientSessionId(), 1_000);
	assert(started.status === 'playing' && started.actions.length === 0, 'sesja startuje pusta');
	const fresh = checkoutBull81View(started);
	assert(fresh.checkout === 81 && fresh.remaining === 81, 'start od 81');
	assert(fresh.carousel.left == null && fresh.carousel.center === 81 && fresh.carousel.right === 82, 'karuzela startowa');

	let setup = dart(started, 20, null);
	assert(checkoutBull81View(setup).remaining === 61 && checkoutBull81View(setup).dartsInVisit === 1, 'T nie, single 20 schodzi');
	setup = dart(setup, 20, 'triple');
	assert(checkoutBull81View(setup).remaining === 1 && checkoutBull81View(setup).dartsInVisit === 2, 'triple też odejmuje');

	let closed = closeFrom(started, 81);
	const afterClose = checkoutBull81View(closed);
	assert(afterClose.checkout === 82 && afterClose.score === CLOSE_POINTS, 'zamknięcie 81 daje 10 i otwiera 82');
	assert(afterClose.remaining === 82 && afterClose.dartsInVisit === 0, 'nowe podejście od 82');
	assert(afterClose.carousel.left === 81 && afterClose.carousel.center === 82, 'karuzela po sukcesie');
	assert(checkoutBull81Stats(closed).aims[0].aim === 'Inner', 'cel trzeciej lotki to Inner');
	assert(checkoutBull81Stats(closed).aims[0].hits === 1 && checkoutBull81Stats(closed).aims[0].attempts === 1, 'Inner trafiony');

	let bonus = dart(started, 20, null);
	bonus = dart(bonus, 20, null);
	bonus = dart(bonus, 25, 'double');
	assert(checkoutBull81View(bonus).checkout === 81, 'bonus zostawia 81');
	assert(checkoutBull81View(bonus).score === BONUS_POINTS, 'Inner bez 50 daje 4');
	assert(checkoutBull81View(bonus).carousel.center === 81, 'bonus nie rusza karuzeli');

	let outer = dart(started, 20, null);
	outer = dart(outer, 11, null);
	assert(checkoutBull81View(outer).remaining === 50, 'ustawione 50');
	outer = dart(outer, 25, null);
	assert(checkoutBull81View(outer).score === 0 && checkoutBull81View(outer).checkout === 81, 'Outer przy 50 nic nie daje');
	assert(checkoutBull81Stats(outer).aims[0].hits === 0, 'Outer to pudło na Inner');

	let climb = started;
	for (let value = CHECKOUT_BULL_81_FIRST; value <= CHECKOUT_BULL_81_LAST; value += 1) {
		climb = closeFrom(climb, value);
	}
	assert(checkoutBull81View(climb).checkout === 89, 'po 90 idzie 89');
	assert(checkoutBull81View(climb).score === CLOSE_POINTS * 10, '10 zamknięć w górę');

	for (let value = 89; value >= CHECKOUT_BULL_81_FIRST; value -= 1) {
		climb = closeFrom(climb, value);
	}
	assert(checkoutBull81View(climb).checkout === 81, 'po powrocie znowu 81');
	assert(checkoutBull81View(climb).pathIndex === 19, 'kolejna runda na ścieżce');
	assert(checkoutBull81View(climb).score === CLOSE_POINTS * 19, 'pełna runda to 19 zamknięć');

	const undone = undoCheckoutBull81(closed);
	assert(checkoutBull81View(undone).checkout === 81 && checkoutBull81View(undone).dartsInVisit === 2, 'cofnięcie trzeciej wraca do ustawienia');
	assert(checkoutBull81View(undone).remaining === 50 && checkoutBull81View(undone).score === 0, 'po cofnięciu zamknięcia wynik znika');
	assert(undoCheckoutBull81(started) === started, 'puste cofnięcie nic nie zmienia');

	const open = dart(started, 20, null);
	const cut = expireCheckoutBull81(open);
	assert(cut.status === 'completed', 'koniec czasu zamyka ćwiczenie');
	assert(cut.actions.length === 0, 'urwane podejście nie zostawia lotek');
	assert(checkoutBull81Stats(cut).aims.length === 0, 'urwana trzecia nie wchodzi do Inner');
	assert(checkoutBull81Stats(cut).score === 0, 'urwana wizyta nie daje punktów');

	const kept = expireCheckoutBull81(closed);
	assert(kept.actions.length === closed.actions.length, 'rozliczone podejście zostaje po czasie');
	assert(checkoutBull81Completion(kept, '2026-11-20T20:00:00.000Z').score === CLOSE_POINTS, 'wynik z zamknięcia');

	const body = sessionBody(checkoutBull81Completion(bonus, '2026-11-20T20:00:00.000Z'));
	assert(body.exerciseKey === 'checkout_bull_81', 'zapis wskazuje ćwiczenie');
	assert(body.score === BONUS_POINTS, 'na serwer idzie wynik');
	assert(body.stats.aims[0].aim === 'Inner', 'na serwer idzie skuteczność Inner');
	assert(body.stats.darts === undefined, 'lista lotek nie idzie na serwer');
}

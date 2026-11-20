import { createClientSessionId } from '../clientSessionId.js';
import { sessionBody } from '../trainingSessionSync.js';
import {
	CATCH20_LAST,
	canPlayCatch20,
	catch20Completion,
	catch20DurationMs,
	catch20Stats,
	catch20View,
	dartFromPad,
	expireCatch20,
	interpretCatch20Sum,
	recordCatch20Dart,
	recordCatch20Sum,
	startCatch20Session,
	undoCatch20,
} from '../catch20Exercise.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function definition() {
	return {
		id: 'catch_20',
		kind: 'exercise',
		name: 'Catch20',
		exerciseKey: 'catch_20',
		durationSeconds: 540,
	};
}

function dart(session, base, modifier) {
	return recordCatch20Dart(session, dartFromPad(base, modifier));
}

export function runCatch20ExerciseTests() {
	assert(canPlayCatch20(definition()), 'aktywne Catch20 da się rozpocząć');
	assert(!canPlayCatch20({ ...definition(), inactive: true }), 'nieaktywne Catch20 nie startuje');
	assert(!canPlayCatch20({ ...definition(), exerciseKey: 'bobs_27_easy' }), 'Bob ma własny silnik');
	assert(catch20DurationMs({ durationSeconds: 120 }) === 120000, 'czas bierze się z definicji');

	const started = startCatch20Session(definition(), createClientSessionId(), 1_000, 'per_dart');
	assert(started.endsAt === 541_000, 'domyślnie 9 minut');
	assert(started.inputMode === 'per_dart', 'tryb lotek zostaje przy sesji');
	const fresh = catch20View(started);
	assert(fresh.checkout === 41 && fresh.remaining === 41 && fresh.visit === 1, 'start od 41, wizyta 1');
	assert(fresh.dartsInVisit === 0, 'pierwsza lotka jeszcze nie weszła');

	const prepared = dart(started, 15, null);
	assert(catch20View(prepared).remaining === 26, '15 z 41 zostawia 26');
	const doubled = dart(dart(prepared, 0, null), 13, 'double');
	const afterDouble = catch20View(doubled);
	assert(afterDouble.closed === 1, 'zamknięcie liczy się do wyniku');
	assert(afterDouble.checkout === 42 && afterDouble.visit === 1, 'po zamknięciu wchodzi 42');
	assert(catch20Stats(doubled).doubles[0].label === 'D13', 'cel lotki z 26 to D13');
	assert(catch20Stats(doubled).doubles[0].attempts === 2, 'pudło i trafienie to dwie próby');
	assert(catch20Stats(doubled).doubles[0].hits === 1, 'tylko D13 jest trafieniem');

	const other = dart(prepared, 20, null);
	assert(catch20View(other).remaining === 6, 'inna lotka z dubla schodzi z licznika');
	assert(catch20Stats(other).doubles[0].hits === 0, 'S20 przy 26 jest pudłem na D13');

	let busts = startCatch20Session(definition(), 'id', 1_000, 'sum');
	busts = recordCatch20Sum(busts, 45, false);
	assert(catch20View(busts).checkout === 41 && catch20View(busts).visit === 2, 'bust pierwszej wizyty zostawia 41');
	assert(catch20View(busts).remaining === 41, 'licznik wraca do stanu sprzed wizyty');
	busts = recordCatch20Sum(busts, 45, false);
	assert(catch20View(busts).checkout === 42 && catch20View(busts).closed === 0, 'bust drugiej wizyty otwiera 42');
	assert(catch20View(busts).visit === 1, 'następny checkout zaczyna od wizyty 1');

	let scored = startCatch20Session(definition(), 'id', 1_000, 'sum');
	scored = recordCatch20Sum(scored, 20, false);
	assert(catch20View(scored).remaining === 21 && catch20View(scored).visit === 2, 'wizyta bez bustu zostawia nowy licznik');
	scored = recordCatch20Sum(scored, 30, false);
	assert(catch20View(scored).checkout === 42 && catch20View(scored).closed === 0, 'bust drugiej wizyty po zejściu też przepada');

	let closed = startCatch20Session(definition(), 'id', 1_000, 'sum');
	assert(interpretCatch20Sum(41, 41) === 'confirm', 'suma równa licznikowi czeka na zamknięcie');
	assert(recordCatch20Sum(closed, 41, false) === closed, 'bez potwierdzenia suma równa licznikowi nie wchodzi');
	closed = recordCatch20Sum(closed, 41, true);
	assert(catch20View(closed).closed === 1 && catch20View(closed).checkout === 42, 'potwierdzona suma zamyka checkout');
	assert(catch20Stats(closed).doubles.length === 0, 'suma nie zbiera prób na dubla');

	let six = startCatch20Session(definition(), 'id', 1_000, 'per_dart');
	for (let visit = 0; visit < 2; visit += 1) {
		six = dart(six, 1, null);
		six = dart(six, 0, null);
		six = dart(six, 0, null);
	}
	assert(catch20View(six).checkout === 42 && catch20View(six).closed === 0, 'dwie wizyty bez zamknięcia idą dalej');

	const undone = undoCatch20(doubled);
	assert(undone.status === 'playing', 'cofnięcie zostawia ćwiczenie');
	assert(catch20View(undone).checkout === 41 && catch20View(undone).remaining === 26, 'cofnięcie zdejmuje ostatnią lotkę');
	assert(catch20Stats(undone).doubles[0].attempts === 1, 'cofnięcie zdejmuje próbę dubla');

	const open = dart(prepared, 0, null);
	const cut = expireCatch20(open);
	assert(cut.status === 'completed', 'koniec czasu zamyka ćwiczenie');
	assert(cut.actions.length === 0, 'urwana wizyta nie zostawia lotek');
	assert(catch20Stats(cut).doubles.length === 0, 'urwana próba dubla nie wchodzi do statystyk');
	assert(catch20Stats(cut).closed === 0, 'urwana wizyta nie zamyka checkoutu');

	const kept = expireCatch20(busts);
	assert(kept.actions.length === busts.actions.length, 'rozliczona wizyta zostaje po czasie');

	let last = startCatch20Session(definition(), 'id', 1_000, 'sum');
	for (let checkout = 41; checkout <= CATCH20_LAST; checkout += 1) {
		last = recordCatch20Sum(last, checkout, true);
	}
	assert(last.status === 'completed', 'zamknięcie 60 kończy ćwiczenie');
	assert(catch20View(last).closed === 20, 'dwadzieścia zamknięć to wynik 20');

	const body = sessionBody(catch20Completion(doubled, '2026-11-20T16:00:00.000Z'));
	assert(body.exerciseKey === 'catch_20', 'zapis wskazuje ćwiczenie');
	assert(body.score === 1, 'wynik to liczba zamknięć');
	assert(body.stats.doubles[0].label === 'D13', 'na serwer idzie skuteczność dubla');
	assert(body.stats.darts === undefined, 'lista lotek nie idzie na serwer');
}

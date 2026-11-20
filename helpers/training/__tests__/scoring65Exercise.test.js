import { createClientSessionId } from '../clientSessionId.js';
import { dartFromPad } from '../catch20Exercise.js';
import { sessionBody } from '../trainingSessionSync.js';
import {
	canPlayScoring65,
	expireScoring65,
	recordScoring65Dart,
	recordScoring65Sum,
	scoring65Average,
	scoring65Completion,
	scoring65DurationMs,
	scoring65Stats,
	scoring65View,
	startScoring65Session,
	undoScoring65,
} from '../scoring65Exercise.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function definition() {
	return {
		id: 'scoring_65',
		kind: 'exercise',
		name: 'Scoring 65',
		exerciseKey: 'scoring_65',
		durationSeconds: 300,
	};
}

function dart(session, base, modifier) {
	return recordScoring65Dart(session, dartFromPad(base, modifier));
}

export function runScoring65ExerciseTests() {
	assert(canPlayScoring65(definition()), 'aktywne Scoring 65 da się rozpocząć');
	assert(!canPlayScoring65({ ...definition(), inactive: true }), 'nieaktywne Scoring 65 nie startuje');
	assert(!canPlayScoring65({ ...definition(), exerciseKey: 'catch_20' }), 'Catch20 ma własny silnik');
	assert(scoring65DurationMs({ durationSeconds: 120 }) === 120000, 'czas bierze się z definicji');
	assert(scoring65DurationMs({}) === 300000, 'domyślnie 5 minut');

	const started = startScoring65Session(definition(), createClientSessionId(), 1_000, 'per_dart');
	assert(started.endsAt === 301_000, 'start liczy koniec z czasu definicji');
	assert(started.inputMode === 'per_dart', 'tryb lotek zostaje przy sesji');
	const fresh = scoring65View(started);
	assert(fresh.points === 0 && fresh.running === 0 && fresh.approaches === 0, 'start od zera');

	let low = startScoring65Session(definition(), 'id', 1_000, 'sum');
	low = recordScoring65Sum(low, 64);
	assert(scoring65View(low).points === 0, '64 daje 0 punktów ćwiczenia');
	assert(scoring65View(low).total === 64 && scoring65View(low).approaches === 1, 'słabsze podejście wchodzi do średniej');
	assert(scoring65Average(64, 1) === 64, 'jedno podejście ma średnią równą sumie');

	let line = startScoring65Session(definition(), 'id', 1_000, 'sum');
	assert(recordScoring65Sum(line, 181) === line, 'suma powyżej 180 nie wchodzi');
	assert(recordScoring65Sum(line, -1) === line, 'ujemna suma nie wchodzi');
	line = recordScoring65Sum(line, 65);
	assert(scoring65View(line).points === 1 && scoring65View(line).total === 65, '65 daje 1 punkt');
	line = recordScoring65Sum(line, 0);
	assert(scoring65View(line).points === 1 && scoring65View(line).approaches === 2, 'pudło 0 zostaje podejściem');

	let mixed = startScoring65Session(definition(), 'id', 1_000, 'sum');
	mixed = recordScoring65Sum(mixed, 60);
	mixed = recordScoring65Sum(mixed, 80);
	mixed = recordScoring65Sum(mixed, 40);
	const mixedView = scoring65View(mixed);
	assert(mixedView.points === 1, 'z trzech podejść punkt daje tylko 80');
	assert(mixedView.total === 180 && mixedView.approaches === 3, 'średnia liczy wszystkie zakończone podejścia');
	assert(scoring65Stats(mixed).average === 60, '60, 80 i 40 dają średnią 60');

	let per = startScoring65Session(definition(), 'id', 1_000, 'per_dart');
	per = dart(per, 20, null);
	assert(scoring65View(per).running === 20 && scoring65View(per).points === 0, 'pierwsza lotka podbija bieżącą sumę');
	per = dart(per, 20, 'triple');
	assert(scoring65View(per).running === 80 && scoring65View(per).openLabels.join(' ') === '20 T20', 'druga lotka dokłada się do sumy');
	per = dart(per, 25, null);
	const closed = scoring65View(per);
	assert(closed.points === 1 && closed.running === 105 && closed.settled, 'trzecia lotka rozlicza 105 i zostawia sumę na liczniku');
	assert(closed.total === 105 && closed.dartsInVisit === 0, 'rozliczone podejście zamyka lotki');
	const nextVisit = dart(per, 20, null);
	assert(scoring65View(nextVisit).running === 20 && !scoring65View(nextVisit).settled, 'kolejna lotka zaczyna nowe podejście od zera');

	let under = startScoring65Session(definition(), 'id', 1_000, 'per_dart');
	under = dart(dart(dart(under, 20, null), 20, null), 20, null);
	assert(scoring65View(under).points === 0 && scoring65View(under).total === 60, '60 z trzech lotek daje 0 punktów');

	const reopened = undoScoring65(per);
	assert(reopened.status === 'playing', 'cofnięcie zostawia ćwiczenie');
	assert(scoring65View(reopened).points === 0 && scoring65View(reopened).running === 80, 'cofnięcie zdejmuje ostatnią lotkę i punkt');
	const undoneSum = undoScoring65(mixed);
	assert(scoring65View(undoneSum).approaches === 2 && scoring65View(undoneSum).points === 1, 'cofnięcie sumy zdejmuje całe podejście');

	let open = startScoring65Session(definition(), 'id', 1_000, 'per_dart');
	open = recordScoring65Sum(open, 100);
	assert(open.actions.length === 0, 'tryb lotek ignoruje sumę');
	open = dart(dart(dart(open, 20, 'triple'), 19, null), 5, null);
	open = dart(open, 20, null);
	open = dart(open, 20, null);
	const cut = expireScoring65(open);
	assert(cut.status === 'completed', 'koniec czasu zamyka ćwiczenie');
	assert(cut.actions.length === 3, 'urwana para lotek odpada');
	assert(scoring65Stats(cut).approaches === 1 && scoring65Stats(cut).total === 84, 'rozliczone podejście zostaje');
	assert(scoring65View(cut).points === 1, 'punkt z rozliczonego podejścia zostaje');

	const kept = expireScoring65(mixed);
	assert(kept.actions.length === mixed.actions.length, 'zatwierdzone sumy zostają po czasie');

	const empty = expireScoring65(startScoring65Session(definition(), 'id', 1_000, 'sum'));
	assert(scoring65Stats(empty).average == null && scoring65Stats(empty).approaches === 0, 'brak podejść zostawia pustą średnią');

	const body = sessionBody(scoring65Completion(mixed, '2026-11-20T18:00:00.000Z'));
	assert(body.exerciseKey === 'scoring_65', 'zapis wskazuje ćwiczenie');
	assert(body.score === 1, 'wynik to liczba punktów za 65+');
	assert(body.stats.total === 180 && body.stats.approaches === 3, 'na serwer idzie suma i liczba podejść');
	assert(body.stats.average === 60, 'na serwer idzie średnia');
	assert(body.stats.darts === undefined && body.stats.visits === undefined, 'lista lotek nie idzie na serwer');
}

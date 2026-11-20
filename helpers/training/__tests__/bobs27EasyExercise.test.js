import { createClientSessionId } from '../clientSessionId.js';
import {
	BOB27_EASY_TARGETS,
	bob27EasyCompletion,
	bob27EasyScore,
	bob27EasyStats,
	canPlayBob27Easy,
	currentBob27EasyVisit,
	expireBob27Easy,
	recordBob27EasyDart,
	startBob27EasySession,
	undoBob27EasyDart,
} from '../bobs27EasyExercise.js';
import { sessionBody } from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function play(definition, hits, now) {
	return hits.reduce(
		(session, hit) => recordBob27EasyDart(session, hit),
		startBob27EasySession(definition, '33333333-3333-4333-8333-333333333333', now),
	);
}

export function runBob27EasyExerciseTests() {
	const definition = {
		id: 'bobs_27_easy',
		kind: 'exercise',
		name: "Bob's 27 easy",
		exerciseKey: 'bobs_27_easy',
		durationSeconds: 300,
	};

	assert(canPlayBob27Easy(definition), 'aktywne ćwiczenie da się rozpocząć');
	assert(!canPlayBob27Easy({ ...definition, inactive: true }), 'nieaktywne ćwiczenie nie startuje');
	assert(!canPlayBob27Easy({ ...definition, exerciseKey: 'bobs_27_hard' }), 'hard ma własny silnik');

	const started = startBob27EasySession(definition, createClientSessionId(), 1_000);
	assert(started.endsAt === 301_000, 'czas bierze się z definicji');
	assert(bob27EasyScore(started.darts) === 27, 'start od 27');
	assert(currentBob27EasyVisit(started).label === 'D1', 'pierwszy cel to D1');
	assert(currentBob27EasyVisit(started).dartNumber === 1, 'pierwsza lotka podejścia');

	const open = play(definition, [true, false]);
	assert(bob27EasyScore(open.darts) === 27, 'niedomknięta trójka nie rusza wyniku');
	assert(currentBob27EasyVisit(open).dartNumber === 3, 'trzecia lotka tego samego dubla');
	assert(currentBob27EasyVisit(open).label === 'D1', 'cel stoi do końca trójki');

	const twoHits = recordBob27EasyDart(open, true);
	assert(bob27EasyScore(twoHits.darts) === 31, 'dwa D1 dodają 4');
	assert(currentBob27EasyVisit(twoHits).label === 'D2', 'po trójce wchodzi D2');
	assert(currentBob27EasyVisit(twoHits).dartNumber === 1, 'licznik lotki wraca do 1');

	const missed = play(definition, [false, false, false]);
	assert(bob27EasyScore(missed.darts) === 25, 'trzy pudła odejmują wartość raz');

	const undone = undoBob27EasyDart(twoHits);
	assert(undone.darts.length === 2, 'cofnięcie zdejmuje ostatnią lotkę');
	assert(undone.status === 'playing', 'cofnięcie zostawia ćwiczenie');
	assert(bob27EasyScore(undone.darts) === 27, 'cofnięcie trzeciej lotki oddaje wynik sprzed trójki');
	assert(currentBob27EasyVisit(undone).label === 'D1', 'cel wraca na niedomkniętą trójkę');

	let negative = startBob27EasySession(definition, 'id');
	for (let visit = 0; visit < 5; visit += 1) {
		negative = playHits(negative, [false, false, false]);
	}
	assert(bob27EasyScore(negative.darts) === -3, 'ujemny wynik nie kończy easy');
	assert(negative.status === 'playing', 'po ujemnym wyniku gra jedzie dalej');

	const perfectHits = Array.from({ length: BOB27_EASY_TARGETS * 3 }, () => true);
	const perfect = play(definition, perfectHits);
	assert(perfect.status === 'completed', 'D20 przed czasem kończy ćwiczenie');
	assert(bob27EasyScore(perfect.darts) === 1287, 'trzy trafienia na każdym dubli dają 1287');
	assert(currentBob27EasyVisit(perfect) === null, 'po D20 nie ma kolejnego celu');

	const cut = expireBob27Easy(open);
	assert(cut.status === 'completed', 'koniec czasu zamyka ćwiczenie');
	assert(cut.darts.length === 0, 'niedokończona trójka wypada');
	assert(bob27EasyScore(cut.darts) === 27, 'odrzucona trójka nic nie dodaje i nic nie odejmuje');
	assert(bob27EasyStats(cut).attempts === 0, 'odrzucone lotki nie wchodzą do statystyk');

	const kept = expireBob27Easy(twoHits);
	assert(kept.darts.length === 3, 'domknięta trójka zostaje');
	assert(bob27EasyStats(kept).hits === 2, 'zostają trafienia sprzed końca');
	assert(bob27EasyStats(kept).attempts === 3, 'pudło domkniętej trójki liczy się do lotek');
	assert(bob27EasyStats(kept).percent === 67, '2 z 3 to 67 procent');

	const record = bob27EasyCompletion(perfect, '2026-11-20T15:00:00.000Z');
	assert(record.score === 1287, 'wynik to stan licznika');
	assert(record.stats.hits === 60 && record.stats.percent === 100, 'pełne trafienia');
	assert(!Object.prototype.hasOwnProperty.call(record.stats, 'darts'), 'statystyki nie mają listy lotek');
	const body = sessionBody(record);
	assert(body.exerciseKey === 'bobs_27_easy', 'zapis wskazuje ćwiczenie');
	assert(body.score === 1287, 'na serwer idzie wynik');
	assert(body.stats.attempts === 60, 'na serwer idą lotki domkniętych trójek');
}

function playHits(session, hits) {
	return hits.reduce((current, hit) => recordBob27EasyDart(current, hit), session);
}

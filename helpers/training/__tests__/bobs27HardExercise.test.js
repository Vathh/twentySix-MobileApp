import {
	BOB27_HARD_INNER_AIM,
	BOB27_HARD_INNER_AIM_TEXT,
	BOB27_HARD_TARGETS,
	bob27HardAimText,
	bob27HardCompletion,
	bob27HardScore,
	bob27HardStats,
	canPlayBob27Hard,
	currentBob27HardVisit,
	expireBob27Hard,
	recordBob27HardDart,
	startBob27HardSession,
	undoBob27HardDart,
} from '../bobs27HardExercise.js';
import { sessionBody } from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function play(definition, hits, now) {
	return hits.reduce(
		(session, hit) => recordBob27HardDart(session, hit),
		startBob27HardSession(definition, '44444444-4444-4444-8444-444444444444', now),
	);
}

function playHits(session, hits) {
	return hits.reduce((current, hit) => recordBob27HardDart(current, hit), session);
}

export function runBob27HardExerciseTests() {
	const definition = {
		id: 'bobs_27_hard',
		kind: 'exercise',
		name: "Bob's 27 hard",
		exerciseKey: 'bobs_27_hard',
		durationSeconds: 300,
	};

	assert(canPlayBob27Hard(definition), 'aktywne ćwiczenie da się rozpocząć');
	assert(!canPlayBob27Hard({ ...definition, inactive: true }), 'nieaktywne ćwiczenie nie startuje');
	assert(!canPlayBob27Hard({ ...definition, exerciseKey: 'bobs_27_easy' }), 'easy ma własny silnik');

	const started = startBob27HardSession(definition, 'id', 1_000);
	assert(started.endsAt === 301_000, 'czas bierze się z definicji');
	assert(bob27HardScore(started.darts) === 27, 'start od 27');
	assert(currentBob27HardVisit(started).label === 'D1', 'pierwszy cel to D1');
	assert(bob27HardAimText(currentBob27HardVisit(started)).includes('podwójną'), 'dubl ma instrukcję podwójnej');

	const firstHit = play(definition, [true]);
	assert(bob27HardScore(firstHit.darts) === 29, 'pierwsze D1 podbija licznik od razu');
	const secondHit = recordBob27HardDart(firstHit, true);
	assert(bob27HardScore(secondHit.darts) === 31, 'drugie D1 podbija licznik od razu');
	const open = recordBob27HardDart(secondHit, false);
	assert(open.darts[2].aim === 'D1' && open.darts[2].hit === false, 'pudło zostaje z celem D1');
	assert(bob27HardScore(open.darts) === 31, 'pudło po trafieniach nie rusza licznika');

	assert(currentBob27HardVisit(open).label === 'D2', 'po trójce wchodzi D2');

	const missed = play(definition, [false, false, false]);
	assert(bob27HardScore(missed.darts) === 25, 'trzy pudła odejmują wartość raz');

	const undone = undoBob27HardDart(open);
	assert(bob27HardScore(undone.darts) === 31, 'cofnięcie pudła zostawia trafienia');
	assert(currentBob27HardVisit(undone).label === 'D1', 'cel wraca na niedomkniętą trójkę');
	const undoneHit = undoBob27HardDart(secondHit);
	assert(bob27HardScore(undoneHit.darts) === 29, 'cofnięcie trafienia oddaje wartość tej lotki');

	let busted = startBob27HardSession(definition, 'id');
	for (let visit = 0; visit < 5; visit += 1) {
		busted = playHits(busted, [false, false, false]);
	}
	assert(busted.status === 'completed', 'rozliczenie poniżej 1 kończy ćwiczenie');
	assert(bob27HardScore(busted.darts) === 0, 'zakończenie poniżej 1 zapisuje 0');
	assert(busted.darts.length === 15, 'lotki rozliczonego celu zostają');
	assert(busted.darts[14].aim === 'D5' && busted.darts[14].hit === false, 'ostatnie pudło jest celowane w D5');
	assert(currentBob27HardVisit(busted) === null, 'po końcu nie ma kolejnego celu');
	const bustStats = bob27HardStats(busted);
	assert(bustStats.aims.length === 5, 'w statystykach są tylko rzucone duble');
	assert(bustStats.aims[4].aim === 'D5' && bustStats.aims[4].hits === 0, 'D5 ma same pudła');
	assert(!bustStats.aims.some((row) => row.aim === 'D6'), 'D6, do którego ćwiczenie nie doszło, nie ma wpisu');

	const doubles = Array.from({ length: 20 * 3 }, () => true);
	const beforeBull = play(definition, doubles);
	assert(beforeBull.status === 'playing', 'po D20 zostaje inner');
	assert(currentBob27HardVisit(beforeBull).aim === BOB27_HARD_INNER_AIM, 'ostatni cel to inner');
	assert(bob27HardAimText(currentBob27HardVisit(beforeBull)) === BOB27_HARD_INNER_AIM_TEXT, 'inner ma własną instrukcję');
	assert(bob27HardScore(beforeBull.darts) === 1287, 'same duble dają 1287');
	const innerHit = recordBob27HardDart(beforeBull, true);
	assert(bob27HardScore(innerHit.darts) === 1337, 'inner podbija licznik od razu');
	assert(innerHit.status === 'playing', 'jedno trafienie innera nie kończy ćwiczenia');

	const bullMiss = playHits(beforeBull, [false, false, false]);
	assert(bullMiss.status === 'completed', 'rozliczenie innera kończy ćwiczenie');
	assert(bob27HardScore(bullMiss.darts) === 1237, 'trzy pudła w inner odejmują 50');
	assert(bullMiss.darts[62].aim === 'Inner' && bullMiss.darts[62].hit === false, 'pudło w inner nie jest trafieniem');

	const perfect = playHits(beforeBull, [true, true, true]);
	assert(perfect.status === 'completed', 'trzy innery przed czasem kończą ćwiczenie');
	assert(bob27HardScore(perfect.darts) === 1437, 'trzy innery dodają 150');
	assert(perfect.darts.length === BOB27_HARD_TARGETS * 3, 'pełne ćwiczenie ma 63 lotki');

	const cut = expireBob27Hard(secondHit);
	assert(cut.darts.length === 0, 'niedokończona trójka wypada');
	assert(bob27HardScore(cut.darts) === 27, 'odrzucona trójka nic nie zmienia');

	const record = bob27HardCompletion(bullMiss, '2026-11-20T16:00:00.000Z');
	assert(record.score === 1237, 'wynik to stan licznika');
	assert(record.stats.aims.some((row) => row.aim === 'D20' && row.hits === 3), 'D20 ma trzy trafienia');
	assert(record.stats.aims.some((row) => row.aim === 'Inner' && row.attempts === 3 && row.hits === 0), 'inner ma trzy pudła');
	assert(!Object.prototype.hasOwnProperty.call(record.stats, 'darts'), 'statystyki nie mają listy lotek');
	const body = sessionBody(record);
	assert(body.exerciseKey === 'bobs_27_hard', 'zapis wskazuje ćwiczenie');
	assert(body.score === 1237, 'na serwer idzie wynik');
	assert(body.stats.aims.length === 21, 'na serwer idzie skuteczność każdego rzuconego celu');

	const bustRecord = bob27HardCompletion(busted, '2026-11-20T16:00:00.000Z');
	assert(bustRecord.score === 0, 'na serwer nie idzie liczba ujemna');
}

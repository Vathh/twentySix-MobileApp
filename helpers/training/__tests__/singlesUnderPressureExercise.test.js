import { targetLabel } from '../clockExercise.js';
import {
	DEFAULT_DURATION_MS,
	LOOP_LENGTH,
	SINGLES_AIM_TEXT,
	canPlaySingles,
	currentSinglesVisit,
	expireSingles,
	pathTarget,
	positionPoints,
	recordSinglesOutcome,
	singlesCompletion,
	singlesScore,
	singlesScoreAt,
	startSinglesSession,
	undoSinglesDart,
} from '../singlesUnderPressureExercise.js';
import { sessionBody } from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function play(definition, hits) {
	return hits.reduce(
		(session, hit) => recordSinglesOutcome(session, hit),
		startSinglesSession(definition, '44444444-4444-4444-8444-444444444444', 1_000),
	);
}

function labels(session) {
	const visit = currentSinglesVisit(session);
	return visit.targets
		.slice(visit.windowStart, visit.windowStart + 3)
		.map(targetLabel)
		.join(',');
}

function focus(session) {
	const visit = currentSinglesVisit(session);
	return targetLabel(visit.targets[visit.windowStart + visit.activeOffset]);
}

const definition = {
	id: 'singles_under_pressure',
	kind: 'exercise',
	name: 'Singielki z presją',
	exerciseKey: 'singles_under_pressure',
	durationSeconds: 600,
	inactive: false,
};

export function runSinglesUnderPressureExerciseTests() {
	assert(pathTarget(0).aim === 'S1', 'ścieżka zaczyna się od S1');
	assert(pathTarget(19).aim === 'S20', 'przed bullem jest S20');
	assert(pathTarget(20).kind === 'bull', 'po S20 jest bull');
	assert(pathTarget(21).aim === 'S20', 'po bullu wraca S20');
	assert(pathTarget(40).aim === 'S1', 'powrót kończy się na S1');
	assert(pathTarget(41).aim === 'S1', 'nowa ścieżka znowu od S1');
	assert(LOOP_LENGTH === 41, 'pętla ma 41 celów');

	assert(positionPoints(4) === 5, 'sektor 5 w drodze do bulla jest wart 5');
	assert(positionPoints(18) === 19, 'sektor 19 w drodze do bulla jest wart 19');
	assert(positionPoints(20) === 25, 'bull jest wart 25');
	assert(positionPoints(22) === 27, 'sektor 19 w drodze powrotnej jest wart 27');
	assert(positionPoints(23) === 28, 'sektor 18 w drodze powrotnej jest wart 28');
	assert(positionPoints(28) === 33, 'sektor 13 w drodze powrotnej jest wart 33');
	assert(positionPoints(40) === 45, 'sektor 1 w drodze powrotnej jest wart 45');
	assert(singlesScoreAt(0) === 1, 'start na sektorze 1 jest wart 1');
	assert(singlesScoreAt(41) === 46, 'ukończona ścieżka dokłada 45, a nowa stoi na 1');

	assert(canPlaySingles(definition), 'aktywne singielki da się rozpocząć');
	assert(!canPlaySingles({ ...definition, inactive: true }), 'nieaktywne singielki nie startują');
	assert(!canPlaySingles({ ...definition, exerciseKey: 'clock_1_20_bull' }), 'zegar szybki ma własny silnik');
	assert(SINGLES_AIM_TEXT === 'Celuj w pole pojedyncze wskazanego sektora, jeśli trafisz - celuj w kolejny', 'instrukcja singielek');

	const started = startSinglesSession(definition, definition.id, 5_000);
	assert(started.endsAt - 5_000 === 600000, 'domyślnie jest 10 minut');
	assert(startSinglesSession({ ...definition, durationSeconds: null }, definition.id, 0).durationMs === DEFAULT_DURATION_MS, 'brak czasu zostawia 10 minut');
	assert(labels(started) === '1,2,3', 'na starcie widać 1, 2 i 3');
	assert(focus(started) === '1', 'podświetlona jest jedynka');
	assert(singlesScore(started) === 1, 'przed rzutem wynik to pozycja 1');

	let session = recordSinglesOutcome(started, false);
	assert(labels(session) === '1,2,3', 'pudło nie rusza okna');
	assert(focus(session) === '1', 'pudło zostawia ramkę');
	session = recordSinglesOutcome(session, true);
	assert(labels(session) === '1,2,3', 'trafienie zostawia trójkę na ekranie');
	assert(focus(session) === '2', 'ramka przechodzi na dwójkę');
	session = recordSinglesOutcome(session, true);
	assert(labels(session) === '3,4,5', 'po podejściu zostaje trójka');
	assert(currentSinglesVisit(session).activeOffset === 0, 'trójka staje z lewej');
	assert(singlesScore(session) === 3, 'dwa trafienia stoją na sektorze 3');

	session = play(definition, [true, false, false]);
	assert(labels(session) === '2,3,4', 'jedno trafienie w trójce przechodzi o jeden');
	assert(singlesScore(session) === 2, 'pozycja 2 jest warta 2');

	session = play(definition, [false, false, false]);
	assert(labels(session) === '1,2,3', 'trzy pudła na jedynce zostawiają jedynkę');
	assert(singlesScore(session) === 1, 'poniżej 1 nie schodzimy');

	session = play(definition, [true, false, false, false, false, false]);
	assert(labels(session) === '1,2,3', 'trzy pudła na dwójce cofają na jedynkę');
	session = undoSinglesDart(session);
	assert(labels(session) === '2,3,4', 'cofnięcie lotki zdejmuje karę podejścia');
	assert(focus(session) === '2', 'ramka wraca na sektor, który był celem');
	session = undoSinglesDart(undoSinglesDart(undoSinglesDart(session)));
	assert(labels(session) === '1,2,3' && focus(session) === '2', 'dalsze cofanie wraca w środek podejścia');

	const upToReturn = [];
	for (let hit = 0; hit < 39; hit += 1) {
		upToReturn.push(true);
	}
	session = play(definition, upToReturn);
	assert(focus(session) === '2', '39 trafień staje na powrotnej dwójce');
	assert(singlesScore(session) === 44, 'powrotna dwójka jest warta 44');
	session = play(definition, upToReturn.concat([true, false, false]));
	assert(focus(session) === '1', 'kolejne trafienie dochodzi do powrotnej jedynki');
	assert(singlesScore(session) === 45, 'powrotna jedynka jest warta 45');
	assert(labels(session) === '1,1,2', 'za powrotną jedynką widać start nowej ścieżki');

	session = play(definition, upToReturn.concat([true, false, false, false, false, false]));
	assert(singlesScore(session) === 45, 'trzy pudła na powrotnej jedynce zostawiają 45');
	assert(focus(session) === '1', 'powrotna jedynka nie cofa się na dwójkę');

	session = play(definition, upToReturn.concat([true, false, false, true, false, false]));
	assert(singlesScore(session) === 46, 'zamknięcie ścieżki daje 45 i nowa stoi na 1');
	assert(labels(session) === '1,2,3', 'nowa ścieżka pokazuje 1, 2 i 3');
	const closed = session;
	session = play(definition, upToReturn.concat([true, false, false, true, false, false, false, false, false]));
	assert(singlesScore(session) === 46, 'nowa ścieżka nie wraca do ukończonej');
	assert(labels(session) === '1,2,3', 'trzy pudła na starcie nowej ścieżki zostawiają jedynkę');

	const toReturnTwenty = [];
	for (let hit = 0; hit < 21; hit += 1) {
		toReturnTwenty.push(true);
	}
	session = play(definition, toReturnTwenty);
	assert(focus(session) === '20', 'po bullu celuje w powrotne 20');
	assert(singlesScore(session) === 26, 'powrotne 20 jest warte 26');
	session = play(definition, toReturnTwenty.concat([false, false, false]));
	assert(focus(session) === 'Bull', 'trzy pudła na powrotnym 20 wracają na bulla');
	assert(singlesScore(session) === 25, 'bull po cofnięciu jest wart 25');
	session = play(definition, toReturnTwenty.concat([false, false, false, false, false, false]));
	assert(focus(session) === '20', 'trzy pudła na bullu wracają na sektor 20');
	assert(singlesScore(session) === 20, 'sektor 20 w drodze do bulla jest wart 20');

	const open = play(definition, [true, true]);
	const expired = expireSingles(open);
	assert(expired.status === 'completed', 'koniec czasu zamyka ćwiczenie');
	assert(expired.darts.length === 2, 'urywana trójka zostawia rzucone lotki');
	assert(singlesScore(expired) === 3, 'urywana trójka nie cofa i zostawia pozycję');
	assert(currentSinglesVisit(expired) === null, 'po czasie nie ma już okna celów');
	assert(expireSingles(expired) === expired, 'drugi koniec czasu nic nie zmienia');

	const undone = undoSinglesDart(play(definition, [true]));
	assert(undone.darts.length === 0, 'cofnięcie zdejmuje ostatnią lotkę');
	assert(singlesScore(undone) === 1, 'po cofnięciu wraca pozycja sprzed lotki');
	assert(undoSinglesDart(undone) === undone, 'puste cofnięcie nic nie zmienia');
	assert(recordSinglesOutcome(expired, true) === expired, 'po czasie lotka nie wchodzi');

	const recorded = play(definition, [true, false, false, true, true, false]);
	const completion = singlesCompletion(recorded, '2026-11-20T17:00:00.000Z');
	assert(completion.score === singlesScore(recorded), 'zapis ma wynik pozycji');
	assert(completion.score === 4, 'po sześciu lotkach pozycja to sektor 4');
	assert(completion.name === 'Singielki z presją', 'zapis ma nazwę ćwiczenia');
	assert(completion.stats.aims.map((row) => row.aim).join(',') === 'S1,S2,S3,S4', 'cele wchodzą w kolejności rzutów');
	assert(completion.stats.aims[0].attempts === 1 && completion.stats.aims[0].hits === 1, 'S1 ma jedno trafienie');
	assert(completion.stats.aims[1].attempts === 3 && completion.stats.aims[1].hits === 1, 'pudła po trafieniu zostają na S2');
	assert(completion.stats.aims[3].attempts === 1 && completion.stats.aims[3].hits === 0, 'pudło S4 zostaje na koncie S4');
	assert(completion.stats.hits === 3, 'trzy trafienia w całym ćwiczeniu');
	assert(completion.stats.attempts === 6, 'sześć lotek w całym ćwiczeniu');
	const body = sessionBody(completion);
	assert(body.exerciseKey === 'singles_under_pressure', 'zapis wskazuje ćwiczenie');
	assert(body.score === completion.score, 'zapis niesie wynik');
	assert(body.stats.darts === undefined, 'lista lotek nie idzie na serwer');
	assert(body.stats.aims.length === 4, 'na serwer idzie skuteczność rzuconych celów');
	assert(singlesCompletion(closed, '2026-11-20T17:00:00.000Z').score === 46, 'zamknięta ścieżka zostaje w zapisie');
}

import {
	DEFAULT_DURATION_MS,
	canPlayScoringPressure,
	currentScoringPressureAim,
	expireScoringPressure,
	recordScoringPressureDart,
	scoringPressureBest,
	scoringPressureCompletion,
	scoringPressureInstruction,
	scoringPressureStreak,
	scoringPressureVariant,
	startScoringPressureSession,
	undoScoringPressureDart,
} from '../scoringUnderPressureExercise.js';
import { sessionBody } from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function play(definition, variant, darts) {
	return darts.reduce(
		(session, dart) => recordScoringPressureDart(session, dart),
		startScoringPressureSession(definition, '33333333-3333-4333-8333-333333333333', variant, 1_000),
	);
}

const definition = {
	id: 'scoring_under_pressure',
	kind: 'exercise',
	name: 'Scoring z presją',
	exerciseKey: 'scoring_under_pressure',
	durationSeconds: 300,
	inactive: false,
};

function instructionText(variant) {
	return scoringPressureInstruction(variant).map((part) => part.text).join('');
}

export function runScoringPressureExerciseTests() {
	assert(canPlayScoringPressure(definition), 'aktywne ćwiczenie da się rozpocząć');
	assert(!canPlayScoringPressure({ ...definition, inactive: true }), 'nieaktywne ćwiczenie nie startuje');
	assert(!canPlayScoringPressure({ ...definition, exerciseKey: 'nine_darts' }), '9 lotek ma własny silnik');
	assert(scoringPressureVariant('19') === '19', 'wariant 19 zostaje');
	assert(scoringPressureVariant('inny') === '20', 'nieznany wariant wraca do 20');

	const started = startScoringPressureSession(definition, definition.id, null, 5_000);
	assert(started.durationMs === DEFAULT_DURATION_MS, 'domyślnie 5 minut');
	assert(started.endsAt === 5_000 + DEFAULT_DURATION_MS, 'czas liczy się od startu');
	assert(started.variant === '20', 'bez wyboru celuje w 20');
	assert(startScoringPressureSession({ ...definition, durationSeconds: 90 }, definition.id, '18', 0).durationMs === 90_000, 'plan skraca czas');

	assert(instructionText('20') === 'Celuj w sektor 20.', 'instrukcja jednego sektora');
	assert(instructionText('20/19/18') === 'Celuj kolejno po jednej lotce w sektor 20, 19 i 18.', 'instrukcja rotacji');

	let session = play(definition, '20', [
		{ ring: 'triple' },
		{ ring: 'double' },
		{ ring: 'single' },
	]);
	assert(session.darts.map((dart) => dart.points).join(',') === '3,2,1', 'triple, double i single podbijają serię');
	assert(scoringPressureStreak(session.darts) === 6, 'seria jest sumą lotek');
	assert(currentScoringPressureAim(session).dartNumber === 1, 'po trzeciej lotce wraca lotka 1');
	assert(currentScoringPressureAim(session).number === 20, 'wariant 20 nie zmienia sektora');

	session = recordScoringPressureDart(session, { ring: 'miss' });
	assert(scoringPressureStreak(session.darts) === 0, 'pudło zeruje serię');
	assert(scoringPressureBest(session.darts) === 6, 'najwyższa seria zostaje');
	session = recordScoringPressureDart(session, { ring: 'triple', number: 19 });
	assert(session.darts.at(-1).points === 0, 'obcy sektor w wariancie 20 jest pudłem');
	assert(session.darts.at(-1).aim === 20, 'cel lotki zostaje przy wyznaczonym sektorze');

	session = undoScoringPressureDart(undoScoringPressureDart(session));
	assert(scoringPressureStreak(session.darts) === 6, 'cofnięcie wraca do serii');

	const rotation = play(definition, '20/19/18', [
		{ ring: 'triple', number: 20 },
		{ ring: 'double', number: 19 },
		{ ring: 'single', number: 18 },
		{ ring: 'triple', number: 19 },
	]);
	assert(rotation.darts.map((dart) => dart.aim).join(',') === '20,19,18,20', 'rotacja idzie 20, 19, 18 i od nowa');
	assert(rotation.darts.map((dart) => dart.points).join(',') === '3,2,1,0', 'zły rząd zeruje serię');
	assert(currentScoringPressureAim(rotation).number === 19, 'po złym rzędzie cel przechodzi dalej');
	assert(scoringPressureBest(rotation.darts) === 6, 'seria przez trzy sektory liczy się do wyniku');
	assert(recordScoringPressureDart(rotation, { ring: 'outer' }) === rotation, 'nieznany przycisk nie wchodzi');

	const finished = expireScoringPressure(rotation);
	assert(finished.status === 'completed', 'koniec czasu zamyka ćwiczenie');
	assert(finished.darts.length === 4, 'urywana kolejka zostawia rzucone lotki');
	const completion = scoringPressureCompletion(finished, '2026-11-20T16:00:00.000Z');
	assert(completion.score === 6, 'na serwer idzie najwyższa seria');
	assert(completion.stats.hits === 3, 'trzy trafienia');
	assert(completion.stats.attempts === 4, 'cztery lotki');
	assert(completion.stats.aims.map((row) => row.aim).join(',') === '20,19,18', 'sektory osobno');
	assert(completion.stats.aims[0].attempts === 2, '20 ma dwie próby');
	assert(completion.stats.aims[0].hits === 1, '20 ma jedno trafienie');
	const body = sessionBody(completion);
	assert(body.exerciseKey === 'scoring_under_pressure', 'zapis wskazuje ćwiczenie');
	assert(body.score === 6, 'zapis niesie wynik');
	assert(body.stats.darts === undefined, 'lista lotek nie idzie na serwer');
}

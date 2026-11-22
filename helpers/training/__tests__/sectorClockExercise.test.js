import { createClientSessionId } from '../clientSessionId.js';
import { targetLabel } from '../clockExercise.js';
import {
	SECTOR_COUNT,
	canPlaySectorClock,
	clearedCount,
	currentSectorVisit,
	expireSectorClock,
	formatRemaining,
	recordSectorOutcome,
	scheduleCues,
	sectorClockCompletion,
	sectorClockScore,
	sectorClockStats,
	sectorTargets,
	startSectorClockSession,
	undoSectorDart,
	visibleRemainingMs,
} from '../sectorClockExercise.js';
import { sessionBody } from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function labels(session) {
	return currentSectorVisit(session).targets.map(targetLabel).join(',');
}

function play(definition, hits) {
	return hits.reduce(
		(session, hit) => recordSectorOutcome(session, hit),
		startSectorClockSession(definition, '22222222-2222-4222-8222-222222222222'),
	);
}

export function runSectorClockExerciseTests() {
	const targets = sectorTargets();
	assert(targets.length === SECTOR_COUNT + 1, 'dwadzieścia sektorów i bull');
	assert(targets[0].number === 1, 'start od sektora 1');
	assert(targets[19].number === 20, 'przed bullem jest sektor 20');
	assert(targets[20].kind === 'bull', 'ostatni cel to bull');

	const definition = {
		id: 'clock_sdt',
		kind: 'exercise',
		name: 'Zegar sektory',
		exerciseKey: 'clock_sdt',
		durationSeconds: 300,
		inactive: false,
	};
	assert(canPlaySectorClock(definition), 'aktywny zegar sektorów da się rozpocząć');
	assert(!canPlaySectorClock({ ...definition, inactive: true }), 'nieaktywny zegar sektorów nie startuje');
	assert(!canPlaySectorClock({ ...definition, exerciseKey: 'clock_1_20_bull' }), 'zegar szybki ma własny silnik');

	let session = startSectorClockSession(definition, definition.id);
	assert(labels(session) === '1,2,3', 'na starcie widać 1, 2 i 3');
	assert(currentSectorVisit(session).activeOffset === 0, 'podświetlona jest jedynka');

	session = recordSectorOutcome(session, false);
	assert(labels(session) === '1,2,3', 'pudło nie rusza okna');
	assert(currentSectorVisit(session).activeOffset === 0, 'pudło zostawia ramkę na jedynce');
	session = recordSectorOutcome(session, true);
	assert(labels(session) === '1,2,3', 'trafienie zostawia trójkę na ekranie');
	assert(currentSectorVisit(session).activeOffset === 1, 'ramka przechodzi na dwójkę');
	session = recordSectorOutcome(session, false);
	assert(labels(session) === '2,3,4', 'po trzeciej lotce jedynka schodzi');
	assert(currentSectorVisit(session).activeOffset === 0, 'dwójka staje z lewej');
	assert(clearedCount(session) === 1, 'zaliczony jest jeden sektor');

	session = recordSectorOutcome(session, true);
	assert(labels(session) === '2,3,4', 'kolejne trafienie zostawia okno');
	assert(currentSectorVisit(session).activeOffset === 1, 'ramka stoi na trójce');
	session = recordSectorOutcome(session, true);
	assert(labels(session) === '2,3,4', 'drugie trafienie dochodzi do czwórki w tym oknie');
	assert(currentSectorVisit(session).activeOffset === 2, 'ramka stoi na czwórce');
	session = recordSectorOutcome(session, false);
	assert(labels(session) === '4,5,6', 'po podejściu zostaje czwórka');
	assert(currentSectorVisit(session).activeOffset === 0, 'czwórka jest z lewej');
	assert(sectorClockStats(session).hits === 3, 'trzy trafienia');
	assert(sectorClockStats(session).attempts === 6, 'sześć lotek');
	assert(sectorClockStats(session).percent === 50, 'połowa trafień');

	session = undoSectorDart(session);
	assert(labels(session) === '2,3,4', 'cofnięcie wraca niedomknięte podejście');
	assert(currentSectorVisit(session).activeOffset === 2, 'ramka wraca na czwórkę');
	session = undoSectorDart(session);
	assert(labels(session) === '2,3,4', 'cofnięcie trafienia zostawia okno');
	assert(currentSectorVisit(session).activeOffset === 1, 'ramka wraca na trójkę');
	assert(session.status === 'playing', 'cofnięcie zostawia ćwiczenie w toku');

	const fresh = startSectorClockSession(definition, definition.id);
	assert(undoSectorDart(fresh) === fresh, 'puste cofnięcie nic nie zmienia');

	const nearEnd = play(definition, [
		...Array(18).fill(true),
	]);
	assert(labels(nearEnd) === '19,20,Bull', 'po osiemnastu trafieniach widać 19, 20 i bulla');
	assert(currentSectorVisit(nearEnd).activeOffset === 0, 'ramka stoi na dziewiętnastce');
	const towardBull = recordSectorOutcome(recordSectorOutcome(nearEnd, true), true);
	assert(labels(towardBull) === '19,20,Bull', 'dwa trafienia zostawiają to okno');
	assert(currentSectorVisit(towardBull).activeOffset === 2, 'ramka dochodzi do bulla');
	assert(towardBull.darts[towardBull.darts.length - 1].ring === 'single', 'dwudziestka jest sektorem');
	const bull = recordSectorOutcome(towardBull, false);
	assert(labels(bull) === 'Bull', 'po pudle zostaje sam bull');
	assert(currentSectorVisit(bull).activeOffset === 0, 'bull jest podświetlony');

	const finished = recordSectorOutcome(bull, true);
	assert(finished.status === 'completed', 'trafienie bulla kończy ćwiczenie');
	assert(finished.darts[finished.darts.length - 1].ring === 'outer', 'bull zapisuje się jako środek');
	assert(currentSectorVisit(finished) === null, 'po końcu nie ma okna');
	assert(recordSectorOutcome(finished, true) === finished, 'po końcu lotka nie dochodzi');
	const finishedStats = sectorClockStats(finished);
	assert(finishedStats.hits === 21, 'dwadzieścia sektorów i bull');
	assert(finishedStats.attempts === 22, 'jedno pudło dochodzi do lotek');
	assert(finishedStats.percent === 95, '21 z 22 to 95 procent');
	assert(finishedStats.aims.length === 21, 'sektory zbierają skuteczność per cel');
	assert(finishedStats.aims.some((row) => row.aim === 'Bull' && row.attempts === 2 && row.hits === 1), 'pudło zostaje przy Bullu');
	assert(finishedStats.aims[0].aim === '1' && finishedStats.aims[0].attempts === 1, 'sektor 1 ma jedną lotkę');
	const stuckAims = sectorClockStats(play(definition, [false, false, true])).aims;
	assert(stuckAims[0].aim === '1' && stuckAims[0].attempts === 3 && stuckAims[0].hits === 1, 'pudła sektora 1 doliczają się do 1');

	const reopened = undoSectorDart(finished);
	assert(reopened.status === 'playing', 'cofnięcie otwiera domknięte ćwiczenie');
	assert(labels(reopened) === 'Bull', 'wraca bull');

	const stuck = play(definition, [false, false, false]);
	assert(stuck.status === 'playing', 'trzy pudła nie kończą ćwiczenia');
	assert(labels(stuck) === '1,2,3', 'trzy pudła zostawiają jedynkę');
	assert(sectorClockStats(stuck).hits === 0, 'same pudła nie dają trafień');
	assert(sectorClockStats(stuck).percent === 0, 'zero trafień to zero procent');

	assert(sectorClockScore(finished) === 29, 'jedno pudło przy pełnym zamknięciu daje 29');
	const perfect = play(definition, Array(21).fill(true));
	assert(sectorClockScore(perfect) === 30, '21 trafień bez pudła daje 30');
	const slow = play(definition, [
		...Array(29).fill(false),
		...Array(21).fill(true),
	]);
	assert(sectorClockScore(slow) === 1, '21 trafień i 29 pudeł daje 1');
	const weak = play(definition, [
		...Array(40).fill(false),
		...Array(21).fill(true),
	]);
	assert(sectorClockScore(weak) === -10, 'dużo pudeł schodzi poniżej zera');

	const record = sectorClockCompletion(finished, '2026-11-19T18:00:00.000Z');
	assert(record.score === 29, 'zapis ma wynik zegara sektorów');
	assert(record.name === 'Zegar sektory', 'zapis ma nazwę ćwiczenia');
	assert(!Object.prototype.hasOwnProperty.call(record, 'darts'), 'zapis nie ma listy lotek');
	const body = sessionBody(record);
	assert(body.exerciseKey === 'clock_sdt', 'zapis wskazuje ćwiczenie');
	assert(!JSON.stringify(body).includes('darts'), 'na serwer nie idą lotki');

	const started = startSectorClockSession(definition, definition.id, 10_000);
	assert(started.durationMs === 300_000, 'domyślnie pięć minut');
	assert(started.endsAt === 310_000, 'koniec jest liczony od startu');
	assert(visibleRemainingMs(started, 10_000) === 300_000, 'na starcie widać pełny czas');
	assert(visibleRemainingMs(started, 9_000) === 300_000, 'wcześniejszy odczyt nie dokłada sekundy');
	assert(formatRemaining(visibleRemainingMs(started, 10_000)) === '5:00', 'start pokazuje 5:00');
	assert(formatRemaining(visibleRemainingMs(started, 11_000)) === '4:59', 'po sekundzie zostaje 4:59');
	assert(formatRemaining(5_000) === '0:05', 'ostatnie pięć sekund');
	assert(formatRemaining(0) === '0:00', 'zero zostaje zerem');

	const full = scheduleCues(started.endsAt, 10_000);
	assert(full.tickDelayMs === 295_000, 'tykanie wchodzi pięć sekund przed końcem');
	assert(full.tickPositionSeconds === 0, 'pełne pięć sekund leci od początku pliku');
	assert(full.endDelayMs === 300_000, 'koniec jest po pięciu minutach');
	const short = scheduleCues(3_000, 0);
	assert(short.tickDelayMs === 0, 'krótsze ćwiczenie tyka od razu');
	assert(short.tickPositionSeconds === 2, 'plik startuje tak, by skończyć się z czasem');
	assert(short.endDelayMs === 3_000, 'koniec jest po trzech sekundach');

	const cut = expireSectorClock(recordSectorOutcome(started, true));
	assert(cut.status === 'completed', 'czas zamyka niedokończone ćwiczenie');
	assert(sectorClockStats(cut).hits === 1, 'zostaje trafienie sprzed końca');
	assert(sectorClockStats(cut).attempts === 1, 'koniec nie dopisuje lotki');
	assert(sectorClockScore(cut) === 10, 'jeden sektor i dwadzieścia otwartych daje 10');
	assert(currentSectorVisit(cut) === null, 'po czasie nie ma kolejnego celu');
	assert(expireSectorClock(cut) === cut, 'drugi koniec nic nie zmienia');

	const uuid = createClientSessionId();
	assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid), 'identyfikator sesji');
}

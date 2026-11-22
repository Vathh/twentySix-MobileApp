import {
	CLOCK_LENGTH,
	canPlayClock,
	clockCompletion,
	clockScore,
	clockStats,
	clockTargets,
	currentTarget,
	currentVisit,
	dartHitsTarget,
	recordOutcome,
	startClockSession,
	targetLabel,
	throwDart,
	undoDart,
} from '../clockExercise.js';
import { createClientSessionId } from '../clientSessionId.js';
import {
	applySyncOutcome,
	enqueueCompletion,
	sessionBody,
	syncLabel,
	syncOutcome,
} from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function play(definition, darts) {
	return darts.reduce((session, dart) => throwDart(session, dart), startClockSession(definition, '11111111-1111-4111-8111-111111111111'));
}

export function runClockExerciseTests() {
	const full = clockTargets(null);
	assert(full.length === CLOCK_LENGTH, 'domyślnie 21 celów');
	assert(full[0].number === 1, 'start od sektora 1');
	assert(full[19].number === 20, 'dwudziesty cel to sektor 20');
	assert(full[20].kind === 'bull', 'ostatni cel to bull');
	assert(targetLabel(full[20]) === 'Bull', 'etykieta bulla');

	const cut = clockTargets(10);
	assert(cut.length === 10, 'krótsza definicja ucina sekwencję');
	assert(cut[9].number === 10, 'dziesiąta lotka zostaje na sektorze 10');
	assert(cut.every((target) => target.kind === 'sector'), 'ucięty zegar nie dochodzi do bulla');

	const capped = clockTargets(40);
	assert(capped.length === CLOCK_LENGTH, 'dłuższa definicja nie dokłada celów');

	const sector = { kind: 'sector', number: 20 };
	assert(dartHitsTarget(sector, { number: 20, ring: 'single' }), 'single sektora trafia');
	assert(dartHitsTarget(sector, { number: 20, ring: 'double' }), 'double sektora trafia');
	assert(dartHitsTarget(sector, { number: 20, ring: 'triple' }), 'triple sektora trafia');
	assert(!dartHitsTarget(sector, { number: 19, ring: 'triple' }), 'inny sektor pudłuje');
	assert(!dartHitsTarget(sector, { number: 25, ring: 'inner' }), 'bull na sektorze pudłuje');

	const bull = { kind: 'bull' };
	assert(dartHitsTarget(bull, { number: 25, ring: 'outer' }), 'outer bull trafia');
	assert(dartHitsTarget(bull, { number: 25, ring: 'inner' }), 'inner bull trafia');
	assert(!dartHitsTarget(bull, { number: 20, ring: 'single' }), 'sektor na bullu pudłuje');

	const definition = {
		id: 'clock_1_20_bull',
		kind: 'exercise',
		name: 'Zegar szybki',
		exerciseKey: 'clock_1_20_bull',
		dartCount: 21,
		inactive: false,
	};
	assert(canPlayClock(definition), 'aktywny zegar da się rozpocząć');
	assert(!canPlayClock({ ...definition, inactive: true }), 'nieaktywny zegar nie startuje');
	assert(!canPlayClock({ ...definition, exerciseKey: 'loose_throws' }), 'inne ćwiczenie nie startuje tym silnikiem');
	const doubles = { ...definition, id: 'doubles_clock', exerciseKey: 'doubles_clock', name: 'Zegar' };
	assert(canPlayClock(doubles), 'zegar doubli korzysta z tego silnika');
	const doubleHit = recordOutcome(startClockSession(doubles, doubles.id), true);
	assert(doubleHit.darts[0].number === 1 && doubleHit.darts[0].ring === 'double', 'trafienie doubli zapisuje double');

	let session = startClockSession(definition, definition.id);
	let visit = currentVisit(session);
	assert(visit.targets.map(targetLabel).join(',') === '1,2,3', 'pierwsze podejście to sektory 1, 2 i 3');
	assert(visit.activeOffset === 0, 'na starcie aktywny jest pierwszy cel');
	assert(visit.windowStart === 0, 'okno zaczyna się od jedynki');
	assert(currentTarget(session).number === 1, 'cel to sektor 1');

	session = recordOutcome(session, true);
	visit = currentVisit(session);
	assert(session.status === 'playing', 'trafienie nie kończy ćwiczenia');
	assert(visit.activeOffset === 1, 'po trafieniu aktywna jest dwójka');
	assert(visit.targets.map(targetLabel).join(',') === '1,2,3', 'trójka zostaje do trzeciej lotki');
	session = recordOutcome(session, false);
	assert(currentVisit(session).activeOffset === 2, 'pudło przechodzi na trójkę');
	session = recordOutcome(session, true);
	visit = currentVisit(session);
	assert(visit.targets.map(targetLabel).join(',') === '4,5,6', 'po trzech lotkach wchodzi następna trójka');
	assert(visit.windowStart === 3, 'karuzela startuje od czwórki');
	assert(visit.activeOffset === 0, 'nowa trójka zaczyna się od pierwszego celu');
	assert(clockStats(session).hits === 2, 'dwa trafienia i jedno pudło');
	assert(clockStats(session).attempts === 3, 'trzy lotki są policzone');

	session = undoDart(session);
	visit = currentVisit(session);
	assert(visit.targets.map(targetLabel).join(',') === '1,2,3', 'cofnięcie wraca do poprzedniej trójki');
	assert(visit.activeOffset === 2, 'cofnięcie wraca na ostatni cel trójki');
	session = startClockSession(definition, definition.id);
	session = throwDart(session, { number: 5, ring: 'single' });
	assert(session.status === 'playing', 'pudło nie kończy ćwiczenia');
	assert(currentTarget(session).number === 2, 'pudło przechodzi dalej');
	session = undoDart(session);
	assert(session.darts.length === 0, 'cofnięcie zdejmuje ostatnią lotkę');
	assert(currentTarget(session).number === 1, 'cofnięcie wraca do poprzedniego celu');
	assert(undoDart(session) === session, 'puste cofnięcie nic nie zmienia');

	const hits = [];
	for (let number = 1; number <= 20; number += 1) {
		hits.push({ number, ring: number % 2 === 0 ? 'double' : 'triple' });
	}
	hits.push({ number: 25, ring: 'outer' });
	const finished = play(definition, hits);
	assert(finished.status === 'completed', 'ostatnia lotka kończy ćwiczenie');
	assert(currentTarget(finished) === null, 'po końcu nie ma kolejnego celu');
	assert(currentVisit(finished) === null, 'po końcu nie ma podejścia');
	assert(recordOutcome(finished, true) === finished, 'po końcu wynik nie dochodzi');
	assert(throwDart(finished, { number: 1, ring: 'single' }) === finished, 'po końcu lotka nie dochodzi');
	const beforeBull = play(definition, hits.slice(0, 18));
	assert(currentVisit(beforeBull).targets.map(targetLabel).join(',') === '19,20,Bull', 'ostatnie podejście to 19, 20 i bull');

	const undone = undoDart(finished);
	assert(undone.status === 'playing', 'cofnięcie otwiera domknięte ćwiczenie');
	assert(currentTarget(undone).kind === 'bull', 'wraca bull');

	const summary = clockStats(finished);
	assert(summary.aims.length === 21, 'zegar szybki zbiera skuteczność każdego sektora');
	assert(summary.aims[0].aim === '1' && summary.aims[0].attempts === 1, 'pierwszy cel to sektor 1');
	assert(summary.aims[20].aim === 'Bull' && summary.aims[20].hits === 1, 'ostatni cel to Bull');
	const doubleStats = clockStats(doubleHit);
	assert(doubleStats.aims[0].aim === 'D1', 'zegar doubli oznacza cele jako D1…');
	assert(summary.hits === 21 && summary.attempts === 21 && summary.percent === 100, 'pełne trafienia');
	const oneMiss = play(definition, [
		{ number: 20, ring: 'single' },
		...hits.slice(1),
	]);
	assert(clockStats(oneMiss).hits === 20, 'pierwsze pudło schodzi z trafień');
	assert(clockStats(oneMiss).percent === 95, '20 z 21 to 95 procent');

	assert(clockScore(finished) === 21, 'zegar szybki daje 1 punkt za trafienie');
	assert(clockScore(oneMiss) === 20, 'pudło w zegarze szybkim nie daje punktu');
	const doubleRecord = clockCompletion(doubleHit, '2026-11-19T18:00:00.000Z');
	assert(doubleRecord.score === 3, 'zegar doubli daje 3 punkty za double');
	let doublesBull = startClockSession(doubles, 'doubles-bull');
	for (let number = 1; number <= 20; number += 1) {
		doublesBull = recordOutcome(doublesBull, true);
	}
	assert(currentTarget(doublesBull)?.kind === 'bull', 'po D20 jest bull');
	const outerBull = recordOutcome(doublesBull, true, 'outer');
	assert(outerBull.darts[20].ring === 'outer', 'outer bull zapisuje outer');
	assert(clockScore(outerBull) === 20 * 3 + 3, 'outer bull daje 3 punkty');
	const innerBull = recordOutcome(doublesBull, true, 'inner');
	assert(innerBull.darts[20].ring === 'inner', 'inner bull zapisuje inner');
	assert(clockScore(innerBull) === 20 * 3 + 6, 'inner bull daje 6 punktów');

	const record = clockCompletion(finished, '2026-11-19T18:00:00.000Z');
	assert(record.score === 21, 'zapis szybkiego zegara ma sumę punktów');
	assert(record.stats.hits === 21, 'zapis ma trafienia');
	assert(!Object.prototype.hasOwnProperty.call(record, 'darts'), 'zapis nie ma listy lotek');
	assert(!Object.prototype.hasOwnProperty.call(record.stats, 'darts'), 'statystyki nie mają listy lotek');
	const body = sessionBody(record);
	assert(body.exerciseKey === 'clock_1_20_bull', 'zapis wskazuje ćwiczenie');
	assert(!JSON.stringify(body).includes('darts'), 'na serwer nie idą lotki');
	assert(body.score === 21, 'na serwer idzie suma punktów');

	const stored = enqueueCompletion([], record);
	const again = enqueueCompletion(stored, { ...record, stats: { hits: 0, attempts: 21, percent: 0 } });
	assert(again === stored, 'drugi lokalny zapis tej sesji nie powstaje');
	assert(again[0].stats.hits === 21, 'zostaje pierwsze ukończenie');

	const synced = applySyncOutcome(stored, record.clientSessionId, syncOutcome({
		ok: false,
		status: 409,
		data: { reason: 'training_session_already_stored' },
	}));
	assert(synced[0].sync === 'synced', '409 jest tym samym wpisem');
	assert(syncOutcome({ ok: true, status: 201, data: {} }) === 'synced', '201 zapisuje');
	assert(syncOutcome({ ok: false, status: 422, data: { reason: 'training_definition_not_found' } }) === 'rejected', 'brak definicji odpada');
	assert(syncOutcome({ ok: false, status: 422, data: { reason: 'training_definition_not_active' } }) === 'rejected', 'wyłączona treść odpada');
	assert(syncOutcome({ ok: false, status: 0, data: { message: 'offline' } }) === 'pending', 'brak sieci zostawia sesję');
	assert(syncLabel('pending') === 'Zapisze się po połączeniu.', 'komunikat oczekiwania');

	const uuid = createClientSessionId();
	assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid), 'identyfikator sesji');
}

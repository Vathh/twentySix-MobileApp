import { createClientSessionId } from '../clientSessionId.js';
import {
	BULL_COUNTER_AIM,
	bullCounterCompletion,
	bullCounterScore,
	bullCounterStats,
	canPlayBullCounter,
	expireBullCounter,
	recordBullCounterDart,
	startBullCounterSession,
	undoBullCounterDart,
} from '../bullCounterExercise.js';
import { sessionBody } from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function play(definition, rings, now) {
	return rings.reduce(
		(session, ring) => recordBullCounterDart(session, ring),
		startBullCounterSession(definition, '44444444-4444-4444-8444-444444444444', now),
	);
}

export function runBullCounterExerciseTests() {
	const definition = {
		id: 'bull_counter',
		kind: 'exercise',
		name: 'Walka o licznik',
		exerciseKey: 'bull_counter',
		durationSeconds: 180,
	};

	assert(canPlayBullCounter(definition), 'aktywne ćwiczenie da się rozpocząć');
	assert(!canPlayBullCounter({ ...definition, inactive: true }), 'nieaktywne ćwiczenie nie startuje');
	assert(!canPlayBullCounter({ ...definition, exerciseKey: 'bobs_27_easy' }), 'Bob ma własny silnik');

	const started = startBullCounterSession(definition, createClientSessionId(), 1_000);
	assert(started.endsAt === 181_000, 'czas bierze się z definicji');
	assert(bullCounterScore(started.darts) === 0, 'start od zera');

	const custom = startBullCounterSession({ ...definition, durationSeconds: 120 }, 'id', 0);
	assert(custom.durationMs === 120_000, 'zmienna czasu nadpisuje domyślną');

	const open = play(definition, ['inner', 'outer', 'miss']);
	assert(bullCounterScore(open.darts) === 6, 'inner 4 plus outer 2');
	assert(open.darts[0].aim === BULL_COUNTER_AIM && open.darts[0].ring === 'inner', 'lotka celuje w Inner');
	assert(open.status === 'playing', 'rzuty nie kończą ćwiczenia przed czasem');

	const undone = undoBullCounterDart(open);
	assert(undone.darts.length === 2, 'cofnięcie zdejmuje ostatnią lotkę');
	assert(bullCounterScore(undone.darts) === 6, 'pudło nie zmienia wyniku, cofnięcie pudła też nie');
	assert(bullCounterScore(undoBullCounterDart(undone).darts) === 4, 'cofnięcie outera oddaje 4');

	assert(recordBullCounterDart(open, 'single') === open, 'nieznany pierścień nie wchodzi');
	assert(undoBullCounterDart(started) === started, 'puste cofnięcie nic nie zmienia');

	const cut = expireBullCounter(open);
	assert(cut.status === 'completed', 'koniec czasu zamyka ćwiczenie');
	assert(cut.darts.length === 3, 'rzucone lotki zostają');
	assert(bullCounterScore(cut.darts) === 6, 'wynik z lotek sprzed końca');
	assert(expireBullCounter(cut) === cut, 'drugi koniec czasu nic nie zmienia');
	assert(recordBullCounterDart(cut, 'inner') === cut, 'po czasie lotka nie wchodzi');

	const stats = bullCounterStats(cut);
	assert(stats.hits === 2 && stats.attempts === 3, 'inner i outer liczą się jako trafienia');
	assert(stats.percent === 67, '2 z 3 to 67 procent');
	assert(stats.aims.map((row) => row.aim).join(',') === 'Bull,Inner,Outer', 'Bull + Inner + Outer');
	assert(stats.aims[0].hits === 2 && stats.aims[1].hits === 1 && stats.aims[2].hits === 1, 'rozbicie pierścieni bulla');

	const record = bullCounterCompletion(cut, '2026-11-20T18:00:00.000Z');
	assert(record.score === 6, 'wynik to suma punktów');
	assert(record.stats.hits === 2 && record.stats.percent === 67, 'statystyki bez listy lotek');
	assert(record.stats.aims.length === 3, 'aims na serwer');
	assert(!Object.prototype.hasOwnProperty.call(record.stats, 'darts'), 'statystyki nie mają listy lotek');
	const body = sessionBody(record);
	assert(body.exerciseKey === 'bull_counter', 'zapis wskazuje ćwiczenie');
	assert(body.score === 6, 'na serwer idzie wynik');
	assert(body.stats.attempts === 3, 'na serwer idą próby');
	assert(body.stats.aims[0].aim === 'Bull', 'na serwer idzie skuteczność bulla');
}

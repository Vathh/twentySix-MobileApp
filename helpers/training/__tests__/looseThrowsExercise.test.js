import { createClientSessionId } from '../clientSessionId.js';
import {
	canPlayLooseThrows,
	expireLooseThrows,
	looseThrowsCompletion,
	startLooseThrowsSession,
} from '../looseThrowsExercise.js';
import { sessionBody } from '../trainingSessionSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runLooseThrowsExerciseTests() {
	const definition = {
		id: 'loose_throws',
		kind: 'exercise',
		name: 'Luźne rzuty',
		exerciseKey: 'loose_throws',
		durationSeconds: 180,
	};

	assert(canPlayLooseThrows(definition), 'aktywne luźne rzuty da się rozpocząć');
	assert(!canPlayLooseThrows({ ...definition, inactive: true }), 'nieaktywne luźne rzuty nie startują');
	assert(!canPlayLooseThrows({ ...definition, exerciseKey: 'clock_sdt' }), 'zegar sektorów ma własny silnik');

	const session = startLooseThrowsSession(definition, definition.id, 10_000);
	assert(session.status === 'playing', 'start otwiera ćwiczenie');
	assert(session.durationMs === 180_000, 'domyślnie trzy minuty');
	assert(session.endsAt === 190_000, 'koniec jest liczony od startu');
	assert(!Object.prototype.hasOwnProperty.call(session, 'darts'), 'w trakcie nie ma listy lotek');

	const custom = startLooseThrowsSession({ ...definition, durationSeconds: 10 }, definition.id, 0);
	assert(custom.durationMs === 10_000, 'czas z definicji wygrywa z domyślnym');

	const missing = startLooseThrowsSession({ ...definition, durationSeconds: null }, definition.id, 0);
	assert(missing.durationMs === 180_000, 'pusty czas wraca do trzech minut');

	const finished = expireLooseThrows(session);
	assert(finished.status === 'completed', 'czas zamyka ćwiczenie');
	assert(expireLooseThrows(finished) === finished, 'drugi koniec nic nie zmienia');

	const record = looseThrowsCompletion(finished, '2026-11-19T18:00:00.000Z');
	assert(record.score === null, 'luźne rzuty nie mają punktacji');
	assert(record.name === 'Luźne rzuty', 'zapis ma nazwę ćwiczenia');
	assert(record.stats.elapsedSeconds === 180, 'zapisujemy czas ćwiczenia');
	assert(!Object.prototype.hasOwnProperty.call(record.stats, 'hits'), 'nie zbieramy trafień');
	assert(!Object.prototype.hasOwnProperty.call(record, 'darts'), 'zapis nie ma listy lotek');
	const body = sessionBody(record);
	assert(body.exerciseKey === 'loose_throws', 'zapis wskazuje ćwiczenie');
	assert(body.stats.elapsedSeconds === 180, 'na serwer idzie czas');
	assert(!JSON.stringify(body).includes('darts'), 'na serwer nie idą lotki');

	const uuid = createClientSessionId();
	assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid), 'identyfikator sesji');
}

import {
	isRecordsCacheStale,
	mergeCompletionIntoBundle,
	normalizeRecordVariant,
} from '../recordsBundle.js';

const TTL = 30 * 60 * 1000;

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runRecordsCacheTests() {
	assert(normalizeRecordVariant('nine_darts', null) === '9', 'nine default 9');
	assert(normalizeRecordVariant('nine_darts', '18') === '18', 'nine 18');
	assert(normalizeRecordVariant('scoring_under_pressure', '20/19/18') === '20/19/18', 'pressure rot');
	assert(normalizeRecordVariant('bull_counter', 'x') == null, 'no variant exercise');

	assert(isRecordsCacheStale(null, Date.now(), TTL) === true, 'brak cache = stale');
	assert(
		isRecordsCacheStale({ savedAt: new Date().toISOString() }, Date.now(), TTL) === false,
		'świeży cache',
	);
	assert(
		isRecordsCacheStale(
			{ savedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
			Date.now(),
			TTL,
		) === true,
		'stary cache',
	);

	const empty = { items: [], definitions: [] };
	const afterExercise = mergeCompletionIntoBundle(empty, {
		exerciseKey: 'bull_counter',
		score: 12,
		completedAt: '2026-11-25T12:00:00.000Z',
		name: 'Walka o licznik',
	});
	assert(afterExercise.items.length === 1 && afterExercise.items[0].score === 12, 'nowy PB ćwiczenia');

	const worse = mergeCompletionIntoBundle(afterExercise, {
		exerciseKey: 'bull_counter',
		score: 10,
		completedAt: '2026-11-25T13:00:00.000Z',
	});
	assert(worse.items[0].score === 12, 'gorszy wynik nie nadpisuje');

	const better = mergeCompletionIntoBundle(afterExercise, {
		exerciseKey: 'bull_counter',
		score: 20,
		completedAt: '2026-11-25T14:00:00.000Z',
	});
	assert(better.items[0].score === 20, 'lepszy wynik podbija PB');

	const nine = mergeCompletionIntoBundle(empty, {
		exerciseKey: 'nine_darts',
		score: 8,
		stats: { variant: '18' },
		completedAt: '2026-11-25T12:00:00.000Z',
	});
	assert(nine.items[0].variant === '18' && nine.items[0].score === 8, 'wariant nine');

	const plan = mergeCompletionIntoBundle(empty, {
		definitionId: 7,
		kind: 'plan',
		score: 100,
		completedAt: '2026-11-25T12:00:00.000Z',
		items: [
			{ kind: 'exercise', status: 'completed', exerciseKey: 'catch_20', score: 40 },
		],
	});
	assert(plan.definitions[0].score === 100, 'PB planu');
	assert(plan.items.some((row) => row.exerciseKey === 'catch_20' && row.score === 40), 'PB z itemu planu');
}

runRecordsCacheTests();

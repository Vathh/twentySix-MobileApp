import assert from 'assert';
import {
	activeFilterCount,
	freePlayToHistoryItem,
	mergeHistoryLists,
	outboxToHistoryItem,
	serverKindsFromFilter,
} from '../trainingHistoryMerge.js';

assert.strictEqual(activeFilterCount(['plan'], 30), 2);
assert.strictEqual(activeFilterCount([], null), 0);
assert.deepStrictEqual(serverKindsFromFilter(['plan', 'free_play']), ['plan']);
assert.deepStrictEqual(serverKindsFromFilter(['free_play']), []);

const free = freePlayToHistoryItem({
	id: 'g1',
	playedAt: '2026-11-20T10:00:00.000Z',
	winnerName: 'Ala',
	players: [{ name: 'Ala' }, { name: 'Ola' }],
});
assert.strictEqual(free.kind, 'free_play');
assert.strictEqual(free.name, 'Ala vs Ola');

const pending = outboxToHistoryItem({
	clientSessionId: 'c1',
	exerciseKey: 'loose_throws',
	name: 'Luźne rzuty',
	completedAt: '2026-11-21T10:00:00.000Z',
	score: null,
	sync: 'pending',
});
assert.strictEqual(pending.sync, 'pending');

const merged = mergeHistoryLists({
	outbox: [{
		clientSessionId: 'c1',
		exerciseKey: 'loose_throws',
		name: 'Luźne rzuty',
		completedAt: '2026-11-21T12:00:00.000Z',
		sync: 'pending',
	}],
	remote: [{
		id: 9,
		clientSessionId: 'c1',
		kind: 'exercise',
		name: 'Luźne rzuty',
		completedAt: '2026-11-21T12:00:00.000Z',
		score: null,
	}],
	freePlay: [{
		id: 'g1',
		playedAt: '2026-11-20T10:00:00.000Z',
		players: [{ name: 'Ala' }],
	}],
}, [], null);

assert.strictEqual(merged[0].sync, 'pending');
assert.ok(merged.some((row) => row.kind === 'free_play'));

console.log('trainingHistoryMerge.test.js ok');

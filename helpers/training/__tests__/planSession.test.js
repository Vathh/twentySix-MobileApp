import assert from 'assert';
import {
	advanceHang,
	emptyPlanHang,
	finalizeHang,
	mergeAims,
	planProgressLabel,
	recordBreakResult,
	recordExerciseResult,
	slotToExerciseDefinition,
} from '../planSession.js';

const plan = {
	id: 7,
	name: 'Wieczór',
	inactive: false,
	items: [
		{ position: 1, kind: 'exercise', exerciseKey: 'loose_throws', name: 'Luźne rzuty', scored: true, durationSeconds: 180 },
		{ position: 2, kind: 'break', breakSeconds: 60, name: 'Przerwa' },
		{ position: 3, kind: 'exercise', exerciseKey: 'bull_counter', name: 'Walka o licznik', scored: false, durationSeconds: 180 },
	],
};

assert.strictEqual(planProgressLabel(2, 8), '3/8');

const def = slotToExerciseDefinition(plan, plan.items[0]);
assert.strictEqual(def.exerciseKey, 'loose_throws');
assert.strictEqual(def.kind, 'exercise');

let hang = emptyPlanHang(plan, 'sess-1', 'sum');
hang = recordExerciseResult(hang, plan.items[0], {
	score: 0,
	stats: { aims: [{ aim: '20', attempts: 3, hits: 1 }] },
});
hang = advanceHang(hang);
assert.strictEqual(hang.index, 1);
assert.ok(hang.break);

hang = recordBreakResult(hang, plan.items[1], 'skipped');
hang = advanceHang(hang);
hang = recordExerciseResult(hang, plan.items[2], {
	score: 12,
	stats: { aims: [{ aim: 'Inner', attempts: 4, hits: 2 }] },
}, 'completed');
hang = advanceHang(hang);

assert.strictEqual(hang.phase, 'summary');
assert.strictEqual(hang.summary.score, 0, 'rozgrzewka nie wchodzi do sumy; luźne dały 0');
assert.strictEqual(hang.summary.items.length, 3);
assert.deepStrictEqual(
	hang.summary.items[0].stats,
	{ aims: [{ aim: '20', attempts: 3, hits: 1 }] },
	'item planu niesie stats ćwiczenia',
);
assert.deepStrictEqual(
	hang.summary.items[2].stats,
	{ aims: [{ aim: 'Inner', attempts: 4, hits: 2 }] },
	'drugie ćwiczenie też ma stats',
);

const aims = mergeAims([
	[{ aim: '20', attempts: 3, hits: 1 }],
	[{ aim: '20', attempts: 3, hits: 2 }],
]);
assert.strictEqual(aims[0].attempts, 6);
assert.strictEqual(aims[0].hits, 3);

const early = finalizeHang({
	...emptyPlanHang(plan, 'sess-2'),
	results: [],
});
assert.strictEqual(early.summary.score, 0);

console.log('planSession.test.js ok');

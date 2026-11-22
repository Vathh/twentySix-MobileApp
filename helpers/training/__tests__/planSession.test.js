import assert from 'assert';
import {
	advanceHang,
	aimsFromCompletion,
	emptyPlanHang,
	finalizeHang,
	mergeAims,
	planProgressLabel,
	planSlotTitle,
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

assert.strictEqual(
	planSlotTitle({ kind: 'exercise', exerciseKey: 'nine_darts', dartCount: 36, name: '9/18 lotek' }),
	'9 lotek',
);
assert.strictEqual(
	planSlotTitle({ kind: 'exercise', exerciseKey: 'nine_darts', dartCount: 72, name: '9/18 lotek' }),
	'18 lotek',
);
assert.strictEqual(
	planSlotTitle({ kind: 'exercise', exerciseKey: 'scoring_under_pressure', variant: '19', name: 'Scoring z presją' }),
	'Scoring z presją — 19',
);
assert.strictEqual(
	planSlotTitle({ kind: 'exercise', exerciseKey: 'loose_throws', durationSeconds: 180, name: 'Luźne rzuty' }),
	'Luźne rzuty — 3 min',
);
assert.strictEqual(
	planSlotTitle({ kind: 'exercise', exerciseKey: 'clock_1_20_bull', dartCount: 21, name: 'Zegar' }),
	'Zegar szybki — 21 lotek',
);

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
assert.strictEqual(hang.summary.items[0].stats, undefined, 'item planu nie wysyła surowych stats');
assert.deepStrictEqual(
	hang.summary.items[0].aims,
	[{ aim: '20', attempts: 3, hits: 1 }],
	'item planu niesie aims',
);
assert.strictEqual(hang.summary.items[2].stats, undefined);
assert.deepStrictEqual(
	hang.summary.items[2].aims,
	[{ aim: 'Inner', attempts: 4, hits: 2 }],
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

assert.deepStrictEqual(
	aimsFromCompletion({
		score: 4,
		stats: { doubles: [{ label: 'D13', attempts: 2, hits: 1 }] },
	}),
	[{ aim: 'D13', attempts: 2, hits: 1, percent: 50 }],
	'doubles mapping',
);

assert.deepStrictEqual(
	aimsFromCompletion({
		stats: {
			stages: [
				{ label: 'Sektor 20', attempts: 9, hits: 8 },
				{ label: 'Sektor 19', attempts: 9, hits: 7 },
				{ label: '20, 19 i 18', attempts: 9, hits: 6 },
			],
		},
	}).map((row) => row.aim).sort(),
	['19', '20'],
	'stare etapy: Sektor N → N, bez zbiorczego 20/19/18',
);

console.log('planSession.test.js ok');

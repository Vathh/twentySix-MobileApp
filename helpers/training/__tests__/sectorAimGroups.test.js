import {
	boardOrderKey,
	classifyAim,
	groupAimsByKind,
	highlightAims,
	overallAimAccuracy,
	sortAimsByBoard,
} from '../sectorAimGroups.js';

function assert(cond, msg) {
	if (!cond) {
		throw new Error(msg || 'assert failed');
	}
}

assert(classifyAim('20') === 'sector', 'bare number = sector');
assert(classifyAim('D20') === 'double', 'D20 = double');
assert(classifyAim('S1') === 'single', 'S1 = single');
assert(classifyAim('T19') === 'triple', 'T19 = triple');
assert(classifyAim('Inner') === 'double', 'Inner = double');
assert(classifyAim('Bull') === 'sector', 'Bull = sector');

assert(boardOrderKey('D1') < boardOrderKey('D20'), 'board order D1 < D20');
assert(boardOrderKey('20') < boardOrderKey('Bull'), '20 before Bull');

const sorted = sortAimsByBoard([
	{ aim: 'D20', attempts: 1, hits: 1 },
	{ aim: 'D2', attempts: 1, hits: 0 },
	{ aim: 'D10', attempts: 1, hits: 1 },
]);
assert(sorted.map((r) => r.aim).join(',') === 'D2,D10,D20', 'sort by board number');

const groups = groupAimsByKind([
	{ aim: '20', attempts: 5, hits: 2 },
	{ aim: 'D20', attempts: 3, hits: 1 },
	{ aim: 'S5', attempts: 2, hits: 2 },
	{ aim: 'T5', attempts: 1, hits: 0 },
]);
assert(groups.sector.length === 1 && groups.double.length === 1, 'group split');
assert(groups.single[0].aim === 'S5' && groups.triple[0].aim === 'T5', 'S/T groups');

const overall = overallAimAccuracy([
	{ aim: 'D1', attempts: 10, hits: 4 },
	{ aim: 'D2', attempts: 10, hits: 6 },
]);
assert(overall.attempts === 20 && overall.hits === 10 && overall.percent === 50, 'overall %');

const hi = highlightAims([
	{ aim: 'A', attempts: 20, hits: 18 },
	{ aim: 'B', attempts: 20, hits: 2 },
	{ aim: 'C', attempts: 20, hits: 10 },
	{ aim: 'E', attempts: 20, hits: 4 },
	{ aim: 'D', attempts: 5, hits: 5 },
], 15);
assert(hi.best[0].aim === 'A', 'best by %');
assert(hi.worst[0].aim === 'B', 'worst by % among non-best');
assert(hi.best.length === 3 && !hi.best.some((r) => r.aim === 'D'), 'min attempts filter');
assert(!hi.worst.some((r) => hi.best.some((b) => b.aim === r.aim)), 'worst excludes best');

const onlyThree = highlightAims([
	{ aim: 'A', attempts: 20, hits: 18 },
	{ aim: 'B', attempts: 20, hits: 10 },
	{ aim: 'C', attempts: 20, hits: 2 },
], 15);
assert(onlyThree.best.length === 3 && onlyThree.worst.length === 0, '≤3 eligible → worst empty');

const four = highlightAims([
	{ aim: 'A', attempts: 20, hits: 18 },
	{ aim: 'B', attempts: 20, hits: 14 },
	{ aim: 'C', attempts: 20, hits: 10 },
	{ aim: 'D', attempts: 20, hits: 2 },
], 15);
assert(four.best.map((r) => r.aim).join(',') === 'A,B,C', 'best top 3');
assert(four.worst.length === 1 && four.worst[0].aim === 'D', 'worst = remaining only');

console.log('sectorAimGroups.test.js OK');

import { buildH2hLegVisitRows } from '../buildH2hLegVisitRows.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function visit(partial) {
	return {
		bust: false,
		closedLeg: false,
		dartsInVisit: 3,
		...partial,
	};
}

function testEmptyVisitsOnlyHeaders() {
	const rows = buildH2hLegVisitRows([], 1, 2);
	assert(rows.length === 0, 'no rows at leg start');
}

function testLeftOpenerFillsThenPairs() {
	const afterLeft = buildH2hLegVisitRows(
		[visit({ id: 1, playerId: 1, score: 60, remainingAfter: 441 })],
		1,
		2,
	);
	assert(afterLeft.length === 1, 'one round after first visit');
	assert(afterLeft[0].leftThrown === '60', 'left thrown 60');
	assert(afterLeft[0].leftRemaining === '441', 'left remaining 441');
	assert(afterLeft[0].darts === 3, 'darts 3');
	assert(afterLeft[0].rightThrown === '-', 'right empty');
	assert(afterLeft[0].rightRemaining === '-', 'right remaining empty');

	const afterBoth = buildH2hLegVisitRows(
		[
			visit({ id: 1, playerId: 1, score: 60, remainingAfter: 441 }),
			visit({ id: 2, playerId: 2, score: 80, remainingAfter: 421 }),
		],
		1,
		2,
	);
	assert(afterBoth.length === 1, 'still one round');
	assert(afterBoth[0].rightThrown === '80', 'right thrown 80');
	assert(afterBoth[0].rightRemaining === '421', 'right remaining 421');
	assert(afterBoth[0].darts === 3, 'darts stay 3 until next left visit');
}

function testNewestRoundOnTop() {
	const rows = buildH2hLegVisitRows(
		[
			visit({ id: 1, playerId: 1, score: 60, remainingAfter: 441 }),
			visit({ id: 2, playerId: 2, score: 80, remainingAfter: 421 }),
			visit({ id: 3, playerId: 1, score: 57, remainingAfter: 384 }),
			visit({ id: 4, playerId: 2, score: 44, remainingAfter: 377 }),
		],
		1,
		2,
	);
	assert(rows.length === 2, 'two rounds');
	assert(rows[0].leftThrown === '57' && rows[0].darts === 6, 'newest 57/6 on top');
	assert(rows[0].rightThrown === '44' && rows[0].rightRemaining === '377', 'newest right 44/377');
	assert(rows[1].leftThrown === '60' && rows[1].darts === 3, 'oldest 60/3 below');
	assert(rows[1].rightThrown === '80', 'oldest right 80');
}

function testRightOpenerEmptyLeftDartsThree() {
	const afterRight = buildH2hLegVisitRows(
		[visit({ id: 1, playerId: 2, score: 60, remainingAfter: 441 })],
		1,
		2,
	);
	assert(afterRight.length === 1, 'one round');
	assert(afterRight[0].leftThrown === '-', 'left empty');
	assert(afterRight[0].leftRemaining === '-', 'left remaining empty');
	assert(afterRight[0].darts === 3, 'darts 3 even when right opened');
	assert(afterRight[0].rightThrown === '60', 'right thrown');
	assert(afterRight[0].rightRemaining === '441', 'right remaining');

	const afterLeft = buildH2hLegVisitRows(
		[
			visit({ id: 1, playerId: 2, score: 60, remainingAfter: 441 }),
			visit({ id: 2, playerId: 1, score: 80, remainingAfter: 421 }),
		],
		1,
		2,
	);
	assert(afterLeft.length === 1, 'same round filled');
	assert(afterLeft[0].leftThrown === '80', 'left filled');
	assert(afterLeft[0].darts === 3, 'darts still 3');
}

function testBustShowsLabelKeepsRemaining() {
	const rows = buildH2hLegVisitRows(
		[
			visit({
				id: 1,
				playerId: 1,
				score: 60,
				bust: true,
				remainingBefore: 501,
				remainingAfter: 501,
			}),
		],
		1,
		2,
	);
	assert(rows[0].leftThrown === 'Bust', 'bust label');
	assert(rows[0].leftRemaining === '501', 'remaining unchanged');
	assert(rows[0].leftBust === true, 'bust flag');
}

function testSkipsIncompleteVisits() {
	const rows = buildH2hLegVisitRows(
		[
			visit({ id: 1, playerId: 1, score: 20, dartsInVisit: 1, remainingAfter: 481 }),
			visit({ id: 2, playerId: 1, score: 60, dartsInVisit: 3, remainingAfter: 441 }),
		],
		1,
		2,
	);
	assert(rows.length === 1, 'partial per-dart visit ignored');
	assert(rows[0].leftThrown === '60', 'complete visit kept');
}

export function runBuildH2hLegVisitRowsTests() {
	testEmptyVisitsOnlyHeaders();
	testLeftOpenerFillsThenPairs();
	testNewestRoundOnTop();
	testRightOpenerEmptyLeftDartsThree();
	testBustShowsLabelKeepsRemaining();
	testSkipsIncompleteVisits();
}

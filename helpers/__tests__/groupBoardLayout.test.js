import { layoutGroupBoard } from '../groupBoardLayout.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function columnsFor(playerCount) {
	const columns = [{ key: 'player', label: 'Zawodnik' }];
	for (let index = 1; index <= playerCount; index += 1) {
		columns.push({ key: `vs_${index}`, label: `P${index}` });
	}
	columns.push(
		{ key: 'gamesWon', label: 'W' },
		{ key: 'gamesLost', label: 'L' },
		{ key: 'matchUnitsDifference', label: 'Wynik' },
		{ key: 'points', label: 'Pkt' },
		{ key: 'place', label: 'Pozycja' },
	);
	return columns;
}

const phone = layoutGroupBoard(columnsFor(4), 358, 1);
assert(phone.showAll === false, 'phone group of 4 stays split');
assert(phone.matches.needsScroll === false, 'phone match grid fits');
assert(phone.standings.needsScroll === false, 'phone standings fit');
assert(phone.standings.columns.some((column) => column.label === 'Poz'), 'place header shortens when split');
assert(phone.matches.columns[0].key === 'player', 'player column stays in the match pane');
assert(
	phone.matches.columns[0].width === phone.standings.columns[0].width,
	'player column keeps the same width in both panes',
);
assert(!phone.matches.columns.some((column) => column.key === 'points'), 'match pane hides standings');

const crowded = layoutGroupBoard(columnsFor(8), 358, 1);
assert(crowded.showAll === false, 'phone group of 8 stays split');
assert(crowded.matches.needsScroll === true, 'eight-player grid may scroll');

const tablet = layoutGroupBoard(columnsFor(5), 1000, 1.31);
assert(tablet.showAll === true, 'wide tablet shows the full table');
assert(tablet.full.columns.some((column) => column.label === 'Pozycja'), 'full table keeps Pozycja');

console.log('groupBoardLayout tests ok');

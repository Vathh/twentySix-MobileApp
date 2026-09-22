import { buildGroupMatrix, matrixCellForPair } from '../groupMatrix.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

const group = {
	groupNumber: 1,
	standings: [
		{ playerId: 1, playerName: 'Andrzej', userId: 1, gamesWon: 1, gamesLost: 0, matchUnitsDifference: 3, points: 1, place: 1 },
		{ playerId: 2, playerName: 'Marek', userId: 2, gamesWon: 0, gamesLost: 1, matchUnitsDifference: -3, points: 0, place: 2 },
	],
	games: [
		{
			id: 10,
			status: 'finished',
			player1: { id: 1 },
			player2: { id: 2 },
			score1: 3,
			score2: 0,
		},
		{
			id: 11,
			status: 'scheduled',
			player1: { id: 1 },
			player2: { id: 2 },
			score1: 0,
			score2: 0,
		},
	],
};

const finished = group.games[0];
const open = group.games[1];

const finishedCell = matrixCellForPair(finished, 1, { playableUnfinished: true });
assert(finishedCell.text === '3 - 0', 'finished score from row player 1');
assert(finishedCell.playable === false, 'finished not playable');
assert(finishedCell.average == null, 'finished without visits has no average');

const openCell = matrixCellForPair(open, 1, { playableUnfinished: true });
assert(openCell.text === '—', 'open is dash');
assert(openCell.sequence == null, 'open without sequence has no badge');
assert(openCell.playable === true, 'open is playable');
assert(openCell.game.id === 11, 'open keeps game');

const numbered = matrixCellForPair(
	{ ...open, sequence: 2 },
	1,
	{ playableUnfinished: true },
);
assert(numbered.sequence === 2, 'scheduled cell keeps sequence');
assert(numbered.text === '2', 'sequence is the cell text');
assert(numbered.playable === true, 'numbered cell stays playable');

const matrix = buildGroupMatrix(group, { playableUnfinished: true });
assert(matrix.rows[0][`vs_1`].text === 'X', 'diagonal X');
assert(matrix.rows[0][`vs_1`].playable === false, 'diagonal not playable');

const scored = matrixCellForPair(
	{ ...finished, player1Average: 80.5, player2Average: 40 },
	2,
	{ playableUnfinished: true },
);
assert(scored.text === '0 - 3', 'finished score from row player 2');
assert(scored.average === '40.00', 'row player match average');

const scheduledAverage = matrixCellForPair(
	{ ...open, player1Average: 80.5, sequence: 2 },
	1,
	{ playableUnfinished: true },
);
assert(scheduledAverage.average == null, 'sequence cell hides match average');

const matrixWithAverage = buildGroupMatrix({
	...group,
	standings: group.standings.map((row, index) => (
		index === 0 ? { ...row, average: 80.5 } : row
	)),
	games: [{ ...finished, player1Average: 80.5, player2Average: 40 }],
});
assert(matrixWithAverage.rows[0].player.subtitle === '80.50', 'group average under the name');
assert(matrixWithAverage.rows[0].vs_2.average === '80.50', 'match cell uses row player average');

console.log('groupMatrix tests ok');

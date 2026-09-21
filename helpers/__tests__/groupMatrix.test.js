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

const openCell = matrixCellForPair(open, 1, { playableUnfinished: true });
assert(openCell.text === '—', 'open is dash');
assert(openCell.playable === true, 'open is playable');
assert(openCell.game.id === 11, 'open keeps game');

const matrix = buildGroupMatrix(group, { playableUnfinished: true });
assert(matrix.rows[0][`vs_1`].text === 'X', 'diagonal X');
assert(matrix.rows[0][`vs_1`].playable === false, 'diagonal not playable');

console.log('groupMatrix tests ok');

import { updateStats } from '../playerResultActions.js';
import {
	createInitialPlayersBoard,
	playersBoardReducer,
	resetPlayersBoard,
} from '../playersBoardReducer.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function testInitLengthAndScore() {
	const board = createInitialPlayersBoard(3, 501);
	assert(board.length === 3, 'three player slots');
	assert(
		board.every((p) => p.score === 501 && p.startingScore === 501),
		'each player starts at 501',
	);
}

function testDispatchHitsOnlyTargetPlayer() {
	const start = createInitialPlayersBoard(3, 501);
	const next = playersBoardReducer(start, {
		...updateStats(60),
		playerIndex: 1,
	});
	assert(next !== start, 'board identity changes');
	assert(next[0].score === 501, 'player 0 unchanged');
	assert(next[1].score === 441, 'player 1 scored 60');
	assert(next[1].currentLegScores[0] === 60, 'visit recorded on player 1');
	assert(next[2].score === 501, 'player 2 unchanged');
	assert(start[1].score === 501, 'previous board not mutated');
}

function testUnknownPlayerIndexIsNoop() {
	const start = createInitialPlayersBoard(2, 501);
	const missing = playersBoardReducer(start, {
		...updateStats(60),
		playerIndex: 4,
	});
	assert(missing === start, 'out of range is noop');
	const none = playersBoardReducer(start, updateStats(60));
	assert(none === start, 'missing playerIndex is noop');
}

function testResetReplacesBoard() {
	const scored = playersBoardReducer(createInitialPlayersBoard(2, 501), {
		...updateStats(100),
		playerIndex: 0,
	});
	const reset = playersBoardReducer(scored, resetPlayersBoard(4, 301));
	assert(reset.length === 4, 'reset to four players');
	assert(
		reset.every((p) => p.score === 301),
		'reset uses new starting score',
	);
}

export function runPlayersBoardReducerTests() {
	testInitLengthAndScore();
	testDispatchHitsOnlyTargetPlayer();
	testUnknownPlayerIndexIsNoop();
	testResetReplacesBoard();
}

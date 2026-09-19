import { applyOfflinePerDartUndo, playerHasInProgressPerDartVisit } from '../perDartUndo.js';
import {
	appendDartLabel,
	completeCurrentVisit,
	createInitialPlayerResultState,
	undoLastVisit,
	updateStats,
} from '../../reducers/playerResultActions.js';
import { playerResultReducer } from '../../reducers/playerResultReducer.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function dart(playerIndex, points, completedVisit) {
	return {
		playerIndex,
		points,
		label: `S${points}`,
		completedVisit,
		bust: false,
	};
}

function emptyUndoState() {
	return {
		startingScore: 501,
		dartHistory: [],
		visitLog: [],
		visitPointsTotal: 0,
		visitStartScore: null,
		localRemaining: null,
		currentPlayerIndex: 0,
		players: [
			createInitialPlayerResultState(501),
			createInitialPlayerResultState(501),
		],
	};
}

function playCommittedVisit(state, playerIndex, darts) {
	let player = state.players[playerIndex];
	const visitScore = darts.reduce((sum, points) => sum + points, 0);
	for (const points of darts) {
		player = playerResultReducer(player, appendDartLabel(`S${points}`));
		state.dartHistory.push(dart(playerIndex, points, false));
	}
	player = playerResultReducer(player, updateStats(visitScore));
	player = playerResultReducer(player, completeCurrentVisit());
	let marked = 0;
	for (let i = state.dartHistory.length - 1; i >= 0 && marked < darts.length; i -= 1) {
		if (state.dartHistory[i].playerIndex !== playerIndex) {
			continue;
		}
		state.dartHistory[i].completedVisit = true;
		marked += 1;
	}
	state.visitLog.push({
		playerIndex,
		visitScore,
		darts: [...darts],
		bust: false,
	});
	state.players[playerIndex] = player;
	state.currentPlayerIndex = (playerIndex + 1) % state.players.length;
	state.visitPointsTotal = 0;
	state.visitStartScore = null;
	state.localRemaining = null;
	return state;
}

function startInProgressVisit(state, playerIndex, points) {
	let player = state.players[playerIndex];
	const visitStart = player.score;
	player = playerResultReducer(player, appendDartLabel(`S${points}`));
	state.players[playerIndex] = player;
	state.dartHistory.push(dart(playerIndex, points, false));
	state.visitStartScore = visitStart;
	state.visitPointsTotal = points;
	state.localRemaining = visitStart - points;
	state.currentPlayerIndex = playerIndex;
	return state;
}

function displayRemaining(state, playerIndex) {
	if (
		playerIndex === state.currentPlayerIndex &&
		state.localRemaining != null
	) {
		return state.localRemaining;
	}
	return state.players[playerIndex].score;
}

function userScenarioAfterFirstDartOfSecondVisit() {
	let state = emptyUndoState();
	state = playCommittedVisit(state, 0, [20, 20, 20]);
	state = playCommittedVisit(state, 1, [19, 19, 19]);
	state = startInProgressVisit(state, 0, 20);
	return state;
}

function testPreserveFlag() {
	assert(
		playerHasInProgressPerDartVisit(
			[dart(1, 19, false), dart(0, 20, true)],
			1,
		) === true,
		'in-progress dart for player 1 is preserved',
	);
	assert(
		playerHasInProgressPerDartVisit([dart(0, 20, true)], 0) === false,
		'completed dart is not in-progress',
	);
}

function testUndoFirstInProgressDart() {
	let state = userScenarioAfterFirstDartOfSecondVisit();
	assert(state.players[0].score === 441, 'P1 committed 441');
	assert(state.players[1].score === 444, 'P2 committed 444');
	assert(displayRemaining(state, 0) === 421, 'overlay after 20');

	state = applyOfflinePerDartUndo(state);
	assert(state.kind === 'pop_in_progress', 'first undo pops in-progress dart');
	assert(state.players[0].score === 441, 'P1 committed score unchanged');
	assert(state.players[1].score === 444, 'P2 unchanged');
	assert(state.localRemaining == null, 'visit overlay cleared after last in-progress dart');
	assert(state.visitPointsTotal === 0, 'visit total reset');
	assert(state.currentPlayerIndex === 0, 'still P1 turn until next undo');
}

function testUndoIntoPreviousVisitShowsOneDartNotWholeVisit() {
	let state = userScenarioAfterFirstDartOfSecondVisit();
	state = applyOfflinePerDartUndo(state);
	state = applyOfflinePerDartUndo(state);

	assert(state.kind === 'reopen_committed', 'second undo reopens P2 visit');
	assert(state.currentPlayerIndex === 1, 'turn returns to P2');
	assert(state.players[1].score === 501, 'P2 visit uncommitted once');
	assert(state.players[0].score === 441, 'P1 still 441');
	assert(state.visitPointsTotal === 38, 'two remaining darts stay in visit total');
	assert(state.localRemaining === 463, 'display remaining is 501-38, not 501');
	assert(displayRemaining(state, 1) === 463, 'UI remaining after one dart undo');
	assert(
		state.dartHistory.filter((d) => d.playerIndex === 1 && !d.completedVisit).length === 2,
		'two P2 darts restored as in-progress',
	);
	assert(state.visitLog.length === 1, 'P2 visit removed from committed log');
	assert(state.visitLog[0].playerIndex === 0, 'log keeps only P1 visit');
}

function testRetossThirdDartUsesFullVisitTotal() {
	let state = userScenarioAfterFirstDartOfSecondVisit();
	state = applyOfflinePerDartUndo(state);
	state = applyOfflinePerDartUndo(state);

	state.visitPointsTotal += 19;
	assert(state.visitPointsTotal === 57, 'third dart restores 19+19+19');
	state.players[1] = playerResultReducer(state.players[1], updateStats(57));
	assert(state.players[1].score === 444, 're-applied visit lands on 444, not 482');
}

function testExtraUndosNeverExceedStartingScore() {
	let state = userScenarioAfterFirstDartOfSecondVisit();
	for (let i = 0; i < 20; i += 1) {
		state = applyOfflinePerDartUndo(state);
	}
	assert(state.kind === 'noop', 'nothing left to undo');
	assert(state.players[0].score === 501, 'P1 back at 501');
	assert(state.players[1].score === 501, 'P2 back at 501');
	assert(state.players[0].score <= 501 && state.players[1].score <= 501, 'no score above start');
	assert(state.visitLog.length === 0, 'committed log empty');
	assert(state.dartHistory.length === 0, 'dart history empty');
}

function testReducerIgnoresUndoWhenNoVisitLeft() {
	let player = createInitialPlayerResultState(501);
	player = playerResultReducer(player, updateStats(60));
	player = playerResultReducer(player, undoLastVisit(60));
	assert(player.score === 501, 'first undo restores 501');
	const again = playerResultReducer(player, undoLastVisit(60));
	assert(again.score === 501, 'second undo does not grow to 561');
	assert(again === player, 'noop keeps same state identity');
}

function testBustUndoDoesNotInflateScore() {
	let state = emptyUndoState();
	state = playCommittedVisit(state, 0, [20, 20, 20]);
	state.players[1] = playerResultReducer(state.players[1], updateStats(0));
	state.visitLog.push({
		playerIndex: 1,
		visitScore: 0,
		darts: null,
		bust: true,
	});
	state.currentPlayerIndex = 0;
	state.dartHistory = state.dartHistory.filter((d) => d.playerIndex === 0);

	state = applyOfflinePerDartUndo(state);
	assert(state.kind === 'reopen_committed', 'P1 visit is last in history');
	assert(state.players[0].score === 501, 'P1 uncommitted');
	assert(state.players[1].score === 501, 'P2 bust still 501');

	state = applyOfflinePerDartUndo(state);
	state = applyOfflinePerDartUndo(state);
	state = applyOfflinePerDartUndo(state);
	assert(state.players[0].score === 501, 'P1 stays 501 after remaining darts');
	assert(state.kind === 'undo_bust' || state.kind === 'noop', `got ${state.kind}`);
	assert(state.players[1].score === 501, 'bust undo does not add points');
}

export function runPerDartUndoTests() {
	testPreserveFlag();
	testUndoFirstInProgressDart();
	testUndoIntoPreviousVisitShowsOneDartNotWholeVisit();
	testRetossThirdDartUsesFullVisitTotal();
	testExtraUndosNeverExceedStartingScore();
	testReducerIgnoresUndoWhenNoVisitLeft();
	testBustUndoDoesNotInflateScore();
}

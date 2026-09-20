import {
	createInitialPlayerResultState,
	legLose,
	legWin,
	syncFromServer,
} from '../playerResultActions.js';
import { playerResultReducer } from '../playerResultReducer.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function withLastVisit(state) {
	return {
		...state,
		currentVisitDartLabels: ['T20', '20'],
		lastVisitDartLabels: ['T20', '19', 'D16'],
		currentLegScores: [60],
	};
}

function testLegWinClearsLastVisitMemory() {
	const start = withLastVisit(createInitialPlayerResultState(501));
	start.score = 40;
	const next = playerResultReducer(start, legWin(2));
	assert(next.currentVisitDartLabels.length === 0, 'LEG_WIN clears current visit labels');
	assert(next.lastVisitDartLabels.length === 0, 'LEG_WIN clears last visit labels');
	assert(next.currentLegScores.length === 0, 'LEG_WIN starts a fresh leg score list');
}

function testLegLoseClearsLastVisitMemory() {
	const start = withLastVisit(createInitialPlayerResultState(501));
	const next = playerResultReducer(start, legLose());
	assert(next.currentVisitDartLabels.length === 0, 'LEG_LOSE clears current visit labels');
	assert(next.lastVisitDartLabels.length === 0, 'LEG_LOSE clears last visit labels');
	assert(next.currentLegScores.length === 0, 'LEG_LOSE starts a fresh leg score list');
}

function testSyncFromServerClearsLastVisitOnNewLeg() {
	const start = withLastVisit(createInitialPlayerResultState(501));
	const next = playerResultReducer(
		start,
		syncFromServer({
			score: 501,
			legsWon: 1,
			legsWonInSet: 1,
			setsWon: 0,
			currentLegScores: [],
			dartsThrown: 0,
		}),
	);
	assert(next.currentVisitDartLabels.length === 0, 'sync on closed leg clears current labels');
	assert(next.lastVisitDartLabels.length === 0, 'sync on closed leg clears last visit labels');
}

function testSyncFromServerKeepsLastVisitMidLeg() {
	const start = withLastVisit(createInitialPlayerResultState(501));
	const next = playerResultReducer(
		start,
		syncFromServer({
			score: 441,
			legsWon: 0,
			legsWonInSet: 0,
			setsWon: 0,
			currentLegScores: [60],
			dartsThrown: 3,
		}),
	);
	assert(next.lastVisitDartLabels.join(' ') === 'T20 19 D16', 'mid-leg sync keeps last visit');
	assert(next.currentLegScores[0] === 60, 'mid-leg sync keeps visit scores');
}

export function runPlayerResultReducerTests() {
	testLegWinClearsLastVisitMemory();
	testLegLoseClearsLastVisitMemory();
	testSyncFromServerClearsLastVisitOnNewLeg();
	testSyncFromServerKeepsLastVisitMidLeg();
}

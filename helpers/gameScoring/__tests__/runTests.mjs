import { applyGameScoringState } from '../applyGameScoringState.js';
import {
	computeFfaStateRevision,
	computeTournamentStateRevision,
} from '../computeStateRevision.js';
import {
	fromFfaState,
	fromTournamentState,
	normalizeScoringState,
} from '../normalizeScoringState.js';
import { tournamentMidLeg } from './fixtures/tournamentMidLeg.js';
import { ffaAfterVisit } from './fixtures/ffaAfterVisit.js';
import { ffaPartialVisit } from './fixtures/ffaPartialVisit.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function testNormalizeTournament() {
	const normalized = fromTournamentState(tournamentMidLeg, [
		{ playerId: 1 },
		{ playerId: 2 },
	]);
	assert(normalized.format === 'h2h', 'format h2h');
	assert(normalized.meta.kind === 'tournament_group', 'kind group');
	assert(normalized.meta.legsToWin === 2, 'legsToWin');
	assert(normalized.players.length === 2, 'two players');
	assert(normalized.visits.length === 1, 'one visit');
	assert(normalized.turn.currentPlayerIndex === 1, 'next player after complete visit');
	assert(
		normalized.revision === computeTournamentStateRevision(tournamentMidLeg),
		'revision matches tournament',
	);
}

function testNormalizeFfa() {
	const normalized = fromFfaState(ffaAfterVisit, [
		{ playerId: 10 },
		{ playerId: 20 },
	]);
	assert(normalized.format === 'ffa', 'format ffa');
	assert(normalized.meta.kind === 'quick_ffa', 'kind quick_ffa');
	assert(normalized.meta.lobbyId === 5, 'lobbyId');
	assert(normalized.turn.currentPlayerIndex === 1, 'session turn index');
	assert(
		normalized.revision === computeFfaStateRevision(ffaAfterVisit),
		'revision matches ffa',
	);
}

function testAutoDetect() {
	assert(normalizeScoringState(tournamentMidLeg).format === 'h2h', 'auto h2h');
	assert(normalizeScoringState(ffaAfterVisit).format === 'ffa', 'auto ffa');
}

function testApplyH2h() {
	const dispatches = [[], []];
	const dispatchFns = [
		(action) => dispatches[0].push(action),
		(action) => dispatches[1].push(action),
	];
	const currentPlayerIndexRef = { current: 0 };
	let closed = false;
	let currentIdx = 0;

	const result = applyGameScoringState(tournamentMidLeg, {
		players: [{ playerId: 1 }, { playerId: 2 }],
		N: 2,
		dispatches: dispatchFns,
		currentPlayerIndexRef,
		setCurrentPlayerIndex: (i) => {
			currentIdx = i;
		},
		setGameClosed: (v) => {
			closed = v;
		},
		lastStateKeyRef: { current: '' },
		lastPlayerSnapRef: { current: {} },
		useLegOpenerRotation: false,
	});

	assert(result.currentPlayerIndex === 1, 'apply h2h next player');
	assert(currentIdx === 1, 'setCurrentPlayerIndex called');
	assert(dispatches[0].length === 1, 'player1 synced');
	assert(dispatches[0][0].type === 'SYNC_FROM_SERVER', 'sync action');
	assert(!closed, 'game not closed');
}

function testApplyFfa() {
	const dispatches = [[], []];
	const dispatchFns = [
		(action) => dispatches[0].push(action),
		(action) => dispatches[1].push(action),
	];
	const currentPlayerIndexRef = { current: 0 };

	const result = applyGameScoringState(ffaAfterVisit, {
		players: [{ playerId: 10 }, { playerId: 20 }],
		N: 2,
		dispatches: dispatchFns,
		currentPlayerIndexRef,
		setCurrentPlayerIndex: () => {},
		setGameClosed: () => {},
		lastStateKeyRef: { current: '' },
		legOpenerIndexRef: { current: 0 },
		lastLegNumberRef: { current: null },
	});

	assert(result.currentPlayerIndex === 1, 'apply ffa session index');
	assert(dispatches[0].length === 1, 'ffa player synced');
}

function testUnifiedApiPayload() {
	const unified = {
		format: 'ffa',
		revision: 4000000,
		meta: {
			kind: 'quick_ffa',
			lobbyId: 5,
			legsToWin: 2,
			status: 'in_progress',
		},
		turn: {
			currentPlayerIndex: 1,
			legOpenerIndex: 0,
			legNumber: 1,
		},
		players: ffaAfterVisit.players,
		currentLeg: ffaAfterVisit.currentLeg,
		visits: ffaAfterVisit.visits,
		session: ffaAfterVisit.session,
	};
	const normalized = normalizeScoringState(unified);
	assert(normalized.turn.currentPlayerIndex === 1, 'unified turn from API');
	assert(normalized.meta.lobbyId === 5, 'unified meta from API');
}

function testApplyFfaPartialVisitPreservesLocalLegScores() {
	const dispatches = [[], []];
	const dispatchFns = [
		(action) => dispatches[0].push(action),
		(action) => dispatches[1].push(action),
	];
	const currentPlayerIndexRef = { current: 0 };

	applyGameScoringState(ffaPartialVisit, {
		players: [{ playerId: 10 }, { playerId: 20 }],
		N: 2,
		dispatches: dispatchFns,
		currentPlayerIndexRef,
		setCurrentPlayerIndex: () => {},
		setGameClosed: () => {},
		lastStateKeyRef: { current: '' },
		legOpenerIndexRef: { current: 0 },
		lastLegNumberRef: { current: null },
	});

	const sync = dispatches[0][0];
	assert(sync.type === 'SYNC_FROM_SERVER', 'sync action');
	assert(sync.score === 481, 'remaining from server');
	assert(sync.currentLegScores === undefined, 'partial visit preserves local leg scores');
	assert(currentPlayerIndexRef.current === 0, 'still player 0 turn');
}

const tests = [
	['normalize tournament', testNormalizeTournament],
	['normalize ffa', testNormalizeFfa],
	['auto detect format', testAutoDetect],
	['apply h2h', testApplyH2h],
	['apply ffa', testApplyFfa],
	['ffa partial visit sync', testApplyFfaPartialVisitPreservesLocalLegScores],
	['unified API payload', testUnifiedApiPayload],
];

let passed = 0;
for (const [name, fn] of tests) {
	fn();
	passed += 1;
	console.log(`ok — ${name}`);
}

console.log(`\n${passed}/${tests.length} tests passed`);

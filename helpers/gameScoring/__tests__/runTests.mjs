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
import { tournamentAfterLegClose } from './fixtures/tournamentAfterLegClose.js';
import { ffaAfterVisit } from './fixtures/ffaAfterVisit.js';
import { ffaPartialVisit } from './fixtures/ffaPartialVisit.js';
import { evaluatePerDartVisitAfterDart } from '../../perDartVisitRules.js';

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

function testTournamentRevisionMonotonicOnFastVisits() {
	const afterHighVisit = computeTournamentStateRevision({
		...tournamentMidLeg,
		visits: [
			{
				id: 10,
				playerId: 2,
				score: 150,
				dartsInVisit: 3,
				bust: false,
				closedLeg: false,
			},
		],
	});
	const afterLowVisit = computeTournamentStateRevision({
		...tournamentMidLeg,
		visits: [
			{
				id: 10,
				playerId: 2,
				score: 150,
				dartsInVisit: 3,
				bust: false,
				closedLeg: false,
			},
			{
				id: 11,
				playerId: 1,
				score: 22,
				dartsInVisit: 3,
				bust: false,
				closedLeg: false,
			},
		],
	});
	assert(
		afterLowVisit > afterHighVisit,
		`revision must grow when second visit scores less (${afterLowVisit} vs ${afterHighVisit})`,
	);
}

function testTournamentRevisionMonotonicAfterLegClose() {
	const midRev = computeTournamentStateRevision({
		...tournamentMidLeg,
		currentLeg: { id: 259, legNumber: 1, open: true },
		visits: [
			{
				id: 99,
				playerId: 1,
				score: 123,
				dartsInVisit: 3,
				bust: false,
				closedLeg: true,
			},
		],
	});
	const afterCloseRev = computeTournamentStateRevision(tournamentAfterLegClose);
	assert(
		afterCloseRev > midRev,
		`revision after leg close (${afterCloseRev}) must exceed mid-leg (${midRev})`,
	);
}

function testApplyH2hArchivesLoserLegScoresOnNewLeg() {
	const dispatches = [[], []];
	const dispatchFns = [
		(action) => dispatches[0].push(action),
		(action) => dispatches[1].push(action),
	];
	const lastPlayerSnapRef = { current: {} };
	const lastLegNumberRef = { current: 1 };
	const lastStateKeyRef = { current: '' };

	const legOneState = {
		game: {
			id: 1,
			kind: 'group',
			status: 'in_progress',
			legsToWin: 2,
			player1LegsWon: 0,
			player2LegsWon: 0,
			startingScore: 501,
		},
		players: [
			{
				playerId: 1,
				remaining: 441,
				legsWon: 0,
				gameAverage: 60,
				legAverage: 60,
			},
			{
				playerId: 2,
				remaining: 411,
				legsWon: 0,
				gameAverage: 90,
				legAverage: 90,
			},
		],
		currentLeg: { id: 5, legNumber: 1, open: true },
		visits: [
			{
				id: 1,
				playerId: 1,
				score: 60,
				dartsInVisit: 3,
				bust: false,
				closedLeg: false,
			},
			{
				id: 2,
				playerId: 2,
				score: 90,
				dartsInVisit: 3,
				bust: false,
				closedLeg: false,
			},
		],
		legs: [],
	};

	applyGameScoringState(legOneState, {
		players: [{ playerId: 1 }, { playerId: 2 }],
		N: 2,
		dispatches: dispatchFns,
		currentPlayerIndexRef: { current: 0 },
		setCurrentPlayerIndex: () => {},
		setGameClosed: () => {},
		lastStateKeyRef,
		lastPlayerSnapRef,
		lastLegNumberRef,
		useLegOpenerRotation: false,
	});

	const legTwoState = {
		...legOneState,
		game: {
			...legOneState.game,
			player1LegsWon: 1,
		},
		players: [
			{
				playerId: 1,
				remaining: 501,
				legsWon: 1,
				gameAverage: 60,
				legAverage: null,
			},
			{
				playerId: 2,
				remaining: 501,
				legsWon: 0,
				gameAverage: 90,
				legAverage: null,
			},
		],
		currentLeg: { id: 6, legNumber: 2, open: true },
		visits: [],
		legs: [
			{
				id: 5,
				legNumber: 1,
				winnerId: 1,
			},
		],
	};

	applyGameScoringState(legTwoState, {
		players: [{ playerId: 1 }, { playerId: 2 }],
		N: 2,
		dispatches: dispatchFns,
		currentPlayerIndexRef: { current: 0 },
		setCurrentPlayerIndex: () => {},
		setGameClosed: () => {},
		lastStateKeyRef,
		lastPlayerSnapRef,
		lastLegNumberRef,
		useLegOpenerRotation: false,
	});

	const loserSync = dispatches[1].at(-1);
	assert(loserSync?.type === 'SYNC_FROM_SERVER', 'loser synced');
	assert(
		Array.isArray(loserSync.legByLegScores) &&
			loserSync.legByLegScores.some((leg) => leg.includes(90)),
		'loser leg scores archived after leg change',
	);
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

function testCheckoutLegAverageIncludesClosingVisit() {
	const dispatches = [[], []];
	const dispatchFns = [
		(action) => dispatches[0].push(action),
		(action) => dispatches[1].push(action),
	];
	const lastStateKeyRef = { current: '' };
	const lastPlayerSnapRef = {
		current: {
			1: {
				legsWon: 0,
				currentLegScores: [180, 180],
				currentLegAverage: '180.00',
				dartsThrown: 6,
				score: 141,
			},
		},
	};
	const lastLegNumberRef = { current: 1 };

	const afterCheckoutState = {
		game: {
			id: 1,
			kind: 'group',
			status: 'in_progress',
			player1LegsWon: 1,
			player2LegsWon: 0,
			legsToWin: 2,
			startingScore: 501,
		},
		players: [
			{
				playerId: 1,
				remaining: 501,
				legsWon: 1,
				gameAverage: 167,
				legAverage: null,
			},
			{
				playerId: 2,
				remaining: 501,
				legsWon: 0,
				gameAverage: null,
				legAverage: null,
			},
		],
		currentLeg: { id: 2, legNumber: 2, open: true },
		visits: [],
		legs: [{ id: 1, legNumber: 1, winnerId: 1 }],
	};

	applyGameScoringState(afterCheckoutState, {
		players: [{ playerId: 1 }, { playerId: 2 }],
		N: 2,
		dispatches: dispatchFns,
		currentPlayerIndexRef: { current: 0 },
		setCurrentPlayerIndex: () => {},
		setGameClosed: () => {},
		lastStateKeyRef,
		lastPlayerSnapRef,
		lastLegNumberRef,
		useLegOpenerRotation: true,
	});

	const sync = dispatches[0].at(-1);
	assert(sync?.type === 'SYNC_FROM_SERVER', 'winner synced after checkout');
	assert(
		Array.isArray(sync.legByLegScores) &&
			sync.legByLegScores.some((leg) => leg.includes(141)),
		'checkout score archived with leg visits',
	);
	assert(
		Array.isArray(sync.legsAverages) &&
			sync.legsAverages.some((avg) => Number(avg) < 180),
		'best leg average includes checkout visit darts',
	);
}

function testPerDartBustRules() {
	const overshoot = evaluatePerDartVisitAfterDart(24, 60, 'T20');
	assert(overshoot.bust && !overshoot.checkout, 'T20 on 24 is bust');

	const invalidFinish = evaluatePerDartVisitAfterDart(24, 24, '16');
	assert(invalidFinish.bust && !invalidFinish.checkout, 'S8+S16 on 24 is bust');

	const validCheckout = evaluatePerDartVisitAfterDart(24, 24, 'D12');
	assert(!validCheckout.bust && validCheckout.checkout, 'D12 on 24 is checkout');

	const leaveOne = evaluatePerDartVisitAfterDart(50, 49, 'S17');
	assert(leaveOne.bust && !leaveOne.checkout, 'leaving 1 is bust');
}

const tests = [
	['normalize tournament', testNormalizeTournament],
	['tournament revision fast visits', testTournamentRevisionMonotonicOnFastVisits],
	['tournament revision after leg close', testTournamentRevisionMonotonicAfterLegClose],
	['normalize ffa', testNormalizeFfa],
	['auto detect format', testAutoDetect],
	['apply h2h loser leg archive', testApplyH2hArchivesLoserLegScoresOnNewLeg],
	['checkout leg average archive', testCheckoutLegAverageIncludesClosingVisit],
	['apply h2h', testApplyH2h],
	['apply ffa', testApplyFfa],
	['ffa partial visit sync', testApplyFfaPartialVisitPreservesLocalLegScores],
	['unified API payload', testUnifiedApiPayload],
	['per-dart bust rules', testPerDartBustRules],
];

let passed = 0;
for (const [name, fn] of tests) {
	fn();
	passed += 1;
	console.log(`ok — ${name}`);
}

console.log(`\n${passed}/${tests.length} tests passed`);

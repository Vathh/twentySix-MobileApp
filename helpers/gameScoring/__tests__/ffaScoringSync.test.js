import {
	applyFfaSyncState,
	shouldSkipFfaBackupTick,
	shouldStartFfaBackupPoll,
} from '../ffaScoringSync.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function baseState(overrides = {}) {
	return {
		session: {
			status: 'in_progress',
			stateVersion: 3,
			currentPlayerIndex: 1,
			legOpenerIndex: 0,
			quickGameId: 9,
			...overrides.session,
		},
		players: [{ playerId: 1 }, { playerId: 2 }],
		turn: {
			currentPlayerIndex: 1,
			legOpenerIndex: 0,
			...overrides.turn,
		},
		you: { canInput: true, ...overrides.you },
		...overrides.rest,
	};
}

function makeCtx(overrides = {}) {
	const appliedPlayers = [];
	const afterCalls = [];
	let closed = false;
	let currentIdx = null;
	let canInput = true;
	let finishedId = null;
	let aborted = false;
	const ctx = {
		pendingWrites: 0,
		lastVersionRef: { current: -1 },
		finishedRef: { current: false },
		abortedRef: { current: false },
		setGameClosed: (v) => {
			closed = v;
		},
		onAborted: () => {
			aborted = true;
		},
		onFinishedQuickGameId: (id) => {
			finishedId = id;
		},
		setCurrentPlayerIndex: (i) => {
			currentIdx = i;
		},
		setCanInputFromServer: (v) => {
			canInput = v;
		},
		legOpenerIndexRef: { current: null },
		applyPlayers: (state) => appliedPlayers.push(state),
		afterApply: (state) => afterCalls.push(state),
		...overrides,
	};
	return {
		ctx,
		get closed() {
			return closed;
		},
		get currentIdx() {
			return currentIdx;
		},
		get canInput() {
			return canInput;
		},
		get finishedId() {
			return finishedId;
		},
		get aborted() {
			return aborted;
		},
		appliedPlayers,
		afterCalls,
	};
}

function testPollOnlyWhenWsDown() {
	assert(
		shouldStartFfaBackupPoll({
			enabled: true,
			hasTransport: true,
			wsHealthy: false,
			closed: false,
		}),
		'poll when WS down',
	);
	assert(
		!shouldStartFfaBackupPoll({
			enabled: true,
			hasTransport: true,
			wsHealthy: true,
			closed: false,
		}),
		'no poll when WS healthy',
	);
	assert(
		!shouldStartFfaBackupPoll({
			enabled: true,
			hasTransport: true,
			wsHealthy: false,
			closed: true,
		}),
		'no poll when closed',
	);
	assert(
		!shouldStartFfaBackupPoll({
			enabled: false,
			hasTransport: true,
			wsHealthy: false,
			closed: false,
		}),
		'no poll when disabled',
	);
}

function testSkipTickDuringWrites() {
	assert(
		shouldSkipFfaBackupTick({ pendingWrites: 1, wsHealthy: false }),
		'skip while write in flight',
	);
	assert(
		shouldSkipFfaBackupTick({ pendingWrites: 0, wsHealthy: true }),
		'skip if WS recovered mid-interval',
	);
	assert(
		!shouldSkipFfaBackupTick({ pendingWrites: 0, wsHealthy: false }),
		'tick when idle and WS down',
	);
}

function testApplyPlayersAndTurn() {
	const env = makeCtx();
	const state = baseState();
	const result = applyFfaSyncState(state, env.ctx);
	assert(result.applied, 'applied');
	assert(env.appliedPlayers.length === 1, 'applyPlayers called');
	assert(env.afterCalls.length === 1, 'afterApply called');
	assert(env.currentIdx === 1, 'turn index');
	assert(env.ctx.legOpenerIndexRef.current === 0, 'opener');
	assert(env.canInput === true, 'canInput');
	assert(env.ctx.lastVersionRef.current === 3, 'version stored');
}

function testStaleVersionDuringWrite() {
	const env = makeCtx({
		pendingWrites: 1,
		lastVersionRef: { current: 5 },
	});
	const result = applyFfaSyncState(baseState({ session: { stateVersion: 4 } }), env.ctx);
	assert(!result.applied && result.reason === 'stale', 'stale skipped');
	assert(env.appliedPlayers.length === 0, 'players not applied');
}

function testFinishedOnce() {
	const env = makeCtx();
	const finished = baseState({ session: { status: 'finished', stateVersion: 8, quickGameId: 42 } });
	applyFfaSyncState(finished, env.ctx);
	assert(env.closed === true, 'closed');
	assert(env.finishedId === 42, 'quickGameId once');
	applyFfaSyncState(finished, env.ctx);
	assert(env.finishedId === 42, 'not fired twice');
}

function testAbortStopsApply() {
	const env = makeCtx();
	const result = applyFfaSyncState(
		baseState({ session: { status: 'aborted', stateVersion: 2 } }),
		env.ctx,
	);
	assert(!result.applied && result.reason === 'aborted', 'aborted');
	assert(env.aborted === true, 'onAborted');
	assert(env.closed === true, 'closed');
	assert(env.appliedPlayers.length === 0, 'no player apply');
}

function testInvalidState() {
	const env = makeCtx();
	const result = applyFfaSyncState({ session: null }, env.ctx);
	assert(!result.applied && result.reason === 'invalid', 'invalid');
}

function testApplyWithoutYouKeepsPreviousCanInput() {
	const env = makeCtx();
	applyFfaSyncState(baseState({ you: { canInput: false } }), env.ctx);
	assert(env.canInput === false, 'you.canInput false applied');
	const state = baseState({ session: { stateVersion: 4 } });
	delete state.you;
	applyFfaSyncState(state, env.ctx);
	assert(env.canInput === false, 'missing you does not unlock from opponent payload');
}

export function runFfaScoringSyncTests() {
	testPollOnlyWhenWsDown();
	testSkipTickDuringWrites();
	testApplyPlayersAndTurn();
	testApplyWithoutYouKeepsPreviousCanInput();
	testStaleVersionDuringWrite();
	testFinishedOnce();
	testAbortStopsApply();
	testInvalidState();
}

import {
	createFfaRealtimeConfig,
	ffaHostBlockedMessage,
	ffaInputBlockedMessage,
	unwrapFfaPayload,
} from '../transports/ffaTransportShared.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function testUnwrap() {
	assert(unwrapFfaPayload({ state: { session: { id: 1 } } }).session.id === 1, 'nested state');
	assert(unwrapFfaPayload({ session: { id: 2 } }).session.id === 2, 'flat state');
	assert(unwrapFfaPayload({ foo: 1 }) === null, 'missing session');
}

function testRealtimeConfig() {
	const cfg = createFfaRealtimeConfig({
		lobbyId: 7,
		accessToken: 'tok',
		scope: 'quick-game-ffa-bob27',
	});
	assert(cfg.channelName === 'private-quick-game-lobby.7', 'channel');
	assert(cfg.channelType === 'private', 'private');
	assert(cfg.scope === 'quick-game-ffa-bob27', 'scope');
	assert(cfg.unwrapPayload({ session: { id: 1 } }).session.id === 1, 'unwrap wired');
}

function testHostGuard() {
	assert(
		ffaHostBlockedMessage('one_device', false, 'punkty wpisuje')?.includes('jedno urządzenie'),
		'guest blocked on one_device',
	);
	assert(ffaHostBlockedMessage('one_device', true, 'cofa') === null, 'host allowed');
	assert(ffaHostBlockedMessage('each_own', false, 'cofa') === null, 'each_own no host lock');
}

function testEachOwnGuard() {
	const base = {
		lobbyScoringMode: 'each_own',
		isHost: false,
		myPlayerIndexFromLobby: 1,
	};
	assert(
		ffaInputBlockedMessage({ ...base, playerIndex: 0, currentPlayerIndex: 0 })
			=== 'Możesz wpisywać tylko własne rzuty.',
		'other player',
	);
	assert(
		ffaInputBlockedMessage({ ...base, playerIndex: 1, currentPlayerIndex: 0 })
			=== 'Czekaj na swoją kolejkę.',
		'wait for turn',
	);
	assert(
		ffaInputBlockedMessage({ ...base, playerIndex: 1, currentPlayerIndex: 1 }) === null,
		'own turn ok',
	);
}

export function runFfaTransportSharedTests() {
	testUnwrap();
	testRealtimeConfig();
	testHostGuard();
	testEachOwnGuard();
}

import { ffaScoringCanInput } from '../ffaScoringCanInput.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

const base = {
	gameClosed: false,
	isModalVisible: false,
	busy: false,
	isSpectator: false,
	syncEnabled: true,
	canInputFromServer: false,
	lobbyScoringMode: 'each_own',
	myPlayerIndex: 1,
	currentPlayerIndex: 1,
};

export function runFfaScoringCanInputTests() {
	assert(
		ffaScoringCanInput(base),
		'each_own own turn unlocks even when you.canInput from opponent event is false',
	);
	assert(
		!ffaScoringCanInput({ ...base, currentPlayerIndex: 0 }),
		'each_own waits for own turn',
	);
	assert(
		ffaScoringCanInput({
			...base,
			lobbyScoringMode: 'one_device',
			canInputFromServer: true,
			myPlayerIndex: 0,
			currentPlayerIndex: 1,
		}),
		'one_device host uses server canInput',
	);
	assert(
		!ffaScoringCanInput({
			...base,
			lobbyScoringMode: 'one_device',
			canInputFromServer: false,
			myPlayerIndex: 0,
			currentPlayerIndex: 0,
		}),
		'one_device guest/blocked stays locked',
	);
	assert(
		ffaScoringCanInput({ ...base, syncEnabled: false, canInputFromServer: false, currentPlayerIndex: 0 }),
		'offline ignores server canInput',
	);
}

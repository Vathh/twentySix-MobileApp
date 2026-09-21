import {
	consumeH2hCancelledPayload,
	isH2hCancelledState,
} from '../ffaClosedStatus.js';

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

export function runH2hCancelledPayloadTests() {
	assert(!isH2hCancelledState(null), 'null is not cancelled');
	assert(!isH2hCancelledState({ game: { status: 'in_progress' } }), 'in_progress is not cancelled');
	assert(isH2hCancelledState({ cancelled: true, gameId: 4 }), 'event payload cancelled');
	assert(isH2hCancelledState({ game: { status: 'cancelled' } }), 'game.status cancelled');
	assert(isH2hCancelledState({ meta: { status: 'cancelled' } }), 'meta.status cancelled');

	let closed = false;
	let aborted = false;
	const handledRef = { current: false };
	const first = consumeH2hCancelledPayload(
		{ cancelled: true, gameId: 9, kind: 'group' },
		{
			setGameClosed: (v) => {
				closed = v;
			},
			onAborted: () => {
				aborted = true;
			},
			handledRef,
		},
	);
	assert(first === true, 'consume returns true');
	assert(closed === true, 'setGameClosed');
	assert(aborted === true, 'onAborted');
	assert(handledRef.current === true, 'handled');

	let abortedAgain = false;
	const second = consumeH2hCancelledPayload(
		{ cancelled: true },
		{
			setGameClosed: () => {},
			onAborted: () => {
				abortedAgain = true;
			},
			handledRef,
		},
	);
	assert(second === true, 'second consume still true');
	assert(abortedAgain === false, 'onAborted once');

	assert(
		consumeH2hCancelledPayload(
			{ game: { status: 'in_progress' } },
			{ setGameClosed: () => {}, onAborted: () => {}, handledRef: { current: false } },
		) === false,
		'in_progress not consumed',
	);
}

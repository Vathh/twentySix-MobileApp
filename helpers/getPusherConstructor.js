/**
 * Metro/Hermes czasem daje `{ default: Pusher }` zamiast samej klasy —
 * wtedy `new Pusher()` kończy się „constructor is not callable”.
 */
export function getPusherConstructor() {
	const mod = require('pusher-js/react-native');
	const candidate = mod?.default ?? mod;
	if (typeof candidate !== 'function') {
		throw new TypeError(
			`Pusher export is ${typeof candidate}, expected function (pusher-js/react-native)`,
		);
	}
	return candidate;
}

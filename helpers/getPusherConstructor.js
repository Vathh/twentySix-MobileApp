import * as PusherRnModule from 'pusher-js/react-native';
import * as PusherWebModule from 'pusher-js/dist/web/pusher.js';

/**
 * Metro/Hermes w release APK potrafi zwrócić kilkowarstwowy obiekt zamiast klasy Pusher.
 * Statyczne importy + unwrap; fallback web (RN ma global WebSocket).
 */
const SOURCES = [
	['pusher-js/react-native', PusherRnModule],
	['pusher-js/dist/web/pusher.js', PusherWebModule],
];

function looksLikePusher(ctor) {
	if (typeof ctor !== 'function') {
		return false;
	}
	return (
		typeof ctor.instances !== 'undefined'
		|| typeof ctor.prototype?.subscribe === 'function'
		|| ctor.name === 'Pusher'
		|| ctor.name === 'default'
	);
}

function unwrapPusherExport(value, depth = 0) {
	if (value == null || depth > 6) {
		return null;
	}
	if (looksLikePusher(value)) {
		return value;
	}
	if (typeof value !== 'object') {
		return null;
	}

	const direct = [
		value.default,
		value.Pusher,
		value.default?.default,
		value.default?.Pusher,
	];
	for (const candidate of direct) {
		if (looksLikePusher(candidate)) {
			return candidate;
		}
	}

	if (value.default != null && typeof value.default === 'object') {
		const nested = unwrapPusherExport(value.default, depth + 1);
		if (nested) {
			return nested;
		}
	}

	for (const key of Object.keys(value)) {
		if (key === '__esModule') {
			continue;
		}
		const candidate = value[key];
		if (looksLikePusher(candidate)) {
			return candidate;
		}
	}

	return null;
}

function describeExport(value) {
	if (value == null) {
		return 'null';
	}
	if (typeof value === 'function') {
		return `function:${value.name || 'anonymous'}`;
	}
	if (typeof value !== 'object') {
		return typeof value;
	}
	const keys = Object.keys(value).filter((k) => k !== '__esModule');
	const inner = value.default != null ? ` default=${typeof value.default}` : '';
	return `object{${keys.join(',')}}${inner}`;
}

export function getPusherConstructor() {
	let lastShape = 'brak modułu';

	for (const [source, mod] of SOURCES) {
		const ctor = unwrapPusherExport(mod);
		if (ctor) {
			ctor.__twentySixPusherSource = source;
			return ctor;
		}
		lastShape = `${source} → ${describeExport(mod)}`;
	}

	throw new TypeError(
		`Nie znaleziono konstruktora Pusher (${lastShape})`,
	);
}

export function getPusherSourceLabel(ctor) {
	return ctor?.__twentySixPusherSource ?? 'unknown';
}

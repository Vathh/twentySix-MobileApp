/**
 * Pusher ładujemy LAZY (require w runtime), nie importem statycznym —
 * inaczej moduł web/rn odpala się przy starcie aplikacji i crashuje APK.
 */
const SOURCES = [
	'pusher-js/react-native',
	'pusher-js/dist/web/pusher.js',
];

let cachedCtor = null;

function ensureSelfGlobal() {
	if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
		global.self = global;
	}
}

function tryRequire(id) {
	try {
		ensureSelfGlobal();
		// Metro bundluje to do APK; require dopiero w lobby / scoringu.
		return require(id);
	} catch {
		return null;
	}
}

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

function findPusherConstructor(value, seen = new Set(), depth = 0) {
	if (value == null || depth > 8) {
		return null;
	}
	if (typeof value === 'object' || typeof value === 'function') {
		if (seen.has(value)) {
			return null;
		}
		seen.add(value);
	}
	if (looksLikePusher(value)) {
		return value;
	}
	if (typeof value !== 'object') {
		return null;
	}
	for (const key of Object.keys(value)) {
		if (key === '__esModule') {
			continue;
		}
		const found = findPusherConstructor(value[key], seen, depth + 1);
		if (found) {
			return found;
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
	if (cachedCtor) {
		return cachedCtor;
	}

	let lastShape = 'brak modułu';

	for (const source of SOURCES) {
		const mod = tryRequire(source);
		if (mod == null) {
			continue;
		}
		const ctor = findPusherConstructor(mod);
		if (ctor) {
			ctor.__twentySixPusherSource = source;
			cachedCtor = ctor;
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

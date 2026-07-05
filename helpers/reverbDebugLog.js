const MAX_ENTRIES = 50;
/** @type {Array<{ id: number; ts: string; level: string; scope: string; message: string; detail: string }>} */
const entries = [];
/** @type {Set<(rows: typeof entries) => void>} */
const listeners = new Set();

export function isReverbDebugEnabled() {
	const flag = process.env.EXPO_PUBLIC_REVERB_DEBUG?.trim();
	if (flag === '1' || flag === 'true') {
		return true;
	}
	return typeof __DEV__ !== 'undefined' && __DEV__;
}

function formatDetail(detail) {
	if (detail == null || detail === '') {
		return '';
	}
	if (typeof detail === 'string') {
		return detail;
	}
	if (detail instanceof Error) {
		return detail.message;
	}
	try {
		const s = JSON.stringify(detail);
		return s.length > 200 ? `${s.slice(0, 200)}…` : s;
	} catch {
		return String(detail);
	}
}

/**
 * @param {'info'|'warn'|'error'} level
 * @param {string} scope
 * @param {string} message
 * @param {unknown} [detail]
 */
export function appendReverbDebugLog(level, scope, message, detail) {
	if (!isReverbDebugEnabled()) {
		return;
	}
	const row = {
		id: Date.now() + Math.random(),
		ts: new Date().toLocaleTimeString('pl-PL', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		}),
		level,
		scope,
		message,
		detail: formatDetail(detail),
	};
	entries.push(row);
	while (entries.length > MAX_ENTRIES) {
		entries.shift();
	}
	const snapshot = [...entries];
	listeners.forEach((fn) => fn(snapshot));
}

export function getReverbDebugLog() {
	return [...entries];
}

/** @param {(rows: typeof entries) => void} listener */
export function subscribeReverbDebugLog(listener) {
	listeners.add(listener);
	listener([...entries]);
	return () => listeners.delete(listener);
}

export function clearReverbDebugLog() {
	entries.length = 0;
	const snapshot = [...entries];
	listeners.forEach((fn) => fn(snapshot));
}

import { notifyIfUnauthorized, SESSION_EXPIRED_MESSAGE } from '../sessionExpired.js';

/**
 * Błąd HTTP scoringu z flagą retryable (sieć / 5xx → outbox).
 */
export class ScoringRequestError extends Error {
	constructor(message, { status = null, retryable = false } = {}) {
		super(message);
		this.name = 'ScoringRequestError';
		this.status = status;
		this.retryable = retryable;
	}
}

export function isRetryableScoringError(error) {
	if (!error) {
		return false;
	}
	if (error.retryable === true) {
		return true;
	}
	if (error.name === 'AbortError') {
		return true;
	}
	// Fetch network failure (RN / browsers)
	if (error instanceof TypeError) {
		return true;
	}
	const msg = String(error.message || '').toLowerCase();
	return (
		msg.includes('network') ||
		msg.includes('failed to fetch') ||
		msg.includes('network request failed') ||
		msg.includes('timeout')
	);
}

export function userErrorMessage(error, fallback = 'Coś poszło nie tak') {
	if (error == null) {
		return fallback;
	}
	if (typeof error === 'string') {
		const trimmed = error.trim();
		return trimmed || fallback;
	}
	const msg = String(error.message || '').trim();
	return msg || fallback;
}

export function throwIfScoringResponseNotOk(res, data, text, fallbackMessage) {
	if (res.ok) {
		return;
	}
	const status = res.status;
	notifyIfUnauthorized(status);
	const retryable = status >= 500 || status === 0 || status === 408 || status === 429;
	throw new ScoringRequestError(
		status === 401
			? SESSION_EXPIRED_MESSAGE
			: userErrorMessage(
				{ message: jsonOrPlainMessage(data, text) },
				fallbackMessage,
			),
		{ status, retryable },
	);
}

function jsonOrPlainMessage(data, text) {
	if (data && typeof data.message === 'string' && data.message.trim()) {
		return data.message.trim();
	}
	const raw = String(text || '').trim();
	if (!raw || raw.startsWith('<') || /<!doctype/i.test(raw)) {
		return '';
	}
	return raw;
}

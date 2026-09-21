import { notifyIfUnauthorized, SESSION_EXPIRED_MESSAGE } from '../sessionExpired.js';
import {
	extractApiMessage,
	isNetworkError,
	userFacingErrorMessage,
} from '../userFacingError.js';

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
	if (isNetworkError(error)) {
		return true;
	}
	// Fetch network failure (RN / browsers)
	if (error instanceof TypeError) {
		return true;
	}
	return false;
}

export function isGameCancelledScoringError(error) {
	if (!error) {
		return false;
	}
	if (error.status === 409) {
		return true;
	}
	const msg = String(error.message || '').toLowerCase();
	return msg.includes('nie jest w trakcie');
}

export function isRemainingBeforeMismatchError(error) {
	const msg = String(error?.message || error || '').toLowerCase();
	return msg.includes('nieprawidłowy wynik przed')
		|| msg.includes('nieprawidlowy wynik przed');
}

export function userErrorMessage(error, fallback = 'Coś poszło nie tak') {
	return userFacingErrorMessage({ error, fallback });
}

export function throwIfScoringResponseNotOk(res, data, text, fallbackMessage) {
	if (res.ok) {
		return;
	}
	const status = res.status;
	notifyIfUnauthorized(status);
	const retryable = status >= 500 || status === 0 || status === 408 || status === 429;
	const payload = data && typeof data === 'object' ? { ...data } : {};
	if (!extractApiMessage(payload)) {
		const fromText = jsonOrPlainMessage(data, text);
		if (fromText) {
			payload.message = fromText;
		}
	}
	throw new ScoringRequestError(
		status === 401
			? SESSION_EXPIRED_MESSAGE
			: userFacingErrorMessage({
				status,
				data: payload,
				fallback: fallbackMessage,
			}),
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

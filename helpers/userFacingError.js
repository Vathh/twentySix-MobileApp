/**
 * Komunikaty dla użytkownika: sieć vs odpowiedź API vs fallback domenowy.
 * Nie pokazuj „zły kod / złe hasło”, gdy request w ogóle nie doszedł do serwera.
 */

export const CONNECTION_ERROR_MESSAGE =
	'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.';

export const SERVER_ERROR_MESSAGE =
	'Serwer chwilowo nie odpowiada. Spróbuj ponownie za chwilę.';

export const TOO_MANY_REQUESTS_MESSAGE =
	'Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie.';

const TECHNICAL_NETWORK_RE =
	/network request failed|failed to fetch|networkerror|network error|load failed|fetch failed|timed?\s*out|timeout|econnrefused|enotfound|eai_again|internet connection|offline|socket|abort/i;

export function isTechnicalNetworkMessage(message) {
	return TECHNICAL_NETWORK_RE.test(String(message || ''));
}

export function isNetworkError(error) {
	if (error == null) {
		return false;
	}
	if (typeof error === 'string') {
		return isTechnicalNetworkMessage(error);
	}
	if (error.name === 'AbortError') {
		return true;
	}
	const msg = String(error.message || '');
	if (isTechnicalNetworkMessage(msg)) {
		return true;
	}
	return false;
}

export function extractApiMessage(data) {
	if (data && typeof data.message === 'string') {
		const msg = data.message.trim();
		if (
			msg
			&& !msg.startsWith('<')
			&& !/<!doctype/i.test(msg)
			&& !isTechnicalNetworkMessage(msg)
		) {
			return msg;
		}
	}
	const firstField = data?.errors ? Object.values(data.errors)[0] : null;
	if (Array.isArray(firstField) && firstField[0]) {
		return String(firstField[0]).trim();
	}
	if (typeof firstField === 'string' && firstField.trim()) {
		return firstField.trim();
	}
	return '';
}

export function messageForHttpStatus(status) {
	if (status === 0) {
		return CONNECTION_ERROR_MESSAGE;
	}
	if (status == null) {
		return '';
	}
	if (status === 408 || status === 504) {
		return CONNECTION_ERROR_MESSAGE;
	}
	if (status === 429) {
		return TOO_MANY_REQUESTS_MESSAGE;
	}
	if (status >= 500) {
		return SERVER_ERROR_MESSAGE;
	}
	return '';
}

/**
 * @param {{ error?: unknown, status?: number, data?: object, fallback?: string }} [opts]
 */
export function userFacingErrorMessage({
	error,
	status,
	data,
	fallback = 'Coś poszło nie tak',
} = {}) {
	if (isNetworkError(error) || status === 0) {
		return CONNECTION_ERROR_MESSAGE;
	}
	const apiMsg = extractApiMessage(data);
	if (apiMsg) {
		return apiMsg;
	}
	const byStatus = messageForHttpStatus(status);
	if (byStatus) {
		return byStatus;
	}
	if (typeof error === 'string') {
		const trimmed = error.trim();
		return trimmed || fallback;
	}
	const errMsg = String(error?.message || '').trim();
	if (errMsg) {
		return errMsg;
	}
	if (typeof fallback === 'string' && fallback.trim()) {
		return fallback.trim();
	}
	return 'Coś poszło nie tak';
}

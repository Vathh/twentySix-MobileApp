/**
 * Wspólne helpery fetch dla helperów *Api.js zwracających `{ ok, status, data }`.
 * 401 przy tokenie → notifySessionExpired (ten sam handler co scoring).
 * Błąd sieci / 5xx dostaje komunikat użytkownika — nie fallback „zły kod”.
 */

import { notifyIfUnauthorized } from './sessionExpired';
import {
	extractApiMessage,
	messageForHttpStatus,
	userFacingErrorMessage,
} from './userFacingError';

export function authHeaders(accessToken, { json = false } = {}) {
	const headers = {
		Accept: 'application/json',
	};
	if (accessToken) {
		headers.Authorization = `Bearer ${accessToken}`;
	}
	if (json) {
		headers['Content-Type'] = 'application/json';
	}
	return headers;
}

export async function parseJsonSafe(res) {
	return res.json().catch(() => ({}));
}

function dataWithUserMessage(data, status) {
	if (extractApiMessage(data)) {
		return data;
	}
	const injected = messageForHttpStatus(status);
	if (!injected) {
		return data;
	}
	return { ...data, message: injected };
}

/**
 * @returns {Promise<{ ok: boolean, status: number, data: object, error?: unknown }>}
 */
export async function apiRequest(url, { method = 'GET', accessToken, body, json = false } = {}) {
	try {
		const res = await fetch(url, {
			method,
			headers: authHeaders(accessToken, { json }),
			...(body !== undefined ? { body: JSON.stringify(body) } : {}),
		});
		const data = await parseJsonSafe(res);
		notifyIfUnauthorized(res.status, {
			url,
			hasAccessToken: Boolean(accessToken),
		});
		return {
			ok: res.ok,
			status: res.status,
			data: res.ok ? data : dataWithUserMessage(data, res.status),
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			data: { message: userFacingErrorMessage({ error }) },
			error,
		};
	}
}

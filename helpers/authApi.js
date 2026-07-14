import {
	ACCOUNT_LOGIN_API_URL,
	ACCOUNT_LOGOUT_API_URL,
	ACCOUNT_SESSION_REFRESH_API_URL,
} from './apiConfig';

const JSON_HEADERS = {
	'Content-Type': 'application/json',
	Accept: 'application/json',
};

function authHeaders(accessToken) {
	return {
		...JSON_HEADERS,
		Authorization: `Bearer ${accessToken}`,
	};
}

export function mapLoginResponseToAuth(data) {
	return {
		accessToken: data?.token ?? null,
		tournamentId: null,
		userId: data?.user?.id ?? null,
		playerId: data?.user?.playerId ?? null,
		playerName: data?.user?.name ?? null,
		email: data?.user?.email ?? null,
	};
}

export async function loginWithPassword(email, password) {
	const response = await fetch(ACCOUNT_LOGIN_API_URL, {
		method: 'POST',
		headers: JSON_HEADERS,
		body: JSON.stringify({ email, password }),
	});
	const data = await response.json().catch(() => ({}));
	return { ok: response.ok, status: response.status, data };
}

export async function refreshAuthSession(accessToken) {
	const response = await fetch(ACCOUNT_SESSION_REFRESH_API_URL, {
		method: 'POST',
		headers: authHeaders(accessToken),
	});
	const data = await response.json().catch(() => ({}));
	return { ok: response.ok, status: response.status, data };
}

export async function logoutAuthSession(accessToken) {
	const response = await fetch(ACCOUNT_LOGOUT_API_URL, {
		method: 'POST',
		headers: authHeaders(accessToken),
	});
	return { ok: response.ok, status: response.status };
}

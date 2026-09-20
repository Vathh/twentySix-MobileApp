import {
	getTournamentJoinApplyUrl,
	getTournamentJoinPreviewUrl,
} from './apiConfig';
import { notifyIfUnauthorized } from './sessionExpired';
import { userFacingErrorMessage } from './userFacingError';

async function readJson(res) {
	try {
		return await res.json();
	} catch {
		return {};
	}
}

async function tournamentJoinRequest(url, { method, accessToken, fallback }) {
	let res;
	try {
		res = await fetch(url, {
			method,
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		});
	} catch (error) {
		throw new Error(userFacingErrorMessage({ error, fallback }));
	}

	const data = await readJson(res);
	notifyIfUnauthorized(res.status);
	if (!res.ok) {
		throw new Error(userFacingErrorMessage({
			status: res.status,
			data,
			fallback,
		}));
	}
	return data;
}

export async function fetchTournamentJoinPreview(code, accessToken) {
	return tournamentJoinRequest(getTournamentJoinPreviewUrl(code), {
		method: 'GET',
		accessToken,
		fallback: 'Nie znaleziono turnieju',
	});
}

export async function applyTournamentJoin(code, accessToken) {
	return tournamentJoinRequest(getTournamentJoinApplyUrl(code), {
		method: 'POST',
		accessToken,
		fallback: 'Nie udało się wysłać zgłoszenia',
	});
}

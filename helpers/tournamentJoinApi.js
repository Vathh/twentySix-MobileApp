import {
	getTournamentJoinApplyUrl,
	getTournamentJoinPreviewUrl,
} from './apiConfig';
import { notifyIfUnauthorized } from './sessionExpired';

export async function fetchTournamentJoinPreview(code, accessToken) {
	const res = await fetch(getTournamentJoinPreviewUrl(code), {
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const data = await res.json();
	notifyIfUnauthorized(res.status);
	if (!res.ok) {
		throw new Error(data?.message || 'Nie znaleziono turnieju');
	}
	return data;
}

export async function applyTournamentJoin(code, accessToken) {
	const res = await fetch(getTournamentJoinApplyUrl(code), {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
	});
	const data = await res.json();
	notifyIfUnauthorized(res.status);
	if (!res.ok) {
		throw new Error(data?.message || 'Nie udało się wysłać zgłoszenia');
	}
	return data;
}

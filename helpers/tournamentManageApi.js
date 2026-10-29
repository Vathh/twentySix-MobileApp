import { apiRequest } from './apiClient';
import {
	getOrganizationTournamentsUrl,
	getSeasonTournamentsUrl,
	getTournamentGuestsUrl,
	getTournamentInvitationCancelUrl,
	getTournamentInvitationRemoveUrl,
	getTournamentInviteUrl,
	getTournamentJoinRequestApproveUrl,
	getTournamentJoinRequestRejectUrl,
	getTournamentJoinRequestUrl,
	getTournamentJoinSelfUrl,
	getTournamentRelatedGuestUrl,
	getTournamentSetupUrl,
	getTournamentStartUrl,
	getTournamentTabletCodeUrl,
	getTournamentUsersUrl,
} from './apiConfig';
import { userFacingErrorMessage } from './userFacingError';

function fail(status, data, error, fallback) {
	return {
		ok: false,
		status,
		data,
		message: userFacingErrorMessage({ error, status, data, fallback }),
	};
}

async function call(url, accessToken, options, fallback) {
	const result = await apiRequest(url, { accessToken, json: true, ...options });
	if (!result.ok) {
		return fail(result.status, result.data, result.error, fallback);
	}
	return { ok: true, data: result.data };
}

export function createOrganizationTournament(accessToken, organizationId, body) {
	return call(
		getOrganizationTournamentsUrl(organizationId),
		accessToken,
		{ method: 'POST', body },
		'Nie udało się utworzyć turnieju',
	);
}

export function createSeasonTournament(accessToken, seasonId, body) {
	return call(
		getSeasonTournamentsUrl(seasonId),
		accessToken,
		{ method: 'POST', body },
		'Nie udało się utworzyć turnieju',
	);
}

export function fetchTournamentSetup(accessToken, tournamentId) {
	return call(getTournamentSetupUrl(tournamentId), accessToken, {}, 'Nie udało się wczytać turnieju');
}

export function searchTournamentUsers(accessToken, tournamentId, query) {
	return call(
		getTournamentUsersUrl(tournamentId, query),
		accessToken,
		{},
		'Nie udało się wyszukać graczy',
	);
}

export function inviteTournamentUser(accessToken, tournamentId, userId) {
	return call(
		getTournamentInviteUrl(tournamentId),
		accessToken,
		{ method: 'POST', body: { userId } },
		'Nie udało się wysłać zaproszenia',
	);
}

export function applyTournamentJoin(accessToken, tournamentId) {
	return call(
		getTournamentJoinRequestUrl(tournamentId),
		accessToken,
		{ method: 'POST', body: {} },
		'Nie udało się wysłać zgłoszenia',
	);
}

export function joinTournamentSelf(accessToken, tournamentId) {
	return call(
		getTournamentJoinSelfUrl(tournamentId),
		accessToken,
		{ method: 'POST', body: {} },
		'Nie udało się dodać Cię do turnieju',
	);
}

export function cancelTournamentInvitation(accessToken, tournamentId, invitationId) {
	return call(
		getTournamentInvitationCancelUrl(tournamentId, invitationId),
		accessToken,
		{ method: 'POST', body: {} },
		'Nie udało się anulować zaproszenia',
	);
}

export function removeTournamentParticipant(accessToken, tournamentId, invitationId) {
	return call(
		getTournamentInvitationRemoveUrl(tournamentId, invitationId),
		accessToken,
		{ method: 'POST', body: {} },
		'Nie udało się usunąć uczestnika',
	);
}

export function addTournamentGuest(accessToken, tournamentId, name) {
	return call(
		getTournamentGuestsUrl(tournamentId),
		accessToken,
		{ method: 'POST', body: { name } },
		'Nie udało się dodać gościa',
	);
}

export function addRelatedTournamentGuest(accessToken, tournamentId, playerId) {
	return call(
		getTournamentRelatedGuestUrl(tournamentId),
		accessToken,
		{ method: 'POST', body: { playerId } },
		'Nie udało się dodać gościa',
	);
}

export function removeTournamentGuest(accessToken, tournamentId, playerId) {
	return call(
		getTournamentGuestsUrl(tournamentId),
		accessToken,
		{ method: 'DELETE', body: { playerId } },
		'Nie udało się usunąć gościa',
	);
}

export function approveTournamentJoinRequest(accessToken, tournamentId, requestId) {
	return call(
		getTournamentJoinRequestApproveUrl(tournamentId, requestId),
		accessToken,
		{ method: 'POST', body: {} },
		'Nie udało się przyjąć zgłoszenia',
	);
}

export function rejectTournamentJoinRequest(accessToken, tournamentId, requestId) {
	return call(
		getTournamentJoinRequestRejectUrl(tournamentId, requestId),
		accessToken,
		{ method: 'POST', body: {} },
		'Nie udało się odrzucić zgłoszenia',
	);
}

export function startTournament(accessToken, tournamentId, body) {
	return call(
		getTournamentStartUrl(tournamentId),
		accessToken,
		{ method: 'POST', body },
		'Nie udało się wystartować turnieju',
	);
}

export function regenerateTournamentTabletCode(accessToken, tournamentId) {
	return call(
		getTournamentTabletCodeUrl(tournamentId),
		accessToken,
		{ method: 'POST', body: {} },
		'Nie udało się wygenerować kodu',
	);
}

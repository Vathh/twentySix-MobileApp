import { apiRequest } from './apiClient';
import {
	ORGANIZATIONS_URL,
	getOrganizationAdminsRemoveUrl,
	getOrganizationAdminsUrl,
	getOrganizationGuestsRemoveUrl,
	getOrganizationGuestsUrl,
	getOrganizationInvitationCancelUrl,
	getOrganizationJoinRequestApproveUrl,
	getOrganizationJoinRequestRejectUrl,
	getOrganizationJoinRequestUrl,
	getOrganizationLogoUrl,
	getOrganizationManageUrl,
	getOrganizationRelatedUsersRemoveUrl,
	getOrganizationRelatedUsersUrl,
	getOrganizationSeasonsUrl,
	getOrganizationUrl,
	getOrganizationUsersUrl,
	getSeasonAdminsRemoveUrl,
	getSeasonAdminsUrl,
	getSeasonManageUrl,
	getSeasonUrl,
	getTournamentAdminUsersUrl,
	getTournamentAdminsRemoveUrl,
	getTournamentAdminsUrl,
	getTournamentCancelUrl,
	getTournamentUrl,
} from './apiConfig';

function fail(result, fallback) {
	return result?.data?.message || fallback;
}

async function send(url, accessToken, options, fallback) {
	const result = await apiRequest(url, { accessToken, json: true, ...options });
	if (!result.ok) {
		return { ok: false, message: fail(result, fallback), data: null };
	}
	return { ok: true, message: result.data?.message || '', data: result.data };
}

export function createOrganization(accessToken, body) {
	return send(ORGANIZATIONS_URL, accessToken, { method: 'POST', body }, 'Nie udało się utworzyć organizacji.');
}

export function fetchOrganizationManage(accessToken, organizationId) {
	return send(getOrganizationManageUrl(organizationId), accessToken, { method: 'GET' }, 'Nie udało się pobrać organizacji.');
}

export function updateOrganization(accessToken, organizationId, body) {
	return send(getOrganizationUrl(organizationId), accessToken, { method: 'PUT', body }, 'Nie udało się zapisać organizacji.');
}

export async function uploadOrganizationLogo(accessToken, organizationId, file) {
	const formData = new FormData();
	formData.append('logo', {
		uri: file.uri,
		name: 'logo.jpg',
		type: file.mimeType || 'image/jpeg',
	});
	const result = await apiRequest(getOrganizationLogoUrl(organizationId), {
		method: 'POST',
		accessToken,
		formData,
	});
	if (!result.ok) {
		return { ok: false, message: fail(result, 'Nie udało się zapisać logo.'), data: null };
	}
	return { ok: true, message: result.data?.message || '', data: result.data };
}

export function deleteOrganization(accessToken, organizationId, body) {
	return send(getOrganizationUrl(organizationId), accessToken, { method: 'DELETE', body }, 'Nie udało się usunąć organizacji.');
}

export function searchOrganizationUsers(accessToken, organizationId, query) {
	return send(getOrganizationUsersUrl(organizationId, query), accessToken, { method: 'GET' }, 'Nie udało się wyszukać.');
}

export function inviteOrganizationUser(accessToken, organizationId, userId) {
	return send(getOrganizationRelatedUsersUrl(organizationId), accessToken, { method: 'POST', body: { userId } }, 'Nie udało się zaprosić.');
}

export function applyOrganizationJoinRequest(accessToken, organizationId) {
	return send(getOrganizationJoinRequestUrl(organizationId), accessToken, { method: 'POST', body: {} }, 'Nie udało się wysłać zgłoszenia.');
}

export function approveOrganizationJoinRequest(accessToken, organizationId, requestId) {
	return send(getOrganizationJoinRequestApproveUrl(organizationId, requestId), accessToken, { method: 'POST', body: {} }, 'Nie udało się zatwierdzić zgłoszenia.');
}

export function rejectOrganizationJoinRequest(accessToken, organizationId, requestId) {
	return send(getOrganizationJoinRequestRejectUrl(organizationId, requestId), accessToken, { method: 'POST', body: {} }, 'Nie udało się odrzucić zgłoszenia.');
}

export function cancelOrganizationInvitation(accessToken, organizationId, invitationId) {
	return send(getOrganizationInvitationCancelUrl(organizationId, invitationId), accessToken, { method: 'POST', body: {} }, 'Nie udało się anulować zaproszenia.');
}

export function removeOrganizationMember(accessToken, organizationId, userId) {
	return send(getOrganizationRelatedUsersRemoveUrl(organizationId), accessToken, { method: 'POST', body: { userId } }, 'Nie udało się usunąć ze składu.');
}

export function addOrganizationGuest(accessToken, organizationId, name) {
	return send(getOrganizationGuestsUrl(organizationId), accessToken, { method: 'POST', body: { name } }, 'Nie udało się dodać gościa.');
}

export function removeOrganizationGuest(accessToken, organizationId, playerId) {
	return send(getOrganizationGuestsRemoveUrl(organizationId), accessToken, { method: 'POST', body: { playerId } }, 'Nie udało się usunąć gościa.');
}

export function addOrganizationAdmin(accessToken, organizationId, userId) {
	return send(getOrganizationAdminsUrl(organizationId), accessToken, { method: 'POST', body: { userId } }, 'Nie udało się nadać uprawnień.');
}

export function removeOrganizationAdmin(accessToken, organizationId, userId) {
	return send(getOrganizationAdminsRemoveUrl(organizationId), accessToken, { method: 'POST', body: { userId } }, 'Nie udało się zdjąć uprawnień.');
}

export function createSeason(accessToken, organizationId, body) {
	return send(getOrganizationSeasonsUrl(organizationId), accessToken, { method: 'POST', body }, 'Nie udało się utworzyć sezonu.');
}

export function fetchSeasonManage(accessToken, seasonId) {
	return send(getSeasonManageUrl(seasonId), accessToken, { method: 'GET' }, 'Nie udało się pobrać sezonu.');
}

export function updateSeason(accessToken, seasonId, body) {
	return send(getSeasonUrl(seasonId), accessToken, { method: 'PUT', body }, 'Nie udało się zapisać sezonu.');
}

export function deleteSeason(accessToken, seasonId, body) {
	return send(getSeasonUrl(seasonId), accessToken, { method: 'DELETE', body }, 'Nie udało się usunąć sezonu.');
}

export function addSeasonAdmin(accessToken, seasonId, userId) {
	return send(getSeasonAdminsUrl(seasonId), accessToken, { method: 'POST', body: { userId } }, 'Nie udało się nadać uprawnień.');
}

export function removeSeasonAdmin(accessToken, seasonId, userId) {
	return send(getSeasonAdminsRemoveUrl(seasonId), accessToken, { method: 'POST', body: { userId } }, 'Nie udało się zdjąć uprawnień.');
}

export function fetchTournamentAdmins(accessToken, tournamentId) {
	return send(getTournamentAdminsUrl(tournamentId), accessToken, { method: 'GET' }, 'Nie udało się pobrać administratorów.');
}

export function searchTournamentAdmins(accessToken, tournamentId, query) {
	return send(getTournamentAdminUsersUrl(tournamentId, query), accessToken, { method: 'GET' }, 'Nie udało się wyszukać.');
}

export function addTournamentAdmin(accessToken, tournamentId, userId) {
	return send(getTournamentAdminsUrl(tournamentId), accessToken, { method: 'POST', body: { userId } }, 'Nie udało się nadać uprawnień.');
}

export function removeTournamentAdmin(accessToken, tournamentId, userId) {
	return send(getTournamentAdminsRemoveUrl(tournamentId), accessToken, { method: 'POST', body: { userId } }, 'Nie udało się zdjąć uprawnień.');
}

export function cancelTournamentPlay(accessToken, tournamentId, currentPassword) {
	return send(
		getTournamentCancelUrl(tournamentId),
		accessToken,
		{ method: 'POST', body: { current_password: currentPassword } },
		'Nie udało się anulować rozgrywek.',
	);
}

export function deleteTournament(accessToken, tournamentId, body) {
	return send(getTournamentUrl(tournamentId), accessToken, { method: 'DELETE', body }, 'Nie udało się usunąć turnieju.');
}

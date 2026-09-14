import {
	FRIENDS_ACCEPT_URL,
	FRIENDS_INVITATIONS_RECEIVED_URL,
	FRIENDS_REJECT_URL,
	LEAGUE_MEMBERSHIP_INVITATIONS_RECEIVED_URL,
	ORGANIZATION_INVITATIONS_RECEIVED_URL,
	QUICK_GAME_LOBBY_INVITATIONS_URL,
	SEASON_INVITATIONS_RECEIVED_URL,
	TOURNAMENT_INVITATIONS_RECEIVED_URL,
	getLeagueMembershipInvitationAcceptUrl,
	getLeagueMembershipInvitationRejectUrl,
	getOrganizationInvitationAcceptUrl,
	getOrganizationInvitationRejectUrl,
	getQuickGameLobbyRejectInvitationUrl,
	getQuickGameLobbyUrl,
	getSeasonInvitationAcceptUrl,
	getSeasonInvitationRejectUrl,
	getTournamentInvitationAcceptUrl,
	getTournamentInvitationRejectUrl,
	getTournamentInvitationWithdrawUrl,
} from './apiConfig';
import { apiRequest } from './apiClient';

export async function fetchTournamentInvitationsReceived(accessToken) {
	return apiRequest(TOURNAMENT_INVITATIONS_RECEIVED_URL, { accessToken });
}

export async function fetchOrganizationInvitationsReceived(accessToken) {
	return apiRequest(ORGANIZATION_INVITATIONS_RECEIVED_URL, { accessToken });
}

export async function fetchSeasonInvitationsReceived(accessToken) {
	return apiRequest(SEASON_INVITATIONS_RECEIVED_URL, { accessToken });
}

export async function fetchLeagueMembershipInvitationsReceived(accessToken) {
	return apiRequest(LEAGUE_MEMBERSHIP_INVITATIONS_RECEIVED_URL, { accessToken });
}

export async function fetchQuickGameLobbyInvitations(accessToken) {
	return apiRequest(QUICK_GAME_LOBBY_INVITATIONS_URL, { accessToken });
}

export async function fetchFriendInvitationsReceived(accessToken) {
	return apiRequest(FRIENDS_INVITATIONS_RECEIVED_URL, { accessToken });
}

const TOURNAMENT_INVITATION_URL_BY_ACTION = {
	accept: getTournamentInvitationAcceptUrl,
	reject: getTournamentInvitationRejectUrl,
	withdraw: getTournamentInvitationWithdrawUrl,
};

export async function actOnTournamentInvitation(invitationId, action, accessToken) {
	const buildUrl = TOURNAMENT_INVITATION_URL_BY_ACTION[action];
	return apiRequest(buildUrl(invitationId), {
		method: 'POST',
		accessToken,
		json: true,
		body: {},
	});
}

export async function joinQuickGameLobby(lobbyId, accessToken) {
	return apiRequest(`${getQuickGameLobbyUrl(lobbyId)}/join`, {
		method: 'POST',
		accessToken,
		json: true,
		body: {},
	});
}

export async function rejectQuickGameLobbyInvitation(invitationId, accessToken) {
	return apiRequest(getQuickGameLobbyRejectInvitationUrl(invitationId), {
		method: 'POST',
		accessToken,
		json: true,
		body: {},
	});
}

const ORGANIZATION_INVITATION_URL_BY_ACTION = {
	accept: getOrganizationInvitationAcceptUrl,
	reject: getOrganizationInvitationRejectUrl,
};

export async function actOnOrganizationInvitation(invitationId, action, accessToken) {
	const buildUrl = ORGANIZATION_INVITATION_URL_BY_ACTION[action];
	return apiRequest(buildUrl(invitationId), {
		method: 'POST',
		accessToken,
		json: true,
		body: {},
	});
}

const SEASON_INVITATION_URL_BY_ACTION = {
	accept: getSeasonInvitationAcceptUrl,
	reject: getSeasonInvitationRejectUrl,
};

export async function actOnSeasonInvitation(invitationId, action, accessToken) {
	const buildUrl = SEASON_INVITATION_URL_BY_ACTION[action];
	return apiRequest(buildUrl(invitationId), {
		method: 'POST',
		accessToken,
		json: true,
		body: {},
	});
}

const LEAGUE_MEMBERSHIP_INVITATION_URL_BY_ACTION = {
	accept: getLeagueMembershipInvitationAcceptUrl,
	reject: getLeagueMembershipInvitationRejectUrl,
};

export async function actOnLeagueMembershipInvitation(invitationId, action, accessToken) {
	const buildUrl = LEAGUE_MEMBERSHIP_INVITATION_URL_BY_ACTION[action];
	return apiRequest(buildUrl(invitationId), {
		method: 'POST',
		accessToken,
		json: true,
		body: {},
	});
}

export async function actOnFriendInvitation(invitationId, action, accessToken) {
	const url = action === 'accept' ? FRIENDS_ACCEPT_URL : FRIENDS_REJECT_URL;
	return apiRequest(url, {
		method: 'POST',
		accessToken,
		json: true,
		body: { invitationId },
	});
}

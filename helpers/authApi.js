import {
	ACCOUNT_LOGIN_API_URL,
	ACCOUNT_LOGOUT_API_URL,
	ACCOUNT_CHANGE_PASSWORD_API_URL,
	ACCOUNT_ACCEPT_TERMS_API_URL,
	ACCOUNT_FORGOT_PASSWORD_API_URL,
	ACCOUNT_SESSION_REFRESH_API_URL,
	LOGIN_API_URL,
	REGISTER_API_URL,
	RESEND_VERIFICATION_API_URL,
} from './apiConfig';
import { apiRequest } from './apiClient';

export function mapLoginResponseToAuth(data) {
	return {
		accessToken: data?.token ?? null,
		tournamentId: null,
		userId: data?.user?.id ?? null,
		playerId: data?.user?.playerId ?? null,
		playerName: data?.user?.name ?? null,
		email: data?.user?.email ?? null,
		avatarUrl: data?.user?.avatarUrl ?? null,
		termsAccepted: data?.user?.termsAccepted === true,
	};
}

export async function loginWithPassword(email, password) {
	return apiRequest(ACCOUNT_LOGIN_API_URL, {
		method: 'POST',
		json: true,
		body: { email, password },
	});
}

export async function refreshAuthSession(accessToken) {
	return apiRequest(ACCOUNT_SESSION_REFRESH_API_URL, {
		method: 'POST',
		accessToken,
		json: true,
	});
}

export async function logoutAuthSession(accessToken) {
	const { ok, status } = await apiRequest(ACCOUNT_LOGOUT_API_URL, {
		method: 'POST',
		accessToken,
		json: true,
	});
	return { ok, status };
}

export async function changePassword(accessToken, {
	currentPassword,
	password,
	passwordConfirmation,
}) {
	return apiRequest(ACCOUNT_CHANGE_PASSWORD_API_URL, {
		method: 'PUT',
		accessToken,
		json: true,
		body: {
			current_password: currentPassword,
			password,
			password_confirmation: passwordConfirmation,
		},
	});
}

export async function registerAccount({ name, email, password, acceptedTerms }) {
	return apiRequest(REGISTER_API_URL, {
		method: 'POST',
		json: true,
		body: { name, email, password, acceptedTerms: acceptedTerms === true },
	});
}

export async function acceptAccountTerms(accessToken) {
	return apiRequest(ACCOUNT_ACCEPT_TERMS_API_URL, {
		method: 'POST',
		accessToken,
		json: true,
		body: {},
	});
}

export async function requestPasswordReset(email) {
	return apiRequest(ACCOUNT_FORGOT_PASSWORD_API_URL, {
		method: 'POST',
		json: true,
		body: { email },
	});
}

export async function resendVerificationEmail(email) {
	return apiRequest(RESEND_VERIFICATION_API_URL, {
		method: 'POST',
		json: true,
		body: { email },
	});
}

export async function loginWithTournamentCode(code) {
	return apiRequest(LOGIN_API_URL, {
		method: 'POST',
		json: true,
		body: { code },
	});
}

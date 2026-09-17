export const SESSION_EXPIRED_MESSAGE = 'Sesja wygasła. Zaloguj się ponownie.';

let onUnauthorized = null;
let notifying = false;

export function setOnUnauthorized(handler) {
	onUnauthorized = typeof handler === 'function' ? handler : null;
	if (!onUnauthorized) {
		notifying = false;
	}
}

export function isSessionAuthExemptUrl(url) {
	const path = String(url || '');
	if (!path) {
		return false;
	}

	return (
		path.includes('/account/login')
		|| path.includes('/account/session/refresh')
		|| path.includes('/account/logout')
		|| path.includes('/register')
		|| path.includes('/email/verification-notification')
		|| /\/api\/login(?:\?|$)/.test(path)
		|| path.endsWith('/api/login')
	);
}

/**
 * 401 przy requestcie z tokenem → AuthProvider.logout().
 * Konto (email/hasło) kończy sesję; sędziowanie kodem wraca do zapamiętanego konta.
 * Pomija logowanie / refresh / logout, żeby nie zjadać złego hasła ani pętli.
 */
export function notifySessionExpired({ url, hasAccessToken = true } = {}) {
	if (!hasAccessToken || isSessionAuthExemptUrl(url)) {
		return;
	}
	if (notifying || typeof onUnauthorized !== 'function') {
		return;
	}
	notifying = true;
	try {
		const result = onUnauthorized();
		Promise.resolve(result).finally(() => {
			notifying = false;
		});
	} catch {
		notifying = false;
	}
}

export function notifyIfUnauthorized(status, options = {}) {
	if (Number(status) !== 401) {
		return;
	}
	notifySessionExpired(options);
}

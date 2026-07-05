import { getReverbConfig } from './apiConfig';
import { getPusherConstructor } from './getPusherConstructor';
import { logReverbWs } from './reverbWsLog';

/**
 * Instancja Pusher pod Laravel Reverb w React Native.
 * Wymaga `pusher-js/react-native` (Metro też wymusza ten entry w metro.config.js).
 */
export function createReverbPusher(accessToken = null) {
	const cfg = getReverbConfig();
	logReverbWs('info', 'pusher', 'tworzenie klienta Pusher', {
		host: cfg.wsHost,
		port: cfg.wsPort,
		tls: cfg.forceTLS,
		keyPrefix: cfg.key.slice(0, 4),
		hasToken: !!accessToken,
	});
	const options = {
		// Dummy cluster — przy wsHost łączy z Reverb, nie z pusher.com (Laravel docs: mt1).
		cluster: 'mt1',
		wsHost: cfg.wsHost,
		wsPort: cfg.wsPort,
		wssPort: cfg.wssPort,
		forceTLS: cfg.forceTLS,
		disableStats: true,
		enabledTransports: cfg.enabledTransports,
	};

	if (accessToken) {
		options.authorizer = (channel) => ({
			authorize: (socketId, callback) => {
				logReverbWs('info', 'auth', `POST /broadcasting/auth (${channel.name})`, {
					socketId: socketId?.slice?.(0, 12),
				});
				const body = new URLSearchParams({
					socket_id: socketId,
					channel_name: channel.name,
				}).toString();
				fetch(cfg.authEndpoint, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body,
				})
					.then(async (res) => {
						const data = await res.json().catch(() => ({}));
						if (!res.ok) {
							logReverbWs('error', 'auth', `auth HTTP ${res.status}`, data);
							callback(true, data);
							return;
						}
						logReverbWs('info', 'auth', `auth HTTP ${res.status} OK`);
						callback(false, data);
					})
					.catch((err) => {
						logReverbWs('error', 'auth', 'auth fetch błąd', err);
						callback(true, err);
					});
			},
		});
	}

	let pusher;
	try {
		const Pusher = getPusherConstructor();
		logReverbWs('info', 'pusher', 'import Pusher OK', {
			exportType: typeof Pusher,
		});
		pusher = new Pusher(cfg.key, options);
		logReverbWs('info', 'pusher', 'konstruktor Pusher OK');
	} catch (err) {
		logReverbWs('error', 'pusher', 'konstruktor Pusher rzucił wyjątek', err);
		throw err;
	}
	return pusher;
}

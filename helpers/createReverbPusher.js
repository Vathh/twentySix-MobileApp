import Pusher from 'pusher-js/react-native';
import { getReverbConfig } from './apiConfig';

/**
 * Instancja Pusher pod Laravel Reverb w React Native.
 * Wymaga `pusher-js/react-native` (Metro też wymusza ten entry w metro.config.js).
 */
export function createReverbPusher(accessToken = null) {
	const cfg = getReverbConfig();
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
							callback(true, data);
							return;
						}
						callback(false, data);
					})
					.catch((err) => callback(true, err));
			},
		});
	}

	return new Pusher(cfg.key, options);
}

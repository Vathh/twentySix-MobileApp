import Pusher from 'pusher-js/react-native';
import { getReverbConfig } from './apiConfig';

/**
 * Instancja Pusher pod Laravel Reverb w React Native.
 * Wymaga `pusher-js/react-native` (nie domyślny import z 'pusher-js').
 */
export function createReverbPusher(accessToken = null) {
	const cfg = getReverbConfig();
	const options = {
		// Reverb = własny host; pusty cluster — nie łączyć z pusher.com
		cluster: '',
		wsHost: cfg.wsHost,
		wsPort: cfg.wsPort,
		wssPort: cfg.wssPort,
		forceTLS: cfg.forceTLS,
		disableStats: true,
		enabledTransports: cfg.forceTLS ? ['wss'] : ['ws', 'wss'],
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

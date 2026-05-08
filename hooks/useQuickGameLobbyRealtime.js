import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { getReverbConfig } from '../helpers/apiConfig';
import {
	attachPusherReverbDebugLogging,
	logReverbWs,
	normalizePusherPayload,
} from '../helpers/reverbWsLog';

const LOBBY_EVENT = 'lobby.updated';
// Laravel/Echo czasem używa nazwy z kropką na początku — wiążemy obie.
const LOBBY_EVENT_ALT = '.lobby.updated';

function handleLobbyPayload(raw, onLobbyUpdatedRef) {
	const data = normalizePusherPayload(raw);
	const lobby = data?.lobby ?? null;
	if (lobby) {
		onLobbyUpdatedRef.current?.(lobby);
	} else {
		logReverbWs(
			'warn',
			'quick-game-lobby',
			'odebrano event bez pola lobby (sprawdź broadcastWith / parsowanie JSON)',
			data,
		);
	}
}

export function useQuickGameLobbyRealtime({
	lobbyId,
	accessToken,
	enabled,
	onLobbyUpdated,
}) {
	const onLobbyUpdatedRef = useRef(onLobbyUpdated);
	onLobbyUpdatedRef.current = onLobbyUpdated;

	useEffect(() => {
		if (!enabled || !lobbyId || !accessToken) {
			return undefined;
		}

		const cfg = getReverbConfig();
		const pusher = new Pusher(cfg.key, {
			cluster: cfg.cluster,
			wsHost: cfg.wsHost,
			wsPort: cfg.wsPort,
			wssPort: cfg.wssPort,
			forceTLS: cfg.forceTLS,
			disableStats: true,
			enabledTransports: cfg.enabledTransports ?? ['ws', 'wss'],
			authEndpoint: cfg.authEndpoint,
			auth: {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/json',
				},
			},
		});

		const unbindDebug = attachPusherReverbDebugLogging(pusher, {
			scope: 'quick-game-lobby',
			wsHost: cfg.wsHost,
			wsPort: cfg.wsPort,
			forceTLS: cfg.forceTLS,
			authEndpoint: cfg.authEndpoint,
		});

		const channelName = `private-quick-game-lobby.${lobbyId}`;
		const channel = pusher.subscribe(channelName);
		channel.bind('pusher:subscription_succeeded', () => {
			logReverbWs(
				'info',
				'quick-game-lobby',
				`subskrypcja kanału OK: ${channelName}`,
			);
		});
		channel.bind('pusher:subscription_error', (status) => {
			logReverbWs(
				'warn',
				'quick-game-lobby',
				'subscription_error — sprawdź /broadcasting/auth i kanał',
				status,
			);
		});
		const onLobbyEvent = (payload) => handleLobbyPayload(payload, onLobbyUpdatedRef);
		channel.bind(LOBBY_EVENT, onLobbyEvent);
		channel.bind(LOBBY_EVENT_ALT, onLobbyEvent);

		return () => {
			unbindDebug();
			channel.unbind_all();
			pusher.unsubscribe(channelName);
			pusher.disconnect();
		};
	}, [enabled, lobbyId, accessToken]);
}

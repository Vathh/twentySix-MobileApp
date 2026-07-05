import { useEffect, useRef } from 'react';
import { createReverbPusher } from '../helpers/createReverbPusher';
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
	onWsHealthChange,
}) {
	const onLobbyUpdatedRef = useRef(onLobbyUpdated);
	onLobbyUpdatedRef.current = onLobbyUpdated;
	const onWsHealthChangeRef = useRef(onWsHealthChange);
	onWsHealthChangeRef.current = onWsHealthChange;

	useEffect(() => {
		if (!enabled || !lobbyId || !accessToken) {
			onWsHealthChangeRef.current?.(false);
			return undefined;
		}

		let pusher;
		let channel;
		let unbindDebug = () => {};
		const markWsDown = () => onWsHealthChangeRef.current?.(false);

		try {
			const cfg = getReverbConfig();
			pusher = createReverbPusher(accessToken);

			unbindDebug = attachPusherReverbDebugLogging(pusher, {
				scope: 'quick-game-lobby',
				wsHost: cfg.wsHost,
				wsPort: cfg.wsPort,
				forceTLS: cfg.forceTLS,
				authEndpoint: cfg.authEndpoint,
			});

			pusher.connection.bind('connected', () => {
				onWsHealthChangeRef.current?.(true);
			});
			pusher.connection.bind('disconnected', markWsDown);
			pusher.connection.bind('unavailable', markWsDown);
			pusher.connection.bind('failed', markWsDown);
			pusher.connection.bind('error', markWsDown);

			const channelName = `private-quick-game-lobby.${lobbyId}`;
			channel = pusher.subscribe(channelName);
			channel.bind('pusher:subscription_succeeded', () => {
				onWsHealthChangeRef.current?.(true);
				logReverbWs(
					'info',
					'quick-game-lobby',
					`subskrypcja kanału OK: ${channelName}`,
				);
			});
			channel.bind('pusher:subscription_error', (status) => {
				markWsDown();
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
		} catch (err) {
			markWsDown();
			logReverbWs(
				'error',
				'quick-game-lobby',
				'init Pusher/Reverb nieudany — lobby działa przez odświeżanie HTTP',
				err,
			);
			return undefined;
		}

		return () => {
			try {
				markWsDown();
				unbindDebug();
				if (channel) {
					channel.unbind_all();
					const channelName = `private-quick-game-lobby.${lobbyId}`;
					pusher?.unsubscribe(channelName);
				}
				pusher?.disconnect();
			} catch {
				// ignore cleanup errors
			}
		};
	}, [enabled, lobbyId, accessToken]);
}

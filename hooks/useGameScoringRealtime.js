import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { getReverbConfig } from '../helpers/apiConfig';
import {
	attachPusherReverbDebugLogging,
	logReverbWs,
	normalizePusherPayload,
} from '../helpers/reverbWsLog';

const DEFAULT_GAME_EVENTS = ['game.state', '.game.state'];

/**
 * Subskrypcja kanału Reverb/Pusher ze stanem meczu.
 * Obsługuje kanały publiczne (turniej) i prywatne (quick game FFA).
 */
export function useGameScoringRealtime({
	channelName,
	enabled,
	onGameState,
	onWsHealthChange,
	channelType = 'public',
	accessToken = null,
	events = DEFAULT_GAME_EVENTS,
	scope = 'game-scoring',
	unwrapPayload = (data) => data,
}) {
	const onGameStateRef = useRef(onGameState);
	onGameStateRef.current = onGameState;
	const onWsHealthChangeRef = useRef(onWsHealthChange);
	onWsHealthChangeRef.current = onWsHealthChange;

	useEffect(() => {
		if (!enabled || !channelName) {
			onWsHealthChangeRef.current?.(false);
			return undefined;
		}

		let pusher;
		let channel;
		let unbindDebug = () => {};
		const markWsDown = () => onWsHealthChangeRef.current?.(false);

		try {
			const cfg = getReverbConfig();
			const pusherOptions = {
				cluster: cfg.cluster,
				wsHost: cfg.wsHost,
				wsPort: cfg.wsPort,
				wssPort: cfg.wssPort,
				forceTLS: cfg.forceTLS,
				disableStats: true,
				enabledTransports: cfg.forceTLS ? ['wss'] : ['ws'],
			};

			if (channelType === 'private' && accessToken) {
				pusherOptions.authEndpoint = cfg.authEndpoint;
				pusherOptions.auth = {
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/json',
					},
				};
			}

			pusher = new Pusher(cfg.key, pusherOptions);

			unbindDebug = attachPusherReverbDebugLogging(pusher, {
				scope,
				wsHost: cfg.wsHost,
				wsPort: cfg.wsPort,
				forceTLS: cfg.forceTLS,
				authEndpoint:
					channelType === 'private' && accessToken
						? cfg.authEndpoint
						: '(public — brak auth)',
			});

			pusher.connection.bind('disconnected', markWsDown);
			pusher.connection.bind('unavailable', markWsDown);
			pusher.connection.bind('failed', markWsDown);

			channel = pusher.subscribe(channelName);
			channel.bind('pusher:subscription_succeeded', () => {
				onWsHealthChangeRef.current?.(true);
				logReverbWs('info', scope, `subskrypcja OK: ${channelName}`);
			});
			channel.bind('pusher:subscription_error', (status) => {
				console.warn(`[WS/Reverb:${scope}] subscription_error`, status);
				markWsDown();
			});

			const onState = (payload) => {
				const data = normalizePusherPayload(payload);
				const state = unwrapPayload(data);
				if (state) {
					onGameStateRef.current?.(state);
				}
			};

			events.forEach((eventName) => {
				channel.bind(eventName, onState);
			});
		} catch (err) {
			logReverbWs(
				'error',
				scope,
				'init Pusher/Reverb nieudany — fallback HTTP polling',
				err,
			);
			markWsDown();
			return undefined;
		}

		return () => {
			try {
				markWsDown();
				pusher?.connection.unbind('disconnected', markWsDown);
				pusher?.connection.unbind('unavailable', markWsDown);
				pusher?.connection.unbind('failed', markWsDown);
				unbindDebug();
				if (channel) {
					channel.unbind_all();
					pusher?.unsubscribe(channelName);
				}
				pusher?.disconnect();
			} catch {
				// ignore cleanup errors
			}
		};
	}, [
		enabled,
		channelName,
		channelType,
		accessToken,
		events,
		scope,
		unwrapPayload,
	]);
}

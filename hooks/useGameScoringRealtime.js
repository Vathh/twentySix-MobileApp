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

		const cfg = getReverbConfig();
		const pusherOptions = {
			cluster: cfg.cluster,
			wsHost: cfg.wsHost,
			wsPort: cfg.wsPort,
			wssPort: cfg.wssPort,
			forceTLS: cfg.forceTLS,
			disableStats: true,
			enabledTransports: cfg.enabledTransports ?? ['ws', 'wss'],
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

		const pusher = new Pusher(cfg.key, pusherOptions);

		const unbindDebug = attachPusherReverbDebugLogging(pusher, {
			scope,
			wsHost: cfg.wsHost,
			wsPort: cfg.wsPort,
			forceTLS: cfg.forceTLS,
			authEndpoint:
				channelType === 'private' && accessToken
					? cfg.authEndpoint
					: '(public — brak auth)',
		});

		const markWsDown = () => onWsHealthChangeRef.current?.(false);

		pusher.connection.bind('disconnected', markWsDown);
		pusher.connection.bind('unavailable', markWsDown);
		pusher.connection.bind('failed', markWsDown);

		const channel = pusher.subscribe(channelName);
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

		return () => {
			markWsDown();
			pusher.connection.unbind('disconnected', markWsDown);
			pusher.connection.unbind('unavailable', markWsDown);
			pusher.connection.unbind('failed', markWsDown);
			unbindDebug();
			channel.unbind_all();
			pusher.unsubscribe(channelName);
			pusher.disconnect();
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

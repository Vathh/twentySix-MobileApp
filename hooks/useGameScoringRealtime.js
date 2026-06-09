import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { getReverbConfig } from '../helpers/apiConfig';
import {
	attachPusherReverbDebugLogging,
	logReverbWs,
	normalizePusherPayload,
} from '../helpers/reverbWsLog';

const GAME_STATE_EVENT = 'game.state';
const GAME_STATE_EVENT_ALT = '.game.state';

/**
 * Publiczny kanał stanu meczu (quick-game.{id}, group-game.{id}, playoff-game.{id}).
 */
export function useGameScoringRealtime({
	channelName,
	enabled,
	onGameState,
}) {
	const onGameStateRef = useRef(onGameState);
	onGameStateRef.current = onGameState;

	useEffect(() => {
		if (!enabled || !channelName) {
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
		});

		const unbindDebug = attachPusherReverbDebugLogging(pusher, {
			scope: 'game-scoring',
			wsHost: cfg.wsHost,
			wsPort: cfg.wsPort,
		});

		const channel = pusher.subscribe(channelName);
		channel.bind('pusher:subscription_succeeded', () => {
			logReverbWs('info', 'game-scoring', `subskrypcja OK: ${channelName}`);
		});
		channel.bind('pusher:subscription_error', (status) => {
			console.warn('[WS/Reverb:game-scoring] subscription_error', status);
		});

		const onState = (payload) => {
			const data = normalizePusherPayload(payload);
			if (data) {
				onGameStateRef.current?.(data);
			}
		};
		channel.bind(GAME_STATE_EVENT, onState);
		channel.bind(GAME_STATE_EVENT_ALT, onState);

		return () => {
			unbindDebug();
			channel.unbind_all();
			pusher.unsubscribe(channelName);
			pusher.disconnect();
		};
	}, [enabled, channelName]);
}

import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { getReverbConfig } from '../helpers/apiConfig';
import {
	attachPusherReverbDebugLogging,
	logReverbWs,
	normalizePusherPayload,
} from '../helpers/reverbWsLog';

const MATCH_STATE_EVENT = 'match.state';
const MATCH_STATE_EVENT_ALT = '.match.state';

/**
 * Publiczny kanał stanu meczu (quick-game.{id}, group-game.{id}, playoff-game.{id}).
 */
export function useMatchScoringRealtime({
	channelName,
	enabled,
	onMatchState,
}) {
	const onMatchStateRef = useRef(onMatchState);
	onMatchStateRef.current = onMatchState;

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
			scope: 'match-scoring',
			wsHost: cfg.wsHost,
			wsPort: cfg.wsPort,
		});

		const channel = pusher.subscribe(channelName);
		channel.bind('pusher:subscription_succeeded', () => {
			logReverbWs('info', 'match-scoring', `subskrypcja OK: ${channelName}`);
		});
		channel.bind('pusher:subscription_error', (status) => {
			console.warn('[WS/Reverb:match-scoring] subscription_error', status);
		});

		const onState = (payload) => {
			const data = normalizePusherPayload(payload);
			if (data) {
				onMatchStateRef.current?.(data);
			}
		};
		channel.bind(MATCH_STATE_EVENT, onState);
		channel.bind(MATCH_STATE_EVENT_ALT, onState);

		return () => {
			unbindDebug();
			channel.unbind_all();
			pusher.unsubscribe(channelName);
			pusher.disconnect();
		};
	}, [enabled, channelName]);
}

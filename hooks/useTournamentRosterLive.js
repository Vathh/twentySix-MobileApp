import { useEffect, useRef } from 'react';
import { getReverbConfig } from '../helpers/apiConfig';
import { createReverbPusher } from '../helpers/createReverbPusher';
import { attachPusherReverbDebugLogging } from '../helpers/reverbWsLog';

const ROSTER_EVENTS = [
	'join.requests.updated',
	'.join.requests.updated',
	'start.roster.updated',
	'.start.roster.updated',
];

/**
 * Skład i zgłoszenia zaplanowanego turnieju — ten sam kanał co web (`tournament.{id}`).
 */
export function useTournamentRosterLive({ tournamentId, enabled, onReload }) {
	const onReloadRef = useRef(onReload);
	onReloadRef.current = onReload;

	useEffect(() => {
		if (!enabled || tournamentId == null) {
			return undefined;
		}

		let channel;
		let pusher;
		let unbindDebug = () => {};
		const channelName = `tournament.${tournamentId}`;
		const reload = (payload) => {
			onReloadRef.current?.(payload);
		};

		try {
			const cfg = getReverbConfig();
			pusher = createReverbPusher(null);
			unbindDebug = attachPusherReverbDebugLogging(pusher, {
				scope: 'tournament-roster',
				wsHost: cfg.wsHost,
				wsPort: cfg.wsPort,
				forceTLS: cfg.forceTLS,
				authEndpoint: '(public — brak auth)',
			});
			channel = pusher.subscribe(channelName);
			ROSTER_EVENTS.forEach((name) => channel.bind(name, reload));
		} catch (error) {
			console.warn('[tournament-roster] subscribe failed', error);
		}

		return () => {
			try {
				ROSTER_EVENTS.forEach((name) => channel?.unbind(name, reload));
				if (pusher) {
					pusher.unsubscribe(channelName);
				}
				unbindDebug();
				pusher?.disconnect();
			} catch {
				// ignore
			}
		};
	}, [enabled, tournamentId]);
}

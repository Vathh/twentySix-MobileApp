import { useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import { getReverbConfig } from '../helpers/apiConfig';

const SESSION_EVENT = 'session.state';

/**
 * Subskrypcja prywatnego kanału Reverb dla stanu sesji szybkiego meczu.
 * @param {object} opts
 * @param {string|null} opts.sessionId
 * @param {string|null} opts.accessToken Bearer Sanctum
 * @param {boolean} opts.enabled
 * @param {(payload: { state: object }) => void} opts.onSessionState
 * @returns {{ wsConnected: boolean }}
 */
export function useQuickGameSessionRealtime({
	sessionId,
	accessToken,
	enabled,
	onSessionState,
}) {
	const [wsConnected, setWsConnected] = useState(false);
	const onSessionStateRef = useRef(onSessionState);
	onSessionStateRef.current = onSessionState;

	useEffect(() => {
		if (!enabled || !sessionId || !accessToken) {
			setWsConnected(false);
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

		const setConn = (v) => setWsConnected(v);
		pusher.connection.bind('connected', () => setConn(true));
		pusher.connection.bind('disconnected', () => setConn(false));
		pusher.connection.bind('unavailable', () => setConn(false));
		pusher.connection.bind('failed', () => setConn(false));
		pusher.connection.bind('error', () => setConn(false));

		const channelName = `private-quick-game-session.${sessionId}`;
		const channel = pusher.subscribe(channelName);
		channel.bind(SESSION_EVENT, (payload) => {
			if (payload && payload.state) {
				onSessionStateRef.current?.({ state: payload.state });
			}
		});

		return () => {
			channel.unbind_all();
			pusher.unsubscribe(channelName);
			pusher.disconnect();
			setWsConnected(false);
		};
	}, [enabled, sessionId, accessToken]);

	return { wsConnected };
}

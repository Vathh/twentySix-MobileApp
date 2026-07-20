import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { createReverbPusher } from '../helpers/createReverbPusher';
import { getReverbConfig } from '../helpers/apiConfig';
import {
	attachPusherReverbDebugLogging,
	logReverbWs,
	normalizePusherPayload,
} from '../helpers/reverbWsLog';

const FINISHED_EVENTS = ['tournament.finished', '.tournament.finished'];
const promptedTournamentIds = new Set();

/**
 * Subskrypcja zakończenia turnieju — wylogowanie tabletu sędziowskiego.
 */
export function useTournamentFinishedRealtime({
	tournamentId,
	enabled,
	onFinished,
}) {
	const onFinishedRef = useRef(onFinished);
	onFinishedRef.current = onFinished;

	useEffect(() => {
		if (!enabled || tournamentId == null) {
			return undefined;
		}

		const channelName = `tournament.${tournamentId}`;
		let pusher;
		let channel;
		let unbindDebug = () => {};

		try {
			const cfg = getReverbConfig();
			pusher = createReverbPusher(null);
			unbindDebug = attachPusherReverbDebugLogging(pusher, {
				scope: 'tournament-finished',
				wsHost: cfg.wsHost,
				wsPort: cfg.wsPort,
				forceTLS: cfg.forceTLS,
				authEndpoint: '(public — brak auth)',
			});

			channel = pusher.subscribe(channelName);
			channel.bind('pusher:subscription_succeeded', () => {
				logReverbWs('info', 'tournament-finished', `subskrypcja OK: ${channelName}`);
			});

			const handleFinished = (payload) => {
				const data = normalizePusherPayload(payload) ?? {};
				onFinishedRef.current?.(data);
			};

			FINISHED_EVENTS.forEach((eventName) => {
				channel.bind(eventName, handleFinished);
			});
		} catch (e) {
			console.warn('[tournament-finished] subscribe failed', e);
		}

		return () => {
			try {
				FINISHED_EVENTS.forEach((eventName) => {
					channel?.unbind(eventName);
				});
				if (channelName && pusher) {
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

export function promptTournamentFinishedLogout(setAuth, tournamentId, message) {
	const id = Number(tournamentId);
	if (Number.isFinite(id) && promptedTournamentIds.has(id)) {
		setAuth({});
		return;
	}
	if (Number.isFinite(id)) {
		promptedTournamentIds.add(id);
	}

	Alert.alert(
		'Turniej zakończony',
		message || 'Turniej zakończony. Dziękujemy za sędziowanie.',
		[
			{
				text: 'OK',
				onPress: () => setAuth({}),
			},
		],
		{ cancelable: false },
	);
}

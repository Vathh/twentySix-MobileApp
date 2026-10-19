import { useEffect, useRef } from 'react';
import {
	getReverbConfig,
	getTournamentGroupsLiveUrl,
	getTournamentPlayoffLiveUrl,
} from '../helpers/apiConfig';
import { createReverbPusher } from '../helpers/createReverbPusher';
import {
	attachPusherReverbDebugLogging,
	logReverbWs,
	normalizePusherPayload,
} from '../helpers/reverbWsLog';
import {
	applyGroupMatrixEvent,
	applyGroupsSnapshot,
	applyPlayoffGames,
	applyPlayoffSnapshot,
} from '../helpers/tournamentLiveApply';

const GROUP_EVENTS = ['groups.matrix.updated', '.groups.matrix.updated'];
const PLAYOFF_EVENTS = ['playoff.bracket.updated', '.playoff.bracket.updated'];
const FINISHED_EVENTS = ['tournament.finished', '.tournament.finished'];

async function fetchSnapshot(url, accessToken) {
	const res = await fetch(url, {
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
	});
	if (!res.ok) {
		return null;
	}
	return res.json();
}

/**
 * Live tabela grup i drabinki na ekranie turnieju.
 * Ten sam kanał co strona: tournament.{id}.
 */
export function useTournamentCatalogLive({
	tournamentId,
	enabled,
	accessToken,
	setData,
	onReload,
}) {
	const setDataRef = useRef(setData);
	const onReloadRef = useRef(onReload);
	setDataRef.current = setData;
	onReloadRef.current = onReload;

	useEffect(() => {
		if (!enabled || tournamentId == null || !accessToken) {
			return undefined;
		}

		let cancelled = false;
		const channelName = `tournament.${tournamentId}`;
		let pusher;
		let channel;
		let unbindDebug = () => {};
		let pollTimer;

		const publish = (next) => {
			if (cancelled) {
				return;
			}
			if (next == null) {
				onReloadRef.current?.();
				return;
			}
			setDataRef.current?.(next);
		};

		const pull = async () => {
			try {
				const [groups, playoff] = await Promise.all([
					fetchSnapshot(getTournamentGroupsLiveUrl(tournamentId), accessToken),
					fetchSnapshot(getTournamentPlayoffLiveUrl(tournamentId), accessToken),
				]);
				if (cancelled) {
					return;
				}
				let reload = false;
				setDataRef.current?.((current) => {
					let next = current;
					if (groups) {
						const patched = applyGroupsSnapshot(next, groups);
						if (patched == null) {
							reload = true;
							return current;
						}
						next = patched;
					}
					if (playoff) {
						const patched = applyPlayoffSnapshot(next, playoff);
						if (patched == null) {
							reload = true;
							return current;
						}
						next = patched;
					}
					return next;
				});
				if (reload) {
					onReloadRef.current?.();
				}
			} catch {
				// WebSocket zostaje głównym źródłem
			}
		};

		try {
			const cfg = getReverbConfig();
			pusher = createReverbPusher(null);
			unbindDebug = attachPusherReverbDebugLogging(pusher, {
				scope: 'tournament-catalog',
				wsHost: cfg.wsHost,
				wsPort: cfg.wsPort,
				forceTLS: cfg.forceTLS,
				authEndpoint: '(public — brak auth)',
			});
			channel = pusher.subscribe(channelName);
			channel.bind('pusher:subscription_succeeded', () => {
				logReverbWs('info', 'tournament-catalog', `subskrypcja OK: ${channelName}`);
				void pull();
			});

			const onGroup = (payload) => {
				const data = normalizePusherPayload(payload);
				if (!data) {
					return;
				}
				setDataRef.current?.((current) => applyGroupMatrixEvent(current, data));
			};
			const onPlayoff = (payload) => {
				const data = normalizePusherPayload(payload);
				if (!data) {
					return;
				}
				setDataRef.current?.((current) => applyPlayoffGames(current, data.games ?? []));
			};
			const onFinished = () => {
				publish(null);
			};

			GROUP_EVENTS.forEach((name) => channel.bind(name, onGroup));
			PLAYOFF_EVENTS.forEach((name) => channel.bind(name, onPlayoff));
			FINISHED_EVENTS.forEach((name) => channel.bind(name, onFinished));
		} catch (error) {
			console.warn('[tournament-catalog] subscribe failed', error);
		}

		void pull();
		pollTimer = setInterval(() => {
			void pull();
		}, 30000);

		return () => {
			cancelled = true;
			clearInterval(pollTimer);
			try {
				GROUP_EVENTS.forEach((name) => channel?.unbind(name));
				PLAYOFF_EVENTS.forEach((name) => channel?.unbind(name));
				FINISHED_EVENTS.forEach((name) => channel?.unbind(name));
				if (pusher) {
					pusher.unsubscribe(channelName);
				}
				unbindDebug();
				pusher?.disconnect();
			} catch {
				// ignore
			}
		};
	}, [enabled, tournamentId, accessToken]);
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuickGameLobbyRealtime } from './useQuickGameLobbyRealtime';
import { fetchQuickGameLobby } from '../helpers/quickGameLobbyApi';
import { normalizeMatchFormat } from '../helpers/matchFormat/matchFormat';
import {
	loadPersistedMatchFormat,
} from '../helpers/matchFormat/persistMatchFormat';
import { logReverbWs } from '../helpers/reverbWsLog';
import { navigateToGameScoring } from '../helpers/navigateFromGameScoring';

export const QUICK_GAME_GAME_TYPES = { X01: 'x01', CRICKET: 'cricket', BOB27: 'bob27', ATC: 'atc', CATCH40: 'catch40', CRICKET56: 'cricket56' };
export const QUICK_GAME_SCORING_MODES = { ONE_DEVICE: 'one_device', EACH_OWN: 'each_own' };

const LOBBY_POLL_MS = 5000;

function resolveYouAreHost(data, prev, auth) {
	if (typeof data?.youAreHost === 'boolean') {
		return data.youAreHost;
	}
	if (data?.hostId != null && auth?.userId != null) {
		return Number(data.hostId) === Number(auth.userId);
	}
	if (Array.isArray(data?.players) && auth?.playerId != null) {
		return data.players.some(
			(p) => p.isHost && Number(p.playerId) === Number(auth.playerId),
		);
	}
	return prev?.youAreHost ?? false;
}

export function normalizeLobbyGameType(value) {
	const raw = String(value ?? 'x01').toLowerCase();
	if (raw === 'cricket') return 'cricket';
	if (raw === 'bob27') return 'bob27';
	if (raw === 'atc' || raw === 'around_the_clock' || raw === 'clock') return 'atc';
	if (raw === 'catch40' || raw === 'catch_40' || raw === 'catch-40') return 'catch40';
	if (
		raw === 'cricket56'
		|| raw === 'cricket_56'
		|| raw === 'cricket-56'
		|| raw === 'cricket60'
		|| raw === 'cricket_60'
		|| raw === 'cricketsequence'
		|| raw === 'cricket_sequence'
	) return 'cricket56';
	if (raw === '501') return 'x01';
	return 'x01';
}

/**
 * Stan lobby quick game + sync (HTTP fetch, WS realtime, backup poll) i normalizacja
 * payloadu z serwera. Wydzielone z QuickGameLobby — ekran zostaje z akcjami (fetch API)
 * i renderem, bez zmiany zachowania.
 */
export function useQuickGameLobbyState({ route, navigation, auth, defaultMatchFormat }) {
	const [lobby, setLobby] = useState(null);
	const [matchFormat, setMatchFormat] = useState(defaultMatchFormat);
	const [gameType, setGameType] = useState(QUICK_GAME_GAME_TYPES.X01);
	const [scoringMode, setScoringMode] = useState(QUICK_GAME_SCORING_MODES.EACH_OWN);
	const [invitations, setInvitations] = useState([]); // [{ id, name, status: 'sent'|'accepted'|'rejected' }]
	const [orderedPlayers, setOrderedPlayers] = useState([]);
	const [wsLive, setWsLive] = useState(false);
	const hasNavigatedToGameRef = useRef(false);
	const wsLiveRef = useRef(false);
	const hasServerFormatRef = useRef(false);

	const setWsHealth = useCallback((healthy) => {
		wsLiveRef.current = healthy;
		setWsLive(healthy);
	}, []);

	useEffect(() => {
		let cancelled = false;
		loadPersistedMatchFormat('quickGame').then((fmt) => {
			if (cancelled || hasServerFormatRef.current) {
				return;
			}
			setMatchFormat(fmt);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const resolveMyPlayerIndex = useCallback((players, fromApi) => {
		if (fromApi !== undefined && fromApi !== null) return fromApi;
		if (auth?.playerId == null) return null;
		const idx = players.findIndex(
			(p) => p.playerId != null && Number(p.playerId) === Number(auth.playerId),
		);
		return idx >= 0 ? idx : null;
	}, [auth?.playerId]);

	const applyLobbyData = useCallback((data, fallbackLobbyId = null) => {
		if (!data) return;
		if (data.status === 'waiting') {
			hasNavigatedToGameRef.current = false;
		}
		const startedPlayers = Array.isArray(data.players) ? data.players : [];
		if (
			data.status === 'started' &&
			startedPlayers.length >= 2
		) {
			if (hasNavigatedToGameRef.current) return;
			hasNavigatedToGameRef.current = true;
			const players = startedPlayers.map((p) => ({
				id: p.id,
				name: p.name ?? p.tempName ?? 'Gracz',
				playerId: p.playerId ?? p.player_id,
			}));
			const gameTypeToUse = normalizeLobbyGameType(data.gameType ?? data.game_type);
			const format = normalizeMatchFormat({
				...data.matchFormat,
				gameType: gameTypeToUse,
			});
			const scoringModeToUse = data.scoringMode ?? QUICK_GAME_SCORING_MODES.EACH_OWN;
			const isHost = data.youAreHost ?? lobby?.youAreHost ?? false;
			const myPlayerIndex = resolveMyPlayerIndex(players, data.myPlayerIndex);
			setLobby(null);
			navigateToGameScoring(navigation, {
				quickGame: {
					players,
					lobbyId: data.id ?? fallbackLobbyId ?? lobby?.id ?? null,
					matchFormat: format,
					gameType: gameTypeToUse,
					scoringMode: scoringModeToUse,
					isHost,
					myPlayerIndex,
				},
			});
			return;
		}

		setLobby((prev) => ({
			...(prev ?? {}),
			...data,
			youAreHost: resolveYouAreHost(data, prev, auth),
			gameType: normalizeLobbyGameType(data.gameType ?? data.game_type ?? prev?.gameType),
			scoringMode: data.scoringMode ?? prev?.scoringMode ?? QUICK_GAME_SCORING_MODES.EACH_OWN,
		}));
		if (data.matchFormat != null) {
			hasServerFormatRef.current = true;
			setMatchFormat(
				normalizeMatchFormat({
					...data.matchFormat,
					gameType: normalizeLobbyGameType(
						data.gameType ?? data.game_type ?? data.matchFormat.gameType,
					),
				}),
			);
		}
		if (data.scoringMode != null) setScoringMode(data.scoringMode);
		if (data.gameType != null || data.game_type != null) {
			setGameType(normalizeLobbyGameType(data.gameType ?? data.game_type));
		}
		// Bez tablicy players nie ruszaj orderedPlayers (unikaj [] z „pustego” payloadu).
		if (Array.isArray(data.players)) {
			const incoming = data.players.map((p) => ({ ...p, name: p.name ?? p.tempName ?? 'Gracz' }));
			setOrderedPlayers((prev) => {
				const key = (p) => p.id ?? p.playerId ?? p.player_id ?? p.tempName ?? '';
				const incIds = new Set(incoming.map(key));
				const prevIds = new Set(prev.map(key));
				if (prev.length === 0 || incIds.size !== prevIds.size || [...incIds].some((id) => !prevIds.has(id))) {
					return incoming;
				}
				return prev.map((p) => incoming.find((i) => key(i) === key(p)) || p).filter(Boolean);
			});
			// Lokalna lista „Zaproszenia” — usuń wpis gdy gracz już dołączył do lobby (HTTP/WS).
			setInvitations((prev) => {
				if (Array.isArray(data.pendingInvites)) {
					const joinedIds = new Set(
						incoming
							.map((p) => Number(p.playerId ?? p.player_id))
							.filter((id) => Number.isFinite(id)),
					);
					return data.pendingInvites
						.filter((inv) => !joinedIds.has(Number(inv.id)))
						.map((inv) => ({
							id: Number(inv.id),
							name: inv.name ?? 'Gracz',
							status: inv.status ?? 'sent',
						}));
				}
				return prev.filter((inv) => {
					const joined = incoming.some(
						(p) =>
							(inv.id != null &&
								(Number(p.playerId) === Number(inv.id) ||
									Number(p.player_id) === Number(inv.id))) ||
							(inv.name && (p.name ?? p.tempName) === inv.name),
					);
					return !joined;
				});
			});
		}
	}, [auth, lobby?.id, lobby?.youAreHost, navigation, resolveMyPlayerIndex]);

	const fetchLobbyById = useCallback(async (lobbyId) => {
		if (!lobbyId || !auth?.accessToken) return;
		logReverbWs('info', 'lobby-http', 'GET lobby (polling/refresh)', { lobbyId });
		try {
			const { ok, status, data } = await fetchQuickGameLobby(lobbyId, auth.accessToken);
			if (ok) {
				logReverbWs('info', 'lobby-http', `GET lobby ${status}`, {
					lobbyId: data?.id,
					players: data?.players?.length,
				});
				applyLobbyData(data, lobbyId);
			} else {
				logReverbWs('warn', 'lobby-http', `GET lobby HTTP ${status}`);
			}
		} catch (e) {
			logReverbWs('error', 'lobby-http', 'GET lobby błąd', e);
		}
	}, [auth?.accessToken, applyLobbyData]);

	useFocusEffect(
		useCallback(() => {
			const initial = route?.params?.initialLobby;
			if (initial?.id) {
				if (initial.matchFormat != null) {
					hasServerFormatRef.current = true;
				}
				setLobby(initial);
				setMatchFormat(normalizeMatchFormat(initial.matchFormat));
				setGameType(initial.gameType ?? initial.game_type ?? QUICK_GAME_GAME_TYPES.X01);
				setScoringMode(initial.scoringMode ?? QUICK_GAME_SCORING_MODES.EACH_OWN);
				const pl = (initial.players || []).map((p) => ({ ...p, name: p.name ?? p.tempName ?? 'Gracz' }));
				setOrderedPlayers(pl);
				if (Array.isArray(initial.pendingInvites)) {
					setInvitations(initial.pendingInvites.map((inv) => ({
						id: inv.id,
						name: inv.name ?? 'Gracz',
						status: inv.status ?? 'sent',
					})));
				}
				navigation.setParams({ initialLobby: undefined });
			} else if (lobby?.id) {
				fetchLobbyById(lobby.id);
			}
			return () => {};
		}, [lobby?.id, fetchLobbyById, route?.params?.initialLobby, navigation])
	);

	useQuickGameLobbyRealtime({
		lobbyId: lobby?.id ?? null,
		accessToken: auth?.accessToken ?? null,
		enabled: !!lobby?.id && !!auth?.accessToken,
		onLobbyUpdated: applyLobbyData,
		onWsHealthChange: setWsHealth,
	});

	useEffect(() => {
		if (!lobby?.id || !auth?.accessToken || wsLive) {
			return undefined;
		}
		if ((lobby.status ?? 'waiting') === 'started') {
			return undefined;
		}
		const t = setInterval(() => {
			if (wsLiveRef.current) {
				return;
			}
			fetchLobbyById(lobby.id);
		}, LOBBY_POLL_MS);
		return () => clearInterval(t);
	}, [lobby?.id, lobby?.status, auth?.accessToken, fetchLobbyById, wsLive]);

	return {
		lobby,
		setLobby,
		matchFormat,
		setMatchFormat,
		gameType,
		setGameType,
		scoringMode,
		setScoringMode,
		invitations,
		setInvitations,
		orderedPlayers,
		setOrderedPlayers,
		wsLive,
		applyLobbyData,
		fetchLobbyById,
	};
}

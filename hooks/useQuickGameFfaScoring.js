import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import Pusher from 'pusher-js';
import { getReverbConfig } from '../helpers/apiConfig';
import { applyFfaScoringState } from '../helpers/applyFfaScoringState';
import {
	fetchFfaScoringState,
	newFfaClientVisitId,
	recordFfaVisit,
	undoFfaVisit,
} from '../helpers/quickGameFfaApi';
import {
	attachPusherReverbDebugLogging,
	logReverbWs,
	normalizePusherPayload,
} from '../helpers/reverbWsLog';

const FFA_STATE_EVENT = 'ffa.state.updated';
const FFA_STATE_EVENT_ALT = '.ffa.state.updated';
const BACKUP_POLL_MS = 2500;

/**
 * Synchronizacja quick game FFA (N=2..8) przez lobby API + WS.
 */
export function useQuickGameFfaScoring({
	enabled,
	lobbyId,
	accessToken,
	players,
	N,
	playerDispatches,
	playerStates,
	currentPlayerIndexRef,
	setCurrentPlayerIndex,
	setGameClosed,
	gameClosed,
	lobbyScoringMode,
	isHost,
	myPlayerIndexFromLobby,
	legOpenerIndexRef,
	onFinishedQuickGameId,
}) {
	const lastStateKeyRef = useRef('');
	const lastLegNumberRef = useRef(null);
	const finishedQuickGameIdRef = useRef(null);
	const applyStateRef = useRef(null);
	const wsHealthyRef = useRef(false);
	const [wsHealthy, setWsHealthy] = useState(false);

	const setWsHealth = useCallback((healthy) => {
		wsHealthyRef.current = healthy;
		setWsHealthy(healthy);
	}, []);

	const applyState = useCallback(
		(state) => {
			const result = applyFfaScoringState(state, {
				players,
				N,
				dispatches: playerDispatches,
				currentPlayerIndexRef,
				setCurrentPlayerIndex,
				setGameClosed,
				lastStateKeyRef,
				legOpenerIndexRef,
				lastLegNumberRef,
				onFinishedQuickGameId: (id) => {
					if (id) {
						finishedQuickGameIdRef.current = id;
					}
					onFinishedQuickGameId?.(id);
				},
			});
			return state;
		},
		[
			players,
			N,
			playerDispatches,
			currentPlayerIndexRef,
			setCurrentPlayerIndex,
			setGameClosed,
			legOpenerIndexRef,
			onFinishedQuickGameId,
		],
	);

	applyStateRef.current = applyState;

	const loadState = useCallback(async () => {
		if (!enabled || !lobbyId || !accessToken) {
			return null;
		}
		try {
			const state = await fetchFfaScoringState(lobbyId, accessToken);
			applyStateRef.current?.(state);
			return state;
		} catch (e) {
			console.warn('loadFfaScoringState', e);
			return null;
		}
	}, [enabled, lobbyId, accessToken]);

	useEffect(() => {
		if (!enabled || gameClosed || !lobbyId || !accessToken || wsHealthy) {
			return undefined;
		}
		let cancelled = false;
		const tick = async () => {
			if (cancelled || wsHealthyRef.current) return;
			await loadState();
		};
		void tick();
		const t = setInterval(tick, BACKUP_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(t);
		};
	}, [enabled, gameClosed, lobbyId, accessToken, loadState, wsHealthy]);

	useEffect(() => {
		if (!enabled || !lobbyId || !accessToken || gameClosed) {
			setWsHealth(false);
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

		const unbindDebug = attachPusherReverbDebugLogging(pusher, {
			scope: 'quick-game-ffa',
			wsHost: cfg.wsHost,
			wsPort: cfg.wsPort,
		});

		const channelName = `private-quick-game-lobby.${lobbyId}`;
		const channel = pusher.subscribe(channelName);

		const markWsDown = () => setWsHealth(false);

		pusher.connection.bind('disconnected', markWsDown);
		pusher.connection.bind('unavailable', markWsDown);
		pusher.connection.bind('failed', markWsDown);

		channel.bind('pusher:subscription_succeeded', () => {
			setWsHealth(true);
			logReverbWs('info', 'quick-game-ffa', `subskrypcja OK: ${channelName}`);
		});
		channel.bind('pusher:subscription_error', markWsDown);

		const onFfaState = (payload) => {
			const data = normalizePusherPayload(payload);
			const state = data?.state ?? data;
			if (state?.session) {
				applyStateRef.current?.(state);
			}
		};
		channel.bind(FFA_STATE_EVENT, onFfaState);
		channel.bind(FFA_STATE_EVENT_ALT, onFfaState);

		return () => {
			setWsHealth(false);
			pusher.connection.unbind('disconnected', markWsDown);
			pusher.connection.unbind('unavailable', markWsDown);
			pusher.connection.unbind('failed', markWsDown);
			unbindDebug();
			channel.unbind_all();
			pusher.unsubscribe(channelName);
			pusher.disconnect();
		};
	}, [enabled, lobbyId, accessToken, gameClosed, setWsHealth]);

	const assertCanInput = useCallback(
		(playerIndex) => {
			if (lobbyScoringMode === 'one_device' && !isHost) {
				Alert.alert(
					'Info',
					'W trybie „jedno urządzenie” punkty wpisuje tylko host.',
				);
				return false;
			}
			if (
				lobbyScoringMode === 'each_own' &&
				myPlayerIndexFromLobby !== null &&
				myPlayerIndexFromLobby !== playerIndex
			) {
				Alert.alert(
					'Info',
					'Teraz rzuca inny gracz — wpisz wizytę na urządzeniu rzucającego.',
				);
				return false;
			}
			return true;
		},
		[lobbyScoringMode, isHost, myPlayerIndexFromLobby],
	);

	const submitVisit = useCallback(
		async ({
			playerIndex,
			visitScore,
			bust = false,
			dartsInVisit = 3,
			closedLeg = false,
			remainingBefore = null,
			clientVisitId = null,
		}) => {
			if (!enabled || !lobbyId || !accessToken) {
				return null;
			}
			if (!assertCanInput(playerIndex)) {
				return null;
			}
			const player = players[playerIndex];
			if (!player?.playerId) {
				return null;
			}
			try {
				const baseline = remainingBefore ?? playerStates[playerIndex]?.score ?? 501;
				const remainingAfter = bust
					? baseline
					: Math.max(0, baseline - visitScore);
				const state = await recordFfaVisit(lobbyId, accessToken, {
					playerId: player.playerId,
					score: bust ? 0 : visitScore,
					remainingBefore: baseline,
					remainingAfter: closedLeg ? 0 : remainingAfter,
					dartsInVisit,
					closedLeg,
					bust,
					clientVisitId: clientVisitId ?? newFfaClientVisitId(),
				});
				applyStateRef.current?.(state);
				return state;
			} catch (e) {
				Alert.alert('Błąd', e.message || 'Nie udało się zapisać wizyty');
				return null;
			}
		},
		[
			enabled,
			lobbyId,
			accessToken,
			players,
			playerStates,
			assertCanInput,
		],
	);

	const closeLegWithWinner = useCallback(
		async (playerIndex, visitScore, checkoutDart = 3, options = {}) => {
			return submitVisit({
				playerIndex,
				visitScore,
				bust: false,
				dartsInVisit: checkoutDart,
				closedLeg: true,
				remainingBefore: options.remainingBefore ?? null,
				clientVisitId: options.clientVisitId ?? null,
			});
		},
		[submitVisit],
	);

	const undoVisit = useCallback(async () => {
		if (!enabled || !lobbyId || !accessToken) {
			return null;
		}
		if (lobbyScoringMode === 'one_device' && !isHost) {
			Alert.alert('Info', 'W trybie „jedno urządzenie” cofa tylko host.');
			return null;
		}
		try {
			const state = await undoFfaVisit(lobbyId, accessToken);
			applyStateRef.current?.(state);
			return state;
		} catch (e) {
			Alert.alert('Błąd', e.message || 'Nie udało się cofnąć wizyty');
			return null;
		}
	}, [enabled, lobbyId, accessToken, lobbyScoringMode, isHost]);

	return {
		submitVisit,
		closeLegWithWinner,
		undoVisit,
		finishedQuickGameIdRef,
	};
}

import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
	getMatchScoringChannelName,
	getQuickGameScoringBaseUrl,
} from '../helpers/apiConfig';
import { applyMatchScoringState } from '../helpers/applyMatchScoringState';
import {
	closeMatchLeg,
	fetchMatchScoringState,
	newClientVisitId,
	recordMatchVisit,
	startMatchLeg,
	undoMatchVisit,
} from '../helpers/matchScoringApi';
import { useMatchScoringRealtime } from './useMatchScoringRealtime';

const BACKUP_POLL_MS = 2500;

/**
 * Synchronizacja szybkiego meczu przez API wizyt (quick-games/{id}/...).
 */
export function useQuickGameMatchScoring({
	enabled,
	quickGameId,
	accessToken,
	players,
	N,
	playerDispatches,
	playerStates,
	currentPlayerIndexRef,
	setCurrentPlayerIndex,
	setMatchClosed,
	matchClosed,
	isPerDartMode,
	lobbyScoringMode,
	isHost,
	myPlayerIndexFromLobby,
}) {
	const baseUrl = quickGameId ? getQuickGameScoringBaseUrl(quickGameId) : null;
	const currentLegIdRef = useRef(null);
	const lastStateKeyRef = useRef('');
	const ensureLegPromiseRef = useRef(null);

	const applyState = useCallback(
		(state) => {
			const result = applyMatchScoringState(state, {
				players,
				N,
				dispatches: playerDispatches,
				currentPlayerIndexRef,
				setCurrentPlayerIndex,
				setMatchClosed,
				lastStateKeyRef,
			});
			currentLegIdRef.current = result.currentLegId;
			return state;
		},
		[
			players,
			N,
			playerDispatches,
			currentPlayerIndexRef,
			setCurrentPlayerIndex,
			setMatchClosed,
		],
	);

	const loadState = useCallback(async () => {
		if (!enabled || !baseUrl || !accessToken) {
			return null;
		}
		try {
			const state = await fetchMatchScoringState(baseUrl, accessToken);
			applyState(state);
			return state;
		} catch (e) {
			console.warn('loadMatchScoringState', e);
			return null;
		}
	}, [enabled, baseUrl, accessToken, applyState]);

	const ensureLegStarted = useCallback(async () => {
		if (!enabled || !baseUrl || !accessToken) {
			return null;
		}
		if (currentLegIdRef.current) {
			return currentLegIdRef.current;
		}
		if (ensureLegPromiseRef.current) {
			return ensureLegPromiseRef.current;
		}
		ensureLegPromiseRef.current = (async () => {
			try {
				let state = await fetchMatchScoringState(baseUrl, accessToken);
				if (state.currentLeg?.id) {
					currentLegIdRef.current = state.currentLeg.id;
					applyState(state);
					return currentLegIdRef.current;
				}
				const tracked = !!isPerDartMode;
				try {
					state = await startMatchLeg(baseUrl, accessToken, tracked, tracked);
				} catch (startErr) {
					const msg = startErr?.message ?? '';
					if (msg.includes('otwarty leg') || msg.includes('już otwarty')) {
						state = await fetchMatchScoringState(baseUrl, accessToken);
					} else {
						throw startErr;
					}
				}
				applyState(state);
				currentLegIdRef.current = state.currentLeg?.id ?? null;
				return currentLegIdRef.current;
			} finally {
				ensureLegPromiseRef.current = null;
			}
		})();
		return ensureLegPromiseRef.current;
	}, [enabled, baseUrl, accessToken, isPerDartMode, applyState]);

	useEffect(() => {
		if (!enabled || matchClosed) {
			return undefined;
		}
		loadState();
		return undefined;
	}, [enabled, quickGameId, matchClosed, loadState]);

	useEffect(() => {
		if (!enabled || matchClosed || !baseUrl || !accessToken) {
			return undefined;
		}
		let cancelled = false;
		const tick = async () => {
			if (cancelled) return;
			await loadState();
		};
		const t = setInterval(tick, BACKUP_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(t);
		};
	}, [enabled, matchClosed, baseUrl, accessToken, loadState]);

	useMatchScoringRealtime({
		channelName:
			enabled && quickGameId
				? getMatchScoringChannelName('quick', quickGameId)
				: null,
		enabled: enabled && !matchClosed,
		onMatchState: applyState,
	});

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
					'Teraz rzuca drugi gracz — wpisz wizytę na urządzeniu rzucającego.',
				);
				return false;
			}
			return true;
		},
		[lobbyScoringMode, isHost, myPlayerIndexFromLobby],
	);

	const buildCloseLegPlayers = useCallback(
		(winnerPlayerId, checkoutDart) => {
			const tracked = !!isPerDartMode;
			return players.slice(0, N).map((p) => {
				const idx = players.indexOf(p);
				const st = playerStates[idx];
				const scores = st?.currentLegScores ?? [];
				const highestVisit =
					scores.length > 0 ? Math.max(...scores, 0) : null;
				const isWinner = p.playerId === winnerPlayerId;
				return {
					playerId: p.playerId,
					doubleTracked: tracked,
					doubleAttempts: tracked ? null : null,
					doubleSuccesses: tracked ? null : null,
					legAverage: st?.currentLegAverage
						? parseFloat(st.currentLegAverage)
						: null,
					firstNineAverage: null,
					highestVisit,
					highestFinish: isWinner ? highestVisit : null,
					dartsThrown: st?.dartsThrown ?? null,
					checkoutDart: isWinner ? checkoutDart : null,
				};
			});
		},
		[players, N, playerStates, isPerDartMode],
	);

	const submitVisit = useCallback(
		async ({
			playerIndex,
			visitScore,
			bust = false,
			dartsInVisit = 3,
			closedLeg = false,
		}) => {
			if (!enabled || !baseUrl || !accessToken) {
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
				const legId = await ensureLegStarted();
				if (!legId) {
					throw new Error('Brak otwartego lega');
				}
				const remainingBefore = playerStates[playerIndex]?.score ?? 501;
				const remainingAfter = bust
					? remainingBefore
					: Math.max(0, remainingBefore - visitScore);
				const state = await recordMatchVisit(baseUrl, legId, accessToken, {
					playerId: player.playerId,
					score: bust ? 0 : visitScore,
					remainingBefore,
					remainingAfter,
					dartsInVisit,
					closedLeg,
					bust,
					clientVisitId: newClientVisitId(),
				});
				applyState(state);
				return state;
			} catch (e) {
				Alert.alert('Błąd', e.message || 'Nie udało się zapisać wizyty');
				return null;
			}
		},
		[
			enabled,
			baseUrl,
			accessToken,
			players,
			playerStates,
			assertCanInput,
			ensureLegStarted,
			applyState,
		],
	);

	const closeLegWithWinner = useCallback(
		async (playerIndex, visitScore, checkoutDart = 3) => {
			if (!enabled || !baseUrl || !accessToken) {
				return null;
			}
			const player = players[playerIndex];
			if (!player?.playerId) {
				return null;
			}
			try {
				const legId = await ensureLegStarted();
				if (!legId) {
					throw new Error('Brak otwartego lega');
				}
				const remainingBefore = playerStates[playerIndex]?.score ?? 501;
				await recordMatchVisit(baseUrl, legId, accessToken, {
					playerId: player.playerId,
					score: visitScore,
					remainingBefore,
					remainingAfter: 0,
					dartsInVisit: checkoutDart,
					closedLeg: true,
					bust: false,
					clientVisitId: newClientVisitId(),
				});
				const state = await closeMatchLeg(baseUrl, legId, accessToken, {
					winnerId: player.playerId,
					players: buildCloseLegPlayers(player.playerId, checkoutDart),
				});
				currentLegIdRef.current = null;
				applyState(state);
				return state;
			} catch (e) {
				Alert.alert('Błąd', e.message || 'Nie udało się zamknąć lega');
				return null;
			}
		},
		[
			enabled,
			baseUrl,
			accessToken,
			players,
			playerStates,
			ensureLegStarted,
			buildCloseLegPlayers,
			applyState,
		],
	);

	const undoVisit = useCallback(async () => {
		if (!enabled || !baseUrl || !accessToken) {
			return null;
		}
		const legId = currentLegIdRef.current;
		if (!legId) {
			Alert.alert('Info', 'Brak aktywnego lega.');
			return null;
		}
		try {
			const state = await undoMatchVisit(baseUrl, legId, accessToken);
			applyState(state);
			return state;
		} catch (e) {
			Alert.alert('Błąd', e.message || 'Nie udało się cofnąć wizyty');
			return null;
		}
	}, [enabled, baseUrl, accessToken, applyState]);

	return {
		submitVisit,
		closeLegWithWinner,
		undoVisit,
		ensureLegStarted,
	};
}

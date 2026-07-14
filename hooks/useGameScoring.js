import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
	applyGameScoringState,
	computeStateRevision,
	isNormalizedScoringState,
	normalizeScoringState,
} from '../helpers/gameScoring/index.js';
import {
	CLOSED_LEG_UNDO_MESSAGE,
	CLOSED_LEG_UNDO_TITLE,
	resolveUndoLegId,
	wouldUndoClosedLeg,
} from '../helpers/gameScoring/undoVisit.js';
import { useGameScoringRealtime } from './useGameScoringRealtime';

const BACKUP_POLL_MS = 2500;

/**
 * Wspólny hook synchronizacji rozgrywki (turniej H2H, quick FFA, trening local).
 */
export function useGameScoring({
	enabled,
	transport,
	players,
	N,
	playerDispatches,
	playerStates,
	currentPlayerIndexRef,
	setCurrentPlayerIndex,
	setGameClosed,
	gameClosed,
	isPerDartMode = false,
	useLegOpenerRotation = false,
	legOpenerIndexRef,
	onFinishedQuickGameId,
	reloadKey = null,
	onStateLoaded = null,
}) {
	const currentLegIdRef = useRef(null);
	const lastStateKeyRef = useRef('');
	const lastLegNumberRef = useRef(null);
	const ensureLegPromiseRef = useRef(null);
	const lastPlayerSnapRef = useRef({});
	const lastRevisionRef = useRef(-1);
	const pendingWritesRef = useRef(0);
	const visitChainRef = useRef(Promise.resolve());
	const finishedQuickGameIdRef = useRef(null);
	const lastSyncStateRef = useRef(null);
	const wsHealthyRef = useRef(false);
	const [wsHealthy, setWsHealthy] = useState(false);
	const [ffaPresence, setFfaPresence] = useState(null);

	/** Aktualne propsy scoringu — unikamy nowej referencji loadState co render (np. playerDispatches.slice). */
	const scoringSyncRef = useRef({});
	scoringSyncRef.current = {
		players,
		N,
		playerDispatches,
		playerStates,
		enabled,
		transport,
		isPerDartMode,
		onFinishedQuickGameId,
	};

	const realtimeConfig = useMemo(
		() => transport?.getRealtimeConfig?.() ?? null,
		[transport],
	);

	const setWsHealth = useCallback((healthy) => {
		wsHealthyRef.current = healthy;
		setWsHealthy(healthy);
	}, []);

	const applyStateInternal = useCallback(
		(state) => {
			const sync = scoringSyncRef.current;
			const h2h = sync.transport?.format === 'h2h';
			if (state) {
				const normalized = isNormalizedScoringState(state)
					? state
					: normalizeScoringState(state, sync.players);
				lastSyncStateRef.current = {
					currentLeg: normalized?.currentLeg ?? null,
					visits: normalized?.visits ?? [],
					legs: Array.isArray(state.legs) ? state.legs : [],
					turn: normalized?.turn ?? null,
				};
			}
			const result = applyGameScoringState(state, {
				players: sync.players,
				N: sync.N,
				dispatches: sync.playerDispatches,
				currentPlayerIndexRef,
				setCurrentPlayerIndex,
				setGameClosed,
				lastStateKeyRef,
				legOpenerIndexRef,
				lastLegNumberRef,
				useLegOpenerRotation: h2h && useLegOpenerRotation,
				lastPlayerSnapRef: h2h ? lastPlayerSnapRef : undefined,
				onFinishedQuickGameId: (id) => {
					if (id) {
						finishedQuickGameIdRef.current = id;
					}
					sync.onFinishedQuickGameId?.(id);
				},
			});
			if (h2h) {
				currentLegIdRef.current = result.currentLegId;
			}
			return result;
		},
		[
			currentPlayerIndexRef,
			setCurrentPlayerIndex,
			setGameClosed,
			legOpenerIndexRef,
			useLegOpenerRotation,
		],
	);

	const applyStateSafe = useCallback(
		(state, source = 'external') => {
			if (!state) {
				return false;
			}

			if (Array.isArray(state.presence)) {
				setFfaPresence(state.presence);
			}

			const revision = computeStateRevision(state);

			if (source === 'external') {
				if (pendingWritesRef.current > 0) {
					return false;
				}
				if (revision <= lastRevisionRef.current) {
					return false;
				}
			} else {
				// Własna odpowiedź API — zawsze stosuj (kolejka wizyt); revision tylko nie maleje.
				lastRevisionRef.current = Math.max(lastRevisionRef.current, revision);
				applyStateInternal(state);
				return true;
			}

			lastRevisionRef.current = revision;
			applyStateInternal(state);
			return true;
		},
		[applyStateInternal],
	);

	const runSerialized = useCallback((task) => {
		const next = visitChainRef.current.then(() => task());
		visitChainRef.current = next.catch(() => {});
		return next;
	}, []);

	const applyStateSafeRef = useRef(applyStateSafe);
	applyStateSafeRef.current = applyStateSafe;

	const onStateLoadedRef = useRef(onStateLoaded);
	onStateLoadedRef.current = onStateLoaded;

	const loadState = useCallback(async () => {
		const { enabled: syncEnabled, transport: syncTransport } =
			scoringSyncRef.current;
		if (!syncEnabled || !syncTransport?.fetchState) {
			return null;
		}
		try {
			const state = await syncTransport.fetchState();
			applyStateSafeRef.current(state, 'external');
			onStateLoadedRef.current?.(state);
			return state;
		} catch (e) {
			console.warn('loadGameScoringState', e);
			return null;
		}
	}, []);

	const loadStateRef = useRef(loadState);
	loadStateRef.current = loadState;

	const ensureLegStarted = useCallback(async () => {
		if (!enabled || !transport?.startLeg) {
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
				let state = await transport.fetchState();
				if (state.currentLeg?.id) {
					currentLegIdRef.current = state.currentLeg.id;
					applyStateSafe(state, 'submit');
					return currentLegIdRef.current;
				}
				const tracked = !!isPerDartMode;
				try {
					state = await transport.startLeg({ tracked });
				} catch (startErr) {
					const msg = startErr?.message ?? '';
					if (msg.includes('otwarty leg') || msg.includes('już otwarty')) {
						state = await transport.fetchState();
					} else {
						throw startErr;
					}
				}
				applyStateSafe(state, 'submit');
				currentLegIdRef.current = state.currentLeg?.id ?? null;
				return currentLegIdRef.current;
			} finally {
				ensureLegPromiseRef.current = null;
			}
		})();
		return ensureLegPromiseRef.current;
	}, [enabled, transport, isPerDartMode, applyStateSafe]);

	useEffect(() => {
		if (!enabled || gameClosed) {
			return undefined;
		}
		void loadStateRef.current();
		return undefined;
	}, [enabled, gameClosed, reloadKey]);

	useEffect(() => {
		if (!enabled || gameClosed || !transport || wsHealthy) {
			return undefined;
		}
		let cancelled = false;
		const tick = async () => {
			if (cancelled || wsHealthyRef.current) return;
			await loadStateRef.current();
		};
		void tick();
		const t = setInterval(tick, BACKUP_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(t);
		};
	}, [enabled, gameClosed, transport, wsHealthy]);

	useGameScoringRealtime({
		channelName: realtimeConfig?.channelName ?? null,
		enabled: enabled && !gameClosed && !!realtimeConfig,
		channelType: realtimeConfig?.channelType ?? 'public',
		accessToken: realtimeConfig?.accessToken ?? null,
		events: realtimeConfig?.events,
		scope: realtimeConfig?.scope ?? 'game-scoring',
		unwrapPayload: realtimeConfig?.unwrapPayload,
		onGameState: (state) => applyStateSafeRef.current(state, 'external'),
		onWsHealthChange: setWsHealth,
	});

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
		(params) =>
			runSerialized(async () => {
				const {
					playerIndex,
					visitScore,
					bust = false,
					dartsInVisit = 3,
					closedLeg = false,
					clientVisitId,
					remainingBefore: remainingBeforeOverride,
				} = params;

				if (!enabled || !transport?.recordVisit) {
					return null;
				}
				if (!transport.assertCanInput(playerIndex)) {
					return null;
				}
				const player = players[playerIndex];
				if (!player?.playerId) {
					return null;
				}

				pendingWritesRef.current += 1;
				try {
					const liveStates = scoringSyncRef.current.playerStates;
					const remainingBefore =
						remainingBeforeOverride ??
						liveStates[playerIndex]?.score ??
						501;
					const remainingAfter = bust
						? remainingBefore
						: Math.max(0, remainingBefore - visitScore);

					const payload = {
						playerId: player.playerId,
						score: bust ? 0 : visitScore,
						remainingBefore,
						remainingAfter: closedLeg ? 0 : remainingAfter,
						dartsInVisit,
						closedLeg,
						bust,
						clientVisitId:
							clientVisitId ?? transport.newClientVisitId(),
					};

					let legId = null;
					if (transport.requiresLegId) {
						legId = await ensureLegStarted();
						if (!legId) {
							throw new Error('Brak otwartego lega');
						}
					}

					const state = await transport.recordVisit(legId, payload);

					applyStateSafe(state, 'submit');
					return state;
				} catch (e) {
					Alert.alert('Błąd', e.message || 'Nie udało się zapisać wizyty');
					return null;
				} finally {
					pendingWritesRef.current -= 1;
				}
			}),
		[
			runSerialized,
			enabled,
			transport,
			players,
			playerStates,
			ensureLegStarted,
			applyStateSafe,
		],
	);

	const closeLegWithWinner = useCallback(
		(playerIndex, visitScore, checkoutDart = 3, visitOpts = {}) => {
			if (transport?.closeLeg && transport.requiresLegId) {
				return runSerialized(async () => {
					if (!enabled || !transport) {
						return null;
					}
					const player = players[playerIndex];
					if (!player?.playerId) {
						return null;
					}

					pendingWritesRef.current += 1;
					try {
						let legId = visitOpts.legId ?? null;

						if (legId != null && transport.fetchState) {
							const snapshot = await transport.fetchState();
							const openLegId = snapshot?.currentLeg?.id ?? null;
							if (openLegId !== legId) {
								return snapshot;
							}
							currentLegIdRef.current = legId;
						} else {
							legId = await ensureLegStarted();
						}

						if (!legId) {
							throw new Error('Brak otwartego lega');
						}
						const remainingBefore =
							visitOpts.remainingBefore ??
							playerStates[playerIndex]?.score ??
							501;
						await transport.recordVisit(legId, {
							playerId: player.playerId,
							score: visitScore,
							remainingBefore,
							remainingAfter: 0,
							dartsInVisit: checkoutDart,
							closedLeg: true,
							bust: false,
							clientVisitId:
								visitOpts.clientVisitId ??
								transport.newClientVisitId(),
						});
						const state = await transport.closeLeg(legId, {
							winnerId: player.playerId,
							players: buildCloseLegPlayers(
								player.playerId,
								checkoutDart,
							),
						});
						const applied = applyStateSafe(state, 'submit');
						const matchFinished =
							state?.game?.status === 'finished' ||
							state?.meta?.status === 'finished';

						if (matchFinished) {
							if (!applied) {
								lastRevisionRef.current = Math.max(
									lastRevisionRef.current,
									computeStateRevision(state),
								);
								applyStateInternal(state);
							}
							setGameClosed(true);
						}

						const legClosed =
							state?.currentLeg == null ||
							state?.currentLeg?.open === false;
						if (legClosed) {
							currentLegIdRef.current = null;
						}

						if (
							transport.format === 'h2h' &&
							!matchFinished &&
							legClosed
						) {
							await ensureLegStarted();
						}
						return state;
					} catch (e) {
						Alert.alert(
							'Błąd',
							e.message || 'Nie udało się zamknąć lega',
						);
						return null;
					} finally {
						pendingWritesRef.current -= 1;
					}
				});
			}

			return submitVisit({
				playerIndex,
				visitScore,
				bust: false,
				dartsInVisit: checkoutDart,
				closedLeg: true,
				remainingBefore: visitOpts.remainingBefore ?? null,
				clientVisitId: visitOpts.clientVisitId ?? null,
			});
		},
		[
			transport,
			runSerialized,
			enabled,
			players,
			playerStates,
			ensureLegStarted,
			buildCloseLegPlayers,
			applyStateSafe,
			applyStateInternal,
			setGameClosed,
		],
	);

	const undoVisit = useCallback(
		() =>
			runSerialized(async () => {
				if (!enabled || !transport?.undoVisit) {
					return null;
				}
				if (!transport.assertCanUndo()) {
					return null;
				}

				const syncState = lastSyncStateRef.current;
				const needsClosedLegConfirm = wouldUndoClosedLeg(syncState);

				const performUndo = async () => {
					const legId = transport.requiresLegId
						? resolveUndoLegId(syncState, currentLegIdRef.current)
						: null;
					if (transport.requiresLegId && !legId) {
						Alert.alert('Info', 'Brak lega do cofnięcia.');
						return null;
					}

					pendingWritesRef.current += 1;
					try {
						const state = await transport.undoVisit(legId);
						applyStateSafe(state, 'submit');
						return state;
					} catch (e) {
						Alert.alert('Błąd', e.message || 'Nie udało się cofnąć wizyty');
						return null;
					} finally {
						pendingWritesRef.current -= 1;
					}
				};

				if (!needsClosedLegConfirm) {
					return performUndo();
				}

				return new Promise((resolve) => {
					Alert.alert(CLOSED_LEG_UNDO_TITLE, CLOSED_LEG_UNDO_MESSAGE, [
						{ text: 'Anuluj', style: 'cancel', onPress: () => resolve(null) },
						{
							text: 'Cofnij leg',
							style: 'destructive',
							onPress: () => {
								void performUndo().then(resolve);
							},
						},
					]);
				});
			}),
		[runSerialized, enabled, transport, applyStateSafe],
	);

	return {
		submitVisit,
		closeLegWithWinner,
		undoVisit,
		ensureLegStarted,
		getOpenLegId: () => currentLegIdRef.current,
		finishedQuickGameIdRef,
		ffaPresence,
	};
}

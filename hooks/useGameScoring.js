import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useConfirm } from '../context/ConfirmProvider';
import {
	applyGameScoringState,
	computeStateRevision,
	isNormalizedScoringState,
	normalizeScoringState,
} from '../helpers/gameScoring/index.js';
import { consumeFfaAbortPayload } from '../helpers/gameScoring/ffaClosedStatus.js';
import { announceRemoteVisit } from '../helpers/gameScoring/announceRemoteVisit.js';
import {
	clearOutbox,
	dequeueOutbox,
	enqueueOutbox,
	loadOutbox,
} from '../helpers/gameScoring/scoringOutbox.js';
import { isRetryableScoringError } from '../helpers/gameScoring/scoringRequestError.js';
import {
	CLOSED_LEG_UNDO_MESSAGE,
	CLOSED_LEG_UNDO_TITLE,
	resolveUndoLegId,
	wouldUndoClosedLeg,
} from '../helpers/gameScoring/undoVisit.js';
import { useGameScoringRealtime } from './useGameScoringRealtime';

const BACKUP_POLL_MS = 2500;

function isMatchFinishedState(state) {
	return (
		state?.game?.status === 'finished' ||
		state?.meta?.status === 'finished' ||
		state?.session?.status === 'finished'
	);
}

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
	onMatchFormat = null,
	getCloseLegDoubleStats = null,
	onAborted = null,
}) {
	const confirm = useConfirm();
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
	const abortedRef = useRef(false);
	const wsHealthyRef = useRef(false);
	const flushInFlightRef = useRef(false);
	const [wsHealthy, setWsHealthy] = useState(false);
	const [ffaPresence, setFfaPresence] = useState(null);
	const [syncPending, setSyncPending] = useState(false);
	const getCloseLegDoubleStatsRef = useRef(getCloseLegDoubleStats);
	getCloseLegDoubleStatsRef.current = getCloseLegDoubleStats;

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
		onMatchFormat,
	};

	const realtimeConfig = useMemo(
		() => transport?.getRealtimeConfig?.() ?? null,
		[transport],
	);

	const outboxKey = useMemo(
		() => transport?.getOutboxKey?.() ?? null,
		[transport],
	);

	const setWsHealth = useCallback((healthy) => {
		wsHealthyRef.current = healthy;
		setWsHealthy(healthy);
	}, []);

	const refreshSyncPending = useCallback(async () => {
		if (!outboxKey) {
			setSyncPending(false);
			return;
		}
		const list = await loadOutbox(outboxKey);
		setSyncPending(list.length > 0);
	}, [outboxKey]);

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
				if (normalized?.meta?.matchFormat) {
					sync.onMatchFormat?.(normalized.meta.matchFormat);
				}
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
			const prevVisits = lastSyncStateRef.current?.visits;
			applyStateInternal(state);
			const sync = scoringSyncRef.current;
			const normalized = isNormalizedScoringState(state)
				? state
				: normalizeScoringState(state, sync.players);
			announceRemoteVisit(prevVisits, normalized);
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
	const onAbortedRef = useRef(onAborted);
	onAbortedRef.current = onAborted;

	const handleAbortIfNeeded = useCallback(
		(state) =>
			consumeFfaAbortPayload(state, {
				setGameClosed,
				onAborted: () => onAbortedRef.current?.(),
				handledRef: abortedRef,
			}),
		[setGameClosed],
	);

	const markMatchFinishedFromState = useCallback(
		(state) => {
			if (!isMatchFinishedState(state)) {
				return false;
			}
			const applied = applyStateSafe(state, 'submit');
			if (!applied) {
				lastRevisionRef.current = Math.max(
					lastRevisionRef.current,
					computeStateRevision(state),
				);
				applyStateInternal(state);
			}
			setGameClosed(true);
			return true;
		},
		[applyStateSafe, applyStateInternal, setGameClosed],
	);

	const flushOutbox = useCallback(async () => {
		const syncTransport = scoringSyncRef.current.transport;
		const key = syncTransport?.getOutboxKey?.() ?? null;
		if (!key || !syncTransport || flushInFlightRef.current) {
			return null;
		}

		flushInFlightRef.current = true;
		pendingWritesRef.current += 1;
		let lastState = null;
		try {
			if (syncTransport.fetchState) {
				try {
					const snapshot = await syncTransport.fetchState();
					lastState = snapshot;
					applyStateSafeRef.current(snapshot, 'external');
					if (isMatchFinishedState(snapshot)) {
						await clearOutbox(key);
						setSyncPending(false);
						markMatchFinishedFromState(snapshot);
						return snapshot;
					}
				} catch {
					// Brak sieci przy fetch — spróbuj flush wpisów i tak.
				}
			}

			let remaining = await loadOutbox(key);
			while (remaining.length > 0) {
				const entry = remaining[0];
				if (entry.op === 'recordVisit') {
					lastState = await syncTransport.recordVisit(
						entry.legId ?? null,
						entry.payload,
					);
				} else if (entry.op === 'closeLeg' && syncTransport.closeLeg) {
					lastState = await syncTransport.closeLeg(
						entry.legId,
						entry.payload,
					);
				} else if (entry.op === 'achievements') {
					// Obsługiwane przez useGameFinishedEffects / postGame retry.
					remaining = await dequeueOutbox(key);
					continue;
				} else {
					remaining = await dequeueOutbox(key);
					continue;
				}

				applyStateSafeRef.current(lastState, 'submit');
				remaining = await dequeueOutbox(key);

				if (isMatchFinishedState(lastState)) {
					await clearOutbox(key);
					setSyncPending(false);
					markMatchFinishedFromState(lastState);
					return lastState;
				}

				const legClosed =
					lastState?.currentLeg == null ||
					lastState?.currentLeg?.open === false;
				if (legClosed && syncTransport.format === 'h2h') {
					currentLegIdRef.current = null;
				}
			}

			setSyncPending(false);
			return lastState;
		} catch (e) {
			if (isRetryableScoringError(e)) {
				setSyncPending(true);
				return null;
			}
			console.warn('flushOutbox', e);
			return null;
		} finally {
			pendingWritesRef.current -= 1;
			flushInFlightRef.current = false;
			await refreshSyncPending();
		}
	}, [markMatchFinishedFromState, refreshSyncPending]);

	const flushOutboxRef = useRef(flushOutbox);
	flushOutboxRef.current = flushOutbox;

	const loadState = useCallback(async () => {
		const { enabled: syncEnabled, transport: syncTransport } =
			scoringSyncRef.current;
		if (!syncEnabled || !syncTransport?.fetchState) {
			return null;
		}
		try {
			const state = await syncTransport.fetchState();
			if (handleAbortIfNeeded(state)) {
				return state;
			}
			applyStateSafeRef.current(state, 'external');
			onStateLoadedRef.current?.(state);
			if (isMatchFinishedState(state)) {
				const key = syncTransport.getOutboxKey?.() ?? null;
				if (key) {
					await clearOutbox(key);
					setSyncPending(false);
				}
				markMatchFinishedFromState(state);
			}
			return state;
		} catch (e) {
			console.warn('loadGameScoringState', e);
			onStateLoadedRef.current?.(null);
			return null;
		}
	}, [markMatchFinishedFromState, handleAbortIfNeeded]);

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
		void (async () => {
			await loadStateRef.current();
			await flushOutboxRef.current();
		})();
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
			await flushOutboxRef.current();
		};
		void tick();
		const t = setInterval(tick, BACKUP_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(t);
		};
	}, [enabled, gameClosed, transport, wsHealthy]);

	useEffect(() => {
		if (!enabled || !outboxKey) {
			return undefined;
		}
		void refreshSyncPending();

		const unsubNet = NetInfo.addEventListener((state) => {
			if (state.isConnected) {
				void flushOutboxRef.current();
			}
		});

		const onAppState = (next) => {
			if (next === 'active') {
				void flushOutboxRef.current();
			}
		};
		const sub = AppState.addEventListener('change', onAppState);

		return () => {
			unsubNet();
			sub.remove();
		};
	}, [enabled, outboxKey, refreshSyncPending]);

	const onResubscribed = useCallback(() => {
		void (async () => {
			await loadStateRef.current();
			await flushOutboxRef.current();
		})();
	}, []);

	useGameScoringRealtime({
		channelName: realtimeConfig?.channelName ?? null,
		enabled: enabled && !gameClosed && !!realtimeConfig,
		channelType: realtimeConfig?.channelType ?? 'public',
		accessToken: realtimeConfig?.accessToken ?? null,
		events: realtimeConfig?.events,
		scope: realtimeConfig?.scope ?? 'game-scoring',
		unwrapPayload: realtimeConfig?.unwrapPayload,
		onGameState: (state) => {
			if (handleAbortIfNeeded(state)) {
				return;
			}
			applyStateSafeRef.current(state, 'external');
			if (isMatchFinishedState(state)) {
				const key =
					scoringSyncRef.current.transport?.getOutboxKey?.() ?? null;
				if (key) {
					void clearOutbox(key).then(() => setSyncPending(false));
				}
			}
		},
		onWsHealthChange: setWsHealth,
		onResubscribed,
	});

	const buildCloseLegPlayers = useCallback(
		(winnerPlayerId, checkoutDart) => {
			const tracked = !!isPerDartMode;
			const statsMap = getCloseLegDoubleStatsRef.current?.() ?? null;
			return players.slice(0, N).map((p) => {
				const isWinner = p.playerId === winnerPlayerId;
				const stats = p.playerId != null ? statsMap?.[p.playerId] : null;
				return {
					playerId: p.playerId,
					doubleTracked: tracked,
					doubleAttempts: tracked ? (stats?.attempts ?? 0) : null,
					doubleSuccesses: tracked ? (stats?.successes ?? 0) : null,
					legAverage: null,
					firstNineAverage: null,
					highestVisit: null,
					highestFinish: null,
					dartsThrown: null,
					checkoutDart: isWinner ? checkoutDart : null,
				};
			});
		},
		[players, N, isPerDartMode],
	);

	const enqueueRetryable = useCallback(
		async (entry, userMessage) => {
			const key = transport?.getOutboxKey?.() ?? null;
			if (!key) {
				Alert.alert('Błąd', userMessage);
				return;
			}
			await enqueueOutbox(key, entry);
			setSyncPending(true);
			Alert.alert(
				'Brak połączenia',
				'Zapiszę na serwerze, gdy wróci internet.',
			);
		},
		[transport],
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
					darts = null,
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
				const resolvedClientVisitId =
					clientVisitId ?? transport.newClientVisitId();
				let legId = null;
				let payload = null;
				try {
					const liveStates = scoringSyncRef.current.playerStates;
					const remainingBefore =
						remainingBeforeOverride ??
						liveStates[playerIndex]?.score ??
						501;
					const remainingAfter = bust
						? remainingBefore
						: Math.max(0, remainingBefore - visitScore);

					payload = {
						playerId: player.playerId,
						score: bust ? 0 : visitScore,
						remainingBefore,
						remainingAfter: closedLeg ? 0 : remainingAfter,
						dartsInVisit,
						closedLeg,
						bust,
						clientVisitId: resolvedClientVisitId,
					};
					if (Array.isArray(darts) && darts.length > 0) {
						payload.darts = darts;
					};

					if (transport.requiresLegId) {
						legId = await ensureLegStarted();
						if (!legId) {
							throw new Error('Brak otwartego lega');
						}
					}

					const state = await transport.recordVisit(legId, payload);

					applyStateSafe(state, 'submit');
					if (isMatchFinishedState(state)) {
						markMatchFinishedFromState(state);
					}
					return state;
				} catch (e) {
					if (isRetryableScoringError(e) && payload) {
						await enqueueRetryable(
							{
								op: 'recordVisit',
								legId,
								payload,
								clientVisitId: resolvedClientVisitId,
							},
							e.message || 'Nie udało się zapisać wizyty',
						);
						return null;
					}
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
			ensureLegStarted,
			applyStateSafe,
			enqueueRetryable,
			markMatchFinishedFromState,
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
					const resolvedClientVisitId =
						visitOpts.clientVisitId ?? transport.newClientVisitId();
					let legId = visitOpts.legId ?? null;
					let visitPayload = null;
					let closePayload = null;
					try {
						if (legId != null && transport.fetchState) {
							const snapshot = await transport.fetchState();
							if (isMatchFinishedState(snapshot)) {
								markMatchFinishedFromState(snapshot);
								return snapshot;
							}
							const openLegId = snapshot?.currentLeg?.id ?? null;
							if (openLegId !== legId) {
								applyStateSafe(snapshot, 'submit');
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
						visitPayload = {
							playerId: player.playerId,
							score: visitScore,
							remainingBefore,
							remainingAfter: 0,
							dartsInVisit: checkoutDart,
							closedLeg: true,
							bust: false,
							clientVisitId: resolvedClientVisitId,
						};
						if (Array.isArray(visitOpts.darts) && visitOpts.darts.length > 0) {
							visitPayload.darts = visitOpts.darts;
						};
						closePayload = {
							winnerId: player.playerId,
							players: buildCloseLegPlayers(
								player.playerId,
								checkoutDart,
							),
						};

						await transport.recordVisit(legId, visitPayload);
						const state = await transport.closeLeg(legId, closePayload);
						const applied = applyStateSafe(state, 'submit');
						const matchFinished = isMatchFinishedState(state);

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
						if (isRetryableScoringError(e) && visitPayload && closePayload) {
							const key = transport.getOutboxKey?.() ?? null;
							if (key) {
								await enqueueOutbox(key, {
									op: 'recordVisit',
									legId,
									payload: visitPayload,
									clientVisitId: resolvedClientVisitId,
								});
								await enqueueOutbox(key, {
									op: 'closeLeg',
									legId,
									payload: closePayload,
								});
								setSyncPending(true);
								Alert.alert(
									'Brak połączenia',
									'Zapiszę na serwerze, gdy wróci internet.',
								);
							} else {
								Alert.alert(
									'Błąd',
									e.message || 'Nie udało się zamknąć lega',
								);
							}
							return null;
						}
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
			enqueueRetryable,
			markMatchFinishedFromState,
			submitVisit,
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

				const ok = await confirm({
					title: CLOSED_LEG_UNDO_TITLE,
					message: CLOSED_LEG_UNDO_MESSAGE,
					confirmLabel: 'Cofnij leg',
				});
				if (!ok) {
					return null;
				}
				return performUndo();
			}),
		[runSerialized, enabled, transport, applyStateSafe, confirm],
	);

	return {
		submitVisit,
		closeLegWithWinner,
		undoVisit,
		ensureLegStarted,
		getOpenLegId: () => currentLegIdRef.current,
		finishedQuickGameIdRef,
		ffaPresence,
		syncPending,
		flushOutbox,
	};
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useConfirm } from '../context/ConfirmProvider';
import {
	applyGameScoringState,
	computeStateRevision,
	isNormalizedScoringState,
	normalizeScoringState,
	remainingFromPlayerVisits,
	startingScoreFromScoringState,
} from '../helpers/gameScoring/index.js';
import { consumeFfaAbortPayload, consumeH2hCancelledPayload } from '../helpers/gameScoring/ffaClosedStatus.js';
import { announceRemoteVisit } from '../helpers/gameScoring/announceRemoteVisit.js';
import {
	bindQueuedLegId,
	clearOutbox,
	dequeueOutbox,
	enqueueOutbox,
	loadOutbox,
} from '../helpers/gameScoring/scoringOutbox.js';
import {
	commandAlreadyApplied,
	isLegAlreadyOpenMessage,
	rejectionNotice,
} from '../helpers/gameScoring/scoringQueueAck.js';
import {
	isRemainingBeforeMismatchError,
	isRetryableScoringError,
	isGameCancelledScoringError,
	isLeaseStolenScoringError,
} from '../helpers/gameScoring/scoringRequestError.js';
import { replayOutboxOnRawState } from '../helpers/gameScoring/queuedScoringState.js';
import {
	CLOSED_LEG_UNDO_MESSAGE,
	CLOSED_LEG_UNDO_TITLE,
	resolveUndoLegId,
	wouldUndoClosedLeg,
} from '../helpers/gameScoring/undoVisit.js';
import { useGameScoringRealtime } from './useGameScoringRealtime';

const BACKUP_POLL_MS = 2500;
const FLUSH_RETRY_MS = 3000;
const FLUSH_RETRY_MAX_MS = 8000;

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
	onLeaseLost = null,
	openerChosenRef = null,
}) {
	const confirm = useConfirm();
	const currentLegIdRef = useRef(null);
	const lastStateKeyRef = useRef('');
	const lastLegNumberRef = useRef(null);
	const ensureLegPromiseRef = useRef(null);
	const lastPlayerSnapRef = useRef({});
	const hasSeenScoringProgressRef = useRef(false);
	const lastRevisionRef = useRef(-1);
	const pendingWritesRef = useRef(0);
	const visitChainRef = useRef(Promise.resolve());
	const finishedQuickGameIdRef = useRef(null);
	const lastSyncStateRef = useRef(null);
	const lastRawStateRef = useRef(null);
	const abortedRef = useRef(false);
	const wsHealthyRef = useRef(false);
	const flushInFlightRef = useRef(false);
	const flushAgainRef = useRef(false);
	const retryDelayRef = useRef(FLUSH_RETRY_MS);
	const retryTimerRef = useRef(null);
	const [wsHealthy, setWsHealthy] = useState(false);
	const [ffaPresence, setFfaPresence] = useState(null);
	const [syncPending, setSyncPending] = useState(false);
	const [bullOffRequired, setBullOffRequired] = useState(false);
	const [lastLegClose, setLastLegClose] = useState(null);
	const [legVisits, setLegVisits] = useState([]);
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
				lastRawStateRef.current = state;
				const normalized = isNormalizedScoringState(state)
					? state
					: normalizeScoringState(state, sync.players);
				const visits = normalized?.visits ?? [];
				lastSyncStateRef.current = {
					currentLeg: normalized?.currentLeg ?? null,
					visits,
					legs: Array.isArray(state.legs) ? state.legs : [],
					turn: normalized?.turn ?? null,
				};
				setLegVisits(visits);
				setBullOffRequired(Boolean(normalized?.meta?.bullOffRequired ?? state.meta?.bullOffRequired));
				setLastLegClose(normalized?.meta?.lastLegClose ?? state.meta?.lastLegClose ?? null);
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
				openerChosenRef,
				hasSeenScoringProgressRef,
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
			openerChosenRef,
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

	const resyncFromServer = useCallback(async () => {
		const syncTransport = scoringSyncRef.current.transport;
		if (!syncTransport?.fetchState) {
			return null;
		}
		try {
			const snapshot = await syncTransport.fetchState();
			if (snapshot) {
				applyStateSafeRef.current(snapshot, 'submit');
			}
			return snapshot;
		} catch {
			return null;
		}
	}, []);

	const onStateLoadedRef = useRef(onStateLoaded);
	onStateLoadedRef.current = onStateLoaded;
	const onAbortedRef = useRef(onAborted);
	onAbortedRef.current = onAborted;
	const onLeaseLostRef = useRef(onLeaseLost);
	onLeaseLostRef.current = onLeaseLost;

	const handleAbortIfNeeded = useCallback(
		(state) => {
			if (
				consumeFfaAbortPayload(state, {
					setGameClosed,
					onAborted: () => onAbortedRef.current?.(),
					handledRef: abortedRef,
				})
			) {
				return true;
			}
			return consumeH2hCancelledPayload(state, {
				setGameClosed,
				onAborted: () => onAbortedRef.current?.(),
				handledRef: abortedRef,
			});
		},
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

	const clearFlushRetry = useCallback(() => {
		if (retryTimerRef.current) {
			clearTimeout(retryTimerRef.current);
			retryTimerRef.current = null;
		}
	}, []);

	const scheduleFlushRetry = useCallback(() => {
		if (retryTimerRef.current) {
			return;
		}
		const delay = retryDelayRef.current;
		retryTimerRef.current = setTimeout(() => {
			retryTimerRef.current = null;
			retryDelayRef.current = FLUSH_RETRY_MAX_MS;
			void flushOutboxRef.current?.();
		}, delay);
	}, []);

	const flushOutbox = useCallback(async () => {
		const syncTransport = scoringSyncRef.current.transport;
		const key = syncTransport?.getOutboxKey?.() ?? null;
		if (!key || !syncTransport) {
			return null;
		}
		if (flushInFlightRef.current) {
			flushAgainRef.current = true;
			return null;
		}

		const applyAcked = (state, tail) => {
			if (!state) {
				return;
			}
			applyStateSafeRef.current(replayOutboxOnRawState(state, tail), 'submit');
		};

		const stopForTerminal = async (snapshot, { finished = false, stolen = false, cancelled = false } = {}) => {
			await clearOutbox(key);
			setSyncPending(false);
			clearFlushRetry();
			if (stolen) {
				onLeaseLostRef.current?.();
			}
			if (cancelled && !abortedRef.current) {
				abortedRef.current = true;
				setGameClosed(true);
				onAbortedRef.current?.();
			}
			if (finished && snapshot) {
				markMatchFinishedFromState(snapshot);
			}
		};

		const recoverRejected = async (entry, error) => {
			let snapshot = null;
			try {
				snapshot = await syncTransport.fetchState?.();
			} catch (fetchErr) {
				if (isLeaseStolenScoringError(fetchErr)) {
					await stopForTerminal(null, { stolen: true });
					return { continue: false, state: null };
				}
				if (isGameCancelledScoringError(fetchErr)) {
					await stopForTerminal(null, { cancelled: true });
					return { continue: false, state: null };
				}
			}
			if (snapshot && handleAbortIfNeeded(snapshot)) {
				await stopForTerminal(snapshot);
				return { continue: false, state: snapshot };
			}
			if (snapshot && isMatchFinishedState(snapshot)) {
				await stopForTerminal(snapshot, { finished: true });
				return { continue: false, state: snapshot };
			}
			if (
				snapshot
				&& commandAlreadyApplied(entry, snapshot, {
					legAlreadyOpen: isLegAlreadyOpenMessage(error),
				})
			) {
				if (entry.op === 'startLeg' && snapshot.currentLeg?.id) {
					currentLegIdRef.current = snapshot.currentLeg.id;
					await dequeueOutbox(key);
					await bindQueuedLegId(key, snapshot.currentLeg.id);
				} else {
					await dequeueOutbox(key);
				}
				const tail = await loadOutbox(key);
				applyAcked(snapshot, tail);
				return { continue: true, state: snapshot };
			}
			const pending = await loadOutbox(key);
			const droppedTail = Math.max(0, pending.length - 1);
			await clearOutbox(key);
			setSyncPending(false);
			clearFlushRetry();
			if (snapshot) {
				applyStateSafeRef.current(snapshot, 'submit');
			}
			Alert.alert(
				entry.op === 'undoVisit' ? 'Cofnięcie wizyty' : 'Rozjazd wyniku',
				rejectionNotice(droppedTail, entry.op),
			);
			return { continue: false, state: snapshot };
		};

		const sendQueued = async () => {
			let lastState = null;
			let remaining = await loadOutbox(key);
			while (remaining.length > 0) {
				let entry = remaining[0];
				try {
					if (
						syncTransport.requiresLegId
						&& entry.legId == null
						&& entry.op !== 'startLeg'
					) {
						if (currentLegIdRef.current) {
							entry = { ...entry, legId: currentLegIdRef.current };
						} else {
							setSyncPending(true);
							return { retryable: true, state: lastState };
						}
					}
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
					} else if (entry.op === 'undoVisit' && syncTransport.undoVisit) {
						lastState = await syncTransport.undoVisit(entry.legId ?? null);
					} else if (entry.op === 'startLeg' && syncTransport.startLeg) {
						lastState = await syncTransport.startLeg({
							tracked: Boolean(entry.payload?.tracked),
						});
					} else {
						remaining = await dequeueOutbox(key);
						continue;
					}

					if (entry.op === 'startLeg' && !lastState?.currentLeg?.id) {
						setSyncPending(true);
						return { retryable: true, state: lastState };
					}

					remaining = await dequeueOutbox(key);
					if (entry.op === 'startLeg') {
						currentLegIdRef.current = lastState.currentLeg.id;
						remaining = await bindQueuedLegId(key, lastState.currentLeg.id);
					}

					if (isMatchFinishedState(lastState)) {
						await stopForTerminal(lastState, { finished: true });
						return { retryable: false, state: lastState };
					}

					applyAcked(lastState, remaining);
					const legClosed =
						lastState?.currentLeg == null ||
						lastState?.currentLeg?.open === false;
					if (legClosed && syncTransport.format === 'h2h') {
						currentLegIdRef.current = null;
					}
				} catch (e) {
					if (isLeaseStolenScoringError(e)) {
						await stopForTerminal(null, { stolen: true });
						return { retryable: false, state: null };
					}
					if (isGameCancelledScoringError(e)) {
						await stopForTerminal(null, { cancelled: true });
						return { retryable: false, state: null };
					}
					if (isRetryableScoringError(e)) {
						setSyncPending(true);
						return { retryable: true, state: lastState };
					}
					if (e?.status === 422) {
						const recovered = await recoverRejected(entry, e);
						if (recovered.continue) {
							remaining = await loadOutbox(key);
							lastState = recovered.state ?? lastState;
							continue;
						}
						return { retryable: false, state: recovered.state ?? null };
					}
					console.warn('flushOutbox', e);
					return { retryable: false, state: lastState };
				}
			}
			setSyncPending(false);
			retryDelayRef.current = FLUSH_RETRY_MS;
			clearFlushRetry();
			return { retryable: false, state: lastState };
		};

		flushInFlightRef.current = true;
		pendingWritesRef.current += 1;
		let lastState = null;
		try {
			do {
				flushAgainRef.current = false;
				const pass = await sendQueued();
				lastState = pass.state ?? lastState;
				if (pass.retryable) {
					scheduleFlushRetry();
					break;
				}
			} while (flushAgainRef.current);
			return lastState;
		} finally {
			pendingWritesRef.current -= 1;
			flushInFlightRef.current = false;
			await refreshSyncPending();
		}
	}, [
		markMatchFinishedFromState,
		refreshSyncPending,
		handleAbortIfNeeded,
		setGameClosed,
		clearFlushRetry,
		scheduleFlushRetry,
	]);

	const flushOutboxRef = useRef(flushOutbox);
	flushOutboxRef.current = flushOutbox;

	const replayQueuedLocally = useCallback(async () => {
		const syncTransport = scoringSyncRef.current.transport;
		if (!syncTransport?.queueCommands) {
			return;
		}
		const key = syncTransport.getOutboxKey?.() ?? null;
		if (!key) {
			return;
		}
		const entries = await loadOutbox(key);
		if (entries.length === 0) {
			return;
		}
		let raw = lastRawStateRef.current;
		if (!raw) {
			const sync = scoringSyncRef.current;
			const legId = entries.find((entry) => entry.legId != null)?.legId ?? null;
			raw = {
				players: (sync.players ?? []).map((player, index) => ({
					playerId: player.playerId,
					name: player.name,
					remaining: sync.playerStates?.[index]?.startingScore
						?? sync.playerStates?.[index]?.score
						?? 501,
					legsWon: 0,
				})),
				visits: [],
				currentLeg: legId != null ? { id: legId, open: true, legNumber: 1 } : null,
				game: { status: 'in_progress', player1LegsWon: 0, player2LegsWon: 0 },
				legs: [],
			};
		}
		const next = replayOutboxOnRawState(raw, entries);
		if (next) {
			applyStateInternal(next);
			setSyncPending(true);
		}
	}, [applyStateInternal]);

	const replayQueuedRef = useRef(replayQueuedLocally);
	replayQueuedRef.current = replayQueuedLocally;

	const queueMissingLeg = useCallback(async (key) => {
		if (currentLegIdRef.current) {
			return currentLegIdRef.current;
		}
		const pending = await loadOutbox(key);
		if (!pending.some((entry) => entry.op === 'startLeg')) {
			await enqueueOutbox(key, {
				op: 'startLeg',
				payload: { tracked: !!scoringSyncRef.current.isPerDartMode },
			});
		}
		return null;
	}, []);

	const rawStateForQueue = useCallback((legId) => {
		if (lastRawStateRef.current) {
			return lastRawStateRef.current;
		}
		const sync = scoringSyncRef.current;
		return {
			players: (sync.players ?? []).map((player, index) => ({
				playerId: player.playerId,
				name: player.name,
				remaining: sync.playerStates?.[index]?.startingScore
					?? sync.playerStates?.[index]?.score
					?? 501,
				legsWon: 0,
			})),
			visits: [],
			currentLeg: legId != null ? { id: legId, open: true, legNumber: 1 } : null,
			game: { status: 'in_progress', player1LegsWon: 0, player2LegsWon: 0 },
			legs: [],
		};
	}, []);

	const applyQueuedEntries = useCallback((entries) => {
		const legId = entries.find((entry) => entry.legId != null)?.legId ?? null;
		const next = replayOutboxOnRawState(rawStateForQueue(legId), entries);
		if (next) {
			applyStateInternal(next);
		}
	}, [applyStateInternal, rawStateForQueue]);

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
			if (isGameCancelledScoringError(e)) {
				if (!abortedRef.current) {
					abortedRef.current = true;
					setGameClosed(true);
					onAbortedRef.current?.();
				}
				return null;
			}
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
				if (handleAbortIfNeeded(state)) {
					return null;
				}
				if (state.currentLeg?.id) {
					currentLegIdRef.current = state.currentLeg.id;
					applyStateSafe(state, 'submit');
					return currentLegIdRef.current;
				}
				const tracked = !!isPerDartMode;
				try {
					state = await transport.startLeg({ tracked });
				} catch (startErr) {
					if (isGameCancelledScoringError(startErr)) {
						throw startErr;
					}
					const msg = startErr?.message ?? '';
					if (msg.includes('otwarty leg') || msg.includes('już otwarty')) {
						state = await transport.fetchState();
					} else {
						throw startErr;
					}
				}
				if (handleAbortIfNeeded(state)) {
					return null;
				}
				applyStateSafe(state, 'submit');
				currentLegIdRef.current = state.currentLeg?.id ?? null;
				return currentLegIdRef.current;
			} catch (e) {
				if (isGameCancelledScoringError(e)) {
					if (!abortedRef.current) {
						abortedRef.current = true;
						setGameClosed(true);
						onAbortedRef.current?.();
					}
					return null;
				}
				throw e;
			} finally {
				ensureLegPromiseRef.current = null;
			}
		})();
		return ensureLegPromiseRef.current;
	}, [enabled, transport, isPerDartMode, applyStateSafe, handleAbortIfNeeded]);

	useEffect(() => {
		if (!enabled || gameClosed) {
			return undefined;
		}
		void (async () => {
			await loadStateRef.current();
			await replayQueuedRef.current?.();
			await flushOutboxRef.current();
		})();
		return undefined;
	}, [enabled, gameClosed, reloadKey]);

	useEffect(() => {
		if (!enabled || gameClosed || !realtimeConfig?.channelName || wsHealthy) {
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
	}, [enabled, gameClosed, realtimeConfig, wsHealthy]);

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
			clearFlushRetry();
		};
	}, [enabled, outboxKey, refreshSyncPending, clearFlushRetry]);

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

	const remainingBeforeForPlayer = useCallback((playerIndex, playerId, override) => {
		const live = scoringSyncRef.current.playerStates?.[playerIndex];
		const startingScore = startingScoreFromScoringState(
			lastRawStateRef.current,
			live?.startingScore ?? 501,
		);
		const visits = lastSyncStateRef.current?.visits;
		if (Array.isArray(visits)) {
			return remainingFromPlayerVisits(visits, playerId, startingScore);
		}
		return override ?? live?.score ?? startingScore;
	}, []);

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
				const queueKey = transport.queueCommands
					? transport.getOutboxKey?.() ?? null
					: null;
				try {
					if (queueKey && transport.requiresLegId) {
						legId = await queueMissingLeg(queueKey);
					} else if (transport.requiresLegId) {
						legId = await ensureLegStarted();
						if (!legId) {
							throw new Error('Brak otwartego lega');
						}
					}

					const remainingBefore = remainingBeforeForPlayer(
						playerIndex,
						player.playerId,
						remainingBeforeOverride,
					);
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

					if (queueKey) {
						const entry = {
							op: 'recordVisit',
							legId,
							payload,
							clientVisitId: resolvedClientVisitId,
						};
						await enqueueOutbox(queueKey, entry);
						applyQueuedEntries([entry]);
						void flushOutboxRef.current();
						return lastRawStateRef.current;
					}

					const record = async (visitPayload) => {
						const state = await transport.recordVisit(legId, visitPayload);
						applyStateSafe(state, 'submit');
						if (isMatchFinishedState(state)) {
							markMatchFinishedFromState(state);
						} else if (transport.format === 'h2h') {
							const legClosed =
								state?.currentLeg == null ||
								state?.currentLeg?.open === false;
							if (legClosed) {
								await ensureLegStarted();
							}
						}
						return state;
					};

					try {
						return await record(payload);
					} catch (firstError) {
						if (!isRemainingBeforeMismatchError(firstError)) {
							throw firstError;
						}
						await resyncFromServer();
						const retryBefore = remainingBeforeForPlayer(
							playerIndex,
							player.playerId,
							remainingBeforeOverride,
						);
						payload = {
							...payload,
							remainingBefore: retryBefore,
							remainingAfter: bust
								? retryBefore
								: closedLeg
									? 0
									: Math.max(0, retryBefore - visitScore),
						};
						return await record(payload);
					}
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
			remainingBeforeForPlayer,
			resyncFromServer,
			applyQueuedEntries,
			queueMissingLeg,
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
					const queueKey = transport.queueCommands
						? transport.getOutboxKey?.() ?? null
						: null;
					try {
						if (queueKey) {
							legId = visitOpts.legId ?? currentLegIdRef.current;
							if (!legId) {
								legId = await queueMissingLeg(queueKey);
							}
						} else if (legId != null && transport.fetchState) {
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
						} else if (!queueKey) {
							legId = await ensureLegStarted();
						}

						if (!queueKey && !legId) {
							throw new Error('Brak otwartego lega');
						}
						const remainingBefore = remainingBeforeForPlayer(
							playerIndex,
							player.playerId,
							visitOpts.remainingBefore ?? null,
						);
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

						if (queueKey) {
							const visitEntry = {
								op: 'recordVisit',
								legId,
								payload: visitPayload,
								clientVisitId: resolvedClientVisitId,
							};
							const closeEntry = {
								op: 'closeLeg',
								legId,
								payload: closePayload,
							};
							await enqueueOutbox(queueKey, visitEntry);
							await enqueueOutbox(queueKey, closeEntry);
							applyQueuedEntries([visitEntry, closeEntry]);
							void flushOutboxRef.current();
							return lastRawStateRef.current;
						}

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
						if (transport.fetchState) {
							try {
								const snapshot = await transport.fetchState();
								applyStateSafe(snapshot, 'submit');
								if (isMatchFinishedState(snapshot)) {
									markMatchFinishedFromState(snapshot);
									return snapshot;
								}
								const recoveredLegClosed =
									snapshot?.currentLeg == null ||
									snapshot?.currentLeg?.open === false;
								if (recoveredLegClosed) {
									currentLegIdRef.current = null;
									return snapshot;
								}
								const alreadyCheckout = (
									snapshot?.visits ?? []
								).some(
									(v) =>
										v?.closedLeg &&
										!v?.bust &&
										Number(v?.remainingAfter) === 0,
								);
								if (
									isRetryableScoringError(e) &&
									closePayload &&
									alreadyCheckout
								) {
									const key = transport.getOutboxKey?.() ?? null;
									if (key) {
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
									return snapshot;
								}
							} catch {
								// stan z API niedostępny — idź w standardowy retry
							}
						}
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
			ensureLegStarted,
			buildCloseLegPlayers,
			remainingBeforeForPlayer,
			applyStateSafe,
			applyStateInternal,
			setGameClosed,
			enqueueRetryable,
			markMatchFinishedFromState,
			submitVisit,
			applyQueuedEntries,
			queueMissingLeg,
		],
	);

	const closeLegByBullOff = useCallback(
		(playerIndex) =>
			runSerialized(async () => {
				if (!enabled || !transport?.closeLeg) {
					return null;
				}
				const player = players[playerIndex];
				if (!player?.playerId) {
					return null;
				}

				pendingWritesRef.current += 1;
				let closePayload = null;
				let legId = null;
				const queueKey = transport.queueCommands
					? transport.getOutboxKey?.() ?? null
					: null;
				try {
					if (transport.requiresLegId) {
						if (queueKey) {
							legId = currentLegIdRef.current ?? (await queueMissingLeg(queueKey));
						} else {
							legId = currentLegIdRef.current ?? (await ensureLegStarted());
							if (!legId) {
								throw new Error('Brak otwartego lega');
							}
						}
						closePayload = {
							winnerId: player.playerId,
							players: buildCloseLegPlayers(player.playerId, null),
							reason: 'bull_off',
						};
					} else {
						closePayload = { winnerPlayerId: player.playerId };
					}

					if (queueKey) {
						const entry = {
							op: 'closeLeg',
							legId,
							payload: closePayload,
						};
						await enqueueOutbox(queueKey, entry);
						applyQueuedEntries([entry]);
						void flushOutboxRef.current();
						return lastRawStateRef.current;
					}

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
					if (isRetryableScoringError(e) && closePayload) {
						const key = transport.getOutboxKey?.() ?? null;
						if (key) {
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
			}),
		[
			runSerialized,
			enabled,
			transport,
			players,
			ensureLegStarted,
			buildCloseLegPlayers,
			applyStateSafe,
			applyStateInternal,
			setGameClosed,
			queueMissingLeg,
			applyQueuedEntries,
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
					const visitsBefore = lastSyncStateRef.current?.visits?.length ?? 0;
					try {
						if (transport.queueCommands && transport.getOutboxKey?.()) {
							const key = transport.getOutboxKey();
							const entry = { op: 'undoVisit', legId };
							await enqueueOutbox(key, entry);
							if (!needsClosedLegConfirm) {
								applyQueuedEntries([entry]);
							}
							if (needsClosedLegConfirm) {
								return await flushOutboxRef.current();
							}
							void flushOutboxRef.current();
							return lastRawStateRef.current;
						}
						const state = await transport.undoVisit(legId);
						applyStateSafe(state, 'submit');
						return state;
					} catch (e) {
						const recovered = await resyncFromServer();
						const visitsAfter = lastSyncStateRef.current?.visits?.length ?? 0;
						if (recovered && visitsAfter < visitsBefore) {
							return recovered;
						}
						Alert.alert('Błąd', e.message || 'Nie udało się cofnąć wizyty');
						return recovered;
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
		[runSerialized, enabled, transport, applyStateSafe, confirm, resyncFromServer, applyQueuedEntries],
	);

	return {
		submitVisit,
		closeLegWithWinner,
		closeLegByBullOff,
		undoVisit,
		ensureLegStarted,
		getOpenLegId: () => currentLegIdRef.current,
		finishedQuickGameIdRef,
		ffaPresence,
		syncPending,
		flushOutbox,
		bullOffRequired,
		lastLegClose,
		legVisits,
	};
}

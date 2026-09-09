import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
	applyFfaSyncState,
	FFA_BACKUP_POLL_MS,
	shouldSkipFfaBackupTick,
	shouldStartFfaBackupPoll,
} from '../helpers/gameScoring/ffaScoringSync.js';
import { userErrorMessage } from '../helpers/gameScoring/scoringRequestError.js';
import { useGameScoringRealtime } from './useGameScoringRealtime';

/**
 * Wspólna powłoka sync FFA (GET + WS + poll gdy WS padnie + kolejka zapisów).
 * Mapowanie stanu gry zostaje w callerze (`applyPlayers` / `afterApply`).
 */
export function useFfaScoringSync({
	enabled,
	transport,
	applyPlayers,
	afterApply = null,
	setCurrentPlayerIndex,
	setGameClosed,
	legOpenerIndexRef = null,
	onFinishedQuickGameId = null,
	onAborted = null,
	reloadKey = null,
	logLabel = 'useFfaScoringSync',
}) {
	const lastVersionRef = useRef(-1);
	const pendingWritesRef = useRef(0);
	const writeChainRef = useRef(Promise.resolve());
	const finishedRef = useRef(false);
	const abortedRef = useRef(false);
	const closedRef = useRef(false);
	const wsHealthyRef = useRef(false);
	const [wsHealthy, setWsHealthy] = useState(false);
	const [busy, setBusy] = useState(false);
	const [canInputFromServer, setCanInputFromServer] = useState(true);

	const ctxRef = useRef({});
	ctxRef.current = {
		applyPlayers,
		afterApply,
		setCurrentPlayerIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId,
		onAborted,
	};

	const markClosed = useCallback((closed) => {
		if (closed) {
			closedRef.current = true;
		}
		ctxRef.current.setGameClosed(closed);
	}, []);

	const applyState = useCallback((state) => {
		const ctx = ctxRef.current;
		const result = applyFfaSyncState(state, {
			pendingWrites: pendingWritesRef.current,
			lastVersionRef,
			finishedRef,
			abortedRef,
			setGameClosed: markClosed,
			onAborted: ctx.onAborted,
			onFinishedQuickGameId: ctx.onFinishedQuickGameId,
			setCurrentPlayerIndex: ctx.setCurrentPlayerIndex,
			setCanInputFromServer,
			legOpenerIndexRef: ctx.legOpenerIndexRef,
			applyPlayers: ctx.applyPlayers,
			afterApply: ctx.afterApply,
		});
		if (result.reason === 'aborted') {
			closedRef.current = true;
		}
		return result;
	}, [markClosed]);

	const loadState = useCallback(async ({ notify = true } = {}) => {
		if (!enabled || !transport?.fetchState) return;
		try {
			const state = await transport.fetchState();
			applyState(state);
		} catch (e) {
			if (notify) {
				Alert.alert(
					'Błąd',
					userErrorMessage(e, 'Nie udało się pobrać stanu gry'),
				);
			} else {
				console.warn(`${logLabel} loadState`, e);
			}
		}
	}, [applyState, enabled, logLabel, transport]);

	useEffect(() => {
		if (!enabled) return undefined;
		lastVersionRef.current = -1;
		finishedRef.current = false;
		abortedRef.current = false;
		closedRef.current = false;
		void loadState();
		return undefined;
	}, [enabled, loadState, reloadKey]);

	const realtimeConfig = useMemo(
		() => transport?.getRealtimeConfig?.() ?? null,
		[transport],
	);

	const setWsHealth = useCallback((healthy) => {
		wsHealthyRef.current = healthy;
		setWsHealthy(healthy);
	}, []);

	useGameScoringRealtime({
		channelName: realtimeConfig?.channelName,
		enabled: enabled && !!realtimeConfig?.channelName,
		channelType: realtimeConfig?.channelType ?? 'private',
		accessToken: realtimeConfig?.accessToken ?? null,
		events: realtimeConfig?.events,
		scope: realtimeConfig?.scope ?? 'ffa-sync',
		unwrapPayload: realtimeConfig?.unwrapPayload,
		onGameState: applyState,
		onWsHealthChange: setWsHealth,
	});

	useEffect(() => {
		if (!shouldStartFfaBackupPoll({
			enabled,
			hasTransport: Boolean(transport?.fetchState),
			wsHealthy,
			closed: closedRef.current,
		})) {
			return undefined;
		}
		let cancelled = false;
		const tick = async () => {
			if (
				cancelled
				|| shouldSkipFfaBackupTick({
					pendingWrites: pendingWritesRef.current,
					wsHealthy: wsHealthyRef.current,
				})
				|| closedRef.current
			) {
				return;
			}
			await loadState({ notify: false });
		};
		void tick();
		const id = setInterval(tick, FFA_BACKUP_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [enabled, loadState, transport, wsHealthy]);

	const enqueueWrite = useCallback((fn) => {
		pendingWritesRef.current += 1;
		setBusy(true);
		const run = writeChainRef.current.then(fn).finally(() => {
			pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
			if (pendingWritesRef.current === 0) {
				setBusy(false);
			}
		});
		writeChainRef.current = run.catch(() => {});
		return run;
	}, []);

	const runWrite = useCallback(
		(fn, errorMessage) => {
			if (!fn) return Promise.resolve();
			return enqueueWrite(async () => {
				try {
					const state = await fn();
					if (state) {
						applyState(state);
					}
				} catch (e) {
					Alert.alert('Błąd', userErrorMessage(e, errorMessage));
					await loadState({ notify: false });
					throw e;
				}
			});
		},
		[applyState, enqueueWrite, loadState],
	);

	const submitUndo = useCallback(() => {
		const undo = transport?.undoVisit ?? transport?.undoDart;
		if (!undo) return Promise.resolve();
		return runWrite(() => undo(), 'Nie udało się cofnąć');
	}, [runWrite, transport]);

	return {
		busy,
		canInputFromServer,
		applyState,
		runWrite,
		loadState,
		submitUndo,
		reload: loadState,
	};
}

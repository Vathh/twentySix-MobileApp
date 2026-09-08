import { consumeFfaAbortPayload } from './ffaClosedStatus.js';

export const FFA_BACKUP_POLL_MS = 2500;

/**
 * Backup HTTP poll tylko gdy WS nie żyje — ten sam kontrakt co X01 (`useGameScoring`).
 */
export function shouldStartFfaBackupPoll({ enabled, hasTransport, wsHealthy, closed }) {
	return Boolean(enabled && hasTransport && !wsHealthy && !closed);
}

export function shouldSkipFfaBackupTick({ pendingWrites, wsHealthy }) {
	return pendingWrites > 0 || Boolean(wsHealthy);
}

/**
 * Wspólne apply stanu FFA (abort, wersja, finished, tura).
 * Mapowanie graczy zostaje w `applyPlayers` (inny kształt per tryb gry).
 *
 * @returns {{ applied: boolean, reason?: string }}
 */
export function applyFfaSyncState(state, ctx) {
	const {
		pendingWrites = 0,
		lastVersionRef,
		finishedRef,
		abortedRef,
		setGameClosed,
		onAborted,
		onFinishedQuickGameId,
		setCurrentPlayerIndex,
		setCanInputFromServer,
		legOpenerIndexRef = null,
		applyPlayers,
		afterApply = null,
	} = ctx;

	if (
		consumeFfaAbortPayload(state, {
			setGameClosed,
			onAborted,
			handledRef: abortedRef,
		})
	) {
		return { applied: false, reason: 'aborted' };
	}

	if (!state?.session || !Array.isArray(state.players)) {
		return { applied: false, reason: 'invalid' };
	}

	const version = Number(state.session.stateVersion ?? 0);
	if (version < lastVersionRef.current && pendingWrites > 0) {
		return { applied: false, reason: 'stale' };
	}
	lastVersionRef.current = version;

	const status = state.session.status ?? state.game?.status;
	if (status === 'finished') {
		setGameClosed(true);
		const qid = state.session.quickGameId;
		if (qid != null && !finishedRef.current) {
			finishedRef.current = true;
			onFinishedQuickGameId?.(qid);
		}
	}

	applyPlayers?.(state);

	setCurrentPlayerIndex(Number(
		state.turn?.currentPlayerIndex
		?? state.session.currentPlayerIndex
		?? 0,
	));

	afterApply?.(state);

	if (legOpenerIndexRef) {
		legOpenerIndexRef.current = Number(
			state.turn?.legOpenerIndex ?? state.session.legOpenerIndex ?? 0,
		);
	}

	setCanInputFromServer(state.you?.canInput !== false);

	return { applied: true };
}

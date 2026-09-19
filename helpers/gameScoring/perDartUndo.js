import {
	popDartLabel,
	reopenLastVisit,
	undoLastVisit,
} from '../reducers/playerResultActions.js';
import { playerResultReducer } from '../reducers/playerResultReducer.js';
import {
	playerHasInProgressPerDartVisit,
	reopenLastCompletedVisitDartInHistory,
} from './dartHistoryTracker.js';

function cloneDart(entry) {
	return { ...entry };
}

function cloneVisitLogEntry(entry) {
	return {
		...entry,
		darts: entry.darts ? [...entry.darts] : entry.darts,
	};
}

function findLastVisitLogIndex(visitLog, playerIndex) {
	for (let i = visitLog.length - 1; i >= 0; i -= 1) {
		if (visitLog[i].playerIndex === playerIndex) {
			return i;
		}
	}
	return -1;
}

function emptyVisitState() {
	return {
		visitPointsTotal: 0,
		visitStartScore: null,
		localRemaining: null,
	};
}

/**
 * Jedno kliknięcie „Cofnij” w trybie per-dart (offline).
 *
 * Model punktów: zatwierdzona wizyta wraca na konto **raz** (`undoLastVisit`).
 * Pozostałe lotki zostają w historii jako w toku — kolejne undo tylko je zdejmuje
 * i nie dolicza już nic do wyniku. Dzięki temu nie da się wyjść powyżej 501.
 *
 * @param {object} state
 * @param {object} [opts]
 * @param {boolean} [opts.skipScoreUndo] — online: etykiety lokalnie, wynik z API
 */
export function applyOfflinePerDartUndo(state, opts = {}) {
	const startingScore = state.startingScore ?? 501;
	const skipScoreUndo = Boolean(opts.skipScoreUndo);
	const dartHistory = (state.dartHistory ?? []).map(cloneDart);
	const visitLog = (state.visitLog ?? []).map(cloneVisitLogEntry);
	const players = (state.players ?? []).map((player) => ({ ...player }));
	let visitPointsTotal = state.visitPointsTotal ?? 0;
	let visitStartScore = state.visitStartScore ?? null;
	let localRemaining = state.localRemaining ?? null;
	let currentPlayerIndex = state.currentPlayerIndex ?? 0;
	const dispatches = [];

	const dispatch = (playerIndex, action) => {
		if (players[playerIndex] == null) {
			return;
		}
		players[playerIndex] = playerResultReducer(players[playerIndex], action);
		dispatches.push({ playerIndex, action });
	};

	const snapshot = (kind, extra = {}) => ({
		...state,
		kind,
		needsServerUndo: extra.needsServerUndo ?? false,
		dartHistory,
		visitLog,
		visitPointsTotal,
		visitStartScore,
		localRemaining,
		currentPlayerIndex,
		players,
		dispatches,
		startingScore,
	});

	const last = dartHistory[dartHistory.length - 1];

	if (last && !last.completedVisit) {
		dartHistory.pop();
		const { playerIndex, points } = last;
		visitPointsTotal = Math.max(0, visitPointsTotal - points);
		dispatch(playerIndex, popDartLabel());
		if (localRemaining != null) {
			localRemaining += points;
		} else if (visitStartScore != null) {
			localRemaining = visitStartScore - visitPointsTotal;
		}
		if (!playerHasInProgressPerDartVisit(dartHistory, playerIndex)) {
			({ visitPointsTotal, visitStartScore, localRemaining } = emptyVisitState());
		}
		return snapshot('pop_in_progress');
	}

	if (last && last.completedVisit) {
		const playerIndex = last.playerIndex;
		const remainingAfterVisit = players[playerIndex]?.score ?? startingScore;
		const reopened = reopenLastCompletedVisitDartInHistory(dartHistory, playerIndex);
		if (reopened) {
			const visitStart =
				remainingAfterVisit + reopened.undonePoints + reopened.remainingPoints;
			visitStartScore = visitStart;
			visitPointsTotal = reopened.remainingPoints;
			localRemaining = visitStart - reopened.remainingPoints;
			currentPlayerIndex = playerIndex;

			const labels = players[playerIndex];
			const needsReopen =
				(labels?.currentVisitDartLabels?.length ?? 0) === 0 &&
				(labels?.lastVisitDartLabels?.length ?? 0) > 0;
			if (needsReopen) {
				dispatch(playerIndex, reopenLastVisit());
			}
			dispatch(playerIndex, popDartLabel());

			const logIdx = findLastVisitLogIndex(visitLog, playerIndex);
			if (logIdx >= 0) {
				visitLog.splice(logIdx, 1);
			}

			const hasCommittedVisit =
				(players[playerIndex]?.currentLegScores?.length ?? 0) > 0;
			if (!skipScoreUndo && hasCommittedVisit) {
				dispatch(
					playerIndex,
					undoLastVisit(reopened.undonePoints + reopened.remainingPoints),
				);
			}

			if (reopened.remainingCount === 0) {
				({ visitPointsTotal, visitStartScore, localRemaining } = emptyVisitState());
			}

			return snapshot('reopen_committed', { needsServerUndo: true });
		}
	}

	if (visitLog.length === 0) {
		return snapshot('noop');
	}

	const logLast = visitLog[visitLog.length - 1];
	currentPlayerIndex = logLast.playerIndex;
	({ visitPointsTotal, visitStartScore, localRemaining } = emptyVisitState());

	if (logLast.bust) {
		const hasCommittedVisit =
			(players[logLast.playerIndex]?.currentLegScores?.length ?? 0) > 0;
		if (!skipScoreUndo && hasCommittedVisit) {
			dispatch(logLast.playerIndex, undoLastVisit(0));
		}
		visitLog.pop();
		return snapshot('undo_bust', { needsServerUndo: true });
	}

	const hasCommittedVisit =
		(players[logLast.playerIndex]?.currentLegScores?.length ?? 0) > 0;
	if (!skipScoreUndo && hasCommittedVisit) {
		dispatch(logLast.playerIndex, undoLastVisit(logLast.visitScore ?? 0));
	}
	visitLog.pop();
	return snapshot('undo_log_visit', { needsServerUndo: true });
}

export { playerHasInProgressPerDartVisit };

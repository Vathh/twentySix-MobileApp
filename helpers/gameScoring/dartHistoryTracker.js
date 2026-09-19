import { resetVisitDartLabels } from '../reducers/playerResultActions.js';

export function getRecentVisitDartPointsFromHistory(hist, playerIndex) {
	const points = [];
	for (let i = hist.length - 1; i >= 0 && points.length < 3; i -= 1) {
		const entry = hist[i];
		if (entry.playerIndex !== playerIndex || entry.completedVisit) {
			continue;
		}
		points.unshift(entry.points);
	}
	return points;
}

export function playerHasInProgressPerDartVisit(hist, playerIndex) {
	return (hist ?? []).some(
		(entry) => entry.playerIndex === playerIndex && !entry.completedVisit,
	);
}

/**
 * Cofnięcie ostatniej lotki już zapisanej wizyty: zdejmuje ją z historii
 * i odznacza pozostałe lotki tej wizyty jako w toku.
 * @returns {{ undonePoints: number, remainingPoints: number, remainingCount: number } | null}
 */
export function reopenLastCompletedVisitDartInHistory(hist, playerIndex) {
	let lastIdx = -1;
	for (let i = hist.length - 1; i >= 0; i -= 1) {
		if (hist[i].playerIndex === playerIndex && hist[i].completedVisit) {
			lastIdx = i;
			break;
		}
	}
	if (lastIdx < 0) {
		return null;
	}
	const [undone] = hist.splice(lastIdx, 1);
	let unmarked = 0;
	for (let i = hist.length - 1; i >= 0 && unmarked < 2; i -= 1) {
		if (hist[i].playerIndex !== playerIndex) {
			continue;
		}
		if (!hist[i].completedVisit) {
			break;
		}
		hist[i].completedVisit = false;
		unmarked += 1;
	}
	const remaining = getRecentVisitDartPointsFromHistory(hist, playerIndex);
	return {
		undonePoints: undone.points,
		remainingPoints: remaining.reduce((sum, p) => sum + p, 0),
		remainingCount: remaining.length,
	};
}

/**
 * Bookkeeping dla trybu rzut-po-rzucie (per-dart): historia rzutów bieżącej wizyty,
 * chronologiczny log zatwierdzonych wizyt oraz detekcja aktywnej wizyty w toku.
 * Wydzielone z GameScoringScreen — czyste funkcje operujące na refach przekazanych z ekranu.
 *
 * @param {object} deps
 */
export function createDartHistoryTracker({
	dartHistoryRef,
	visitLogRef,
	visitPointsTotalRef,
	visitStartScoreRef,
	visitClientIdRef,
	localVisitRemainingRef,
	playerDispatches,
	setLocalRemaining,
	currentPlayerIndexRef,
	isPerDartMode,
}) {
	const pushVisitLog = (playerIndex, visitScore, darts = null, { bust = false } = {}) => {
		visitLogRef.current.push({
			playerIndex,
			visitScore,
			darts: darts?.length ? [...darts] : null,
			bust,
		});
	};

	const getRecentVisitDartPoints = (playerIndex) =>
		getRecentVisitDartPointsFromHistory(dartHistoryRef.current, playerIndex);

	const discardInProgressPerDartVisit = () => {
		dartHistoryRef.current = dartHistoryRef.current.filter(
			(entry) => entry.completedVisit,
		);
		visitStartScoreRef.current = null;
		visitClientIdRef.current = null;
		visitPointsTotalRef.current = 0;
		setLocalRemaining(null);
		const idx = currentPlayerIndexRef.current;
		playerDispatches[idx](resetVisitDartLabels());
	};

	const pushDartToHistory = (playerIndex, points, label, remainingBefore = null) => {
		dartHistoryRef.current.push({
			playerIndex,
			points,
			label,
			remainingBefore,
			completedVisit: false,
			bust: false,
		});
	};

	const markLastDartBust = () => {
		const hist = dartHistoryRef.current;
		if (hist.length > 0) {
			hist[hist.length - 1].bust = true;
		}
	};

	const popDartHistory = (count = 1) => {
		for (let i = 0; i < count; i += 1) {
			if (dartHistoryRef.current.length > 0) {
				dartHistoryRef.current.pop();
			}
		}
		if (count >= 3) {
			visitPointsTotalRef.current = 0;
		}
	};

	const markCurrentVisitCompleted = (playerIndex) => {
		const hist = dartHistoryRef.current;
		let marked = 0;
		for (let i = hist.length - 1; i >= 0 && marked < 3; i -= 1) {
			if (hist[i].playerIndex !== playerIndex || hist[i].completedVisit) {
				continue;
			}
			hist[i].completedVisit = true;
			marked += 1;
		}
	};

	const reopenLastCompletedVisitDart = (playerIndex) =>
		reopenLastCompletedVisitDartInHistory(dartHistoryRef.current, playerIndex);

	const hasActivePerDartVisit = () =>
		isPerDartMode() &&
		(visitClientIdRef.current != null ||
			visitPointsTotalRef.current > 0 ||
			localVisitRemainingRef.current != null);

	return {
		pushVisitLog,
		getRecentVisitDartPoints,
		discardInProgressPerDartVisit,
		pushDartToHistory,
		popDartHistory,
		markCurrentVisitCompleted,
		reopenLastCompletedVisitDart,
		hasActivePerDartVisit,
		markLastDartBust,
	};
}

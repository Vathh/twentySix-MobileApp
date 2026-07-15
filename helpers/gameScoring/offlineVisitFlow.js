import { Alert } from 'react-native';
import {
	completeCurrentVisit,
	legLose,
	legWin,
	resetLegsInSet,
	resetVisitDartLabels,
	updateStats,
} from '../reducers/playerResultActions';
import { wouldCloseSet } from '../matchFormat/matchFormatScoring';

/**
 * Offline (trening / lokalny) finish paths for Counter — bez API.
 *
 * @param {object} deps
 */
export function createOfflineVisitFlow(deps) {
	const {
		N,
		getPlayers,
		getPlayerStates,
		getPlayerDispatches,
		getMatchFormat,
		getStartingScore,
		isPerDartMode,
		okHandlingRef,
		checkoutClosingRef,
		currentPlayerIndexRef,
		visitStartScoreRef,
		visitClientIdRef,
		visitPointsTotalRef,
		setCurrentPlayerIndex,
		setLocalRemaining,
		setCurrentResult,
		setResultEdited,
		popDartHistory,
		pushVisitLog,
		getRecentVisitDartPoints,
		markCurrentVisitCompleted,
		handleMaxAndOneSeventy,
		handleHf,
		handleQf,
		getCheckoutPrompt,
		getCurrentResult,
		advanceToNextLegOpener,
		openCheckoutDartModal,
	} = deps;

	const finishOfflinePerDartBust = (idx, _visitStart, dartsInVisit) => {
		popDartHistory(dartsInVisit);
		getPlayerDispatches()[idx](resetVisitDartLabels());
		pushVisitLog(idx, 0, null, { bust: true });
		visitStartScoreRef.current = null;
		visitClientIdRef.current = null;
		visitPointsTotalRef.current = 0;
		setLocalRemaining(null);
		const nextIdx = (idx + 1) % N;
		currentPlayerIndexRef.current = nextIdx;
		setCurrentPlayerIndex(nextIdx);
	};

	const finishOfflineLegWin = (idx, checkoutDart) => {
		if (checkoutClosingRef.current) {
			return;
		}
		checkoutClosingRef.current = true;

		const players = getPlayers();
		const playerStates = getPlayerStates();
		const playerDispatches = getPlayerDispatches();
		const matchFormat = getMatchFormat();
		const player = players[idx];
		const startingScore = getStartingScore();

		if (isPerDartMode()) {
			const visitScore =
				visitStartScoreRef.current ?? playerStates[idx]?.score ?? startingScore;
			const dartPoints = getRecentVisitDartPoints(idx);
			pushVisitLog(idx, visitScore, dartPoints);
			markCurrentVisitCompleted(idx);
			playerDispatches[idx](completeCurrentVisit());
		}

		const dartsThrownBefore = playerStates[idx]?.dartsThrown ?? 0;
		if (player?.playerId) {
			handleQf(player, dartsThrownBefore + checkoutDart);
		}
		playerDispatches[idx](legWin(checkoutDart, matchFormat));
		const setWillClose = matchFormat && wouldCloseSet(playerStates[idx], matchFormat);
		for (let j = 0; j < N; j++) {
			if (j !== idx) playerDispatches[j](legLose());
		}
		if (setWillClose) {
			for (let j = 0; j < N; j++) {
				playerDispatches[j](resetLegsInSet());
			}
		}
		advanceToNextLegOpener();
		checkoutClosingRef.current = false;
	};

	const handleOfflineCheckout = (
		idx,
		visitScore,
		visitOpts = {},
		checkoutDart = null,
	) => {
		const score =
			visitScore ?? getPlayerStates()[idx]?.score ?? getStartingScore();
		if (isPerDartMode() && checkoutDart != null) {
			finishOfflineLegWin(idx, checkoutDart);
			return;
		}
		openCheckoutDartModal(idx, score, visitOpts);
	};

	const promptOfflinePerDartCheckout = (
		idx,
		visitStart,
		resultToApply,
		dartsInVisit,
	) => {
		const player = getPlayers()[idx];

		okHandlingRef.current = true;
		handleMaxAndOneSeventy(player, resultToApply);

		Alert.alert('UWAGA', getCheckoutPrompt(player), [
			{
				text: 'NIE',
				style: 'cancel',
				onPress: () => {
					popDartHistory(dartsInVisit);
					getPlayerDispatches()[idx](resetVisitDartLabels());
					setLocalRemaining(visitStart);
					visitPointsTotalRef.current = 0;
					okHandlingRef.current = false;
				},
			},
			{
				text: 'TAK',
				style: 'destructive',
				onPress: () => {
					okHandlingRef.current = false;
					handleHf(resultToApply, player);
					handleOfflineCheckout(idx, resultToApply, {}, dartsInVisit);
					setLocalRemaining(null);
					visitPointsTotalRef.current = 0;
					visitStartScoreRef.current = null;
				},
			},
		]);
	};

	const finishOfflinePerDartVisit = (
		idx,
		_visitStart,
		resultToApply,
		_dartsInVisit = 3,
	) => {
		const dispatch = getPlayerDispatches()[idx];
		const player = getPlayers()[idx];

		okHandlingRef.current = true;
		handleMaxAndOneSeventy(player, resultToApply);

		const dartPoints = getRecentVisitDartPoints(idx);
		pushVisitLog(idx, resultToApply, dartPoints);
		dispatch(updateStats(resultToApply));
		markCurrentVisitCompleted(idx);
		dispatch(completeCurrentVisit());
		const nextIdx = (idx + 1) % N;
		currentPlayerIndexRef.current = nextIdx;
		setCurrentPlayerIndex(nextIdx);
		setLocalRemaining(null);
		visitPointsTotalRef.current = 0;
		visitStartScoreRef.current = null;
		okHandlingRef.current = false;
	};

	/** Tryb „suma trzech rzutów” — lokalny OK po walidacji wyniku. */
	const handleOfflineSumVisit = () => {
		if (okHandlingRef.current) return;

		const idx = currentPlayerIndexRef.current;
		const state = getPlayerStates()[idx];
		const dispatch = getPlayerDispatches()[idx];
		const player = getPlayers()[idx];
		const resultToApply = getCurrentResult();

		okHandlingRef.current = true;
		handleMaxAndOneSeventy(player);

		if (resultToApply < state.score - 1) {
			pushVisitLog(idx, resultToApply);
			dispatch(updateStats(resultToApply));
			const nextIdx = (idx + 1) % N;
			currentPlayerIndexRef.current = nextIdx;
			setCurrentPlayerIndex(nextIdx);
			setCurrentResult(0);
			setResultEdited(false);
			okHandlingRef.current = false;
			return;
		}

		if (resultToApply === state.score) {
			Alert.alert('UWAGA', getCheckoutPrompt(player), [
				{
					text: 'NIE',
					style: 'cancel',
					onPress: () => {
						okHandlingRef.current = false;
					},
				},
				{
					text: 'TAK',
					style: 'destructive',
					onPress: () => {
						okHandlingRef.current = false;
						handleHf();
						handleOfflineCheckout(idx);
					},
				},
			]);
			setCurrentResult(0);
			setResultEdited(false);
			return;
		}
		setCurrentResult(0);
		setResultEdited(false);
		okHandlingRef.current = false;
	};

	return {
		finishOfflinePerDartBust,
		promptOfflinePerDartCheckout,
		finishOfflinePerDartVisit,
		finishOfflineLegWin,
		handleOfflineCheckout,
		handleOfflineSumVisit,
	};
}

import { Alert } from 'react-native';
import { resetVisitDartLabels } from '../reducers/playerResultActions';

/**
 * Online scoring visit/checkout — zależy od `gameScoring` (transport).
 *
 * @param {object} deps
 */
export function createOnlineVisitFlow(deps) {
	const {
		getGameClosed,
		getSyncEnabled,
		getPlayers,
		getPlayerDispatches,
		getPlayerStatesRef,
		getStartingScore,
		isPerDartMode,
		hasActivePerDartVisit,
		okHandlingRef,
		currentPlayerIndexRef,
		visitStartScoreRef,
		visitClientIdRef,
		visitPointsTotalRef,
		setLocalRemaining,
		setCurrentResult,
		setResultEdited,
		popDartHistory,
		handleMaxAndOneSeventy,
		handleHf,
		getCheckoutPrompt,
		openCheckoutDartModal,
		getGameScoring,
		getCurrentResult,
		beginScoringBusy,
		endScoringBusy,
	} = deps;

	const submitOnlineVisitCore = async (resultToApply, dartsInVisit = 3) => {
		if (getGameClosed() || !getSyncEnabled()) return false;
		const idx = currentPlayerIndexRef.current;
		const state = getPlayerStatesRef().current[idx];
		const player = getPlayers()[idx];
		const startingScore = getStartingScore();
		if (
			resultToApply > 180 ||
			typeof resultToApply !== 'number' ||
			resultToApply < 0
		) {
			return false;
		}
		const visitStart = hasActivePerDartVisit()
			? (visitStartScoreRef.current ?? state?.score ?? startingScore)
			: (state?.score ?? startingScore);
		const visitOpts = {
			clientVisitId: hasActivePerDartVisit()
				? visitClientIdRef.current
				: null,
			remainingBefore: visitStart,
		};
		const overshoot = resultToApply > visitStart;
		const isCheckout = !overshoot && resultToApply === visitStart;
		if (isCheckout) {
			okHandlingRef.current = true;
			return new Promise((resolve) => {
				Alert.alert('UWAGA', getCheckoutPrompt(player), [
					{
						text: 'NIE',
						style: 'cancel',
						onPress: () => {
							okHandlingRef.current = false;
							if (isPerDartMode()) {
								popDartHistory(3);
								getPlayerDispatches()[idx](resetVisitDartLabels());
								setLocalRemaining(visitStart);
							}
							resolve('cancelled');
						},
					},
					{
						text: 'TAK',
						style: 'destructive',
						onPress: async () => {
							try {
								handleMaxAndOneSeventy(player, resultToApply);
								if (resultToApply >= 100) {
									handleHf(resultToApply, player);
								}
								if (isPerDartMode()) {
									await getGameScoring().closeLegWithWinner(
										idx,
										resultToApply,
										dartsInVisit,
										visitOpts,
									);
									visitClientIdRef.current = null;
									okHandlingRef.current = false;
									setLocalRemaining(null);
									setCurrentResult(0);
									setResultEdited(false);
									resolve('done');
								} else {
									openCheckoutDartModal(idx, resultToApply, visitOpts);
									setCurrentResult(0);
									setResultEdited(false);
									resolve('checkout_modal');
								}
							} catch {
								okHandlingRef.current = false;
								resolve('error');
							}
						},
					},
				]);
			});
		}

		handleMaxAndOneSeventy(player, resultToApply);

		let apiState = null;
		const gameScoring = getGameScoring();
		if (overshoot) {
			apiState = await gameScoring.submitVisit({
				playerIndex: idx,
				visitScore: 0,
				bust: true,
				dartsInVisit,
				...visitOpts,
			});
		} else {
			apiState = await gameScoring.submitVisit({
				playerIndex: idx,
				visitScore: resultToApply,
				bust: false,
				dartsInVisit,
				...visitOpts,
			});
		}

		if (!apiState) {
			return false;
		}

		visitClientIdRef.current = null;
		setCurrentResult(0);
		setResultEdited(false);
		return true;
	};

	const promptOnlinePerDartCheckout = (
		idx,
		visitStart,
		resultToApply,
		dartsInVisit,
	) =>
		new Promise((resolve) => {
			const player = getPlayers()[idx];
			const visitOpts = {
				clientVisitId: visitClientIdRef.current,
				remainingBefore: visitStart,
			};

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
						resolve('ended');
					},
				},
				{
					text: 'TAK',
					style: 'destructive',
					onPress: async () => {
						try {
							if (resultToApply >= 100) {
								handleHf(resultToApply, player);
							}
							await getGameScoring().closeLegWithWinner(
								idx,
								resultToApply,
								dartsInVisit,
								visitOpts,
							);
							visitClientIdRef.current = null;
							visitPointsTotalRef.current = 0;
							visitStartScoreRef.current = null;
							setLocalRemaining(null);
							setCurrentResult(0);
							setResultEdited(false);
						} catch {
							// closeLegWithWinner pokazuje Alert przy błędzie API
						} finally {
							okHandlingRef.current = false;
							resolve('ended');
						}
					},
				},
			]);
		});

	const handleOnlineOkBtn = async () => {
		beginScoringBusy();
		try {
			await submitOnlineVisitCore(getCurrentResult());
		} finally {
			endScoringBusy();
		}
	};

	return {
		submitOnlineVisitCore,
		promptOnlinePerDartCheckout,
		handleOnlineOkBtn,
	};
}

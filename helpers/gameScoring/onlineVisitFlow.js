import { playCheckoutWinSound, playVisitScore } from '../gameSounds';
import { resetVisitDartLabels } from '../reducers/playerResultActions';
import { askCheckoutLegConfirmation } from './inputPolicy';
import { recordedDartsInVisit, openVisitDarts } from './visitDarts';

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
		handleQf,
		getCheckoutPrompt,
		openCheckoutDartModal,
		getMatchFormat,
		getGameScoring,
		getCurrentResult,
		beginScoringBusy,
		endScoringBusy,
		dartHistoryRef,
	} = deps;

	const recordQfIfNeeded = (player, idx, checkoutDarts) => {
		if (!player || !handleQf) return;
		const dartsThrownBefore =
			getPlayerStatesRef().current[idx]?.dartsThrown ?? 0;
		handleQf(player, dartsThrownBefore + checkoutDarts);
	};
	const visitDarts = () => {
		if (!isPerDartMode() || !dartHistoryRef) return null;
		const idx = currentPlayerIndexRef.current;
		const darts = openVisitDarts(dartHistoryRef.current, idx);
		return darts.length > 0 ? darts : null;
	};

	const submitOnlineVisitCore = async (resultToApply, dartsInVisit = 3, dartsOverride = null) => {
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
			darts: dartsOverride ?? visitDarts(),
		};
		const overshoot = resultToApply > visitStart;
		const isCheckout = !overshoot && resultToApply === visitStart;
		if (isCheckout) {
			okHandlingRef.current = true;
			return new Promise((resolve) => {
				askCheckoutLegConfirmation({
					message: getCheckoutPrompt(player),
					onCancel: () => {
						okHandlingRef.current = false;
						if (isPerDartMode()) {
							popDartHistory(3);
							getPlayerDispatches()[idx](resetVisitDartLabels());
							setLocalRemaining(visitStart);
						}
						resolve('cancelled');
					},
					onConfirm: async () => {
						try {
							handleMaxAndOneSeventy(player, resultToApply);
							if (resultToApply >= 100) {
								handleHf(resultToApply, player);
							}
							if (isPerDartMode()) {
								playCheckoutWinSound(
									getPlayerStatesRef().current[idx],
									getMatchFormat(),
								);
								recordQfIfNeeded(player, idx, dartsInVisit);
								await getGameScoring().closeLegWithWinner(
									idx,
									resultToApply,
									dartsInVisit,
									visitOpts,
								);
								if (dartHistoryRef) {
									dartHistoryRef.current = [];
								}
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
				});
			});
		}

		handleMaxAndOneSeventy(player, resultToApply);

		let apiState = null;
		const gameScoring = getGameScoring();
		if (overshoot) {
			if (!isPerDartMode()) {
				playVisitScore(0);
			}
			apiState = await gameScoring.submitVisit({
				playerIndex: idx,
				visitScore: 0,
				bust: true,
				dartsInVisit: recordedDartsInVisit({
					bust: true,
					physicalDarts: dartsInVisit,
				}),
				...visitOpts,
			});
		} else {
			if (!isPerDartMode()) {
				playVisitScore(resultToApply);
			}
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
				darts: openVisitDarts(dartHistoryRef?.current ?? [], idx),
			};

			okHandlingRef.current = true;
			handleMaxAndOneSeventy(player, resultToApply);

			askCheckoutLegConfirmation({
				message: getCheckoutPrompt(player),
				onCancel: () => {
					popDartHistory(dartsInVisit);
					getPlayerDispatches()[idx](resetVisitDartLabels());
					setLocalRemaining(visitStart);
					visitPointsTotalRef.current = 0;
					okHandlingRef.current = false;
					resolve('ended');
				},
				onConfirm: async () => {
					try {
						if (resultToApply >= 100) {
							handleHf(resultToApply, player);
						}
						recordQfIfNeeded(player, idx, dartsInVisit);
						playCheckoutWinSound(
							getPlayerStatesRef().current[idx],
							getMatchFormat(),
						);
						await getGameScoring().closeLegWithWinner(
							idx,
							resultToApply,
							dartsInVisit,
							visitOpts,
						);
						if (dartHistoryRef) {
							dartHistoryRef.current = [];
						}
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
			});
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

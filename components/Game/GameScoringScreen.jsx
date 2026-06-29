import React, {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react';
import { Alert, AppState, ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { playerResultReducer } from '../../helpers/reducers/playerResultReducer';
import {
  appendDartLabel,
  completeCurrentVisit,
  initialPlayerResultState,
  legLose,
  legWin,
  popDartLabel,
  reopenLastVisit,
	resetVisitDartLabels,
	undo,
	undoCommittedVisitDart,
	undoLastVisit,
	undoSingleDart,
	updateStats,
} from '../../helpers/reducers/playerResultActions';
import { achievementsReducer } from '../../helpers/reducers/achievementsReducer';
import {
	addAchievement,
	initialAchievementsState,
} from '../../helpers/reducers/achievementActions';
import Counter from './Counter';
import Stats from './Stats';
import Settings from '../Core/Settings';
import { useGameSettings } from '../../hooks/useGameSettings';
import useAuth from '../../hooks/useAuth';
import { useGameScoring } from '../../hooks/useGameScoring';
import {
	canCounterInput,
	checkoutLegPrompt,
	findWinnerIndex,
	isOneDeviceSpectator,
	mapAchievementsForQuick,
	mapAchievementsForTournament,
	GAME_MODE,
	newClientVisitId,
	resolveGameContext,
	sendQuickGameAchievements,
	sendTournamentAchievements,
	shouldHandleLocalTrainingWin,
	showGameFinishedAlert,
	showTrainingFinishedAlert,
	tournamentLegsToWin,
} from '../../helpers/gameScoring';
import { createFfaTransport } from '../../helpers/gameScoring/transports/createFfaTransport.js';
import { releaseTournamentGame } from '../../helpers/lockTournamentGame';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';
import { evaluatePerDartVisitAfterDart } from '../../helpers/perDartVisitRules';
import { postFfaPresence } from '../../helpers/quickGameFfaApi';
import {
	clearActiveFfaLobby,
	saveActiveFfaLobby,
} from '../../helpers/activeQuickGameMatch';
import { buildFfaPresenceBannerMessages } from '../../helpers/ffaPresenceMessages';

const GameScoringScreen = ({ route, navigation }) => {
	const { auth } = useAuth();
	const {
		scoringMode,
		setScoringMode,
		loaded: gameSettingsLoaded,
		isPerDartMode,
	} = useGameSettings();

	const [selectedComponent, setSelectedComponent] = useState('counter');

	const gameCtx = useMemo(
		() => resolveGameContext(route.params, auth),
		[route.params, auth],
	);
	const {
		mode,
		isLocal,
		syncEnabled,
		showStartModal,
		players,
		N,
		legsToWin,
		transport,
		reloadKey,
		lobbyScoringMode,
		isHost,
		myPlayerIndex,
		tournamentGame,
		activeGame,
		lobbyId,
	} = gameCtx;

	const isTournamentOnline =
		mode === GAME_MODE.TOURNAMENT && syncEnabled;
	const [isModalVisible, setIsModalVisible] = useState(
		showStartModal && !isTournamentOnline,
	);
	const [openerCheckPending, setOpenerCheckPending] =
		useState(isTournamentOnline);
	const matchOpenerChosenRef = useRef(!showStartModal && !isTournamentOnline);
	const [isQFModalVisible, setIsQFModalVisible] = useState(false);
	/** Zamrożony kontekst modala checkout — nie zależy od currentPlayerIndex po zamknięciu lega. */
	const [checkoutModalPlayer, setCheckoutModalPlayer] = useState(null);
	const [gameClosed, setGameClosed] = useState(false);

	const [player1State, player1Dispatch] = useReducer(
		playerResultReducer,
		initialPlayerResultState,
	);
	const [player2State, player2Dispatch] = useReducer(
		playerResultReducer,
		initialPlayerResultState,
	);
	const [player3State, player3Dispatch] = useReducer(
		playerResultReducer,
		initialPlayerResultState,
	);
	const [player4State, player4Dispatch] = useReducer(
		playerResultReducer,
		initialPlayerResultState,
	);
	const [player5State, player5Dispatch] = useReducer(
		playerResultReducer,
		initialPlayerResultState,
	);
	const [player6State, player6Dispatch] = useReducer(
		playerResultReducer,
		initialPlayerResultState,
	);
	const [player7State, player7Dispatch] = useReducer(
		playerResultReducer,
		initialPlayerResultState,
	);
	const [player8State, player8Dispatch] = useReducer(
		playerResultReducer,
		initialPlayerResultState,
	);

	const allStates = [
		player1State,
		player2State,
		player3State,
		player4State,
		player5State,
		player6State,
		player7State,
		player8State,
	];
	const allDispatches = [
		player1Dispatch,
		player2Dispatch,
		player3Dispatch,
		player4Dispatch,
		player5Dispatch,
		player6Dispatch,
		player7Dispatch,
		player8Dispatch,
	];
	const playerStates = allStates.slice(0, N);
	const playerDispatches = allDispatches.slice(0, N);
	const playerStatesRef = useRef(playerStates);
	playerStatesRef.current = playerStates;

	const [achievementsState, achievementsDispatch] = useReducer(
		achievementsReducer,
		initialAchievementsState,
	);

	const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
	const currentPlayerIndexRef = useRef(0);
	/** Indeks zawodnika rozpoczynającego bieżący leg (rotacja: opener+1 po zamknięciu lega). */
	const legOpenerIndexRef = useRef(0);
	const okHandlingRef = useRef(false);
	/** Checkout w trybie sumy — czeka na wybór lotki (1–3) przed zamknięciem lega online. */
	const pendingCheckoutRef = useRef(null);
	/** Blokada podwójnego kliknięcia w modalu lotki checkout (API trwa długo). */
	const checkoutClosingRef = useRef(false);
	const tournamentResultSentRef = useRef(false);
	const quickResultSentRef = useRef(false);
	const [ffaFinishedQuickGameId, setFfaFinishedQuickGameId] = useState(null);
	const currentPlayer = players[currentPlayerIndex] ?? null;
	const [currentResult, setCurrentResult] = useState(0);
	const [resultEdited, setResultEdited] = useState(false);
	const [qfHelperDart, setQfHelperDart] = useState(0);
	const [scoringBusy, setScoringBusy] = useState(false);
	const [scoringBusyLabel, setScoringBusyLabel] = useState('Zapisywanie wyniku…');
	/** Pozostały wynik w bieżącej wizycie (per-dart, tylko lokalnie — nad głównym licznikiem). */
	const [localVisitRemaining, setLocalVisitRemainingState] = useState(null);
	const localVisitRemainingRef = useRef(null);
	const setLocalRemaining = useCallback((value) => {
		if (typeof value === 'function') {
			setLocalVisitRemainingState((prev) => {
				const next = value(prev);
				localVisitRemainingRef.current = next;
				return next;
			});
			return;
		}
		localVisitRemainingRef.current = value;
		setLocalVisitRemainingState(value);
	}, []);
	/** Pozostały wynik na początku bieżącej wizyty (tryb rzut po rzucie, offline). */
	const visitStartScoreRef = useRef(null);
	/** Id wizyty online (per-dart) — ten sam clientVisitId przez całą wizytę. */
	const visitClientIdRef = useRef(null);
	/** Kolejność rzutów wpisanych na jednym urządzeniu (tryb per-dart, lokalnie). */
	const dartHistoryRef = useRef([]);
	/** Chronologiczny log zatwierdzonych wizyt — wspólny dla trybu sumy i per-dart (cofanie po zmianie trybu). */
	const visitLogRef = useRef([]);
	const intentionalFfaLeaveRef = useRef(false);
	/** Suma punktów w bieżącej wizycie per-dart (zerowana na początku każdej wizyty). */
	const visitPointsTotalRef = useRef(0);

	const pushVisitLog = (playerIndex, visitScore, darts = null, { bust = false } = {}) => {
		visitLogRef.current.push({
			playerIndex,
			visitScore,
			darts: darts?.length ? [...darts] : null,
			bust,
		});
	};

	const getRecentVisitDartPoints = (playerIndex) => {
		const hist = dartHistoryRef.current;
		const points = [];
		for (let i = hist.length - 1; i >= 0 && points.length < 3; i -= 1) {
			const entry = hist[i];
			if (entry.playerIndex !== playerIndex || entry.completedVisit) {
				continue;
			}
			points.unshift(entry.points);
		}
		return points;
	};

	const discardInProgressPerDartVisit = useCallback(() => {
		dartHistoryRef.current = dartHistoryRef.current.filter(
			(entry) => entry.completedVisit,
		);
		visitStartScoreRef.current = null;
		visitClientIdRef.current = null;
		visitPointsTotalRef.current = 0;
		setLocalRemaining(null);
		const idx = currentPlayerIndexRef.current;
		playerDispatches[idx](resetVisitDartLabels());
	}, [playerDispatches, setLocalRemaining]);

	const pushDartToHistory = (playerIndex, points, label) => {
		dartHistoryRef.current.push({
			playerIndex,
			points,
			label,
			completedVisit: false,
		});
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

	const hasActivePerDartVisit = () =>
		isPerDartMode &&
		(visitClientIdRef.current != null ||
			visitPointsTotalRef.current > 0 ||
			localVisitRemainingRef.current != null);

	const prevPerDartModeRef = useRef(isPerDartMode);

	const scoringTransport = useMemo(() => {
		if (
			mode === GAME_MODE.QUICK_FFA &&
			lobbyScoringMode === 'each_own' &&
			lobbyId &&
			auth?.accessToken
		) {
			return createFfaTransport({
				lobbyId,
				accessToken: auth.accessToken,
				lobbyScoringMode,
				isHost,
				myPlayerIndexFromLobby: myPlayerIndex,
				getCurrentPlayerIndex: () => currentPlayerIndexRef.current,
			});
		}
		return transport;
	}, [
		mode,
		lobbyScoringMode,
		lobbyId,
		auth?.accessToken,
		isHost,
		myPlayerIndex,
		transport,
	]);

	const handleScoringStateLoaded = useCallback(
		(state) => {
			if (!isTournamentOnline || matchOpenerChosenRef.current) {
				return;
			}
			const resumed =
				state?.game?.status === 'in_progress' ||
				state?.game?.status === 'finished' ||
				(state?.game?.player1LegsWon ?? 0) +
					(state?.game?.player2LegsWon ?? 0) >
					0 ||
				(state?.legs?.length ?? 0) > 0 ||
				(state?.visits?.length ?? 0) > 0 ||
				!!state?.currentLeg?.id;
			matchOpenerChosenRef.current = resumed;
			setIsModalVisible(!resumed);
			setOpenerCheckPending(false);
		},
		[isTournamentOnline],
	);

	const gameScoring = useGameScoring({
		enabled: syncEnabled && !gameClosed,
		transport: scoringTransport,
		players,
		N,
		playerDispatches,
		playerStates,
		currentPlayerIndexRef,
		setCurrentPlayerIndex,
		setGameClosed,
		gameClosed,
		isPerDartMode,
		legOpenerIndexRef,
		useLegOpenerRotation: mode === GAME_MODE.TOURNAMENT,
		onFinishedQuickGameId: setFfaFinishedQuickGameId,
		onStateLoaded: handleScoringStateLoaded,
		reloadKey,
	});

	const { ffaPresence } = gameScoring;

	const myPlayerId = useMemo(() => {
		if (myPlayerIndex == null || myPlayerIndex < 0) return null;
		return players[myPlayerIndex]?.id ?? null;
	}, [myPlayerIndex, players]);

	const presenceBannerMessages = useMemo(
		() => buildFfaPresenceBannerMessages(ffaPresence, myPlayerId),
		[ffaPresence, myPlayerId],
	);

	const counterOneDeviceSpectator = useMemo(
		() => isOneDeviceSpectator({ mode, lobbyScoringMode, isHost }),
		[mode, lobbyScoringMode, isHost],
	);

	const counterTurnAllowed = useMemo(
		() =>
			canCounterInput({
				mode,
				gameClosed,
				scoringBusy,
				lobbyScoringMode,
				isHost,
				myPlayerIndex,
				currentPlayerIndex,
				ffaPresence,
				players,
			}),
		[
			mode,
			gameClosed,
			lobbyScoringMode,
			isHost,
			myPlayerIndex,
			currentPlayerIndex,
			ffaPresence,
			players,
		],
	);

	const counterCanInput =
		counterTurnAllowed &&
		!isModalVisible &&
		!openerCheckPending &&
		!scoringBusy;

	useEffect(() => {
		if (prevPerDartModeRef.current === isPerDartMode) {
			return;
		}
		prevPerDartModeRef.current = isPerDartMode;
		okHandlingRef.current = false;
		setCurrentResult(0);
		setResultEdited(false);
		discardInProgressPerDartVisit();
	}, [isPerDartMode, discardInProgressPerDartVisit]);

	useEffect(() => {
		if (!isPerDartMode) {
			localVisitRemainingRef.current = null;
			setLocalRemaining(null);
			return;
		}
		visitStartScoreRef.current = null;
		visitClientIdRef.current = null;
		visitPointsTotalRef.current = 0;
		setLocalRemaining(null);
	}, [isPerDartMode, currentPlayerIndex, setLocalRemaining]);

	useEffect(() => {
		if (!gameClosed || mode !== GAME_MODE.QUICK_FFA) return;
		if (quickResultSentRef.current) return;
		quickResultSentRef.current = true;

		const achievementsPayload = mapAchievementsForQuick(achievementsState);
		const gameId =
			ffaFinishedQuickGameId ??
			gameScoring.finishedQuickGameIdRef?.current ??
			null;
		if (gameId) {
			void sendQuickGameAchievements({
				accessToken: auth?.accessToken,
				gameId,
				achievementsPayload,
			});
		}

		const winnerIdx = findWinnerIndex(playerStates, legsToWin);
		showGameFinishedAlert(players[winnerIdx]?.name, {
			title: 'Mecz zakończony',
		});
	}, [
		gameClosed,
		mode,
		ffaFinishedQuickGameId,
		achievementsState?.achievements,
		auth?.accessToken,
		legsToWin,
		players,
		playerStates,
		gameScoring.finishedQuickGameIdRef,
	]);

	useEffect(() => {
		if (
			!shouldHandleLocalTrainingWin({
				mode,
				syncEnabled,
				playerStates,
				legsToWin,
			})
		) {
			return;
		}
		if (gameClosed) return;

		setGameClosed(true);
		const winnerIdx = findWinnerIndex(playerStates, legsToWin);
		showTrainingFinishedAlert(players[winnerIdx]?.name);
	}, [
		mode,
		syncEnabled,
		gameClosed,
		legsToWin,
		player1State?.legsWon,
		player2State?.legsWon,
		player3State?.legsWon,
		player4State?.legsWon,
		player5State?.legsWon,
		player6State?.legsWon,
		player7State?.legsWon,
		player8State?.legsWon,
		players,
	]);

	const toggleModal = () => {
		setIsModalVisible((visibility) => !visibility);
	};

	const beginScoringBusy = useCallback((label = 'Zapisywanie wyniku…') => {
		setScoringBusyLabel(label);
		setScoringBusy(true);
	}, []);

	const endScoringBusy = useCallback(() => {
		setScoringBusy(false);
		setScoringBusyLabel('Zapisywanie wyniku…');
	}, []);

	const openCheckoutDartModal = (idx, visitScore, visitOpts = {}) => {
		if (checkoutClosingRef.current) {
			return;
		}
		const player = players[idx];
		pendingCheckoutRef.current = {
			idx,
			visitScore,
			visitOpts,
			legId: gameScoring.getOpenLegId?.() ?? null,
		};
		checkoutClosingRef.current = false;
		setQfHelperDart(playerStates[idx]?.dartsThrown ?? 0);
		setCheckoutModalPlayer({
			idx,
			name: player?.name ?? 'Gracz',
		});
		setIsQFModalVisible(true);
	};

	const advanceToNextLegOpener = useCallback(() => {
		dartHistoryRef.current = [];
		visitLogRef.current = [];
		visitPointsTotalRef.current = 0;
		visitClientIdRef.current = null;
		setLocalRemaining(null);
		const nextOpener = computeNextLegOpener(legOpenerIndexRef.current, N);
		legOpenerIndexRef.current = nextOpener;
		currentPlayerIndexRef.current = nextOpener;
		setCurrentPlayerIndex(nextOpener);
	}, [N, setLocalRemaining]);

	const handleBullWinnerSelection = (player) => {
		const idx = players.findIndex(
			(p) => p === player || (p?.id === player?.id && p?.name === player?.name),
		);
		if (idx >= 0) {
			legOpenerIndexRef.current = idx;
			currentPlayerIndexRef.current = idx;
			setCurrentPlayerIndex(idx);
		}
		matchOpenerChosenRef.current = true;
		setOpenerCheckPending(false);
		toggleModal();
	};

	const handleNumberBtn = (number) => {
		if (!counterCanInput) {
			return;
		}
		okHandlingRef.current = false;
		setResultEdited(true);
		if (currentResult.toString().length < 3) {
			setCurrentResult((result) => parseInt(result.toString() + number, 10));
		}
	};

	const handleClearBtn = () => {
		if (gameClosed) {
			return;
		}
		okHandlingRef.current = false;
		setCurrentResult(0);
		setResultEdited(false);
	};

	const handleMaxAndOneSeventy = (playerForAchievement, visitScore) => {
		const p = playerForAchievement ?? currentPlayer;
		if (!p) return;
		const val =
			visitScore !== undefined && visitScore !== null ? visitScore : currentResult;
		if (val == 180) {
			const max = {
				playerId: p.playerId,
				tournamentId: activeGame?.tournamentId,
				value: null,
				type: 'max',
			};
			achievementsDispatch(addAchievement(max));
		}

		if (val >= 170 && val < 180) {
			const oneSeventy = {
				playerId: p.playerId,
				tournamentId: activeGame?.tournamentId,
				value: val,
				type: 'one_seventy',
			};
			achievementsDispatch(addAchievement(oneSeventy));
		}
	};

	const handleHf = (visitScore, playerForHf) => {
		const val =
			visitScore !== undefined && visitScore !== null ? visitScore : currentResult;
		const p = playerForHf ?? currentPlayer;
		if (!p || val < 100) return;
		const hf = {
			playerId: p.playerId,
			tournamentId: activeGame?.tournamentId,
			value: val,
			type: 'hf',
		};
		achievementsDispatch(addAchievement(hf));
	};

	const handleQf = (player, dart) => {
		if (dart < 20) {
			const qf = {
				playerId: player.playerId,
				tournamentId: activeGame?.tournamentId,
				value: dart,
				type: 'qf',
			};
			achievementsDispatch(addAchievement(qf));
		}
	};

	const getCheckoutPrompt = (player) =>
		checkoutLegPrompt({
			mode,
			lobbyScoringMode,
			playerName: player?.name,
		});

	/** Wizyta przez scoring API — `resultToApply` to punkty z całej wizyty (0–180). */
	const submitOnlineVisitCore = async (resultToApply, dartsInVisit = 3) => {
		if (gameClosed || !syncEnabled) return false;
		const idx = currentPlayerIndexRef.current;
		const state = playerStatesRef.current[idx];
		const player = players[idx];
		if (
			resultToApply > 180 ||
			typeof resultToApply !== 'number' ||
			resultToApply < 0
		) {
			return false;
		}
		const visitStart = hasActivePerDartVisit()
			? (visitStartScoreRef.current ?? state?.score ?? 501)
			: (state?.score ?? 501);
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
							if (isPerDartMode) {
								popDartHistory(3);
								playerDispatches[idx](resetVisitDartLabels());
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
								if (isPerDartMode) {
									await gameScoring.closeLegWithWinner(
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

	const handleOnlineOkBtn = async () => {
		beginScoringBusy();
		try {
			await submitOnlineVisitCore(currentResult);
		} finally {
			endScoringBusy();
		}
	};

	const finishOfflinePerDartBust = (idx, visitStart, dartsInVisit) => {
		popDartHistory(dartsInVisit);
		playerDispatches[idx](resetVisitDartLabels());
		pushVisitLog(idx, 0, null, { bust: true });
		visitStartScoreRef.current = null;
		visitClientIdRef.current = null;
		visitPointsTotalRef.current = 0;
		setLocalRemaining(null);
		const nextIdx = (idx + 1) % N;
		currentPlayerIndexRef.current = nextIdx;
		setCurrentPlayerIndex(nextIdx);
	};

	const promptOfflinePerDartCheckout = (idx, visitStart, resultToApply, dartsInVisit) => {
		const player = players[idx];

		okHandlingRef.current = true;
		handleMaxAndOneSeventy(player, resultToApply);

		Alert.alert('UWAGA', getCheckoutPrompt(player), [
			{
				text: 'NIE',
				style: 'cancel',
				onPress: () => {
					popDartHistory(dartsInVisit);
					playerDispatches[idx](resetVisitDartLabels());
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
					handleCheckout(idx);
					setLocalRemaining(null);
					visitPointsTotalRef.current = 0;
					visitStartScoreRef.current = null;
				},
			},
		]);
	};

	const finishOfflinePerDartVisit = (idx, visitStart, resultToApply, dartsInVisit = 3) => {
		const dispatch = playerDispatches[idx];
		const player = players[idx];

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

	const handleDartSubmit = async (points, roundTotal, isLastDart, dartIndex, dartLabel) => {
		if (gameClosed) return;
		if (!counterCanInput) return;

		const idx = currentPlayerIndexRef.current;

		if (dartIndex === 0) {
			const visitStart = playerStates[idx]?.score ?? 501;
			visitStartScoreRef.current = visitStart;
			visitPointsTotalRef.current = 0;
			setLocalRemaining(visitStart);
			playerDispatches[idx](resetVisitDartLabels());
			if (syncEnabled) {
				visitClientIdRef.current = newClientVisitId();
			}
		}

		visitPointsTotalRef.current += points;
		pushDartToHistory(idx, points, dartLabel);

		const visitStart = visitStartScoreRef.current ?? playerStates[idx]?.score ?? 501;
		const visitTotal = visitPointsTotalRef.current;
		const dartsInVisit = dartIndex + 1;
		const { bust, checkout } = evaluatePerDartVisitAfterDart(
			visitStart,
			visitTotal,
			dartLabel,
		);

		if (bust) {
			if (syncEnabled) {
				beginScoringBusy();
				try {
					await gameScoring.submitVisit({
						playerIndex: idx,
						visitScore: 0,
						bust: true,
						dartsInVisit,
						remainingBefore: visitStart,
						clientVisitId: visitClientIdRef.current,
					});
					visitClientIdRef.current = null;
					setLocalRemaining(null);
					visitPointsTotalRef.current = 0;
					visitStartScoreRef.current = null;
				} finally {
					endScoringBusy();
				}
			} else {
				finishOfflinePerDartBust(idx, visitStart, dartsInVisit);
			}
			return;
		}

		playerDispatches[idx](appendDartLabel(dartLabel));
		const baseRemaining =
			localVisitRemainingRef.current ??
			visitStartScoreRef.current ??
			playerStates[idx]?.score ??
			501;
		setLocalRemaining(Math.max(0, baseRemaining - points));

		if (checkout) {
			if (syncEnabled) {
				beginScoringBusy();
				try {
					await submitOnlineVisitCore(visitTotal, dartsInVisit);
				} finally {
					endScoringBusy();
				}
			} else {
				promptOfflinePerDartCheckout(idx, visitStart, visitTotal, dartsInVisit);
			}
			return;
		}

		if (!isLastDart) {
			return;
		}

		visitPointsTotalRef.current = 0;

		if (syncEnabled) {
			beginScoringBusy();
			try {
				markCurrentVisitCompleted(idx);
				await submitOnlineVisitCore(visitTotal, 3);
				if (!okHandlingRef.current) {
					playerDispatches[idx](completeCurrentVisit());
					setLocalRemaining(null);
				}
			} finally {
				endScoringBusy();
			}
			return;
		}

		finishOfflinePerDartVisit(idx, visitStart, visitTotal, 3);
	};

	const handleUndoSingleDart = () => {
		if (gameClosed) return;

		if (isPerDartMode) {
			const history = dartHistoryRef.current;
			if (history.length > 0) {
				const last = history[history.length - 1];
				if (!last.completedVisit) {
					history.pop();
					const { playerIndex, points } = last;
					visitPointsTotalRef.current = Math.max(
						0,
						visitPointsTotalRef.current - points,
					);
					playerDispatches[playerIndex](popDartLabel());
					setLocalRemaining((prev) =>
						prev != null ? prev + points : null,
					);
					if (history.length === 0) {
						visitStartScoreRef.current = null;
						visitPointsTotalRef.current = 0;
						if (syncEnabled) {
							visitClientIdRef.current = null;
						}
						setLocalRemaining(null);
					}
					return;
				}
			}
		}

		if (syncEnabled) {
			visitClientIdRef.current = null;
			setLocalRemaining(null);
			void gameScoring.undoVisit();
			return;
		}

		if (!isPerDartMode) {
			const idx = currentPlayerIndexRef.current;
			playerDispatches[idx](undoSingleDart());
			return;
		}

		const log = visitLogRef.current;
		if (log.length === 0) return;

		const last = log[log.length - 1];

		if (last.bust) {
			log.pop();
			currentPlayerIndexRef.current = last.playerIndex;
			setCurrentPlayerIndex(last.playerIndex);
			setLocalRemaining(null);
			visitStartScoreRef.current = null;
			visitPointsTotalRef.current = 0;
			return;
		}

		if (last.darts?.length > 0) {
			const points = last.darts.pop();
			last.visitScore -= points;
			const st = playerStates[last.playerIndex];
			const needsReopen =
				(st?.currentVisitDartLabels?.length ?? 0) === 0 &&
				(st?.lastVisitDartLabels?.length ?? 0) > 0;
			if (needsReopen) {
				playerDispatches[last.playerIndex](reopenLastVisit());
			}
			playerDispatches[last.playerIndex](undoCommittedVisitDart(points));
			playerDispatches[last.playerIndex](popDartLabel());
			if (last.darts.length === 0) {
				log.pop();
			}
			currentPlayerIndexRef.current = last.playerIndex;
			setCurrentPlayerIndex(last.playerIndex);
			setLocalRemaining(null);
			return;
		}

		const popped = log.pop();
		playerDispatches[popped.playerIndex](undoLastVisit(popped.visitScore));
		currentPlayerIndexRef.current = popped.playerIndex;
		setCurrentPlayerIndex(popped.playerIndex);
		setLocalRemaining(null);
	};

	const handleOkBtn = () => {
		if (gameClosed) return;
		if (
			currentResult > 180 ||
			typeof currentResult !== 'number' ||
			currentResult < 0 ||
			(currentResult === 0 && !resultEdited)
		) {
			return;
		}
		if (syncEnabled) {
			void handleOnlineOkBtn();
			return;
		}
		if (okHandlingRef.current) return;

		const idx = currentPlayerIndexRef.current;
		const state = playerStates[idx];
		const dispatch = playerDispatches[idx];
		const player = players[idx];
		const resultToApply = currentResult;

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
						handleCheckout(idx);
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

	const handleCheckout = (idx, visitScore, visitOpts = {}) => {
		const score = visitScore ?? playerStates[idx]?.score ?? 501;
		if (syncEnabled) {
			if (!isPerDartMode) {
				openCheckoutDartModal(idx, score, visitOpts);
				return;
			}
			void gameScoring.closeLegWithWinner(idx, score, 3, visitOpts);
			return;
		}
		openCheckoutDartModal(idx, score, visitOpts);
	};

	const handleQFModalBtn = async (dartNumber) => {
		if (checkoutClosingRef.current) {
			return;
		}

		const pending = pendingCheckoutRef.current;
		if (!pending) {
			return;
		}

		const idx = pending.idx ?? currentPlayerIndexRef.current;
		const player = players[idx];
		checkoutClosingRef.current = true;
		pendingCheckoutRef.current = null;
		setIsQFModalVisible(false);
		setCheckoutModalPlayer(null);
		beginScoringBusy('Zamykanie lega…');

		if (syncEnabled) {
			const visitScore = pending.visitScore ?? playerStates[idx]?.score ?? 501;
			const visitOpts = {
				...(pending.visitOpts ?? {}),
				legId: pending.legId ?? null,
			};
			try {
				await gameScoring.closeLegWithWinner(
					idx,
					visitScore,
					dartNumber,
					visitOpts,
				);
				visitClientIdRef.current = null;
				setLocalRemaining(null);
				setCurrentResult(0);
				setResultEdited(false);
			} finally {
				checkoutClosingRef.current = false;
				okHandlingRef.current = false;
				endScoringBusy();
			}
			return;
		}

		const dart = qfHelperDart + dartNumber;
		if (player?.playerId) handleQf(player, dart);
		playerDispatches[idx](legWin(dartNumber));
		for (let j = 0; j < N; j++) {
			if (j !== idx) playerDispatches[j](legLose());
		}
		advanceToNextLegOpener();
		checkoutClosingRef.current = false;
		endScoringBusy();
	};

	const handleUndoBtn = () => {
		if (gameClosed) return;
		if (syncEnabled) {
			void gameScoring.undoVisit();
			return;
		}

		const log = visitLogRef.current;
		if (log.length > 0) {
			const last = log.pop();
			currentPlayerIndexRef.current = last.playerIndex;
			setCurrentPlayerIndex(last.playerIndex);
			if (!last.bust) {
				playerDispatches[last.playerIndex](undoLastVisit(last.visitScore));
			}
			return;
		}

		const allAtStart = playerStates.every((s) => s.score === 501);
		if (allAtStart) return;

		const prevIdx = (currentPlayerIndexRef.current - 1 + N) % N;
		currentPlayerIndexRef.current = prevIdx;
		setCurrentPlayerIndex(prevIdx);
		playerDispatches[prevIdx](undo());
	};

	useEffect(() => {
		if (!gameClosed || mode !== GAME_MODE.TOURNAMENT || !syncEnabled) return;
		if (tournamentResultSentRef.current) return;
		tournamentResultSentRef.current = true;

		const winnerIdx = findWinnerIndex(playerStates, tournamentLegsToWin());
		const achievementsPayload = mapAchievementsForTournament(achievementsState);
		if (achievementsPayload.length > 0) {
			void sendTournamentAchievements({
				accessToken: auth?.accessToken,
				activeGame,
				players,
				playerStates,
				N,
				achievements: achievementsPayload,
			});
		}
		showGameFinishedAlert(players[winnerIdx]?.name);
	}, [
		gameClosed,
		mode,
		syncEnabled,
		player1State.legsWon,
		player2State.legsWon,
		achievementsState?.achievements,
		auth?.accessToken,
		activeGame,
		players,
		playerStates,
		N,
	]);

	useEffect(
		() =>
			navigation.addListener('beforeRemove', (e) => {
				e.preventDefault();

				Alert.alert('UWAGA', 'Czy na pewno chcesz opuścić mecz?', [
					{ text: 'KONTYNUUJ MECZ', style: 'cancel', onPress: () => {} },
					{
						text: 'OPUŚĆ MECZ',
						style: 'destructive',
						onPress: async () => {
							if (
								mode === GAME_MODE.TOURNAMENT &&
								!gameClosed &&
								tournamentGame?.id &&
								auth?.accessToken
							) {
								await releaseTournamentGame({
									gameId: tournamentGame.id,
									type: tournamentGame.type === 'playoff' ? 'playoff' : 'group',
									accessToken: auth.accessToken,
								});
							}
							if (
								mode === GAME_MODE.QUICK_FFA &&
								syncEnabled &&
								!gameClosed &&
								lobbyId &&
								auth?.accessToken
							) {
								intentionalFfaLeaveRef.current = true;
								try {
									await postFfaPresence(lobbyId, auth.accessToken, 'left');
								} catch {
									// Wyjście z ekranu i tak dozwolone
								}
								await clearActiveFfaLobby();
							}
							navigation.dispatch(e.data.action);
						},
					},
				]);
			}),
		[
			navigation,
			mode,
			gameClosed,
			tournamentGame,
			auth?.accessToken,
			syncEnabled,
			lobbyId,
		],
	);

	useEffect(() => {
		if (
			mode !== GAME_MODE.QUICK_FFA ||
			!syncEnabled ||
			!lobbyId ||
			!auth?.accessToken ||
			gameClosed
		) {
			return undefined;
		}

		let cancelled = false;
		const token = auth.accessToken;

		const sendPresence = async (status) => {
			if (cancelled) return;
			try {
				await postFfaPresence(lobbyId, token, status);
			} catch {
				// Ignoruj błędy sieci — heartbeat spróbuje ponownie
			}
		};

		saveActiveFfaLobby(lobbyId);
		sendPresence('connected');

		const heartbeat = setInterval(() => sendPresence('connected'), 30000);

		const appStateSub = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active') {
				sendPresence('connected');
			} else if (nextState === 'background' || nextState === 'inactive') {
				sendPresence('disconnected');
			}
		});

		return () => {
			cancelled = true;
			clearInterval(heartbeat);
			appStateSub.remove();
			if (!intentionalFfaLeaveRef.current) {
				sendPresence('disconnected');
			}
		};
	}, [mode, syncEnabled, lobbyId, auth?.accessToken, gameClosed]);

	useEffect(() => {
		if (gameClosed && mode === GAME_MODE.QUICK_FFA) {
			clearActiveFfaLobby();
		}
	}, [gameClosed, mode]);

	function renderContent() {
		if (selectedComponent === 'counter') {
			return (
				<Counter
					players={players}
					playerStates={playerStates}
					currentPlayerIndex={currentPlayerIndex}
					currentResult={currentResult}
					resultEdited={resultEdited}
					handleNumberBtn={handleNumberBtn}
					handleOkBtn={handleOkBtn}
					handleUndoBtn={handleUndoBtn}
					handleClearBtn={handleClearBtn}
					scoringMode={scoringMode}
					canInput={counterTurnAllowed}
					submitting={scoringBusy}
					gameClosed={gameClosed}
					oneDeviceSpectator={counterOneDeviceSpectator}
					handleDartSubmit={handleDartSubmit}
					handleUndoSingleDart={handleUndoSingleDart}
					localVisitRemaining={localVisitRemaining}
				/>
			);
		}
		if (selectedComponent === 'stats') {
			return <Stats players={players} playerStates={playerStates} />;
		}
		if (selectedComponent === 'settings') {
			return (
				<Settings
					scoringMode={scoringMode}
					setScoringMode={setScoringMode}
					loaded={gameSettingsLoaded}
				/>
			);
		}
		return null;
	}

	return (
		<View style={styles.container}>
			<Modal visible={isModalVisible}>
				<View style={styles.modalContainer}>
					<Text style={styles.modalText}>Kto zaczyna mecz?</Text>
					<View
						style={[styles.modalBtnsContainer, N > 2 && styles.modalBtnsWrap]}
					>
						{players.slice(0, N).map((p, i) => (
							<Pressable
								key={i}
								style={styles.modalBtn}
								onPress={() => handleBullWinnerSelection(p)}
							>
								<Text style={styles.modalBtnText} numberOfLines={1}>
									{p?.name ?? 'Gracz'}
								</Text>
							</Pressable>
						))}
					</View>
				</View>
			</Modal>

			{checkoutModalPlayer && (
				<Modal visible={isQFModalVisible}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalText}>
							Którą lotką {checkoutModalPlayer.name} skończył lega?
						</Text>
						<View
							style={[styles.modalBtnsContainer, styles.qfModalBtnsContainer]}
						>
							<Pressable
								style={[styles.modalBtn, styles.qfModalBtn]}
								onPress={() => handleQFModalBtn(1)}
							>
								<Text style={styles.modalBtnText}>1</Text>
							</Pressable>
							<Pressable
								style={[styles.modalBtn, styles.qfModalBtn]}
								onPress={() => handleQFModalBtn(2)}
							>
								<Text style={styles.modalBtnText}>2</Text>
							</Pressable>
							<Pressable
								style={[styles.modalBtn, styles.qfModalBtn]}
								onPress={() => handleQFModalBtn(3)}
							>
								<Text style={styles.modalBtnText}>3</Text>
							</Pressable>
						</View>
					</View>
				</Modal>
			)}

			{scoringBusy && !isQFModalVisible && (
				<View style={styles.scoringBusyOverlay} pointerEvents="none">
					<ActivityIndicator size="large" color="#F99417" />
					<Text style={styles.scoringBusyText}>{scoringBusyLabel}</Text>
				</View>
			)}

			<View style={styles.navigationContainer}>
				<Pressable
					style={
						selectedComponent === 'counter'
							? [styles.navigationBtn, styles.selectedNavigationBtn]
							: [styles.navigationBtn]
					}
					onPress={() => setSelectedComponent('counter')}
				>
					<Text style={[styles.navigationBtnText]}>Wynik</Text>
				</Pressable>
				<Pressable
					style={
						selectedComponent === 'stats'
							? [styles.navigationBtn, styles.selectedNavigationBtn]
							: [styles.navigationBtn]
					}
					onPress={() => setSelectedComponent('stats')}
				>
					<Text style={styles.navigationBtnText}>Statystyki</Text>
				</Pressable>
				<Pressable
					style={
						selectedComponent === 'settings'
							? [styles.navigationBtn, styles.selectedNavigationBtn]
							: [styles.navigationBtn]
					}
					onPress={() => setSelectedComponent('settings')}
				>
					<Text style={styles.navigationBtnText}>Ustawienia</Text>
				</Pressable>
			</View>

			{presenceBannerMessages.length > 0 && (
				<View style={styles.presenceBanner}>
					{presenceBannerMessages.map((message) => (
						<Text key={message} style={styles.presenceBannerText}>
							{message}
						</Text>
					))}
				</View>
			)}

			{renderContent()}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		backgroundColor: '#363062',
	},
	presenceBanner: {
		backgroundColor: '#5c1d1d',
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	presenceBannerText: {
		color: '#ffd4d4',
		fontSize: 14,
		textAlign: 'center',
		marginVertical: 2,
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#363062',
	},
	modalText: {
		color: '#c5c5c5',
		marginRight: 50,
		marginLeft: 50,
		marginBottom: 30,
		fontSize: 20,
		textAlign: 'center',
	},
	modalBtnsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
		width: '100%',
		paddingRight: 50,
		paddingLeft: 50,
	},
	modalBtnsWrap: {
		flexWrap: 'wrap',
		gap: 12,
	},
	qfModalBtnsContainer: {
		flexDirection: 'column',
	},
	modalBtn: {
		width: 120,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: 'rgba(255,255,255,.3)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	qfModalBtn: {
		marginTop: 30,
	},
	checkoutLoadingBox: {
		alignItems: 'center',
		marginTop: 24,
	},
	checkoutLoadingText: {
		color: '#e8e8e8',
		fontSize: 18,
		marginTop: 16,
		textAlign: 'center',
	},
	scoringBusyOverlay: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 56,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(54, 48, 98, 0.72)',
		zIndex: 10,
	},
	scoringBusyText: {
		color: '#f5f5f5',
		fontSize: 18,
		marginTop: 14,
		textAlign: 'center',
	},
	modalBtnText: {
		color: '#c5c5c5',
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 15,
		paddingRight: 15,
		fontSize: 18,
	},
	navigationContainer: {
		flexDirection: 'row',
	},
	navigationBtn: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,.3)',
		paddingTop: 5,
		paddingBottom: 5,
	},
	selectedNavigationBtn: {
		backgroundColor: 'rgba(0,0,0,.3)',
	},
	navigationBtnText: {
		fontSize: 18,
		color: '#c5c5c5',
	},
});

export default GameScoringScreen;

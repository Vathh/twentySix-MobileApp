import React, {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Alert, Pressable, Text, View } from 'react-native';
import { playerResultReducer } from '../../helpers/reducers/playerResultReducer';
import {
  appendDartLabel,
  completeCurrentVisit,
  createInitialPlayerResultState,
  popDartLabel,
  reopenLastVisit,
	resetVisitDartLabels,
	undo,
	undoCommittedVisitDart,
	undoLastVisit,
	undoSingleDart,
} from '../../helpers/reducers/playerResultActions';
import { achievementsReducer } from '../../helpers/reducers/achievementsReducer';
import {
	addAchievement,
	initialAchievementsState,
} from '../../helpers/reducers/achievementActions';
import Counter from './Counter';
import Stats from './Stats';
import Settings from '../Core/Settings';
import GameScoringModals from './GameScoringModals';
import { gameScoringScreenStyles as styles } from './GameScoringScreen.styles';
import { useGameSettings } from '../../hooks/useGameSettings';
import useAuth from '../../hooks/useAuth';
import { useGameScoring } from '../../hooks/useGameScoring';
import { useFfaPresenceHeartbeat } from '../../hooks/useFfaPresenceHeartbeat';
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
	createOfflineVisitFlow,
	createOnlineVisitFlow,
} from '../../helpers/gameScoring';
import { createFfaTransport } from '../../helpers/gameScoring/transports/createFfaTransport.js';
import { releaseTournamentGame } from '../../helpers/lockTournamentGame';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';
import { evaluatePerDartVisitAfterDart } from '../../helpers/perDartVisitRules';
import { postFfaPresence } from '../../helpers/quickGameFfaApi';
import {
	clearActiveFfaLobby,
} from '../../helpers/activeQuickGameMatch';
import { buildFfaPresenceBannerMessages } from '../../helpers/ffaPresenceMessages';
import { normalizeMatchFormat } from '../../helpers/matchFormat/matchFormat';

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
		matchFormat: routeMatchFormat,
		transport,
		reloadKey,
		lobbyScoringMode,
		isHost,
		myPlayerIndex,
		tournamentGame,
		activeGame,
		lobbyId,
	} = gameCtx;

	const [syncedMatchFormat, setSyncedMatchFormat] = useState(null);
	const matchFormat = syncedMatchFormat ?? routeMatchFormat;

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

	const startingScore = matchFormat?.startingScore ?? 501;

	const [player1State, player1Dispatch] = useReducer(
		playerResultReducer,
		startingScore,
		createInitialPlayerResultState,
	);
	const [player2State, player2Dispatch] = useReducer(
		playerResultReducer,
		startingScore,
		createInitialPlayerResultState,
	);
	const [player3State, player3Dispatch] = useReducer(
		playerResultReducer,
		startingScore,
		createInitialPlayerResultState,
	);
	const [player4State, player4Dispatch] = useReducer(
		playerResultReducer,
		startingScore,
		createInitialPlayerResultState,
	);
	const [player5State, player5Dispatch] = useReducer(
		playerResultReducer,
		startingScore,
		createInitialPlayerResultState,
	);
	const [player6State, player6Dispatch] = useReducer(
		playerResultReducer,
		startingScore,
		createInitialPlayerResultState,
	);
	const [player7State, player7Dispatch] = useReducer(
		playerResultReducer,
		startingScore,
		createInitialPlayerResultState,
	);
	const [player8State, player8Dispatch] = useReducer(
		playerResultReducer,
		startingScore,
		createInitialPlayerResultState,
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
			const formatFromState =
				state?.meta?.matchFormat
				?? state?.game?.matchFormat
				?? state?.session?.matchFormat
				?? null;
			if (formatFromState) {
				setSyncedMatchFormat(normalizeMatchFormat(formatFromState));
			}
			if (!isTournamentOnline || matchOpenerChosenRef.current) {
				return;
			}
			const resumed =
				(state?.game?.player1LegsWon ?? 0) +
					(state?.game?.player2LegsWon ?? 0) >
					0 ||
				(state?.legs?.length ?? 0) > 0 ||
				(state?.visits?.length ?? 0) > 0;
			matchOpenerChosenRef.current = resumed;
			setIsModalVisible(!resumed);
			setOpenerCheckPending(false);
		},
		[isTournamentOnline],
	);

	const handleSyncedMatchFormat = useCallback((format) => {
		if (format) {
			setSyncedMatchFormat(normalizeMatchFormat(format));
		}
	}, []);

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
		onMatchFormat: handleSyncedMatchFormat,
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
			scoringBusy,
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

	const KEEP_AWAKE_TAG = 'twentysix-game-scoring';
	useEffect(() => {
		if (gameClosed) {
			void deactivateKeepAwake(KEEP_AWAKE_TAG);
			return undefined;
		}
		void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
		return () => {
			void deactivateKeepAwake(KEEP_AWAKE_TAG);
		};
	}, [gameClosed]);

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

		const winnerIdx = findWinnerIndex(playerStates, matchFormat);
		showGameFinishedAlert(players[winnerIdx]?.name, {
			title: 'Mecz zakończony',
		});
	}, [
		gameClosed,
		mode,
		ffaFinishedQuickGameId,
		achievementsState?.achievements,
		auth?.accessToken,
		players,
		playerStates,
		matchFormat,
		gameScoring.finishedQuickGameIdRef,
	]);

	useEffect(() => {
		if (
			!shouldHandleLocalTrainingWin({
				mode,
				syncEnabled,
				playerStates,
				matchFormat,
			})
		) {
			return;
		}
		if (gameClosed) return;

		setGameClosed(true);
		const winnerIdx = findWinnerIndex(playerStates, matchFormat);
		showTrainingFinishedAlert(players[winnerIdx]?.name);
	}, [
		mode,
		syncEnabled,
		gameClosed,
		matchFormat,
		playerStates,
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

	const offlineVisit = createOfflineVisitFlow({
		N,
		getPlayers: () => players,
		getPlayerStates: () => playerStates,
		getPlayerDispatches: () => playerDispatches,
		getMatchFormat: () => matchFormat,
		getStartingScore: () => startingScore,
		isPerDartMode: () => isPerDartMode,
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
		getCurrentResult: () => currentResult,
		advanceToNextLegOpener,
		openCheckoutDartModal,
	});

	const onlineVisit = createOnlineVisitFlow({
		getGameClosed: () => gameClosed,
		getSyncEnabled: () => syncEnabled,
		getPlayers: () => players,
		getPlayerDispatches: () => playerDispatches,
		getPlayerStatesRef: () => playerStatesRef,
		getStartingScore: () => startingScore,
		isPerDartMode: () => isPerDartMode,
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
		getGameScoring: () => gameScoring,
		getCurrentResult: () => currentResult,
		beginScoringBusy,
		endScoringBusy,
	});

	const {
		submitOnlineVisitCore,
		promptOnlinePerDartCheckout,
		handleOnlineOkBtn,
	} = onlineVisit;

	const finishOfflinePerDartBust = offlineVisit.finishOfflinePerDartBust;
	const promptOfflinePerDartCheckout = offlineVisit.promptOfflinePerDartCheckout;
	const finishOfflinePerDartVisit = offlineVisit.finishOfflinePerDartVisit;

	const handleDartSubmit = async (points, roundTotal, isLastDart, dartIndex, dartLabel) => {
		if (gameClosed || !counterCanInput) {
			return 'ended';
		}

		const idx = currentPlayerIndexRef.current;

		if (dartIndex === 0) {
			const visitStart = playerStates[idx]?.score ?? startingScore;
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

		const visitStart = visitStartScoreRef.current ?? playerStates[idx]?.score ?? startingScore;
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
			return 'ended';
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
					await promptOnlinePerDartCheckout(
						idx,
						visitStart,
						visitTotal,
						dartsInVisit,
					);
				} finally {
					endScoringBusy();
				}
			} else {
				promptOfflinePerDartCheckout(idx, visitStart, visitTotal, dartsInVisit);
			}
			return 'ended';
		}

		if (!isLastDart) {
			return 'continue';
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
			return 'ended';
		}

		finishOfflinePerDartVisit(idx, visitStart, visitTotal, 3);
		return 'ended';
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
		offlineVisit.handleOfflineSumVisit();
	};

	const handleCheckout = (
		idx,
		visitScore,
		visitOpts = {},
		checkoutDart = null,
	) => {
		const score = visitScore ?? playerStates[idx]?.score ?? startingScore;
		if (syncEnabled) {
			if (!isPerDartMode) {
				openCheckoutDartModal(idx, score, visitOpts);
				return;
			}
			void gameScoring.closeLegWithWinner(
				idx,
				score,
				checkoutDart ?? 3,
				visitOpts,
			);
			return;
		}
		offlineVisit.handleOfflineCheckout(idx, visitScore, visitOpts, checkoutDart);
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
		checkoutClosingRef.current = true;
		pendingCheckoutRef.current = null;
		setIsQFModalVisible(false);
		setCheckoutModalPlayer(null);
		beginScoringBusy('Zamykanie lega…');

		if (syncEnabled) {
			const visitScore = pending.visitScore ?? playerStates[idx]?.score ?? startingScore;
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

		offlineVisit.finishOfflineLegWin(idx, dartNumber);
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

		const allAtStart = playerStates.every((s) => s.score === startingScore);
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

		const winnerIdx = findWinnerIndex(playerStates, matchFormat);
		const achievementsPayload = mapAchievementsForTournament(achievementsState);
		if (achievementsPayload.length > 0) {
			void sendTournamentAchievements({
				accessToken: auth?.accessToken,
				activeGame,
				players,
				playerStates,
				N,
				achievements: achievementsPayload,
				matchFormat,
			});
		}
		showGameFinishedAlert(players[winnerIdx]?.name);
	}, [
		gameClosed,
		mode,
		syncEnabled,
		matchFormat,
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

	useFfaPresenceHeartbeat({
		mode,
		syncEnabled,
		lobbyId,
		accessToken: auth?.accessToken,
		gameClosed,
		intentionalFfaLeaveRef,
	});

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
					canInput={counterCanInput}
					showWaitingOverlay={!openerCheckPending}
					submitting={scoringBusy}
					gameClosed={gameClosed}
					oneDeviceSpectator={counterOneDeviceSpectator}
					handleDartSubmit={handleDartSubmit}
					handleUndoSingleDart={handleUndoSingleDart}
					localVisitRemaining={localVisitRemaining}
					matchFormat={matchFormat}
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
			<GameScoringModals
				isOpenerModalVisible={isModalVisible}
				players={players}
				playerCount={N}
				onSelectOpener={handleBullWinnerSelection}
				checkoutModalPlayer={checkoutModalPlayer}
				isCheckoutModalVisible={isQFModalVisible}
				onCheckoutDart={handleQFModalBtn}
				scoringBusy={scoringBusy}
				scoringBusyLabel={scoringBusyLabel}
			/>

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

export default GameScoringScreen;

import React, {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useIsFocused } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  appendDartLabel,
  completeCurrentVisit,
  popDartLabel,
  reopenLastVisit,
	resetVisitDartLabels,
	undo,
	undoLastVisit,
	undoSingleDart,
} from '../../helpers/reducers/playerResultActions';
import { achievementsReducer } from '../../helpers/reducers/achievementsReducer';
import { initialAchievementsState } from '../../helpers/reducers/achievementActions';
import Counter from './Counter';
import Stats from './Stats';
import Settings from '../Core/Settings';
import GameScoringModals from './GameScoringModals';
import GameFinishedModal from './GameFinishedModal';
import { gameScoringScreenStyles as styles } from './GameScoringScreen.styles';
import { useGameSettings } from '../../hooks/useGameSettings';
import useAuth from '../../hooks/useAuth';
import { useGameScoring } from '../../hooks/useGameScoring';
import { usePlayersBoard } from '../../hooks/usePlayersBoard';
import { useLatestCallback } from '../../hooks/useLatestCallback';
import { notifyFfaGameAborted } from '../../helpers/gameScoring/notifyFfaGameAborted';
import { useFfaPresenceHeartbeat } from '../../hooks/useFfaPresenceHeartbeat';
import { useGameFinishedEffects } from '../../hooks/useGameFinishedEffects';
import { useGameFinishedModal } from '../../hooks/useGameFinishedModal';
import { useLeaveGameConfirmation } from '../../hooks/useLeaveGameConfirmation';
import {
	markTournamentFinishedPrompted,
	useTournamentFinishedRealtime,
} from '../../hooks/useTournamentFinishedRealtime';
import {
	canCounterInput,
	checkoutLegPrompt,
	isOneDeviceSpectator,
	GAME_MODE,
	newClientVisitId,
	resolveGameContext,
	createOfflineVisitFlow,
	createOnlineVisitFlow,
} from '../../helpers/gameScoring';
import { createAchievementHandlers } from '../../helpers/gameScoring/achievementHandlers';
import { createDartHistoryTracker } from '../../helpers/gameScoring/dartHistoryTracker';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';
import { evaluatePerDartVisitAfterDart } from '../../helpers/perDartVisitRules';
import { recordedDartsInVisit, openVisitDarts } from '../../helpers/gameScoring/visitDarts';
import {
	countDoubleOutFromDarts,
	mergeDoubleStats,
} from '../../helpers/gameScoring/doubleOutStats';
import { playCheckoutWinSound, playClick, playGameOn, playVisitScore } from '../../helpers/gameSounds';
import { buildFfaPresenceBannerMessages } from '../../helpers/ffaPresenceMessages';
import { normalizeMatchFormat } from '../../helpers/matchFormat/matchFormat';

function scoringStateHasProgress(state) {
	if (!state) {
		return false;
	}
	if ((state.visits?.length ?? 0) > 0) {
		return true;
	}
	if ((state.legs?.length ?? 0) > 0) {
		return true;
	}
	if (
		(state.game?.player1LegsWon ?? 0) + (state.game?.player2LegsWon ?? 0) >
		0
	) {
		return true;
	}
	if ((state.players ?? []).some((p) => (p.legsWon ?? 0) > 0)) {
		return true;
	}
	const legNumber =
		state.currentLeg?.legNumber
		?? state.turn?.legNumber
		?? state.session?.currentLegNumber
		?? 0;
	return Number(legNumber) > 1;
}

const X01GameScoringScreen = ({ route, navigation }) => {
	const { auth, setAuth } = useAuth();
	const isFocused = useIsFocused();
	const insets = useSafeAreaInsets();
	const {
		scoringMode,
		setScoringMode,
		soundsEnabled,
		setSoundsEnabled,
		soundVolume,
		setSoundVolume,
		loaded: gameSettingsLoaded,
		isPerDartMode,
	} = useGameSettings();

	const [selectedComponent, setSelectedComponent] = useState('counter');

	/** Musi istnieć przed resolveGameContext — factory dokłada go do transportu FFA (live turn check). */
	const currentPlayerIndexRef = useRef(0);

	const gameCtx = useMemo(
		() =>
			resolveGameContext(route.params, auth, {
				getCurrentPlayerIndex: () => currentPlayerIndexRef.current,
			}),
		[route.params, auth],
	);
	const {
		mode,
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

	const isH2hOnline =
		(mode === GAME_MODE.TOURNAMENT || mode === GAME_MODE.LEAGUE) &&
		syncEnabled;
	const isTournamentOnline = mode === GAME_MODE.TOURNAMENT && syncEnabled;
	const tournamentIdForSession =
		auth?.tournamentId ?? activeGame?.tournamentId ?? tournamentGame?.tournamentId ?? null;

	/** Po finale turnieju nie wylogowuj od razu — najpierw modal meczu + statystyki. */
	const pendingTournamentLogoutRef = useRef(false);

	const logoutAfterTournamentIfNeeded = useCallback(() => {
		if (!pendingTournamentLogoutRef.current) {
			return;
		}
		pendingTournamentLogoutRef.current = false;
		setAuth({});
	}, [setAuth]);

	useTournamentFinishedRealtime({
		tournamentId: tournamentIdForSession,
		enabled: isTournamentOnline && !!auth?.accessToken && tournamentIdForSession != null,
		onFinished: () => {
			pendingTournamentLogoutRef.current = true;
			markTournamentFinishedPrompted(tournamentIdForSession);
		},
	});

	const askOpenerOnMount = route.params?.askOpener === true;
	const [isModalVisible, setIsModalVisible] = useState(
		askOpenerOnMount || (showStartModal && !isH2hOnline),
	);
	const [openerCheckPending, setOpenerCheckPending] =
		useState(isH2hOnline && !askOpenerOnMount);
	const matchOpenerChosenRef = useRef(
		!askOpenerOnMount && !showStartModal && !isH2hOnline,
	);
	const gameOnPlayedRef = useRef(false);
	const [audioStartReady, setAudioStartReady] = useState(!syncEnabled);
	const [isQFModalVisible, setIsQFModalVisible] = useState(false);
	/** Zamrożony kontekst modala checkout — nie zależy od currentPlayerIndex po zamknięciu lega. */
	const [checkoutModalPlayer, setCheckoutModalPlayer] = useState(null);
	const [gameClosed, setGameClosed] = useState(false);
	const [gameAborted, setGameAborted] = useState(false);

	const startingScore = matchFormat?.startingScore ?? 501;

	const [playerStates, playerDispatches] = usePlayersBoard(N, startingScore);
	const playerStatesRef = useRef(playerStates);
	playerStatesRef.current = playerStates;

	const [achievementsState, achievementsDispatch] = useReducer(
		achievementsReducer,
		initialAchievementsState,
	);

	const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
	/** Indeks zawodnika rozpoczynającego bieżący leg (rotacja: opener+1 po zamknięciu lega). */
	const legOpenerIndexRef = useRef(0);
	const okHandlingRef = useRef(false);
	/** Checkout w trybie sumy — czeka na wybór lotki (1–3) przed zamknięciem lega online. */
	const pendingCheckoutRef = useRef(null);
	/** Blokada podwójnego kliknięcia w modalu lotki checkout (API trwa długo). */
	const checkoutClosingRef = useRef(false);
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

	const {
		pushVisitLog,
		getRecentVisitDartPoints,
		discardInProgressPerDartVisit,
		pushDartToHistory,
		popDartHistory,
		markCurrentVisitCompleted,
		reopenLastCompletedVisitDart,
		hasActivePerDartVisit,
		markLastDartBust,
	} = createDartHistoryTracker({
		dartHistoryRef,
		visitLogRef,
		visitPointsTotalRef,
		visitStartScoreRef,
		visitClientIdRef,
		localVisitRemainingRef,
		playerDispatches,
		setLocalRemaining,
		currentPlayerIndexRef,
		isPerDartMode: () => isPerDartMode,
	});

	const prevPerDartModeRef = useRef(isPerDartMode);

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
			const hasProgress = scoringStateHasProgress(state);
			if (hasProgress) {
				gameOnPlayedRef.current = true;
			}
			setAudioStartReady(true);
			if (!isH2hOnline || matchOpenerChosenRef.current) {
				return;
			}
			if (hasProgress) {
				matchOpenerChosenRef.current = true;
				setIsModalVisible(false);
				setOpenerCheckPending(false);
				return;
			}
			setIsModalVisible(true);
			setOpenerCheckPending(false);
		},
		[isH2hOnline],
	);

	useEffect(() => {
		if (!askOpenerOnMount || matchOpenerChosenRef.current) {
			return;
		}
		setIsModalVisible(true);
		setOpenerCheckPending(false);
	}, [askOpenerOnMount, isH2hOnline, reloadKey]);

	const handleSyncedMatchFormat = useCallback((format) => {
		if (format) {
			setSyncedMatchFormat(normalizeMatchFormat(format));
		}
	}, []);

	const matchDoubleAccRef = useRef([]);

	const collectLegDoubleStats = () => {
		const map = {};
		players.forEach((p, i) => {
			const counted = countDoubleOutFromDarts(
				dartHistoryRef.current.filter((d) => d.playerIndex === i),
			);
			if (p.playerId != null) {
				map[p.playerId] = counted;
			}
			matchDoubleAccRef.current[i] = mergeDoubleStats(
				matchDoubleAccRef.current[i],
				counted,
			);
		});
		return map;
	};

	const gameScoring = useGameScoring({
		enabled: syncEnabled && !gameClosed,
		transport,
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
		useLegOpenerRotation: isH2hOnline,
		onFinishedQuickGameId: setFfaFinishedQuickGameId,
		onStateLoaded: handleScoringStateLoaded,
		onMatchFormat: handleSyncedMatchFormat,
		reloadKey,
		onAborted: () => {
			setGameAborted(true);
			notifyFfaGameAborted(navigation);
		},
		getCloseLegDoubleStats: () => {
			const map = {};
			players.forEach((p, i) => {
				if (p.playerId == null) return;
				map[p.playerId] = countDoubleOutFromDarts(
					dartHistoryRef.current.filter((d) => d.playerIndex === i),
				);
			});
			return map;
		},
	});

	const { ffaPresence, syncPending } = gameScoring;

	const myPlayerId = useMemo(() => {
		if (myPlayerIndex == null || myPlayerIndex < 0) return null;
		return players[myPlayerIndex]?.id ?? null;
	}, [myPlayerIndex, players]);

	const presenceBannerMessages = useMemo(
		() =>
			buildFfaPresenceBannerMessages(ffaPresence, myPlayerId, {
				scoringMode: lobbyScoringMode,
			}),
		[ffaPresence, myPlayerId, lobbyScoringMode],
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
		if (!isFocused || gameClosed) {
			void deactivateKeepAwake(KEEP_AWAKE_TAG);
			return undefined;
		}
		void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
		return () => {
			void deactivateKeepAwake(KEEP_AWAKE_TAG);
		};
	}, [isFocused, gameClosed]);

	useEffect(() => {
		if (gameOnPlayedRef.current || gameClosed || !audioStartReady) {
			return;
		}
		if (isModalVisible || openerCheckPending || !isFocused) {
			return;
		}
		gameOnPlayedRef.current = true;
		playGameOn();
	}, [
		audioStartReady,
		isModalVisible,
		openerCheckPending,
		isFocused,
		gameClosed,
	]);

	const { finishedModalProps, showFinished } = useGameFinishedModal({
		navigation,
		mode,
		isHost,
		lobbyId,
		accessToken: auth?.accessToken,
		players,
		matchFormat,
	});

	const showMatchFinished = useCallback(
		(args) => {
			showFinished({
				...args,
				tournamentEnded: pendingTournamentLogoutRef.current,
			});
		},
		[showFinished],
	);

	useGameFinishedEffects({
		mode,
		gameClosed,
		setGameClosed,
		syncEnabled,
		players,
		playerStates,
		matchFormat,
		achievementsState,
		accessToken: auth?.accessToken,
		ffaFinishedQuickGameId,
		finishedQuickGameIdRef: gameScoring.finishedQuickGameIdRef,
		activeGame,
		N,
		onFinished: showMatchFinished,
		foldTrainingDoubles: () => collectLegDoubleStats(),
		matchDoubleAccRef,
		isPerDart: isPerDartMode,
		visitLog: visitLogRef.current,
		gameAborted,
	});

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
		const byIndex = {};
		for (const dart of dartHistoryRef.current) {
			const i = dart.playerIndex;
			byIndex[i] ??= [];
			byIndex[i].push(dart);
		}
		Object.keys(byIndex).forEach((key) => {
			const i = Number(key);
			matchDoubleAccRef.current[i] = mergeDoubleStats(
				matchDoubleAccRef.current[i],
				countDoubleOutFromDarts(byIndex[i]),
			);
		});
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
		setIsModalVisible(false);
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

	const { handleMaxAndOneSeventy, handleHf, handleQf } = createAchievementHandlers({
		achievementsDispatch,
		activeGame,
		currentPlayer,
		currentResult,
	});

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
		handleQf,
		getCheckoutPrompt,
		openCheckoutDartModal,
		getMatchFormat: () => matchFormat,
		getGameScoring: () => gameScoring,
		getCurrentResult: () => currentResult,
		beginScoringBusy,
		endScoringBusy,
		dartHistoryRef,
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

		if (dartIndex === 0 && visitStartScoreRef.current == null) {
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
		const remainingBeforeThisDart = (visitStartScoreRef.current ?? playerStates[idx]?.score ?? startingScore)
			- (visitPointsTotalRef.current - points);
		pushDartToHistory(idx, points, dartLabel, remainingBeforeThisDart);

		const visitStart = visitStartScoreRef.current ?? playerStates[idx]?.score ?? startingScore;
		const visitTotal = visitPointsTotalRef.current;
		const dartsInVisit = dartIndex + 1;
		const { bust, checkout } = evaluatePerDartVisitAfterDart(
			visitStart,
			visitTotal,
			dartLabel,
		);

		if (bust) {
			markLastDartBust();
			playVisitScore(0);
			const recordedDarts = recordedDartsInVisit({
				bust: true,
				physicalDarts: dartsInVisit,
			});
			if (syncEnabled) {
				beginScoringBusy();
				try {
					await gameScoring.submitVisit({
						playerIndex: idx,
						visitScore: 0,
						bust: true,
						dartsInVisit: recordedDarts,
						remainingBefore: visitStart,
						clientVisitId: visitClientIdRef.current,
						darts: openVisitDarts(dartHistoryRef.current, idx),
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
			playClick();
			return 'continue';
		}

		playVisitScore(visitTotal);
		visitPointsTotalRef.current = 0;

		if (syncEnabled) {
			beginScoringBusy();
			try {
				const visitDarts = openVisitDarts(dartHistoryRef.current, idx);
				markCurrentVisitCompleted(idx);
				await submitOnlineVisitCore(visitTotal, 3, visitDarts);
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

				const playerIndex = last.playerIndex;
				const remainingAfterVisit = playerStates[playerIndex]?.score ?? startingScore;
				const reopened = reopenLastCompletedVisitDart(playerIndex);
				if (reopened) {
					const visitStart =
						remainingAfterVisit +
						reopened.undonePoints +
						reopened.remainingPoints;
					visitStartScoreRef.current = visitStart;
					visitPointsTotalRef.current = reopened.remainingPoints;
					setLocalRemaining(visitStart - reopened.remainingPoints);
					if (syncEnabled) {
						visitClientIdRef.current = newClientVisitId();
					}
					const needsReopen =
						(playerStates[playerIndex]?.currentVisitDartLabels?.length ?? 0) === 0 &&
						(playerStates[playerIndex]?.lastVisitDartLabels?.length ?? 0) > 0;
					if (needsReopen) {
						playerDispatches[playerIndex](reopenLastVisit());
					}
					playerDispatches[playerIndex](popDartLabel());
					currentPlayerIndexRef.current = playerIndex;
					setCurrentPlayerIndex(playerIndex);

					if (syncEnabled) {
						void gameScoring.undoVisit();
						return;
					}

					const fullVisitScore =
						reopened.undonePoints + reopened.remainingPoints;
					playerDispatches[playerIndex](undoLastVisit(fullVisitScore));
					const log = visitLogRef.current;
					const logLast = log[log.length - 1];
					if (logLast && !logLast.bust && logLast.darts?.length > 0) {
						logLast.darts.pop();
						logLast.visitScore = reopened.remainingPoints;
						if (logLast.darts.length === 0) {
							log.pop();
						}
					} else if (logLast?.bust) {
						log.pop();
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
			playerDispatches[last.playerIndex](undoLastVisit(0));
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
			playerDispatches[last.playerIndex](undoLastVisit(last.visitScore + points));
			playerDispatches[last.playerIndex](popDartLabel());
			visitStartScoreRef.current =
				(playerStates[last.playerIndex]?.score ?? startingScore) + last.visitScore + points;
			visitPointsTotalRef.current = last.visitScore;
			setLocalRemaining(visitStartScoreRef.current - last.visitScore);
			if (last.darts.length === 0) {
				log.pop();
			}
			currentPlayerIndexRef.current = last.playerIndex;
			setCurrentPlayerIndex(last.playerIndex);
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
			const player = players[idx];
			const darts = checkoutDart ?? 3;
			if (player?.playerId) {
				const dartsThrownBefore = playerStates[idx]?.dartsThrown ?? 0;
				handleQf(player, dartsThrownBefore + darts);
			}
			void gameScoring.closeLegWithWinner(
				idx,
				score,
				darts,
				visitOpts,
			).then(() => {
				dartHistoryRef.current = [];
			});
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
		// Najpierw czyścimy pending — chroni przed podwójnym kliknięciem lotki.
		// checkoutClosingRef ustawia ścieżka online albo finishOfflineLegWin (offline),
		// żeby nie blokować finishOfflineLegWin własnym early-return.
		pendingCheckoutRef.current = null;
		setIsQFModalVisible(false);
		setCheckoutModalPlayer(null);
		beginScoringBusy('Zamykanie lega…');

		if (syncEnabled) {
			checkoutClosingRef.current = true;
			const visitScore = pending.visitScore ?? playerStates[idx]?.score ?? startingScore;
			const visitOpts = {
				...(pending.visitOpts ?? {}),
				legId: pending.legId ?? null,
			};
			const player = players[idx];
			if (player?.playerId) {
				const dartsThrownBefore = playerStates[idx]?.dartsThrown ?? 0;
				handleQf(player, dartsThrownBefore + dartNumber);
			}
			try {
				playCheckoutWinSound(playerStates[idx], matchFormat);
				await gameScoring.closeLegWithWinner(
					idx,
					visitScore,
					dartNumber,
					visitOpts,
				);
				dartHistoryRef.current = [];
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

		try {
			offlineVisit.finishOfflineLegWin(idx, dartNumber);
			setCurrentResult(0);
			setResultEdited(false);
		} finally {
			checkoutClosingRef.current = false;
			okHandlingRef.current = false;
			endScoringBusy();
		}
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

	useLeaveGameConfirmation({
		navigation,
		mode,
		gameClosed,
		tournamentGame,
		accessToken: auth?.accessToken,
		syncEnabled,
		lobbyId,
		intentionalFfaLeaveRef,
		onClosedLeave: logoutAfterTournamentIfNeeded,
		lobbyScoringMode,
	});

	useFfaPresenceHeartbeat({
		mode,
		syncEnabled,
		lobbyId,
		accessToken: auth?.accessToken,
		gameClosed,
		intentionalFfaLeaveRef,
	});

	const onNumberBtn = useLatestCallback(handleNumberBtn);
	const onOkBtn = useLatestCallback(handleOkBtn);
	const onUndoBtn = useLatestCallback(handleUndoBtn);
	const onClearBtn = useLatestCallback(handleClearBtn);
	const onDartSubmit = useLatestCallback(handleDartSubmit);
	const onUndoSingleDart = useLatestCallback(handleUndoSingleDart);

	function renderContent() {
		if (selectedComponent === 'counter') {
			return (
				<View style={styles.counterHost}>
					<Counter
						players={players}
						playerStates={playerStates}
						currentPlayerIndex={currentPlayerIndex}
						currentResult={currentResult}
						resultEdited={resultEdited}
						handleNumberBtn={onNumberBtn}
						handleOkBtn={onOkBtn}
						handleUndoBtn={onUndoBtn}
						handleClearBtn={onClearBtn}
						scoringMode={scoringMode}
						canInput={counterCanInput}
						showWaitingOverlay={!openerCheckPending}
						submitting={scoringBusy}
						gameClosed={gameClosed}
						oneDeviceSpectator={counterOneDeviceSpectator}
						handleDartSubmit={onDartSubmit}
						handleUndoSingleDart={onUndoSingleDart}
						localVisitRemaining={localVisitRemaining}
						matchFormat={matchFormat}
					/>
				</View>
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
					soundsEnabled={soundsEnabled}
					setSoundsEnabled={setSoundsEnabled}
					soundVolume={soundVolume}
					setSoundVolume={setSoundVolume}
					loaded={gameSettingsLoaded}
				/>
			);
		}
		return null;
	}

	return (
		<View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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

			<GameFinishedModal
				{...finishedModalProps}
				onLeave={() => {
					if (pendingTournamentLogoutRef.current) {
						finishedModalProps.onStay();
						logoutAfterTournamentIfNeeded();
						return;
					}
					finishedModalProps.onLeave();
				}}
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

			{syncPending && (
				<View style={styles.presenceBanner}>
					<Text style={styles.presenceBannerText}>
						Oczekuje na sieć — wynik zostanie wysłany automatycznie.
					</Text>
				</View>
			)}
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

export default X01GameScoringScreen;

import React, {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { playerResultReducer } from '../../helpers/reducers/playerResultReducer';
import {
	appendDartLabel,
	completeCurrentVisit,
	initialPlayerResultState,
	legLose,
	legWin,
	reopenLastVisit,
	resetVisitDartLabels,
	undo,
	undoSingleDart,
	updateSingleDart,
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
import { releaseTournamentGame } from '../../helpers/lockTournamentGame';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';

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
	} = gameCtx;

	const [isModalVisible, setIsModalVisible] = useState(showStartModal);
	const [isQFModalVisible, setIsQFModalVisible] = useState(false);
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

	const [achievementsState, achievementsDispatch] = useReducer(
		achievementsReducer,
		initialAchievementsState,
	);

	const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
	const currentPlayerIndexRef = useRef(0);
	/** Indeks zawodnika rozpoczynającego bieżący leg (rotacja: opener+1 po zamknięciu lega). */
	const legOpenerIndexRef = useRef(0);
	const okHandlingRef = useRef(false);
	const tournamentResultSentRef = useRef(false);
	const quickResultSentRef = useRef(false);
	const [ffaFinishedQuickGameId, setFfaFinishedQuickGameId] = useState(null);
	const currentPlayer = players[currentPlayerIndex] ?? null;
	const [currentResult, setCurrentResult] = useState(0);
	const [qfHelperDart, setQfHelperDart] = useState(0);
	const [scoringBusy, setScoringBusy] = useState(false);
	/** Pozostały wynik na początku bieżącej wizyty (tryb rzut po rzucie, offline). */
	const visitStartScoreRef = useRef(null);
	/** Id wizyty online (per-dart) — ten sam clientVisitId przez całą wizytę. */
	const visitClientIdRef = useRef(null);
	/** Kolejność rzutów wpisanych na jednym urządzeniu (tryb per-dart, lokalnie). */
	const dartHistoryRef = useRef([]);

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
	};

	const markLastDartCompletedVisit = () => {
		const hist = dartHistoryRef.current;
		if (hist.length > 0) {
			hist[hist.length - 1].completedVisit = true;
		}
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
		onFinishedQuickGameId: setFfaFinishedQuickGameId,
		reloadKey,
	});

	const counterOneDeviceSpectator = useMemo(
		() => isOneDeviceSpectator({ mode, lobbyScoringMode, isHost }),
		[mode, lobbyScoringMode, isHost],
	);

	const counterCanInput = useMemo(
		() =>
			canCounterInput({
				mode,
				gameClosed,
				scoringBusy,
				lobbyScoringMode,
				isHost,
				myPlayerIndex,
				currentPlayerIndex,
			}),
		[
			mode,
			gameClosed,
			scoringBusy,
			lobbyScoringMode,
			isHost,
			myPlayerIndex,
			currentPlayerIndex,
		],
	);

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

	const toggleQFModal = () => {
		setIsQFModalVisible((visibility) => !visibility);
	};

	const advanceToNextLegOpener = useCallback(() => {
		dartHistoryRef.current = [];
		visitClientIdRef.current = null;
		const nextOpener = computeNextLegOpener(legOpenerIndexRef.current, N);
		legOpenerIndexRef.current = nextOpener;
		currentPlayerIndexRef.current = nextOpener;
		setCurrentPlayerIndex(nextOpener);
	}, [N]);

	const handleBullWinnerSelection = (player) => {
		const idx = players.findIndex(
			(p) => p === player || (p?.id === player?.id && p?.name === player?.name),
		);
		if (idx >= 0) {
			legOpenerIndexRef.current = idx;
			currentPlayerIndexRef.current = idx;
			setCurrentPlayerIndex(idx);
		}
		toggleModal();
	};

	const handleNumberBtn = (number) => {
		if (!counterCanInput) {
			return;
		}
		okHandlingRef.current = false;
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

	/** Wizyta przez scoring API — `resultToApply` to punkty z całej wizyty (1–180). */
	const submitOnlineVisitCore = async (resultToApply, dartsInVisit = 3) => {
		if (gameClosed || !syncEnabled) return false;
		if (okHandlingRef.current) return false;
		const idx = currentPlayerIndexRef.current;
		const state = playerStates[idx];
		const player = players[idx];
		if (
			resultToApply > 180 ||
			typeof resultToApply !== 'number' ||
			resultToApply <= 0
		) {
			return false;
		}
		const visitStart = visitStartScoreRef.current ?? state?.score ?? 501;
		const visitOpts = {
			clientVisitId: visitClientIdRef.current,
			remainingBefore: visitStart,
		};
		const overshoot = resultToApply > visitStart;
		if (!overshoot && resultToApply === visitStart) {
			okHandlingRef.current = true;
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
					onPress: async () => {
						handleMaxAndOneSeventy(player, resultToApply);
						if (resultToApply >= 100) {
							handleHf(resultToApply, player);
						}
						await gameScoring.closeLegWithWinner(
							idx,
							resultToApply,
							dartsInVisit,
							visitOpts,
						);
						visitClientIdRef.current = null;
						okHandlingRef.current = false;
						setCurrentResult(0);
					},
				},
			]);
			setCurrentResult(0);
			return true;
		}
		okHandlingRef.current = true;
		handleMaxAndOneSeventy(player, resultToApply);
		if (overshoot) {
			await gameScoring.submitVisit({
				playerIndex: idx,
				visitScore: 0,
				bust: true,
				dartsInVisit,
				...visitOpts,
			});
		} else {
			await gameScoring.submitVisit({
				playerIndex: idx,
				visitScore: resultToApply,
				bust: false,
				dartsInVisit,
				...visitOpts,
			});
		}
		visitClientIdRef.current = null;
		okHandlingRef.current = false;
		setCurrentResult(0);
		return true;
	};

	const submitOnlineDartPartial = async (roundTotal, dartsInVisit) => {
		if (gameClosed || !syncEnabled) return;
		const idx = currentPlayerIndexRef.current;
		const visitStart = visitStartScoreRef.current ?? playerStates[idx]?.score ?? 501;
		if (!visitClientIdRef.current) {
			visitClientIdRef.current = newClientVisitId();
		}
		await gameScoring.submitVisit({
			playerIndex: idx,
			visitScore: roundTotal,
			bust: false,
			dartsInVisit,
			closedLeg: false,
			remainingBefore: visitStart,
			clientVisitId: visitClientIdRef.current,
		});
	};

	const handleOnlineOkBtn = async () => {
		setScoringBusy(true);
		try {
			await submitOnlineVisitCore(currentResult);
		} finally {
			setScoringBusy(false);
		}
	};

	const handleDartSubmit = async (points, roundTotal, isLastDart, dartIndex, dartLabel) => {
		if (gameClosed) return;
		if (!counterCanInput) return;

		const idx = currentPlayerIndexRef.current;

		if (dartIndex === 0) {
			visitStartScoreRef.current = playerStates[idx]?.score ?? 501;
			if (syncEnabled) {
				visitClientIdRef.current = newClientVisitId();
				playerDispatches[idx](resetVisitDartLabels());
			}
		}

		if (syncEnabled) {
			playerDispatches[idx](appendDartLabel(dartLabel));
			setScoringBusy(true);
			try {
				if (!isLastDart) {
					await submitOnlineDartPartial(roundTotal, dartIndex + 1);
				} else {
					await submitOnlineVisitCore(roundTotal, dartIndex + 1);
				}
			} finally {
				setScoringBusy(false);
			}
			return;
		}

		playerDispatches[idx](updateSingleDart(points, dartLabel));

		if (!isLastDart) {
			pushDartToHistory(idx, points, dartLabel);
			return;
		}

		const dispatch = playerDispatches[idx];
		const player = players[idx];
		pushDartToHistory(idx, points, dartLabel);

		const visitStart = visitStartScoreRef.current ?? 501;
		const resultToApply = roundTotal;

		okHandlingRef.current = true;
		handleMaxAndOneSeventy(player, resultToApply);

		if (resultToApply > visitStart) {
			dispatch(undoSingleDart());
			dispatch(undoSingleDart());
			dispatch(undoSingleDart());
			popDartHistory(3);
			okHandlingRef.current = false;
			return;
		}

		if (resultToApply < visitStart - 1) {
			markLastDartCompletedVisit();
			dispatch(completeCurrentVisit());
			const nextIdx = (idx + 1) % N;
			currentPlayerIndexRef.current = nextIdx;
			setCurrentPlayerIndex(nextIdx);
			okHandlingRef.current = false;
			return;
		}

		if (resultToApply === visitStart) {
			Alert.alert('UWAGA', getCheckoutPrompt(player), [
				{
					text: 'NIE',
					style: 'cancel',
					onPress: () => {
						dispatch(undoSingleDart());
						dispatch(undoSingleDart());
						dispatch(undoSingleDart());
						popDartHistory(3);
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
					},
				},
			]);
			return;
		}

		dispatch(undoSingleDart());
		dispatch(undoSingleDart());
		dispatch(undoSingleDart());
		popDartHistory(3);
		okHandlingRef.current = false;
	};

	const handleUndoSingleDart = () => {
		if (gameClosed) return;
		if (syncEnabled) {
			visitClientIdRef.current = null;
			void gameScoring.undoVisit();
			return;
		}
		if (!isPerDartMode) {
			const idx = currentPlayerIndexRef.current;
			playerDispatches[idx](undoSingleDart());
			return;
		}

		const history = dartHistoryRef.current;
		if (history.length === 0) return;

		const last = history.pop();
		const { playerIndex, completedVisit } = last;

		if (completedVisit) {
			playerDispatches[playerIndex](reopenLastVisit());
		}
		playerDispatches[playerIndex](undoSingleDart());
		currentPlayerIndexRef.current = playerIndex;
		setCurrentPlayerIndex(playerIndex);
	};

	const handleOkBtn = () => {
		if (gameClosed) return;
		if (syncEnabled) {
			void handleOnlineOkBtn();
			return;
		}
		if (
			currentResult > 180 ||
			typeof currentResult !== 'number' ||
			currentResult <= 0
		)
			return;
		if (okHandlingRef.current) return;

		const idx = currentPlayerIndexRef.current;
		const state = playerStates[idx];
		const dispatch = playerDispatches[idx];
		const player = players[idx];
		const resultToApply = currentResult;

		okHandlingRef.current = true;

		handleMaxAndOneSeventy(player);

		if (resultToApply < state.score - 1) {
			dispatch(updateStats(resultToApply));
			const nextIdx = (idx + 1) % N;
			currentPlayerIndexRef.current = nextIdx;
			setCurrentPlayerIndex(nextIdx);
			setCurrentResult(0);
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
			return;
		}
		setCurrentResult(0);
		okHandlingRef.current = false;
	};

	const handleCheckout = (idx) => {
		if (syncEnabled) {
			const st = playerStates[idx];
			void gameScoring.closeLegWithWinner(idx, st.score, 3);
			return;
		}
		const state = playerStates[idx];
		if (state.dartsThrown < 20) {
			setQfHelperDart(state.dartsThrown);
			toggleQFModal();
			return;
		}
		playerDispatches[idx](legWin(3));
		for (let j = 0; j < N; j++) {
			if (j !== idx) playerDispatches[j](legLose());
		}
		advanceToNextLegOpener();
	};

	const handleQFModalBtn = (dartNumber) => {
		if (syncEnabled) {
			const idx = currentPlayerIndexRef.current;
			const st = playerStates[idx];
			void gameScoring.closeLegWithWinner(idx, st.score, dartNumber);
			toggleQFModal();
			return;
		}
		const dart = qfHelperDart + dartNumber;
		const idx = currentPlayerIndexRef.current;
		const player = players[idx];
		if (player?.playerId) handleQf(player, dart);
		playerDispatches[idx](legWin(dartNumber));
		for (let j = 0; j < N; j++) {
			if (j !== idx) playerDispatches[j](legLose());
		}
		advanceToNextLegOpener();
		toggleQFModal();
	};

	const handleUndoBtn = () => {
		if (gameClosed) return;
		if (syncEnabled) {
			void gameScoring.undoVisit();
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
							navigation.dispatch(e.data.action);
						},
					},
				]);
			}),
		[navigation, mode, gameClosed, tournamentGame, auth?.accessToken],
	);

	function renderContent() {
		if (selectedComponent === 'counter') {
			return (
				<Counter
					players={players}
					playerStates={playerStates}
					currentPlayerIndex={currentPlayerIndex}
					currentResult={currentResult}
					handleNumberBtn={handleNumberBtn}
					handleOkBtn={handleOkBtn}
					handleUndoBtn={handleUndoBtn}
					handleClearBtn={handleClearBtn}
					scoringMode={scoringMode}
					canInput={counterCanInput}
					oneDeviceSpectator={counterOneDeviceSpectator}
					handleDartSubmit={handleDartSubmit}
					handleUndoSingleDart={handleUndoSingleDart}
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
					<Text style={styles.modalText}>Kto rzuca pierwszy?</Text>
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

			{currentPlayer && (
				<Modal visible={isQFModalVisible}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalText}>
							Którą lotką {currentPlayer.name} skończył lega?
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

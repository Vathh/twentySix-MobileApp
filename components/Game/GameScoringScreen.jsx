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
	initialPlayerResultState,
	legLose,
	legWin,
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
import {
	UPDATE_GAME_API_URL,
	QUICK_GAME_UPDATE_API_URL,
	getGroupGameScoringBaseUrl,
	getPlayoffGameScoringBaseUrl,
} from '../../helpers/apiConfig';
import useAuth from '../../hooks/useAuth';
import { useGameScoring } from '../../hooks/useGameScoring';
import { useQuickGameFfaScoring } from '../../hooks/useQuickGameFfaScoring';
import { normalizeTournamentPlayers } from '../../helpers/normalizeTournamentPlayers';
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

	const isTrainingMatch = !!route.params?.trainingGame;
	const trainingGame = route.params?.trainingGame;
	const isQuickGame = !!route.params?.quickGame && !isTrainingMatch;
	const quickGame = route.params?.quickGame;
	const matchConfig = isTrainingMatch ? trainingGame : quickGame;

	const lobbyId = quickGame?.lobbyId ?? null;
	const lobbyScoringMode = matchConfig?.scoringMode ?? 'each_own';
	const isHost = matchConfig?.isHost ?? true;

	const players = isTrainingMatch || isQuickGame
		? (matchConfig?.players ?? []).map((p) => ({
				id: p.id,
				name: p.name ?? 'Gracz',
				playerId: p.playerId != null ? Number(p.playerId) : null,
			}))
		: tournamentGame
			? normalizeTournamentPlayers(
					tournamentGame.player1,
					tournamentGame.player2,
				)
			: [];
	const N = Math.min(Math.max(players.length, 2), 8);

	const tournamentGame = route.params?.game;

	const myPlayerIndexFromLobby = useMemo(() => {
		if (
			matchConfig?.myPlayerIndex !== undefined &&
			matchConfig?.myPlayerIndex !== null
		) {
			return matchConfig.myPlayerIndex;
		}
		if (auth?.playerId != null) {
			const idx = players.findIndex(
				(p) => p.playerId != null && p.playerId === Number(auth.playerId),
			);
			if (idx >= 0) return idx;
		}
		return null;
	}, [matchConfig?.myPlayerIndex, auth?.playerId, players]);

	const hasOnlineQuickGame =
		isQuickGame &&
		!!lobbyId &&
		(quickGame?.gameType === '501' || quickGame?.gameType === undefined);
	const isTournamentGame = !!tournamentGame?.id;
	const useOnlineQuickFfa =
		hasOnlineQuickGame && !!auth?.accessToken;
	const useScoringApi =
		useOnlineQuickFfa || (isTournamentGame && !!auth?.accessToken);
	const useOnlineSync = useScoringApi;
	const legsToWinQuick = matchConfig?.legsCount ?? 2;

	const activeGame = isTrainingMatch
		? {
				id: null,
				type: 'training',
				tournamentId: null,
				groupNumber: null,
			}
		: isQuickGame
		? {
				id: null,
				type: 'quick_game',
				tournamentId: null,
				groupNumber: null,
			}
		: tournamentGame ?? null;

	const [isModalVisible, setIsModalVisible] = useState(
		isTrainingMatch || (!isQuickGame && !useOnlineSync) ? true : false,
	);
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
	/** Pozostały wynik na początku bieżącej wizyty (tryb rzut po rzucie, offline). */
	const visitStartScoreRef = useRef(null);

	const scoringGameId = isTournamentGame ? tournamentGame.id : null;
	const scoringChannelKind = isTournamentGame
		? tournamentGame.type === 'playoff'
			? 'playoff'
			: 'group'
		: null;
	const scoringBaseUrl = useMemo(() => {
		if (!useScoringApi || !scoringGameId || !isTournamentGame) return null;
		return tournamentGame.type === 'playoff'
			? getPlayoffGameScoringBaseUrl(scoringGameId)
			: getGroupGameScoringBaseUrl(scoringGameId);
	}, [useScoringApi, scoringGameId, isTournamentGame, tournamentGame?.type]);

	const tournamentScoring = useGameScoring({
		enabled: isTournamentGame && useScoringApi && !gameClosed,
		baseUrl: scoringBaseUrl,
		channelKind: scoringChannelKind,
		gameId: scoringGameId,
		accessToken: auth?.accessToken ?? null,
		players,
		N,
		playerDispatches,
		playerStates,
		currentPlayerIndexRef,
		setCurrentPlayerIndex,
		setGameClosed,
		gameClosed,
		isPerDartMode,
		inputPolicy: { type: 'tournament' },
	});

	const ffaScoring = useQuickGameFfaScoring({
		enabled: useOnlineQuickFfa && !gameClosed,
		lobbyId,
		accessToken: auth?.accessToken ?? null,
		players,
		N,
		playerDispatches,
		playerStates,
		currentPlayerIndexRef,
		setCurrentPlayerIndex,
		setGameClosed,
		gameClosed,
		lobbyScoringMode,
		isHost,
		myPlayerIndexFromLobby,
		legOpenerIndexRef,
		onFinishedQuickGameId: setFfaFinishedQuickGameId,
	});

	const gameScoring = isQuickGame ? ffaScoring : tournamentScoring;

	const counterCanInput = useMemo(() => {
		if (gameClosed) return false;
		if (isTrainingMatch) return true;
		if (!useScoringApi) {
			if (isQuickGame && lobbyScoringMode === 'one_device' && !isHost) {
				return false;
			}
			if (
				isQuickGame &&
				lobbyScoringMode === 'each_own' &&
				myPlayerIndexFromLobby !== null &&
				myPlayerIndexFromLobby !== currentPlayerIndex
			) {
				return false;
			}
			return true;
		}
		if (isTournamentGame) return true;
		if (lobbyScoringMode === 'one_device' && !isHost) return false;
		if (
			lobbyScoringMode === 'each_own' &&
			myPlayerIndexFromLobby !== null &&
			myPlayerIndexFromLobby !== currentPlayerIndex
		) {
			return false;
		}
		return true;
	}, [
		gameClosed,
		isTrainingMatch,
		useScoringApi,
		isQuickGame,
		isTournamentGame,
		lobbyScoringMode,
		isHost,
		myPlayerIndexFromLobby,
		currentPlayerIndex,
	]);

	useEffect(() => {
		if (!gameClosed || !useOnlineQuickFfa) return;
		if (quickResultSentRef.current) return;
		quickResultSentRef.current = true;

		const achievementsPayload = (achievementsState?.achievements || []).map(
			(a) => ({
				playerId: a.playerId,
				value: a.value ?? null,
				type: a.type,
			}),
		);
		const gameId =
			ffaFinishedQuickGameId ??
			ffaScoring.finishedQuickGameIdRef?.current ??
			null;
		if (gameId) {
			sendQuickGameAchievements(achievementsPayload, gameId);
		}

		const legsWonArr = playerStates.map((s) => s.legsWon);
		const winnerIdx = legsWonArr.findIndex((l) => l >= legsToWinQuick);
		const winner = players[winnerIdx >= 0 ? winnerIdx : 0];
		const loser = N === 2 && winnerIdx >= 0 ? players[1 - winnerIdx] : null;
		const msg =
			N === 2 && loser
				? `${loser.name} przegrał zatem pozostaje przy tarczy jako liczący.`
				: `${winner?.name ?? 'Zwycięzca'} wygrał mecz!`;
		Alert.alert('MECZ ZAKOŃCZONY', msg, [
			{ text: 'OK', style: 'destructive', onPress: () => {} },
		]);
	}, [
		gameClosed,
		useOnlineQuickFfa,
		ffaFinishedQuickGameId,
		achievementsState?.achievements,
		lobbyId,
		legsToWinQuick,
		N,
		players,
		playerStates,
	]);

	useEffect(() => {
		if (isTournamentGame && useScoringApi) return;
		if (useOnlineQuickFfa) return;
		if (isQuickGame) return;

		const legsWonArr = playerStates.map((s) => s.legsWon);
		const legsTarget = isTrainingMatch ? legsToWinQuick : 2;
		const hasWinner = legsWonArr.some((l) => l >= legsTarget);
		if (!hasWinner) return;

		setGameClosed(true);
		const winnerIdx = legsWonArr.findIndex((l) => l >= legsTarget);
		const winner = players[winnerIdx];
		const loser = N === 2 ? players[1 - winnerIdx] : null;

		if (isTrainingMatch) {
			const msg =
				N === 2 && loser
					? `Trening zakończony. ${winner?.name ?? 'Zwycięzca'} wygrywa mecz.\n\nWynik nie został zapisany.`
					: `Trening zakończony. ${winner?.name ?? 'Zwycięzca'} wygrywa mecz.\n\nWynik nie został zapisany.`;
			Alert.alert('Trening', msg, [
				{ text: 'OK', style: 'default', onPress: () => {} },
			]);
			return;
		}

		const gameResultDTO = {
			game: {
				id: activeGame.id,
				type: activeGame.type,
				player1Id: players[0]?.playerId ?? players[0]?.id,
				player2Id: players[1]?.playerId ?? players[1]?.id,
				player1Score: playerStates[0]?.legsWon,
				player2Score: playerStates[1]?.legsWon,
				winnerId: winner.playerId ?? winner.id,
				tournamentId: activeGame.tournamentId,
				groupNumber: activeGame.type === 'playoff' ? 0 : activeGame.groupNumber,
			},
			achievements: achievementsState?.achievements ?? [],
			legs: [],
		};
		sendGameResult(gameResultDTO);
		Alert.alert(
			'MECZ ZAKOŃCZONY',
			`${loser?.name ?? 'Przegrany'} przegrał zatem pozostaje przy tarczy jako liczący.`,
			[{ text: 'OK', style: 'destructive', onPress: () => {} }],
		);
	}, [
		isTournamentGame,
		useScoringApi,
		useOnlineQuickFfa,
		isQuickGame,
		isTrainingMatch,
		legsToWinQuick,
		player1State?.legsWon,
		player2State?.legsWon,
		player3State?.legsWon,
		player4State?.legsWon,
		player5State?.legsWon,
		player6State?.legsWon,
		player7State?.legsWon,
		player8State?.legsWon,
	]);

	const toggleModal = () => {
		setIsModalVisible((visibility) => !visibility);
	};

	const toggleQFModal = () => {
		setIsQFModalVisible((visibility) => !visibility);
	};

	const advanceToNextLegOpener = useCallback(() => {
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
		if (gameClosed) {
			return;
		}
		if (useScoringApi && !isTournamentGame) {
			if (lobbyScoringMode === 'one_device' && !isHost) {
				return;
			}
			if (
				lobbyScoringMode === 'each_own' &&
				myPlayerIndexFromLobby !== null &&
				myPlayerIndexFromLobby !== currentPlayerIndexRef.current
			) {
				return;
			}
		}
		if (!useScoringApi && isQuickGame) {
			if (lobbyScoringMode === 'one_device' && !isHost) return;
			if (
				lobbyScoringMode === 'each_own' &&
				myPlayerIndexFromLobby !== null &&
				myPlayerIndexFromLobby !== currentPlayerIndexRef.current
			) {
				return;
			}
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

	/** Wizyta przez scoring API — `resultToApply` to punkty z całej wizyty (1–180). */
	const submitOnlineVisitCore = async (resultToApply, dartsInVisit = 3) => {
		if (gameClosed || !useScoringApi) return false;
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
		const overshoot = resultToApply > state.score;
		if (!overshoot && resultToApply === state.score) {
			okHandlingRef.current = true;
			Alert.alert('UWAGA', `Czy ${player?.name ?? 'Gracz'} wygrał lega?`, [
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
						await gameScoring.closeLegWithWinner(idx, resultToApply, 3);
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
			});
		} else {
			await gameScoring.submitVisit({
				playerIndex: idx,
				visitScore: resultToApply,
				bust: false,
				dartsInVisit,
			});
		}
		okHandlingRef.current = false;
		setCurrentResult(0);
		return true;
	};

	const handleOnlineOkBtn = async () => submitOnlineVisitCore(currentResult);

	const handleDartSubmit = (points, roundTotal, isLastDart, dartIndex) => {
		if (gameClosed) return;
		if (!counterCanInput) return;

		const idx = currentPlayerIndexRef.current;

		if (!isLastDart) {
			if (dartIndex === 0) {
				visitStartScoreRef.current = playerStates[idx]?.score ?? 501;
			}
			playerDispatches[idx](updateSingleDart(points));
			return;
		}

		if (useScoringApi) {
			void submitOnlineVisitCore(roundTotal, dartIndex + 1);
			return;
		}

		const dispatch = playerDispatches[idx];
		const player = players[idx];

		dispatch(updateSingleDart(points));

		const visitStart = visitStartScoreRef.current ?? 501;
		const resultToApply = roundTotal;

		okHandlingRef.current = true;
		handleMaxAndOneSeventy(player, resultToApply);

		if (resultToApply > visitStart) {
			dispatch(undoSingleDart());
			dispatch(undoSingleDart());
			dispatch(undoSingleDart());
			okHandlingRef.current = false;
			return;
		}

		if (resultToApply < visitStart - 1) {
			const nextIdx = (idx + 1) % N;
			currentPlayerIndexRef.current = nextIdx;
			setCurrentPlayerIndex(nextIdx);
			okHandlingRef.current = false;
			return;
		}

		if (resultToApply === visitStart) {
			Alert.alert('UWAGA', `Czy ${player?.name ?? 'Gracz'} wygrał lega?`, [
				{
					text: 'NIE',
					style: 'cancel',
					onPress: () => {
						dispatch(undoSingleDart());
						dispatch(undoSingleDart());
						dispatch(undoSingleDart());
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
		okHandlingRef.current = false;
	};

	const handleUndoSingleDart = () => {
		if (gameClosed) return;
		if (useOnlineSync) return;
		const idx = currentPlayerIndexRef.current;
		playerDispatches[idx](undoSingleDart());
	};

	const handleUndoLastDartAfterSwitch = () => {
		if (gameClosed) return;
		if (useScoringApi) {
			void gameScoring.undoVisit();
			return;
		}
		const prevIdx = (currentPlayerIndexRef.current - 1 + N) % N;
		currentPlayerIndexRef.current = prevIdx;
		setCurrentPlayerIndex(prevIdx);
		const d = playerDispatches[prevIdx];
		d(undoSingleDart());
		d(undoSingleDart());
		d(undoSingleDart());
	};

	const handleOkBtn = () => {
		if (gameClosed) return;
		if (useScoringApi) {
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
			Alert.alert('UWAGA', `Czy ${player?.name ?? 'Gracz'} wygrał lega?`, [
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
		if (useScoringApi) {
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

	const sendTournamentAchievements = async (achievements) => {
		if (!activeGame?.id || !achievements?.length) return;
		const winnerIdx = playerStates.findIndex((s, i) => {
			const other = playerStates[1 - i];
			return N === 2 && s.legsWon > (other?.legsWon ?? 0);
		});
		const winner = players[winnerIdx >= 0 ? winnerIdx : 0];
		const gameResultDTO = {
			game: {
				id: activeGame.id,
				type: activeGame.type,
				player1Id: players[0]?.playerId ?? players[0]?.id,
				player2Id: players[1]?.playerId ?? players[1]?.id,
				player1Score: playerStates[0]?.legsWon ?? 0,
				player2Score: playerStates[1]?.legsWon ?? 0,
				winnerId: winner?.playerId ?? winner?.id,
				tournamentId: activeGame.tournamentId,
				groupNumber: activeGame.type === 'playoff' ? 0 : activeGame.groupNumber,
			},
			achievements,
			legs: [],
		};
		await sendGameResult(gameResultDTO);
	};

	const sendGameResult = async (gameResultDTO) => {
		try {
			const response = await fetch(UPDATE_GAME_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${auth?.accessToken}`,
				},
				body: JSON.stringify(gameResultDTO),
			});

			if (response.ok) {
				console.log('Zaktualizowano mecz');
			} else {
				console.error('Blad podczas aktualizacji meczu', response.statusText);
			}
		} catch (error) {
			console.error(
				'Blad podczas strzalu do API przy aktualizowaniu meczu',
				error,
			);
		}
	};

	const sendQuickGameAchievements = async (achievementsPayload, gameId) => {
		if (!gameId || !auth?.accessToken) {
			return;
		}
		try {
			const response = await fetch(QUICK_GAME_UPDATE_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${auth.accessToken}`,
				},
				body: JSON.stringify({
					gameId,
					achievements: achievementsPayload || [],
				}),
			});
			if (!response.ok) {
				console.error(
					'Blad podczas wysylania achievementow quick game',
					await response.text(),
				);
			}
		} catch (error) {
			console.error('Blad przy wysylaniu achievementow quick game', error);
		}
	};

	const handleQFModalBtn = (dartNumber) => {
		if (useScoringApi) {
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
		if (useScoringApi) {
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
		if (!gameClosed || !isTournamentGame || !useScoringApi) return;
		if (tournamentResultSentRef.current) return;
		tournamentResultSentRef.current = true;

		const legsWonArr = playerStates.map((s) => s.legsWon);
		const winnerIdx = legsWonArr.findIndex((l) => l >= 2);
		const loser =
			N === 2 && winnerIdx >= 0 ? players[1 - winnerIdx] : null;

		const achievementsPayload = (achievementsState?.achievements || []).map(
			(a) => ({
				playerId: a.playerId,
				tournamentId: a.tournamentId,
				value: a.value ?? null,
				type: a.type,
			}),
		);
		if (achievementsPayload.length > 0) {
			void sendTournamentAchievements(achievementsPayload);
		}
		Alert.alert(
			'MECZ ZAKOŃCZONY',
			`${loser?.name ?? 'Przegrany'} przegrał zatem pozostaje przy tarczy jako liczący.`,
			[{ text: 'OK', style: 'destructive', onPress: () => {} }],
		);
	}, [
		gameClosed,
		isTournamentGame,
		useScoringApi,
		player1State.legsWon,
		player2State.legsWon,
		achievementsState?.achievements,
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
						onPress: () => navigation.dispatch(e.data.action),
					},
				]);
			}),
		[navigation],
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
					frozenVisitStartScore={
						useOnlineSync
							? (playerStates[currentPlayerIndex]?.score ?? 501)
							: null
					}
					handleDartSubmit={handleDartSubmit}
					handleUndoSingleDart={handleUndoSingleDart}
					handleUndoLastDartAfterSwitch={handleUndoLastDartAfterSwitch}
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

// const gameResultDTO = {
//         achievements : achievementsState,
//         game : {
//           tournamentId: activeGame.tournamentId,
//           id: activeGame.id,
//           winnerId: winner.id,
//           loserId: loser.id,
//           markup: activeGame.markup,
//           winnerDestinationMarkup: activeGame.winnerDestinationMarkup,
//           loserDestinationMarkup: activeGame.loserDestinationMarkup,
//           points: activeGame.points
//         }
//       };


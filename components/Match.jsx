import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { playerResultReducer } from '../helpers/reducers/playerResultReducer';
import {
	initialPlayerResultState,
	legLose,
	legWin,
	undo,
	updateStats,
} from '../helpers/reducers/playerResultActions';
import { achievementsReducer } from '../helpers/reducers/achievementsReducer';
import {
	addAchievement,
	initialAchievementsState,
} from '../helpers/reducers/achievementActions';
import Counter from './Counter';
import Stats from './Stats';
import {
	UPDATE_GAME_API_URL,
	QUICK_GAME_UPDATE_API_URL,
} from '../helpers/apiConfig';
import useAuth from '../hooks/useAuth';

const Match = ({ route, navigation }) => {
	const { auth } = useAuth();

	const [selectedComponent, setSelectedComponent] = useState('counter');

	const isQuickGame = !!route.params?.quickGame;
	const quickGame = route.params?.quickGame;
	const matchParam = route.params?.match;

	const players = isQuickGame
		? (quickGame?.players ?? []).map((p) => ({
				id: p.id,
				name: p.name ?? 'Gracz',
				playerId: p.playerId,
			}))
		: matchParam?.match
			? [matchParam.match.player1, matchParam.match.player2]
			: [];
	const N = Math.min(Math.max(players.length, 2), 6);
	const match = isQuickGame
		? {
				match: {
					id: null,
					type: 'quick_match',
					tournamentId: null,
					groupNumber: null,
				},
			}
		: matchParam;

	const [isModalVisible, setIsModalVisible] = useState(true);
	const [isQFModalVisible, setIsQFModalVisible] = useState(false);
	const [matchClosed, setMatchClosed] = useState(false);

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

	const allStates = [
		player1State,
		player2State,
		player3State,
		player4State,
		player5State,
		player6State,
	];
	const allDispatches = [
		player1Dispatch,
		player2Dispatch,
		player3Dispatch,
		player4Dispatch,
		player5Dispatch,
		player6Dispatch,
	];
	const playerStates = allStates.slice(0, N);
	const playerDispatches = allDispatches.slice(0, N);

	const [achievementsState, achievementsDispatch] = useReducer(
		achievementsReducer,
		initialAchievementsState,
	);

	const [legStartingPlayer, setLegStartingPlayer] = useState();
	const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
	const currentPlayerIndexRef = useRef(0);
	const okHandlingRef = useRef(false);
	const currentPlayer = players[currentPlayerIndex] ?? null;
	const [currentResult, setCurrentResult] = useState(0);
	const [qfHelperDart, setQfHelperDart] = useState(0);

	// Ref jest jedynym źródłem prawdy w handleOkBtn; state currentPlayerIndex służy tylko do wyświetlania.
	// Nie synchronizujemy ref ze state w useEffect – po ustawieniu ref i state w handlerach ref nie może być nadpisany.

	const renderContent = () => {
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
				/>
			);
		}
		if (selectedComponent === 'stats') {
			return <Stats players={players} playerStates={playerStates} />;
		}
		return null;
	};

	const switchStartingPlayer = () => {
		const idx = players.findIndex(
			(p) => p === legStartingPlayer || p?.id === legStartingPlayer?.id,
		);
		const nextIdx = idx >= 0 ? (idx + 1) % N : 0;
		setLegStartingPlayer(players[nextIdx]);
		currentPlayerIndexRef.current = nextIdx;
		setCurrentPlayerIndex(nextIdx);
	};

	const toggleModal = () => {
		setIsModalVisible((visibility) => !visibility);
	};

	const toggleQFModal = () => {
		setIsQFModalVisible((visibility) => !visibility);
	};

	const handleBullWinnerSelection = (player) => {
		const idx = players.findIndex(
			(p) => p === player || (p?.id === player?.id && p?.name === player?.name),
		);
		if (idx >= 0) {
			currentPlayerIndexRef.current = idx;
			setCurrentPlayerIndex(idx);
			setLegStartingPlayer(players[idx]);
		}
		toggleModal();
	};

	const handleNumberBtn = (number) => {
		if (matchClosed) {
			return;
		}
		okHandlingRef.current = false;
		if (currentResult.toString().length < 3) {
			setCurrentResult((result) => parseInt(result.toString() + number, 10));
		}
	};

	const handleClearBtn = () => {
		if (matchClosed) {
			return;
		}
		okHandlingRef.current = false;
		setCurrentResult(0);
	};

	const handleMaxAndOneSeventy = (playerForAchievement) => {
		const p = playerForAchievement ?? currentPlayer;
		if (!p) return;
		if (currentResult == 180) {
			const max = {
				playerId: p.playerId,
				tournamentId: match.match.tournamentId,
				value: null,
				type: 'max',
			};
			achievementsDispatch(addAchievement(max));
		}

		if (currentResult >= 170 && currentResult < 180) {
			const oneSeventy = {
				playerId: p.playerId,
				tournamentId: match.match.tournamentId,
				value: currentResult,
				type: 'one_seventy',
			};
			achievementsDispatch(addAchievement(oneSeventy));
		}
	};

	const handleHf = () => {
		if (currentResult >= 100) {
			const hf = {
				playerId: currentPlayer.playerId,
				tournamentId: match.match.tournamentId,
				value: currentResult,
				type: 'hf',
			};
			achievementsDispatch(addAchievement(hf));
		}
	};

	const handleQf = (player, dart) => {
		if (dart < 20) {
			const qf = {
				playerId: player.playerId,
				tournamentId: match.match.tournamentId,
				value: dart,
				type: 'qf',
			};
			achievementsDispatch(addAchievement(qf));
		}
	};

	const handleOkBtn = () => {
		if (matchClosed) return;
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
		const nextIdx = (idx + 1) % N;
		currentPlayerIndexRef.current = nextIdx;
		setCurrentPlayerIndex(nextIdx);
	};

	const sendMatchResult = async (matchResultDTO) => {
		try {
			const response = await fetch(UPDATE_GAME_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${auth?.accessToken}`,
				},
				body: JSON.stringify(matchResultDTO),
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

	const sendQuickGameResult = async (
		playersPayload,
		achievementsPayload,
		lobbyId,
	) => {
		try {
			const body = {
				players: playersPayload,
				achievements: achievementsPayload || [],
				lobbyId: lobbyId ?? undefined,
			};
			const response = await fetch(QUICK_GAME_UPDATE_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(auth?.accessToken
						? { Authorization: `Bearer ${auth.accessToken}` }
						: {}),
				},
				body: JSON.stringify(body),
			});
			if (response.ok) {
				console.log('Zaktualizowano wynik szybkiego meczu');
			} else {
				console.error(
					'Blad podczas aktualizacji szybkiego meczu',
					await response.text(),
				);
			}
		} catch (error) {
			console.error('Blad przy wysylaniu wyniku szybkiego meczu', error);
		}
	};

	const handleQFModalBtn = (dartNumber) => {
		const dart = qfHelperDart + dartNumber;
		const idx = currentPlayerIndexRef.current;
		const player = players[idx];
		if (player?.playerId) handleQf(player, dart);
		playerDispatches[idx](legWin(dartNumber));
		for (let j = 0; j < N; j++) {
			if (j !== idx) playerDispatches[j](legLose());
		}
		const nextIdx = (idx + 1) % N;
		currentPlayerIndexRef.current = nextIdx;
		setCurrentPlayerIndex(nextIdx);
		toggleQFModal();
	};

	const handleUndoBtn = () => {
		if (matchClosed) return;
		const allAtStart = playerStates.every((s) => s.score === 501);
		if (allAtStart) return;
		const prevIdx = (currentPlayerIndexRef.current - 1 + N) % N;
		currentPlayerIndexRef.current = prevIdx;
		setCurrentPlayerIndex(prevIdx);
		playerDispatches[prevIdx](undo());
	};

	useEffect(() => {
		const legsWonArr = playerStates.map((s) => s.legsWon);
		const hasWinner = legsWonArr.some((l) => l >= 2);
		if (!hasWinner) return;

		setMatchClosed(true);
		const winnerIdx = legsWonArr.findIndex((l) => l >= 2);
		const winner = players[winnerIdx];
		const loser = N === 2 ? players[1 - winnerIdx] : null;

		if (isQuickGame) {
			const withPlace = players
				.map((p, i) => ({ player: p, state: playerStates[i], idx: i }))
				.filter((x) => x.player?.playerId)
				.sort((a, b) => b.state.legsWon - a.state.legsWon);
			if (withPlace.length >= 2) {
				const playersPayload = withPlace.map((x, place) => ({
					playerId: x.player.playerId,
					score: x.state.legsWon,
					place: place + 1,
					average: parseFloat(x.state.matchAverage) || null,
					dartsThrown: x.state.totalDartsThrown || null,
					pointsEarned: x.state.totalPointsEarned || null,
				}));
				const achievementsPayload = (achievementsState?.achievements || []).map(
					(a) => ({
						playerId: a.playerId,
						value: a.value ?? null,
						type: a.type,
					}),
				);
				sendQuickGameResult(
					playersPayload,
					achievementsPayload,
					quickGame?.lobbyId,
				);
			}
			const msg =
				N === 2 && loser
					? `${loser.name} przegrał zatem pozostaje przy tarczy jako liczący.`
					: `${winner?.name ?? 'Zwycięzca'} wygrał mecz!`;
			Alert.alert('MECZ ZAKOŃCZONY', msg, [
				{ text: 'OK', style: 'destructive', onPress: () => {} },
			]);
			return;
		}

		const matchResultDTO = {
			game: {
				id: match.match.id,
				type: match.match.type,
				player1Id: players[0]?.id,
				player2Id: players[1]?.id,
				player1Score: playerStates[0]?.legsWon,
				player2Score: playerStates[1]?.legsWon,
				winnerId: winner.id,
				tournamentId: match.match.tournamentId,
				groupNumber: match.match.groupNumber,
			},
			achievements: achievementsState,
		};
		sendMatchResult(matchResultDTO);
		Alert.alert(
			'MECZ ZAKOŃCZONY',
			`${loser.name} przegrał zatem pozostaje przy tarczy jako liczący.`,
			[{ text: 'OK', style: 'destructive', onPress: () => {} }],
		);
	}, [
		player1State.legsWon,
		player2State.legsWon,
		player3State?.legsWon,
		player4State?.legsWon,
		player5State?.legsWon,
		player6State?.legsWon,
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

export default Match;

// const matchResultDTO = {
//         achievements : achievementsState,
//         game : {
//           tournamentId: match.match.id,
//           matchId: match.match.id,
//           winnerId: winner.id,
//           loserId: loser.id,
//           markup: match.match.markup,
//           winnerDestinationMarkup: match.match.winnerDestinationMarkup,
//           loserDestinationMarkup: match.match.loserDestinationMarkup,
//           points: match.match.points
//         }
//       };

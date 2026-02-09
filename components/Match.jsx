import React, { useEffect, useReducer, useRef, useState } from 'react'
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { playerResultReducer } from '../helpers/reducers/playerResultReducer';
import { initialPlayerResultState, legLose, legWin, undo, undoSingleDart, updateSingleDart, updateStats } from '../helpers/reducers/playerResultActions';
import { achievementsReducer } from '../helpers/reducers/achievementsReducer';
import { addAchievement, initialAchievementsState } from '../helpers/reducers/achievementActions';
import Counter from './Counter';
import CricketCounter from './CricketCounter';
import Stats from './Stats';
import Settings from './Settings';
import { useMatchSettings } from '../hooks/useMatchSettings';
import {
  cricketReducer,
  initialCricketState,
  allClosed,
  CRICKET_HIT,
  CRICKET_MISS,
  CRICKET_UNDO,
  CRICKET_LEG_WIN,
  CRICKET_LEG_RESET,
} from '../helpers/reducers/cricketReducer';
import { UPDATE_GAME_API_URL, QUICK_GAME_UPDATE_API_URL } from '../helpers/apiConfig';
import useAuth from '../hooks/useAuth';

const Match = ({ route, navigation }) => {

  const { auth } = useAuth();
  const { scoringMode, setScoringMode, loaded: settingsLoaded } = useMatchSettings();
  const isCricket = isQuickGame && (quickGame?.gameType === 'cricket');

  const [selectedComponent, setSelectedComponent] = useState('counter');

  const isQuickGame = !!route.params?.quickGame;
  const quickGame = route.params?.quickGame;
  const matchParam = route.params?.match;
  const legsToWin = isQuickGame ? (quickGame?.legsCount ?? 3) : 2;

  const players = isQuickGame
    ? (quickGame?.players ?? []).map((p) => ({ id: p.id, name: p.name ?? 'Gracz', playerId: p.playerId }))
    : matchParam?.match
      ? [matchParam.match.player1, matchParam.match.player2]
      : [];
  const N = Math.min(Math.max(players.length, 2), 6);
  const match = isQuickGame ? { match: { id: null, type: 'quick_match', tournamentId: null, groupNumber: null } } : matchParam;

  const [isModalVisible, setIsModalVisible] = useState(true);
  const [isQFModalVisible, setIsQFModalVisible] = useState(false);
  const [matchClosed, setMatchClosed] = useState(false);

  const [player1State, player1Dispatch] = useReducer(playerResultReducer, initialPlayerResultState);
  const [player2State, player2Dispatch] = useReducer(playerResultReducer, initialPlayerResultState);
  const [player3State, player3Dispatch] = useReducer(playerResultReducer, initialPlayerResultState);
  const [player4State, player4Dispatch] = useReducer(playerResultReducer, initialPlayerResultState);
  const [player5State, player5Dispatch] = useReducer(playerResultReducer, initialPlayerResultState);
  const [player6State, player6Dispatch] = useReducer(playerResultReducer, initialPlayerResultState);

  const allStates = [player1State, player2State, player3State, player4State, player5State, player6State];
  const allDispatches = [player1Dispatch, player2Dispatch, player3Dispatch, player4Dispatch, player5Dispatch, player6Dispatch];
  const playerStates = allStates.slice(0, N);
  const playerDispatches = allDispatches.slice(0, N);

  const [cricket1, cricket1Dispatch] = useReducer(cricketReducer, initialCricketState());
  const [cricket2, cricket2Dispatch] = useReducer(cricketReducer, initialCricketState());
  const [cricket3, cricket3Dispatch] = useReducer(cricketReducer, initialCricketState());
  const [cricket4, cricket4Dispatch] = useReducer(cricketReducer, initialCricketState());
  const [cricket5, cricket5Dispatch] = useReducer(cricketReducer, initialCricketState());
  const [cricket6, cricket6Dispatch] = useReducer(cricketReducer, initialCricketState());
  const cricketStates = [cricket1, cricket2, cricket3, cricket4, cricket5, cricket6].slice(0, N);
  const cricketDispatches = [cricket1Dispatch, cricket2Dispatch, cricket3Dispatch, cricket4Dispatch, cricket5Dispatch, cricket6Dispatch].slice(0, N);

  const [achievementsState, achievementsDispatch] = useReducer(achievementsReducer, initialAchievementsState);

  const [legStartingPlayer, setLegStartingPlayer] = useState();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const currentPlayerIndexRef = useRef(0);
  const okHandlingRef = useRef(false);
  const currentPlayer = players[currentPlayerIndex] ?? null;
  const [currentResult, setCurrentResult] = useState(0);
  const [qfHelperDart, setQfHelperDart] = useState(0);
  const [cricketDartsInVisit, setCricketDartsInVisit] = useState(0);

  // Ref jest jedynym źródłem prawdy w handleOkBtn; state currentPlayerIndex służy tylko do wyświetlania.
  // Nie synchronizujemy ref ze state w useEffect – po ustawieniu ref i state w handlerach ref nie może być nadpisany.

  const computeCricketPoints = (playerIdx, segment, multiplier) => {
    const myHitsBefore = cricketStates[playerIdx]?.hits[segment] ?? 0;
    const baseValue = segment === 'bull' ? 25 : segment;
    const extraHits = myHitsBefore < 3
      ? Math.max(0, multiplier - (3 - myHitsBefore))
      : multiplier;
    const anyOpponentNotClosed = cricketStates.some((s, i) => i !== playerIdx && (s?.hits[segment] ?? 0) < 3);
    return anyOpponentNotClosed ? extraHits * baseValue : 0;
  };

  const advanceCricketPlayer = () => {
    const nextIdx = (currentPlayerIndexRef.current + 1) % N;
    currentPlayerIndexRef.current = nextIdx;
    setCurrentPlayerIndex(nextIdx);
    setCricketDartsInVisit(0);
  };

  const handleCricketHit = (segment, multiplier) => {
    if (matchClosed) return;
    const idx = currentPlayerIndexRef.current;
    const pointsToAdd = computeCricketPoints(idx, segment, multiplier);
    cricketDispatches[idx]({ type: CRICKET_HIT, segment, multiplier, pointsToAdd });
    const nextDarts = cricketDartsInVisit + 1;
    setCricketDartsInVisit(nextDarts);
    const nextState = { ...cricketStates[idx], hits: { ...cricketStates[idx]?.hits, [segment]: (cricketStates[idx]?.hits[segment] ?? 0) + multiplier }, points: (cricketStates[idx]?.points ?? 0) + pointsToAdd };
    if (allClosed(nextState.hits)) {
      const myPts = nextState.points;
      const allOthersHaveLessOrEqual = cricketStates.every((s, i) => i === idx || (s?.points ?? 0) <= myPts);
      if (allOthersHaveLessOrEqual) {
        cricketDispatches[idx]({ type: CRICKET_LEG_WIN });
        cricketDispatches.forEach((d) => d({ type: CRICKET_LEG_RESET }));
        const nextStartIdx = (idx + 1) % N;
        setLegStartingPlayer(players[nextStartIdx]);
        currentPlayerIndexRef.current = nextStartIdx;
        setCurrentPlayerIndex(nextStartIdx);
        setCricketDartsInVisit(0);
        return;
      }
    }
    if (nextDarts >= 3) advanceCricketPlayer();
  };

  const handleCricketMiss = () => {
    if (matchClosed) return;
    const idx = currentPlayerIndexRef.current;
    cricketDispatches[idx]({ type: CRICKET_MISS });
    const nextDarts = cricketDartsInVisit + 1;
    setCricketDartsInVisit(nextDarts);
    if (nextDarts >= 3) advanceCricketPlayer();
  };

  const handleCricketUndo = () => {
    if (matchClosed) return;
    const idx = currentPlayerIndexRef.current;
    const hasLast = cricketStates[idx]?.lastHit;
    if (cricketDartsInVisit > 0) {
      if (hasLast) {
        cricketDispatches[idx]({ type: CRICKET_UNDO });
      }
      setCricketDartsInVisit((d) => Math.max(0, d - 1));
    } else {
      const prevIdx = (idx - 1 + N) % N;
      cricketDispatches[prevIdx]({ type: CRICKET_UNDO });
      currentPlayerIndexRef.current = prevIdx;
      setCurrentPlayerIndex(prevIdx);
      setCricketDartsInVisit(2);
    }
  };

  const renderContent = () => {
    if (selectedComponent === 'counter') {
      if (isCricket) {
        return (
          <CricketCounter
            players={players}
            cricketStates={cricketStates}
            currentPlayerIndex={currentPlayerIndex}
            dartsInVisit={cricketDartsInVisit}
            onCricketHit={handleCricketHit}
            onCricketMiss={handleCricketMiss}
            onCricketUndo={handleCricketUndo}
            matchClosed={matchClosed}
          />
        );
      }
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
          handleDartSubmit={handleDartSubmit}
          handleUndoSingleDart={handleUndoSingleDart}
          handleUndoLastDartAfterSwitch={handleUndoLastDartAfterSwitch}
          scoringMode={scoringMode}
        />
      );
    }
    if (selectedComponent === 'stats') {
      const statsStates = isCricket
        ? cricketStates.map((s) => ({ legsWon: s?.legsWon ?? 0, matchAverage: '-', currentLegAverage: '-', totalPointsEarned: s?.points, legsAverages: [] }))
        : playerStates;
      return <Stats players={players} playerStates={statsStates} />;
    }
    if (selectedComponent === 'settings') {
      return (
        <Settings
          scoringMode={scoringMode}
          setScoringMode={setScoringMode}
          loaded={settingsLoaded}
        />
      );
    }
    return null;
  };

  const switchStartingPlayer = () => {
    const idx = players.findIndex((p) => p === legStartingPlayer || (p?.id === legStartingPlayer?.id));
    const nextIdx = idx >= 0 ? (idx + 1) % N : 0;
    setLegStartingPlayer(players[nextIdx]);
    currentPlayerIndexRef.current = nextIdx;
    setCurrentPlayerIndex(nextIdx);
  };

  const toggleModal = () => {
    setIsModalVisible(visibility => !visibility);
  }

  const toggleQFModal = () => {
    setIsQFModalVisible(visibility => !visibility);
  }

  const handleBullWinnerSelection = (player) => {
    const idx = players.findIndex((p) => p === player || (p?.id === player?.id && p?.name === player?.name));
    if (idx >= 0) {
      currentPlayerIndexRef.current = idx;
      setCurrentPlayerIndex(idx);
      setLegStartingPlayer(players[idx]);
    }
    toggleModal();
  };

  const handleNumberBtn = (number) => {
    if(matchClosed){
      return;
    }
    okHandlingRef.current = false;
    if(currentResult.toString().length < 3){
      setCurrentResult(result => parseInt(result.toString() + number, 10));
    }
  }

  const handleClearBtn = () => {
    if(matchClosed){
      return;
    }
    okHandlingRef.current = false;
    setCurrentResult(0);
  };

  const handleMaxAndOneSeventy = (playerForAchievement) => {
    const p = playerForAchievement ?? currentPlayer;
    if (!p) return;
    if(currentResult == 180){
      const max = {
        playerId: p.playerId,
        tournamentId: match.match.tournamentId,
        value: null,
        type: 'max'
      }
      achievementsDispatch(addAchievement(max));
    }

    if(currentResult >= 170 && currentResult < 180){
      const oneSeventy = {
        playerId: p.playerId,
        tournamentId: match.match.tournamentId,
        value: currentResult,
        type: 'one_seventy'
      }
      achievementsDispatch(addAchievement(oneSeventy));
    }
  };

  const handleHf = () => {
    if(currentResult >= 100){
      const hf = {
        playerId: currentPlayer.playerId,
        tournamentId: match.match.tournamentId,
        value: currentResult,
        type: 'hf'
      }
      achievementsDispatch(addAchievement(hf));
    }
  };

  const handleQf = (player, dart) => {
    if(dart < 20){
      const qf = {
        playerId: player.playerId,
        tournamentId: match.match.tournamentId,
        value: dart,
        type: 'qf'
      }
      achievementsDispatch(addAchievement(qf));
    }
  }

  const handleDartSubmit = (points, roundTotal, isLastDart, dartIndex) => {
    if (matchClosed) return;
    if (points <= 0 || points > 180) return;
    if (okHandlingRef.current) return;

    const idx = currentPlayerIndexRef.current;
    const state = playerStates[idx];
    const dispatch = playerDispatches[idx];
    const player = players[idx];

    if (state.score - points < 0) {
      const dartsInRound = state.dartsThrown % 3;
      for (let i = 0; i < dartsInRound; i++) {
        dispatch(undoSingleDart());
      }
      const nextIdx = (idx + 1) % N;
      currentPlayerIndexRef.current = nextIdx;
      setCurrentPlayerIndex(nextIdx);
      return;
    }

    if (state.score - points === 0) {
      okHandlingRef.current = true;
      dispatch(updateSingleDart(points));
      if (isLastDart && roundTotal >= 100) handleHfWithValue(player, roundTotal);
      const dartsInVisit = (dartIndex ?? 2) + 1;
      Alert.alert(
        'UWAGA',
        `Czy ${player?.name ?? 'Gracz'} wygrał lega?`,
        [
          { text: 'NIE', style: 'cancel', onPress: () => { okHandlingRef.current = false; } },
          {
            text: 'TAK',
            style: 'destructive',
            onPress: () => {
              okHandlingRef.current = false;
              handleCheckout(idx, dartsInVisit);
            },
          },
        ]
      );
      return;
    }

    okHandlingRef.current = true;
    if (isLastDart) handleMaxAndOneSeventyWithValue(player, roundTotal);
    dispatch(updateSingleDart(points));
    okHandlingRef.current = false;

    if (isLastDart) {
      const nextIdx = (idx + 1) % N;
      currentPlayerIndexRef.current = nextIdx;
      setCurrentPlayerIndex(nextIdx);
    }
  };

  const handleUndoSingleDart = () => {
    if (matchClosed) return;
    const idx = currentPlayerIndexRef.current;
    const state = playerStates[idx];
    if (state.currentLegScores.length === 0) {
      const prevIdx = (idx - 1 + N) % N;
      const prevState = playerStates[prevIdx];
      const dartsToUndo = Math.min(3, prevState.currentLegScores.length);
      for (let i = 0; i < dartsToUndo; i++) {
        playerDispatches[prevIdx](undoSingleDart());
      }
      currentPlayerIndexRef.current = prevIdx;
      setCurrentPlayerIndex(prevIdx);
      return;
    }
    playerDispatches[idx](undoSingleDart());
  };

  const handleUndoLastDartAfterSwitch = () => {
    if (matchClosed) return;
    const idx = currentPlayerIndexRef.current;
    const prevIdx = (idx - 1 + N) % N;
    playerDispatches[prevIdx](undoSingleDart());
    currentPlayerIndexRef.current = prevIdx;
    setCurrentPlayerIndex(prevIdx);
  };

  const handleMaxAndOneSeventyWithValue = (playerForAchievement, roundTotal) => {
    const p = playerForAchievement;
    if (!p) return;
    if (roundTotal === 180) {
      achievementsDispatch(addAchievement({ playerId: p.playerId, tournamentId: match.match.tournamentId, value: null, type: 'max' }));
    }
    if (roundTotal >= 170 && roundTotal < 180) {
      achievementsDispatch(addAchievement({ playerId: p.playerId, tournamentId: match.match.tournamentId, value: roundTotal, type: 'one_seventy' }));
    }
  };

  const handleHfWithValue = (p, roundTotal) => {
    if (roundTotal >= 100) {
      achievementsDispatch(addAchievement({ playerId: p.playerId, tournamentId: match.match.tournamentId, value: roundTotal, type: 'hf' }));
    }
  };

  const handleOkBtn = (explicitResult) => {
    if (matchClosed) return;
    const resultToApply = (typeof explicitResult === 'number') ? explicitResult : currentResult;
    if (resultToApply > 180 || (typeof resultToApply !== 'number') || resultToApply <= 0) return;
    if (okHandlingRef.current) return;

    const idx = currentPlayerIndexRef.current;
    const state = playerStates[idx];
    const dispatch = playerDispatches[idx];
    const player = players[idx];

    okHandlingRef.current = true;

    handleMaxAndOneSeventy(player);

    if (resultToApply < state.score - 1) {
      dispatch(updateStats(resultToApply));
      const nextIdx = (idx + 1) % N;
      currentPlayerIndexRef.current = nextIdx;
      setCurrentPlayerIndex(nextIdx);
      setCurrentResult(0);
      okHandlingRef.current = false;
      return;
    }

    if (resultToApply === state.score) {
      Alert.alert(
        'UWAGA',
        `Czy ${player?.name ?? 'Gracz'} wygrał lega?`,
        [
          { text: 'NIE', style: 'cancel', onPress: () => { okHandlingRef.current = false; } },
          {
            text: 'TAK',
            style: 'destructive',
            onPress: () => {
              okHandlingRef.current = false;
              handleHf();
              handleCheckout(idx);
            },
          },
        ]
      );
      setCurrentResult(0);
      return;
    }
    setCurrentResult(0);
    okHandlingRef.current = false;
  };

  const handleCheckout = (idx, dartsInVisit = 3) => {
    const state = playerStates[idx];
    if (state.dartsThrown < 20) {
      setQfHelperDart(state.dartsThrown);
      toggleQFModal();
      return;
    }
    playerDispatches[idx](legWin(dartsInVisit));
    for (let j = 0; j < N; j++) {
      if (j !== idx) playerDispatches[j](legLose());
    }
    const nextIdx = (idx + 1) % N;
    currentPlayerIndexRef.current = nextIdx;
    setCurrentPlayerIndex(nextIdx);
  };

  const sendMatchResult = async (matchResultDTO) => {
    try{
      const response = await fetch(UPDATE_GAME_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth?.accessToken}`
        },
        body: JSON.stringify(matchResultDTO)
      });

      if(response.ok){
        console.log('Zaktualizowano mecz');
      }else{
        console.error('Blad podczas aktualizacji meczu', response.statusText);
      }
    } catch (error) {
      console.error('Blad podczas strzalu do API przy aktualizowaniu meczu', error);
    }
  };

  const sendQuickGameResult = async (playersPayload, achievementsPayload, lobbyId) => {
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
          ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        console.log('Zaktualizowano wynik szybkiego meczu');
      } else {
        console.error('Blad podczas aktualizacji szybkiego meczu', await response.text());
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
    const legsWonArr = isCricket
      ? cricketStates.map((s) => s?.legsWon ?? 0)
      : playerStates.map((s) => s.legsWon);
    const hasWinner = legsWonArr.some((l) => l >= legsToWin);
    if (!hasWinner) return;

    setMatchClosed(true);
    const winnerIdx = legsWonArr.findIndex((l) => l >= legsToWin);
    const winner = players[winnerIdx];
    const loser = N === 2 ? players[1 - winnerIdx] : null;

    if (isQuickGame) {
      const states = isCricket ? cricketStates : playerStates;
      const withPlace = players
        .map((p, i) => ({ player: p, state: states[i], idx: i }))
        .filter((x) => x.player?.playerId)
        .sort((a, b) => (b.state.legsWon - a.state.legsWon));
      if (withPlace.length >= 2) {
        const playersPayload = withPlace.map((x, place) => ({
          playerId: x.player.playerId,
          score: x.state.legsWon,
          place: place + 1,
          average: parseFloat(x.state.matchAverage) || null,
          dartsThrown: x.state.totalDartsThrown || null,
          pointsEarned: x.state.totalPointsEarned || null,
        }));
        const achievementsPayload = (achievementsState?.achievements || []).map((a) => ({
          playerId: a.playerId,
          value: a.value ?? null,
          type: a.type,
        }));
        sendQuickGameResult(playersPayload, achievementsPayload, quickGame?.lobbyId);
      }
      const msg = N === 2 && loser
        ? `${loser.name} przegrał zatem pozostaje przy tarczy jako liczący.`
        : `${winner?.name ?? 'Zwycięzca'} wygrał mecz!`;
      Alert.alert('MECZ ZAKOŃCZONY', msg, [{ text: 'OK', style: 'destructive', onPress: () => {} }]);
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
      [{ text: 'OK', style: 'destructive', onPress: () => {} }]
    );
  }, [legsToWin, isCricket, player1State.legsWon, player2State.legsWon, player3State?.legsWon, player4State?.legsWon, player5State?.legsWon, player6State?.legsWon, cricket1?.legsWon, cricket2?.legsWon, cricket3?.legsWon, cricket4?.legsWon, cricket5?.legsWon, cricket6?.legsWon]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {

        e.preventDefault();

        Alert.alert(
          'UWAGA',
          'Czy na pewno chcesz opuścić mecz?',
          [
            { text: "KONTYNUUJ MECZ", style: 'cancel', onPress: () => {} },
            {
              text: 'OPUŚĆ MECZ',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]
        );
      }),
    [navigation]
  );

  return (
    <View style={styles.container}>

      <Modal visible={isModalVisible}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalText}>Kto rzuca pierwszy?</Text>
          <View style={[styles.modalBtnsContainer, N > 2 && styles.modalBtnsWrap]}>
            {players.slice(0, N).map((p, i) => (
              <Pressable
                key={i}
                style={styles.modalBtn}
                onPress={() => handleBullWinnerSelection(p)}
              >
                <Text style={styles.modalBtnText} numberOfLines={1}>{p?.name ?? 'Gracz'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {currentPlayer && 
        <Modal visible={isQFModalVisible}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>Którą lotką {currentPlayer.name} skończył lega?</Text>
            <View style={[styles.modalBtnsContainer, styles.qfModalBtnsContainer]}>
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
      }

      <View style={styles.navigationContainer}>
        <Pressable style={selectedComponent === "counter" ? [styles.navigationBtn, styles.selectedNavigationBtn] : [styles.navigationBtn]} onPress={() => setSelectedComponent('counter')}>
          <Text style={[styles.navigationBtnText]}>Wynik</Text>
        </Pressable>
        <Pressable style={selectedComponent === "stats" ? [styles.navigationBtn, styles.selectedNavigationBtn] : [styles.navigationBtn]} onPress={() => setSelectedComponent('stats')}>
          <Text style={styles.navigationBtnText}>Statystyki</Text>
        </Pressable>
        <Pressable style={selectedComponent === "settings" ? [styles.navigationBtn, styles.selectedNavigationBtn] : [styles.navigationBtn]} onPress={() => setSelectedComponent('settings')}>
          <Text style={styles.navigationBtnText}>Ustawienia</Text>
        </Pressable>
      </View>

      {renderContent()}
      
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#363062'
  },
  modalContainer:{
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
    textAlign: 'center'
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
    flexDirection: 'column'
  },
  modalBtn: {
    width: 120,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  qfModalBtn: {
    marginTop: 30
  },
  modalBtnText: {
    color: '#c5c5c5',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 15,
    paddingRight: 15,
    fontSize: 18
  },
  navigationContainer: {
    flexDirection: 'row'
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
    backgroundColor: 'rgba(0,0,0,.3)'
  },
  navigationBtnText: {
    fontSize: 18,
    color: '#c5c5c5'
  },  
});

export default Match



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

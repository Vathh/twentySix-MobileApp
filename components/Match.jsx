import React, { useEffect, useReducer, useState } from 'react'
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { playerResultReducer } from '../helpers/reducers/playerResultReducer';
import { initialPlayerResultState, legLose, legWin, undo, updateStats } from '../helpers/reducers/playerResultActions';
import { achievementsReducer } from '../helpers/reducers/achievementsReducer';
import { addAchievement, initialAchievementsState } from '../helpers/reducers/achievementActions';
import Counter from './Counter';
import Stats from './Stats';
import { UPDATE_GAME_API_URL } from '../helpers/apiConfig';
import useAuth from '../hooks/useAuth';

const Match = ({ route, navigation }) => {

  const { auth } = useAuth();

  const [selectedComponent, setSelectedComponent] = useState('counter');

  const { match } = route.params;
  const player1 = match.match.player1;
  const player2 = match.match.player2;
  const [isModalVisible, setIsModalVisible] = useState(true);
  const [isQFModalVisible, setIsQFModalVisible] = useState(false);
  const [matchClosed, setMatchClosed] = useState(false);

  const [player1State, player1Dispatch] = useReducer(playerResultReducer, initialPlayerResultState);

  const [player2State, player2Dispatch] = useReducer(playerResultReducer, initialPlayerResultState);

  const [achievementsState, achievementsDispatch] = useReducer(achievementsReducer, initialAchievementsState);

  const [legStartingPlayer, setLegStartingPlayer] = useState();
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentResult, setCurrentResult] = useState(0);
  const [qfHelperDart, setQfHelperDart] = useState(0);

  const renderContent = () => {
    if(selectedComponent === 'counter'){
      return <Counter 
              player1={player1}
              player2={player2}
              player1State={player1State}
              player2State={player2State}
              currentPlayer={currentPlayer}
              currentResult={currentResult}
              handleNumberBtn={handleNumberBtn}
              handleOkBtn={handleOkBtn}
              handleUndoBtn={handleUndoBtn}
              handleClearBtn={handleClearBtn}
            />
    }else if(selectedComponent === 'stats'){
      return <Stats
              player1Name={player1.name}
              player2Name={player2.name}
              player1State={player1State}
              player2State={player2State}
            />
    }
  }

  const switchStartingPlayer = () => {
    if(legStartingPlayer === player1){
      setLegStartingPlayer(player2);
    }
    
    if(legStartingPlayer === player2){
      setLegStartingPlayer(player1);
    }
  };

  const toggleModal = () => {
    setIsModalVisible(visibility => !visibility);
  }

  const toggleQFModal = () => {
    setIsQFModalVisible(visibility => !visibility);
  }

  const handleBullWinnerSelection = (player) => {
    setLegStartingPlayer(player);
    setCurrentPlayer(player);
    toggleModal();
  }

  const handleNumberBtn = (number) => {
    if(matchClosed){
      return;
    }

    if(currentResult.toString().length < 3){
      setCurrentResult(result => parseInt(result.toString() + number, 10));
    }    
  }

  const handleClearBtn = () => {
    if(matchClosed){
      return;
    }
    setCurrentResult(0);
  };

  const handleMaxAndOneSeventy = () => {
    if(currentResult == 180){
      const max = {
        playerId: currentPlayer.playerId,
        tournamentId: match.match.tournamentId,
        value: null,
        type: 'max'
      }
      achievementsDispatch(addAchievement(max));
    }

    if(currentResult >= 170 && currentResult < 180){
      const oneSeventy = {
        playerId: currentPlayer.playerId,
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

  const handleOkBtn = () => {
    if(matchClosed){
      return;
    }

    if(currentResult > 180 || currentResult.length <= 0){
      return
    }

    handleMaxAndOneSeventy();    

    if(currentPlayer === player1){
      if(currentResult < player1State.score - 1){
        player1Dispatch(updateStats(currentResult));
        setCurrentPlayer(player2);
      }
      if(currentResult == player1State.score){
        Alert.alert(
          'UWAGA',
          `Czy ${player1.name} wygrał lega?`,
          [
            { text: "NIE", style: 'cancel', onPress: () => {} },
            {
              text: 'TAK',
              style: 'destructive',
              onPress: () => {
                handleHf();
                handleCheckout(player1)
              },
            },
          ]
        );
      }
    }

    if(currentPlayer === player2){
      if(currentResult < player2State.score - 1){
        player2Dispatch(updateStats(currentResult));
        setCurrentPlayer(player1);
      }
      if(currentResult == player2State.score){
        Alert.alert(
          'UWAGA',
          `Czy ${player2.name} wygrał lega?`,
          [
            { text: "NIE", style: 'cancel', onPress: () => {} },
            {
              text: 'TAK',
              style: 'destructive',
              onPress: () => {
                handleHf();
                handleCheckout(player2)
              },
            },
          ]
        );
      }
    }    
    setCurrentResult(0);
  }

  const handleCheckout = (player) => {

    if(player === player1){
      if(player1State.dartsThrown < 20){
        toggleQFModal();
        setQfHelperDart(player1State.dartsThrown);
        return;
      }else{
        player1Dispatch(legWin(3));
        player2Dispatch(legLose());
      }
    }
    
    if(player === player2){
      if(player2State.dartsThrown < 20){
        toggleQFModal();
        setQfHelperDart(player2State.dartsThrown);
        return;
      }else{
        player2Dispatch(legWin(3));
        player1Dispatch(legLose());
      }
    }    
  }

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
  }

  const handleQFModalBtn = (dartNumber) => {    
    const dart = qfHelperDart + dartNumber;
    if(currentPlayer === player1){
      handleQf(player1, dart);
      player1Dispatch(legWin(dartNumber));
      player2Dispatch(legLose());
      switchStartingPlayer();
    }
    
    if(currentPlayer === player2){
      handleQf(player2, dart);
      player2Dispatch(legWin(dartNumber));
      player1Dispatch(legLose());
      switchStartingPlayer();
    }

    toggleQFModal();
  }

  const handleUndoBtn = () => {
    if(matchClosed){
      return;
    }

    if(player1State.score == 501 && player2State.score == 501){
      return
    }
    if(currentPlayer === player1){
      setCurrentPlayer(player2);
      player2Dispatch(undo());
    }
    if(currentPlayer === player2){
      setCurrentPlayer(player1);
      player1Dispatch(undo());
    }
  }

  useEffect(() => {
    if(player1State.legsWon == 2 || player2State.legsWon == 2){
      setMatchClosed(true);
      let winner;
      let loser;

      if(player1State.legsWon == 2){
        winner = player1;
        loser = player2;
      }else if(player2State.legsWon == 2){
        winner = player2;
        loser = player1;
      }

      const matchResultDTO = {
        game : {
          id: match.match.id,
          type: match.match.type,
          player1Id: player1.id,
          player2Id: player2.id,
          player1Score: player1State.legsWon,
          player2Score: player2State.legsWon,
          winnerId: winner.id,
          tournamentId: match.match.tournamentId,
          groupNumber: match.match.groupNumber 
        },
        achievements : achievementsState
      };

      sendMatchResult(matchResultDTO);

      Alert.alert(
        'MECZ ZAKOŃCZONY',
        `${loser.name} przegrał zatem pozostaje przy tarczy jako liczący.`,
        [
          {
            text: 'OK',
            style: 'destructive',
            onPress: () => {

            },
          },
        ]
      );
    }
  },[player1State.legsWon, player2State.legsWon]);

  useEffect(() => {
    setCurrentPlayer(legStartingPlayer);
  }, [legStartingPlayer])

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
          <View style={styles.modalBtnsContainer}>
            <Pressable 
              style={styles.modalBtn} 
              onPress={() => handleBullWinnerSelection(player1)}
            >
              <Text style={styles.modalBtnText}>{player1.name}</Text>
            </Pressable>
            <Pressable 
              style={styles.modalBtn} 
              onPress={() => handleBullWinnerSelection(player2)}
            >
              <Text style={styles.modalBtnText}>{player2.name}</Text>
            </Pressable>
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

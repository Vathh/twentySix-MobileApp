import React from 'react'
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native'

const Counter = ({
  player1,
  player2,
  player1State,
  player2State,
  currentPlayer,
  currentResult,
  handleNumberBtn,
  handleOkBtn,
  handleUndoBtn,
  handleClearBtn,
  players: playersProp,
  playerStates: playerStatesProp,
  currentPlayerIndex: currentPlayerIndexProp,
}) => {
  const isMulti = Array.isArray(playersProp) && playersProp.length > 2;
  const players = isMulti ? playersProp : [player1, player2];
  const playerStates = isMulti ? playerStatesProp : [player1State, player2State];
  // Zawsze używamy currentPlayerIndex (dla 2 graczy przekazywany z Match), żeby poprawnie przełączać tury
  const currentPlayerIndex = currentPlayerIndexProp ?? (currentPlayer === player1 ? 0 : 1);
  const currentIdx = isMulti ? currentPlayerIndex : currentPlayerIndex;

  if (isMulti) {
    return (
      <View style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.multiLegsLabel}>Legi</Text>
        </View>
        <ScrollView style={styles.multiList} contentContainerStyle={styles.multiListContent}>
          {players.map((p, i) => (
            <View key={i} style={[styles.multiRow, i === currentIdx && styles.multiRowActive]}>
              <View style={styles.multiRowLeft}>
                <Text style={styles.multiPlayerName} numberOfLines={1}>{p?.name ?? 'Gracz'}</Text>
                <Text style={styles.multiDarts}>({playerStates[i]?.dartsThrown ?? 0})</Text>
              </View>
              <View style={styles.multiRowCenter}>
                <Text style={[styles.multiScore, i === currentIdx && styles.goldText]}>
                  {playerStates[i]?.score ?? 501}
                </Text>
                <Text style={styles.multiLegs}>{playerStates[i]?.legsWon ?? 0} legi</Text>
              </View>
              <View style={styles.multiRowRight}>
                <Text style={styles.multiAvg}>ms: {playerStates[i]?.totalPointsEarned ? playerStates[i].matchAverage : '-'}</Text>
                <Text style={styles.multiAvg}>ls: {playerStates[i]?.score !== 501 ? playerStates[i].currentLegAverage : '-'}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.scoreContainer}>
          <View style={styles.score}>
            <Text style={styles.scoreText}>{currentResult > 0 ? currentResult : 'Wprowadź wynik'}</Text>
          </View>
          <View style={styles.undoContainer}>
            <Pressable style={styles.undoBtn} onPress={handleUndoBtn}>
              <Text style={styles.undoText}>Cofnij</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.countContainer}>
          <View style={styles.countRow}>
            {[1,2,3].map((n) => (
              <Pressable key={n} style={styles.countNumber} onPress={() => handleNumberBtn(String(n))}>
                <Text style={styles.countNumberText}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.countRow}>
            {[4,5,6].map((n) => (
              <Pressable key={n} style={styles.countNumber} onPress={() => handleNumberBtn(String(n))}>
                <Text style={styles.countNumberText}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.countRow}>
            {[7,8,9].map((n) => (
              <Pressable key={n} style={styles.countNumber} onPress={() => handleNumberBtn(String(n))}>
                <Text style={styles.countNumberText}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.countRow}>
            <Pressable style={styles.countNumber} onPress={handleClearBtn}>
              <Text style={styles.countNumberText}>C</Text>
            </Pressable>
            <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('0')}>
              <Text style={styles.countNumberText}>0</Text>
            </Pressable>
            <Pressable style={styles.countNumber} onPress={handleOkBtn}>
              <Text style={styles.countNumberText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.resultContainer}>
        <View style={styles.player1Container}>
          <Text style={styles.playerText}>{player1.name} ({player1State.dartsThrown})</Text>
        </View>
        <View style={styles.legsContainer}>
            <Text style={styles.legsResultText}>{player1State.legsWon}</Text>
            <Text style={styles.legsText}>legi</Text>
            <Text style={styles.legsResultText}>{player2State.legsWon}</Text>
        </View>
        <View style={styles.player2Container}>
          <Text style={styles.playerText}>({player2State.dartsThrown}) {player2.name}</Text>
        </View>
      </View>

      <View style={styles.countersContainer}>
        <View style={[styles.counterContainer, styles.counterContainerWithBorder]}>
          <Text style={[styles.counterText, currentIdx === 0 && styles.goldText]}>{player1State.score}</Text>
          <View style={styles.averagesContainer}>
            <Text style={styles.averageText}>
              ms: {player1State.totalPointsEarned != 0 ? player1State.matchAverage : '-'}
            </Text>
            <Text style={styles.averageText}>
              ls: {player1State.score != 501 ? player1State.currentLegAverage : '-'}
            </Text>
          </View>
        </View> 
        <View style={styles.counterContainer}>
          <Text style={[styles.counterText, currentIdx === 1 && styles.goldText]}>{player2State.score}</Text>
          <View style={styles.averagesContainer}>
            <Text style={styles.averageText}>
              ms: {player2State.totalPointsEarned != 0 ? player2State.matchAverage : '-'}
            </Text>
            <Text style={styles.averageText}>
              ls: {player2State.score != 501 ? player2State.currentLegAverage : '-'}
            </Text>
          </View>
        </View> 
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.score}>
          <Text style={styles.scoreText}>{currentResult > 0 ? currentResult : "Wprowadź wynik"}</Text>
        </View>

        <View style={styles.undoContainer}>
          <Pressable style={styles.undoBtn} onPress={handleUndoBtn}>
            <Text style={styles.undoText}>Cofnij</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.countContainer}>
        <View style={styles.countRow}>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('1')}>
            <Text style={styles.countNumberText}>1</Text>
          </Pressable>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('2')}>
            <Text style={styles.countNumberText}>2</Text>
          </Pressable>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('3')}>
            <Text style={styles.countNumberText}>3</Text>
          </Pressable>
        </View>
        <View style={styles.countRow}>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('4')}>
            <Text style={styles.countNumberText}>4</Text>
          </Pressable>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('5')}>
            <Text style={styles.countNumberText}>5</Text>
          </Pressable>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('6')}>
            <Text style={styles.countNumberText}>6</Text>
          </Pressable>
        </View>
        <View style={styles.countRow}>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('7')}>
            <Text style={styles.countNumberText}>7</Text>
          </Pressable>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('8')}>
            <Text style={styles.countNumberText}>8</Text>
          </Pressable>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('9')}>
            <Text style={styles.countNumberText}>9</Text>
          </Pressable>
        </View>
        <View style={styles.countRow}>
          <Pressable style={styles.countNumber} onPress={handleClearBtn}>
            <Text style={styles.countNumberText}>C</Text>
          </Pressable>
          <Pressable style={styles.countNumber} onPress={() => handleNumberBtn('0')}>
            <Text style={styles.countNumberText}>0</Text>
          </Pressable>
          <Pressable style={styles.countNumber} onPress={handleOkBtn}>
            <Text style={styles.countNumberText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  resultContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,.3)',
  },
  player1Container: {
    flex: 1,
    paddingLeft: 10
  },
  player2Container: {
    flex: 1,
    paddingRight: 10,
    alignItems: 'flex-end'
  },
  playerText: {
    fontSize: 18,
    color: '#c5c5c5'
  },
  legsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  legsText: {
    marginLeft: 15,
    marginRight: 15,
    fontSize: 20,
    color: '#c5c5c5'
  },
  legsResultText: {
    fontSize: 28,
    justifyContent: 'center',
    color: '#c5c5c5'
  },
  countersContainer: {
    flexDirection: 'row',
    flex: 1
  },
  counterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  counterContainerWithBorder: {
    borderRightWidth: 2,
    borderColor: 'rgba(0,0,0,.3)'
  },
  counterText: {
    fontSize: 100,
    flex: 1,
    justifyContent: 'center',
    textAlignVertical: 'center',
    color: '#c5c5c5'
  },
  goldText: {
    color: '#F99417'
  },
  averagesContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,.3)'
  },
  averageText: {
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 18,
    color: '#c5c5c5'
  },
  scoreContainer: {
    flexDirection: 'row',
  },
  score: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 24,
    paddingTop: 10,
    paddingBottom: 10,
    color: '#c5c5c5'    
  },
  undoContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.3)'
  },
  undoBtn: {
    paddingRight: 10,
    backgroundColor: 'rgba(0,0,0,.4)',
    flex: 1,
    paddingLeft: 10,
    justifyContent: 'center'
  },
  undoText: {
    fontSize: 18,
    color: '#c5c5c5'
  },
  countContainer: {
    width: '100%'
  },
  countRow:{
    flexDirection: 'row'
  },
  countNumber: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: .5,
    borderColor: '#c5c5c5',
    paddingTop: 15,
    paddingBottom: 15
  },
  countNumberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c5c5c5'
  },
  multiLegsLabel: {
    color: '#c5c5c5',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 6,
  },
  multiList: {
    flex: 1,
  },
  multiListContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  multiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 6,
    borderRadius: 6,
  },
  multiRowActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#F99417',
    backgroundColor: 'rgba(249,148,23,0.15)',
  },
  multiRowLeft: {
    flex: 1.2,
  },
  multiRowCenter: {
    flex: 1,
    alignItems: 'center',
  },
  multiRowRight: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  multiPlayerName: {
    color: '#f5f5f5',
    fontSize: 16,
    fontWeight: '600',
  },
  multiDarts: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  multiScore: {
    fontSize: 36,
    color: '#c5c5c5',
    fontWeight: 'bold',
  },
  multiLegs: {
    color: '#c5c5c5',
    fontSize: 14,
    marginTop: 2,
  },
  multiAvg: {
    color: '#888',
    fontSize: 12,
  },
});

export default Counter

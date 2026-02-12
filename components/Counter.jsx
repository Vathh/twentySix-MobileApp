import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native'
import { SCORING_MODES } from '../hooks/useMatchSettings'

const Counter = ({
  players,
  playerStates,
  currentPlayerIndex,
  currentResult,
  handleNumberBtn,
  handleOkBtn,
  handleUndoBtn,
  handleClearBtn,
  handleDartSubmit,
  handleUndoSingleDart,
  handleUndoLastDartAfterSwitch,
  scoringMode = SCORING_MODES.SUM,
  canInput = true,
}) => {
  const N = players?.length ?? 0;
  const isTwoPlayer = N === 2;
  const isPerDart = scoringMode === SCORING_MODES.PER_DART;
  const inputDisabled = !canInput;

  const [dartScores, setDartScores] = useState([0, 0, 0]);
  const [dartIndex, setDartIndex] = useState(0);
  const [modifier, setModifier] = useState(null);
  const lastSubmittedRef = useRef(null);

  useEffect(() => {
    if (!isPerDart) {
      setDartScores([0, 0, 0]);
      setDartIndex(0);
      setModifier(null);
    }
  }, [isPerDart]);

  const applyDartValue = (baseValue) => {
    if (inputDisabled) return;
    if (dartIndex === 0) lastSubmittedRef.current = null;
    const mult = baseValue === 25
      ? (modifier === 'double' ? 2 : 1)
      : (modifier === 'double' ? 2 : modifier === 'triple' ? 3 : 1);
    const points = baseValue * mult;
    const nextScores = [...dartScores];
    nextScores[dartIndex] = points;
    setDartScores(nextScores);
    setModifier(null);
    const isLastDart = dartIndex >= 2;
    const roundTotal = nextScores[0] + nextScores[1] + nextScores[2];
    handleDartSubmit?.(points, roundTotal, isLastDart, dartIndex);
    if (isLastDart) {
      lastSubmittedRef.current = [nextScores[0], nextScores[1]];
      setDartScores([0, 0, 0]);
      setDartIndex(0);
    } else {
      setDartIndex((i) => i + 1);
    }
  };

  const handleUndoLastDart = () => {
    if (lastSubmittedRef.current) {
      const [d1, d2] = lastSubmittedRef.current;
      lastSubmittedRef.current = null;
      handleUndoLastDartAfterSwitch?.();
      setDartScores([d1, d2, 0]);
      setDartIndex(2);
    } else if (dartIndex > 0) {
      const nextScores = [...dartScores];
      nextScores[dartIndex - 1] = 0;
      setDartScores(nextScores);
      setDartIndex((i) => i - 1);
      handleUndoSingleDart?.();
    } else {
      handleUndoSingleDart?.();
    }
  };

  const dartPad = (
    <View style={[styles.dartPad, inputDisabled && { opacity: 0.6 }]} pointerEvents={inputDisabled ? 'none' : 'auto'}>
      <View style={styles.dartModRow}>
        <Pressable
          style={[styles.dartModBtn, modifier === 'double' && styles.dartModBtnActive]}
          onPress={() => setModifier((m) => (m === 'double' ? null : 'double'))}
        >
          <Text style={[styles.dartModText, modifier === 'double' && styles.dartModTextActive]}>D</Text>
        </Pressable>
        <Pressable
          style={[styles.dartModBtn, modifier === 'triple' && styles.dartModBtnActive]}
          onPress={() => setModifier((m) => (m === 'triple' ? null : 'triple'))}
        >
          <Text style={[styles.dartModText, modifier === 'triple' && styles.dartModTextActive]}>T</Text>
        </Pressable>
        <View style={styles.dartInfo}>
          <Text style={styles.dartInfoText}>Rzut {dartIndex + 1}/3</Text>
        </View>
      </View>
      <View style={styles.dartNumbersRow}>
        {[20, 19, 18, 17, 16].map((n) => (
          <Pressable key={n} style={styles.dartNumBtn} onPress={() => applyDartValue(n)}>
            <Text style={styles.dartNumText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.dartNumbersRow}>
        {[15, 14, 13, 12, 11].map((n) => (
          <Pressable key={n} style={styles.dartNumBtn} onPress={() => applyDartValue(n)}>
            <Text style={styles.dartNumText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.dartNumbersRow}>
        {[10, 9, 8, 7, 6].map((n) => (
          <Pressable key={n} style={styles.dartNumBtn} onPress={() => applyDartValue(n)}>
            <Text style={styles.dartNumText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.dartNumbersRow}>
        {[5, 4, 3, 2, 1].map((n) => (
          <Pressable key={n} style={styles.dartNumBtn} onPress={() => applyDartValue(n)}>
            <Text style={styles.dartNumText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.dartBottomRow}>
        <Pressable
          style={[styles.dartBullBtn, modifier === 'triple' && styles.dartBullBtnDisabled]}
          onPress={modifier === 'triple' ? undefined : () => applyDartValue(25)}
          disabled={modifier === 'triple'}
        >
          <Text style={[styles.dartBullText, modifier === 'triple' && styles.dartBullTextDisabled]}>Bull</Text>
          <Text style={[styles.dartBullSub, modifier === 'triple' && styles.dartBullTextDisabled]}>(25)</Text>
        </Pressable>
      </View>
    </View>
  );

  const numPad = (
    <View style={[styles.countContainer, inputDisabled && { opacity: 0.6 }]} pointerEvents={inputDisabled ? 'none' : 'auto'}>
      <View style={styles.countRow}>
        {[1, 2, 3].map((n) => (
          <Pressable key={n} style={styles.countNumber} onPress={() => handleNumberBtn(String(n))}>
            <Text style={styles.countNumberText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.countRow}>
        {[4, 5, 6].map((n) => (
          <Pressable key={n} style={styles.countNumber} onPress={() => handleNumberBtn(String(n))}>
            <Text style={styles.countNumberText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.countRow}>
        {[7, 8, 9].map((n) => (
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
  );

  const scoreDisplayText = isPerDart
    ? `Rzut ${dartIndex + 1}/3`
    : (currentResult > 0 ? currentResult : 'Wprowadź wynik');
  const scoreSection = (
    <View style={styles.scoreContainer}>
      <View style={styles.score}>
        <Text style={styles.scoreText}>{scoreDisplayText}</Text>
      </View>
      <View style={styles.undoContainer}>
        <Pressable style={styles.undoBtn} onPress={isPerDart ? handleUndoLastDart : handleUndoBtn}>
          <Text style={styles.undoText}>Cofnij</Text>
        </Pressable>
      </View>
    </View>
  );

  if (isTwoPlayer && N >= 2) {
    const p0 = players[0];
    const p1 = players[1];
    const s0 = playerStates[0];
    const s1 = playerStates[1];
    return (
      <View style={styles.container}>
        <View style={styles.resultContainer}>
          <View style={styles.player1Container}>
            <Text style={styles.playerText}>{p0?.name ?? 'Gracz'} ({s0?.dartsThrown ?? 0})</Text>
          </View>
          <View style={styles.legsContainer}>
            <Text style={styles.legsResultText}>{s0?.legsWon ?? 0}</Text>
            <Text style={styles.legsText}>legi</Text>
            <Text style={styles.legsResultText}>{s1?.legsWon ?? 0}</Text>
          </View>
          <View style={styles.player2Container}>
            <Text style={styles.playerText}>({s1?.dartsThrown ?? 0}) {p1?.name ?? 'Gracz'}</Text>
          </View>
        </View>

        <View style={styles.countersContainer}>
          <View style={[styles.counterContainer, styles.counterContainerWithBorder]}>
            <Text style={[styles.counterText, currentPlayerIndex === 0 && styles.goldText]}>{s0?.score ?? 501}</Text>
            <View style={styles.averagesContainer}>
              <Text style={styles.averageText}>
                ms: {s0?.totalPointsEarned ? s0.matchAverage : '-'}
              </Text>
              <Text style={styles.averageText}>
                ls: {s0?.score !== 501 ? s0.currentLegAverage : '-'}
              </Text>
            </View>
          </View>
          <View style={styles.counterContainer}>
            <Text style={[styles.counterText, currentPlayerIndex === 1 && styles.goldText]}>{s1?.score ?? 501}</Text>
            <View style={styles.averagesContainer}>
              <Text style={styles.averageText}>
                ms: {s1?.totalPointsEarned ? s1.matchAverage : '-'}
              </Text>
              <Text style={styles.averageText}>
                ls: {s1?.score !== 501 ? s1.currentLegAverage : '-'}
              </Text>
            </View>
          </View>
        </View>

        {scoreSection}
        {inputDisabled && (
          <Text style={styles.waitingText}>Czekaj na swoją kolejkę</Text>
        )}
        {isPerDart ? dartPad : numPad}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.resultContainer}>
        <Text style={styles.multiLegsLabel}>Legi</Text>
      </View>
      <ScrollView style={styles.multiList} contentContainerStyle={styles.multiListContent}>
        {players.map((p, i) => (
          <View key={i} style={[styles.multiRow, i === currentPlayerIndex && styles.multiRowActive]}>
            <View style={styles.multiRowLeft}>
              <Text style={styles.multiPlayerName} numberOfLines={1}>{p?.name ?? 'Gracz'}</Text>
              <Text style={styles.multiDarts}>({playerStates[i]?.dartsThrown ?? 0})</Text>
            </View>
            <View style={styles.multiRowCenter}>
              <Text style={[styles.multiScore, i === currentPlayerIndex && styles.goldText]}>
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
      {scoreSection}
      {inputDisabled && (
        <Text style={styles.waitingText}>Czekaj na swoją kolejkę</Text>
      )}
      {isPerDart ? dartPad : numPad}
    </View>
  );
};

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
  waitingText: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    paddingVertical: 8
  },
  countContainer: {
    width: '100%'
  },
  countRow: {
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
  dartPad: {
    width: '100%',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  dartModRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dartModBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dartModBtnActive: {
    borderColor: '#F99417',
    backgroundColor: 'rgba(249,148,23,0.25)',
  },
  dartModText: {
    color: '#c5c5c5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dartModTextActive: {
    color: '#F99417',
  },
  dartInfo: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dartInfoText: {
    color: '#888',
    fontSize: 14,
  },
  dartNumbersRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dartNumBtn: {
    flex: 1,
    margin: 2,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dartNumText: {
    color: '#c5c5c5',
    fontSize: 18,
    fontWeight: '600',
  },
  dartBottomRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  dartBullBtn: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dartBullText: {
    color: '#c5c5c5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dartBullSub: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  dartBullBtnDisabled: {
    opacity: 0.4,
  },
  dartBullTextDisabled: {
    color: '#666',
  },
});

export default Counter;

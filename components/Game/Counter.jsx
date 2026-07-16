import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native'
import { SCORING_MODES } from '../../hooks/useGameSettings'
import { formatAverage, hasAverage } from '../../helpers/formatAverage'
import { formatDartLabel } from '../../helpers/formatDartLabel'
import { isSingleSetFormat, normalizeMatchFormat } from '../../helpers/matchFormat/matchFormat'
import {
  legScoreInSetForDisplay,
  matchScoreForDisplay,
  scoreUnitLabel,
} from '../../helpers/matchFormat/matchFormatScoring'

const PER_DART_ACCENT = '#B8D9F0';

const Counter = ({
  players,
  playerStates,
  currentPlayerIndex,
  currentResult,
  resultEdited = false,
  handleNumberBtn,
  handleOkBtn,
  handleUndoBtn,
  handleClearBtn,
  handleDartSubmit,
  handleUndoSingleDart,
  scoringMode = SCORING_MODES.SUM,
  canInput = true,
  submitting = false,
  gameClosed = false,
  localVisitRemaining = null,
  matchFormat = null,
  /** Tryb jednego urządzenia — widok tylko do odczytu (bez komunikatu o kolejce). */
  oneDeviceSpectator = false,
  /** false = ukryj nakładkę „Czekaj na swoją kolejkę” (np. podczas ładowania openera). */
  showWaitingOverlay = true,
}) => {
  const format = normalizeMatchFormat(matchFormat);
  const unitLabel = scoreUnitLabel(format);
  const multiSet = !isSingleSetFormat(format);
  const N = players?.length ?? 0;
  const isTwoPlayer = N === 2;
  const isPerDart = scoringMode === SCORING_MODES.PER_DART;
  const inputDisabled = !canInput || submitting;
  const multiScrollRef = useRef(null);
  const rowOffsetsRef = useRef({});

  useEffect(() => {
    if (isTwoPlayer || N < 3) return;
    const y = rowOffsetsRef.current[currentPlayerIndex];
    if (y != null && multiScrollRef.current) {
      multiScrollRef.current.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }
  }, [currentPlayerIndex, isTwoPlayer, N]);
  const padDisabledStyle = oneDeviceSpectator
    ? { opacity: 0.35 }
    : inputDisabled
      ? { opacity: 0.6 }
      : null;

  const [dartScores, setDartScores] = useState([0, 0, 0]);
  const dartScoresRef = useRef([0, 0, 0]);
  const [dartIndex, setDartIndex] = useState(0);
  const [modifier, setModifier] = useState(null);
  const [currentVisitLabels, setCurrentVisitLabels] = useState([]);

  useEffect(() => {
    if (!isPerDart || !canInput) {
      dartScoresRef.current = [0, 0, 0];
      setDartScores([0, 0, 0]);
      setDartIndex(0);
      setModifier(null);
      setCurrentVisitLabels([]);
      return;
    }

    const st = playerStates[currentPlayerIndex];
    const labels = st?.currentVisitDartLabels ?? [];

    setCurrentVisitLabels([...labels]);
    setDartIndex(Math.min(labels.length, 2));
    if (labels.length === 0) {
      dartScoresRef.current = [0, 0, 0];
      setDartScores([0, 0, 0]);
    } else if (labels.length < dartScoresRef.current.filter((s) => s > 0).length) {
      const next = [0, 0, 0];
      for (let i = 0; i < labels.length; i += 1) {
        next[i] = dartScoresRef.current[i];
      }
      dartScoresRef.current = next;
      setDartScores(next);
    }
    setModifier(null);
  }, [
    currentPlayerIndex,
    isPerDart,
    canInput,
    playerStates[currentPlayerIndex]?.currentVisitDartLabels?.join('|'),
  ]);

  const resetDartPad = () => {
    dartScoresRef.current = [0, 0, 0];
    setDartScores([0, 0, 0]);
    setDartIndex(0);
    setCurrentVisitLabels([]);
    setModifier(null);
  };

  const applyDartValue = async (baseValue) => {
    if (inputDisabled) return;
    const mult = baseValue === 25
      ? (modifier === 'double' ? 2 : 1)
      : (modifier === 'double' ? 2 : modifier === 'triple' ? 3 : 1);
    const points = baseValue * mult;
    /* Na tarczy stalowej max za jedną lotkę to T20 = 60; inne segmenty są ≤ 60. */
    if (points > 60) return;
    const dartLabel = formatDartLabel(baseValue, modifier);
    const nextScores = [...dartScoresRef.current];
    nextScores[dartIndex] = points;
    dartScoresRef.current = nextScores;
    setDartScores(nextScores);
    setModifier(null);
    const nextLabels = [...currentVisitLabels, dartLabel];
    setCurrentVisitLabels(nextLabels);
    const isLastDart = dartIndex >= 2;
    const roundTotal = nextScores[0] + nextScores[1] + nextScores[2];
    const outcome = await Promise.resolve(
      handleDartSubmit?.(points, roundTotal, isLastDart, dartIndex, dartLabel),
    );
    if (outcome === 'continue') {
      // Następny indeks lotki = liczba zapisanych etykiet (0→1→2).
      // Nie używamy setDartIndex(i => i + 1) — useEffect też syncuje z reducera
      // i dawało podwójny increment (po 1. lotce dartIndex=2, wizyta kończyła się po 2.).
      setDartIndex(Math.min(nextLabels.length, 2));
      return;
    }
    resetDartPad();
  };

  const getVisitDartLabels = (playerIndex) => {
    if (!isPerDart) return [];
    const st = playerStates[playerIndex];
    const isActive = playerIndex === currentPlayerIndex;

    // Na swojej turze — tylko bieżąca wizyta; bez fallbacku do poprzedniej
    // (czyści slot od razu po przejściu tury, nie dopiero po 1. rzucie).
    if (isActive && canInput) {
      return currentVisitLabels;
    }

    const inProgress = st?.currentVisitDartLabels ?? [];
    if (inProgress.length) {
      return inProgress;
    }

    return st?.lastVisitDartLabels ?? [];
  };

  const renderLocalVisitRemainingOverlay = (playerIndex) => {
    if (!isPerDart) return null;
    if (playerIndex !== currentPlayerIndex || !canInput) return null;
    const mainScore = playerStates[playerIndex]?.score ?? 501;
    const displayValue = localVisitRemaining ?? mainScore;

    return (
      <View style={styles.localVisitRemainingOverlay} pointerEvents="none">
        <Text style={styles.localVisitRemainingText}>{displayValue}</Text>
      </View>
    );
  };

  const renderLocalVisitRemaining = (playerIndex, variant = 'twoPlayer') => {
    if (!isPerDart || variant === 'twoPlayer') return null;
    if (playerIndex !== currentPlayerIndex || !canInput) return null;
    const mainScore = playerStates[playerIndex]?.score ?? 501;
    const displayValue = localVisitRemaining ?? mainScore;
    return (
      <Text style={styles.localVisitRemainingTextMulti}>{displayValue}</Text>
    );
  };

  const renderVisitDartsUnderScore = (playerIndex, { alignRight = false, overlay = false } = {}) => {
    if (!isPerDart) return null;
    const labels = getVisitDartLabels(playerIndex);
    if (!labels.length) {
      return overlay ? null : <View style={styles.visitDartsUnderScoreSpacer} />;
    }
    return (
      <View
        style={[
          overlay ? styles.visitDartsUnderScoreOverlay : styles.visitDartsUnderScore,
          !overlay && alignRight && styles.visitDartsUnderScoreRight,
        ]}
      >
        <Text
          style={[
            styles.visitDartsAccentText,
            alignRight && styles.visitDartsAccentTextRight,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {labels.join(' · ')}
        </Text>
      </View>
    );
  };

  const renderVisitDartsColumn = (playerIndex) => {
    if (!isPerDart) return null;
    const labels = getVisitDartLabels(playerIndex);
    return (
      <View style={styles.visitDartsColumn}>
        {labels.length === 0 ? (
          <View style={styles.visitDartsColumnSpacer} />
        ) : (
          labels.map((label, idx) => (
            <Text key={`${playerIndex}-${idx}-${label}`} style={styles.visitDartsColumnText}>
              {label}
            </Text>
          ))
        )}
      </View>
    );
  };

  const dartPad = (
    <View style={[styles.dartPad, padDisabledStyle]} pointerEvents={inputDisabled ? 'none' : 'auto'}>
      <View style={styles.dartModRow}>
        <View style={styles.dartModLeft}>
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
        </View>
        <View style={styles.dartBullCenter}>
          <View style={styles.dartZeroBullRow}>
            <Pressable
              style={styles.dartZeroBtn}
              onPress={() => applyDartValue(0)}
            >
              <Text style={styles.dartZeroText}>0</Text>
            </Pressable>
            <Pressable
              style={[styles.dartBullBtn, modifier === 'triple' && styles.dartBullBtnDisabled]}
              onPress={modifier === 'triple' ? undefined : () => applyDartValue(25)}
              disabled={modifier === 'triple'}
            >
              <Text style={[styles.dartBullText, modifier === 'triple' && styles.dartBullTextDisabled]}>Bull</Text>
            </Pressable>
          </View>
        </View>
        <Pressable
          style={[styles.dartUndoBtn, inputDisabled && styles.dartUndoBtnDisabled]}
          onPress={handleUndoSingleDart}
          disabled={inputDisabled}
        >
          <Text style={styles.dartUndoText}>Cofnij</Text>
        </Pressable>
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
    </View>
  );

  const numPad = (
    <View style={[styles.countContainer, padDisabledStyle]} pointerEvents={inputDisabled ? 'none' : 'auto'}>
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

  const scoreDisplayText =
    resultEdited || currentResult > 0 ? String(currentResult) : 'Wprowadź wynik';
  const scoreSection = (
    <View style={styles.scoreContainer}>
      <View style={styles.score}>
        <Text style={styles.scoreText}>{scoreDisplayText}</Text>
      </View>
      <View style={styles.undoContainer}>
        <Pressable style={styles.undoBtn} onPress={handleUndoBtn}>
          <Text style={styles.undoText}>Cofnij</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderWaitingOverlay = (variant = 'twoPlayer') => {
    if (gameClosed) {
      return (
        <View
          style={
            variant === 'multi'
              ? styles.waitingOverlayMulti
              : styles.waitingOverlay
          }
          pointerEvents="none"
        >
          <Text style={[styles.waitingText, styles.matchFinishedText]}>
            Mecz został zakończony
          </Text>
        </View>
      );
    }
    if (!showWaitingOverlay || !inputDisabled || oneDeviceSpectator || submitting) {
      return null;
    }
    return (
      <View
        style={
          variant === 'multi'
            ? styles.waitingOverlayMulti
            : styles.waitingOverlay
        }
        pointerEvents="none"
      >
        <Text style={styles.waitingText}>Czekaj na swoją kolejkę</Text>
      </View>
    );
  };

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
            <Text style={styles.legsResultText}>{matchScoreForDisplay(s0, format)}</Text>
            <View style={styles.legsCenterColumn}>
              <Text style={styles.legsText}>{unitLabel}</Text>
              {multiSet ? (
                <Text style={styles.legsSubText}>
                  {legScoreInSetForDisplay(s0)}:{legScoreInSetForDisplay(s1)} legi
                </Text>
              ) : null}
            </View>
            <Text style={styles.legsResultText}>{matchScoreForDisplay(s1, format)}</Text>
          </View>
          <View style={styles.player2Container}>
            <Text style={styles.playerText}>({s1?.dartsThrown ?? 0}) {p1?.name ?? 'Gracz'}</Text>
          </View>
        </View>

        <View style={styles.countersContainer}>
          <View style={styles.countersScoresRow}>
            <View style={[styles.counterContainer, styles.counterContainerWithBorder]}>
              <View style={[styles.counterScoreStack, isPerDart && styles.counterScoreStackOverlayRoot]}>
                {renderLocalVisitRemainingOverlay(0)}
                <Text
                  style={[styles.counterText, styles.counterTextNoFlex, currentPlayerIndex === 0 && styles.goldText]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.4}
                >
                  {s0?.score ?? 501}
                </Text>
                {renderVisitDartsUnderScore(0, { overlay: isPerDart })}
              </View>
            </View>
            <View style={styles.counterContainer}>
              <View style={[styles.counterScoreStack, isPerDart && styles.counterScoreStackOverlayRoot]}>
                {renderLocalVisitRemainingOverlay(1)}
                <Text
                  style={[styles.counterText, styles.counterTextNoFlex, currentPlayerIndex === 1 && styles.goldText]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.4}
                >
                  {s1?.score ?? 501}
                </Text>
                {renderVisitDartsUnderScore(1, { alignRight: true, overlay: isPerDart })}
              </View>
            </View>
          </View>
          <View style={styles.averagesRow}>
            <View style={[styles.averagesContainer, styles.counterContainerWithBorder]}>
              <Text style={styles.averageText}>
                ms: {hasAverage(s0?.matchAverage) ? formatAverage(s0.matchAverage) : '-'}
              </Text>
              <Text style={styles.averageText}>
                ls: {(s0?.dartsThrown > 0 || hasAverage(s0?.currentLegAverage)) ? formatAverage(s0.currentLegAverage) : '-'}
              </Text>
            </View>
            <View style={styles.averagesContainer}>
              <Text style={styles.averageText}>
                ms: {hasAverage(s1?.matchAverage) ? formatAverage(s1.matchAverage) : '-'}
              </Text>
              <Text style={styles.averageText}>
                ls: {(s1?.dartsThrown > 0 || hasAverage(s1?.currentLegAverage)) ? formatAverage(s1.currentLegAverage) : '-'}
              </Text>
            </View>
          </View>
          {renderWaitingOverlay()}
        </View>

        {!isPerDart && scoreSection}
        {isPerDart ? dartPad : numPad}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.multiListWrapper}>
        <ScrollView
          ref={multiScrollRef}
          style={styles.multiList}
          contentContainerStyle={styles.multiListContent}
        >
          {players.map((p, i) => {
            const st = playerStates[i];
            return (
            <View
              key={i}
              style={[styles.multiRow, i === currentPlayerIndex && styles.multiRowActive]}
              onLayout={(e) => {
                rowOffsetsRef.current[i] = e.nativeEvent.layout.y;
                if (i === currentPlayerIndex && !isTwoPlayer && N >= 3) {
                  const y = e.nativeEvent.layout.y;
                  requestAnimationFrame(() => {
                    multiScrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
                  });
                }
              }}
            >
              <View style={styles.multiRowLeft}>
                <Text style={styles.multiPlayerName} numberOfLines={1}>{p?.name ?? 'Gracz'}</Text>
                <Text style={styles.multiDarts}>({st?.dartsThrown ?? 0})</Text>
              </View>
              {renderVisitDartsColumn(i)}
              <View style={styles.multiRowCenter}>
                {renderLocalVisitRemaining(i, 'multi')}
                <Text style={[styles.multiScore, i === currentPlayerIndex && styles.goldText]}>
                  {st?.score ?? 501}
                </Text>
                <Text style={styles.multiLegs}>
                  {matchScoreForDisplay(st, format)} {unitLabel}
                  {multiSet ? ` · ${legScoreInSetForDisplay(st)} legi` : ''}
                </Text>
              </View>
              <View style={styles.multiRowRight}>
                <Text style={styles.multiAvg}>ms: {hasAverage(st?.matchAverage) ? formatAverage(st.matchAverage) : '-'}</Text>
                <Text style={styles.multiAvg}>ls: {(st?.dartsThrown > 0 || hasAverage(st?.currentLegAverage)) ? formatAverage(st.currentLegAverage) : '-'}</Text>
              </View>
            </View>
            );
          })}
        </ScrollView>
        {renderWaitingOverlay('multi')}
      </View>
      {!isPerDart && scoreSection}
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
  visitDartsUnderScore: {
    width: '100%',
    paddingHorizontal: 6,
    marginTop: 4,
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitDartsUnderScoreOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    zIndex: 1,
  },
  visitDartsUnderScoreRight: {
    alignItems: 'center',
  },
  visitDartsUnderScoreSpacer: {
    minHeight: 22,
    marginTop: 4,
  },
  visitDartsAccentText: {
    fontSize: 17,
    color: PER_DART_ACCENT,
    fontWeight: '600',
    textAlign: 'center',
  },
  visitDartsAccentTextRight: {
    textAlign: 'center',
  },
  visitDartsColumn: {
    flex: 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    minHeight: 54,
  },
  visitDartsColumnSpacer: {
    minHeight: 14,
  },
  visitDartsColumnText: {
    fontSize: 14,
    lineHeight: 18,
    color: PER_DART_ACCENT,
    fontWeight: '600',
    textAlign: 'center',
  },
  legsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  legsCenterColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legsText: {
    marginLeft: 15,
    marginRight: 15,
    fontSize: 20,
    color: '#c5c5c5'
  },
  legsSubText: {
    marginTop: 2,
    fontSize: 12,
    color: '#888',
  },
  legsResultText: {
    fontSize: 28,
    justifyContent: 'center',
    color: '#c5c5c5'
  },
  countersContainer: {
    flex: 1,
    flexDirection: 'column',
    width: '100%',
    position: 'relative',
  },
  countersScoresRow: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    minHeight: 0,
  },
  averagesRow: {
    flexDirection: 'row',
    width: '100%',
  },
  counterContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  counterScoreStack: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterScoreStackOverlayRoot: {
    position: 'relative',
    overflow: 'visible',
  },
  localVisitRemainingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: '50%',
    marginBottom: 54,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  localVisitRemainingText: {
    fontSize: 40,
    lineHeight: 46,
    color: PER_DART_ACCENT,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  localVisitRemainingTextMulti: {
    fontSize: 30,
    color: PER_DART_ACCENT,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  counterTextNoFlex: {
    flex: 0,
    width: '100%',
    textAlign: 'center',
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
    flex: 1,
    minWidth: 0,
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
  },
  undoBtn: {
    paddingRight: 10,
    paddingLeft: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,.4)',
    justifyContent: 'center',
  },
  undoText: {
    fontSize: 18,
    color: '#c5c5c5'
  },
  waitingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 58,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  waitingOverlayMulti: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  waitingText: {
    fontSize: 15,
    color: '#e8e8e8',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  matchFinishedText: {
    color: '#c8f5dc',
    backgroundColor: 'rgba(45,106,79,0.75)',
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
  multiListWrapper: {
    flex: 1,
    position: 'relative',
  },
  multiList: {
    flex: 1,
    paddingTop: 8,
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
    flex: 1,
    minWidth: 0,
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
  },
  dartModLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  dartBullCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dartZeroBullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dartZeroBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    minWidth: 48,
  },
  dartZeroText: {
    color: '#c5c5c5',
    fontSize: 18,
    fontWeight: '600',
  },
  dartModBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  dartUndoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dartUndoBtnDisabled: {
    opacity: 0.45,
  },
  dartUndoText: {
    color: '#c5c5c5',
    fontSize: 16,
    fontWeight: '600',
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
  dartBullBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dartBullText: {
    color: '#c5c5c5',
    fontSize: 18,
    fontWeight: '600',
  },
  dartNumText: {
    color: '#c5c5c5',
    fontSize: 18,
    fontWeight: '600',
  },
  dartBullBtnDisabled: {
    opacity: 0.4,
  },
  dartBullTextDisabled: {
    color: '#666',
  },
});

export default Counter;


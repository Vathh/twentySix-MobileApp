import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';

const CRICKET_SEGMENTS = [20, 19, 18, 17, 16, 15, 'bull'];

const CricketCounter = ({
  players,
  cricketStates,
  currentPlayerIndex,
  dartsInVisit = 0,
  onCricketHit,
  onCricketMiss,
  onCricketUndo,
  gameClosed = false,
}) => {
  const N = players?.length ?? 0;
  const [modifier, setModifier] = useState(null);

  const isSegmentClosedByAll = (seg) => {
    return cricketStates.every((s) => (s?.hits[seg] ?? 0) >= 3);
  };

  const isButtonDisabled = (seg) => gameClosed || isSegmentClosedByAll(seg);

  const handleSegmentPress = (seg, mult = 1) => {
    if (isButtonDisabled(seg)) return;
    const m = seg === 'bull' ? (modifier === 'double' ? 2 : 1) : (modifier === 'double' ? 2 : modifier === 'triple' ? 3 : 1);
    setModifier(null);
    onCricketHit?.(seg, m);
  };

  const handleMiss = () => {
    if (gameClosed) return;
    setModifier(null);
    onCricketMiss?.();
  };

  const handleUndo = () => {
    if (gameClosed) return;
    setModifier(null);
    onCricketUndo?.();
  };

  if (N < 2) return null;

  return (
    <View style={styles.container}>
      <View style={styles.tableWrapper}>
      <ScrollView style={styles.tableScroll} contentContainerStyle={styles.tableContent} horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.tableCols}>
            <View style={[styles.col, styles.colName]}>
              <View style={[styles.cell, styles.cellName, styles.cellHeader]}><Text style={styles.headerText}>Gracz</Text></View>
              {players.slice(0, N).map((p, i) => (
                <View key={i} style={[styles.cell, styles.cellName, i === currentPlayerIndex && styles.cellActive]}>
                  <Text style={styles.cellText} numberOfLines={1} ellipsizeMode="tail">{p?.name ?? 'Gracz'}</Text>
                </View>
              ))}
            </View>
            {CRICKET_SEGMENTS.map((seg) => (
              <View key={seg} style={[styles.col, seg === 'bull' ? styles.colBull : styles.colSegment]}>
                <View style={[styles.cell, styles.cellCenter, styles.cellHeader]}><Text style={styles.headerText}>{seg === 'bull' ? 'Bull' : seg}</Text></View>
                {players.slice(0, N).map((p, i) => {
                  const h = (cricketStates[i]?.hits?.[seg] ?? 0);
                  const closed = h >= 3;
                  const symbol = h === 0 ? '–' : h === 1 ? '\\' : h === 2 ? '×' : '●';
                  return (
                    <View key={i} style={[styles.cell, styles.cellCenter, i === currentPlayerIndex && styles.cellActive]}>
                      <Text style={[styles.cellText, styles.hitSymbol, closed && styles.hitClosed]}>{symbol}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={[styles.col, styles.colPts]}>
              <View style={[styles.cell, styles.cellCenter, styles.cellHeader]}><Text style={styles.headerText}>Pkt</Text></View>
              {players.slice(0, N).map((p, i) => (
                <View key={i} style={[styles.cell, styles.cellCenter, i === currentPlayerIndex && styles.cellActive]}>
                  <Text style={[styles.cellText, styles.ptsText]}>{cricketStates[i]?.points ?? 0}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.scoreSection}>
          <Text style={styles.dartInfo}>Rzut {dartsInVisit + 1}/3 (wprowadzaj po jednym rzucie)</Text>
          <Pressable style={styles.undoBtn} onPress={handleUndo}>
            <Text style={styles.undoText}>Cofnij</Text>
          </Pressable>
        </View>
        <View style={styles.keyboard}>
          <View style={styles.modRow}>
          <Pressable
            style={[styles.modBtn, modifier === 'double' && styles.modBtnActive]}
            onPress={() => setModifier((m) => (m === 'double' ? null : 'double'))}
          >
            <Text style={[styles.modText, modifier === 'double' && styles.modTextActive]}>D</Text>
          </Pressable>
          <Pressable
            style={[styles.modBtn, modifier === 'triple' && styles.modBtnActive]}
            onPress={() => setModifier((m) => (m === 'triple' ? null : 'triple'))}
          >
            <Text style={[styles.modText, modifier === 'triple' && styles.modTextActive]}>T</Text>
          </Pressable>
        </View>
        <View style={styles.numRow}>
          {[20, 19, 18, 17].map((n) => {
            const disabled = isButtonDisabled(n);
            return (
              <Pressable
                key={n}
                style={[styles.numBtn, disabled && styles.numBtnDisabled]}
                onPress={() => handleSegmentPress(n)}
                disabled={disabled}
              >
                <Text style={[styles.numText, disabled && styles.numTextDisabled]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.numRow}>
          {[16, 15].map((n) => {
            const disabled = isButtonDisabled(n);
            return (
              <Pressable
                key={n}
                style={[styles.numBtn, disabled && styles.numBtnDisabled]}
                onPress={() => handleSegmentPress(n)}
                disabled={disabled}
              >
                <Text style={[styles.numText, disabled && styles.numTextDisabled]}>{n}</Text>
              </Pressable>
            );
          })}
          <Pressable
            style={[styles.numBtn, modifier === 'triple' && styles.numBtnDisabled, isButtonDisabled('bull') && styles.numBtnDisabled]}
            onPress={modifier === 'triple' ? undefined : () => handleSegmentPress('bull')}
            disabled={modifier === 'triple' || isButtonDisabled('bull')}
          >
            <Text style={[styles.numText, (modifier === 'triple' || isButtonDisabled('bull')) && styles.numTextDisabled]}>Bull</Text>
          </Pressable>
          <Pressable style={styles.numBtn} onPress={handleMiss} disabled={gameClosed}>
            <Text style={styles.numText}>0</Text>
          </Pressable>
        </View>
        </View>
      </View>
    </View>
  );
};

const COL_NAME = 90;
const COL_SEGMENT = 34;
const COL_BULL = 38;
const COL_PTS = 42;
const BORDER = 'rgba(255,255,255,0.22)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  tableWrapper: {
    flex: 1,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  tableScroll: {
    flex: 1,
  },
  tableContent: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 12,
    flexGrow: 1,
  },
  table: {
    flex: 1,
    minWidth: COL_NAME + COL_SEGMENT * 6 + COL_BULL + COL_PTS,
  },
  tableCols: {
    flexDirection: 'row',
    flex: 1,
  },
  col: {
    flexDirection: 'column',
  },
  colName: {
    flex: 1,
    minWidth: COL_NAME,
    backgroundColor: 'transparent',
  },
  colSegment: { width: COL_SEGMENT, flex: 0 },
  colBull: { width: COL_BULL, flex: 0 },
  colPts: { width: COL_PTS, flex: 0 },
  cell: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  cellName: {
    alignItems: 'flex-start',
    paddingLeft: 6,
    overflow: 'hidden',
  },
  cellCenter: {
    alignItems: 'center',
  },
  cellHeader: {},
  cellActive: {
    backgroundColor: 'rgba(249,148,23,0.2)',
  },
  headerText: {
    color: '#f5f5f5',
    fontSize: 14,
    fontWeight: '700',
  },
  cellText: {
    color: '#e8e8e8',
    fontSize: 15,
  },
  hitSymbol: {
    fontSize: 18,
    fontWeight: '600',
  },
  hitClosed: {
    color: '#4ade80',
  },
  ptsText: {
    fontWeight: '600',
    color: '#f5f5f5',
  },
  bottomSection: {
    paddingBottom: 16,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,.3)',
  },
  dartInfo: {
    flex: 1,
    color: '#888',
    fontSize: 14,
  },
  undoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,.4)',
    borderRadius: 6,
  },
  undoText: {
    color: '#c5c5c5',
    fontSize: 16,
  },
  keyboard: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  modRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  modBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modBtnActive: {
    borderColor: '#F99417',
    backgroundColor: 'rgba(249,148,23,0.25)',
  },
  modText: {
    color: '#c5c5c5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modTextActive: {
    color: '#F99417',
  },
  numRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  numBtn: {
    minWidth: 70,
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  numBtnDisabled: {
    opacity: 0.4,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  numText: {
    color: '#c5c5c5',
    fontSize: 18,
    fontWeight: '600',
  },
  numTextDisabled: {
    color: '#666',
  },
});

export default CricketCounter;


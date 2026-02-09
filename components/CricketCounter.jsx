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
  matchClosed = false,
}) => {
  const N = players?.length ?? 0;
  const [modifier, setModifier] = useState(null);

  const isSegmentClosedByAll = (seg) => {
    return cricketStates.every((s) => (s?.hits[seg] ?? 0) >= 3);
  };

  const isButtonDisabled = (seg) => matchClosed || isSegmentClosedByAll(seg);

  const handleSegmentPress = (seg, mult = 1) => {
    if (isButtonDisabled(seg)) return;
    const m = seg === 'bull' ? (modifier === 'double' ? 2 : 1) : (modifier === 'double' ? 2 : modifier === 'triple' ? 3 : 1);
    setModifier(null);
    onCricketHit?.(seg, m);
  };

  const handleMiss = () => {
    if (matchClosed) return;
    setModifier(null);
    onCricketMiss?.();
  };

  const handleUndo = () => {
    if (matchClosed) return;
    setModifier(null);
    onCricketUndo?.();
  };

  if (N < 2) return null;

  return (
    <View style={styles.container}>
      <View style={styles.resultContainer}>
        <Text style={styles.legsLabel}>Legi</Text>
      </View>

      <ScrollView style={styles.tableScroll} contentContainerStyle={styles.tableContent} horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headerCell, styles.nameCol]}>Gracz</Text>
            {CRICKET_SEGMENTS.map((s) => (
              <Text key={s} style={[styles.cell, styles.headerCell]}>{s === 'bull' ? 'Bull' : s}</Text>
            ))}
            <Text style={[styles.cell, styles.headerCell, styles.ptsCol]}>Pkt</Text>
          </View>
          {players.slice(0, N).map((p, i) => {
            const st = cricketStates[i];
            const hits = st?.hits ?? {};
            return (
              <View key={i} style={[styles.tableRow, i === currentPlayerIndex && styles.tableRowActive]}>
                <Text style={[styles.cell, styles.nameCol]} numberOfLines={1}>
                  {p?.name ?? 'Gracz'} ({(st?.legsWon ?? 0)})
                </Text>
                {CRICKET_SEGMENTS.map((seg) => {
                  const h = hits[seg] ?? 0;
                  const closed = h >= 3;
                  return (
                    <View key={seg} style={[styles.cell, styles.hitCell]}>
                      <Text style={[styles.hitText, closed && styles.hitTextClosed]}>{closed ? '✕' : h || '-'}</Text>
                    </View>
                  );
                })}
                <Text style={[styles.cell, styles.ptsCol]}>{st?.points ?? 0}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

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
          <Pressable style={styles.numBtn} onPress={handleMiss} disabled={matchClosed}>
            <Text style={styles.numText}>0</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  resultContainer: {
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,.3)',
  },
  legsLabel: {
    color: '#c5c5c5',
    fontSize: 16,
    textAlign: 'center',
  },
  tableScroll: {
    flex: 1,
    maxHeight: 220,
  },
  tableContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  table: {
    minWidth: 380,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  tableRowActive: {
    backgroundColor: 'rgba(249,148,23,0.2)',
    borderLeftWidth: 4,
    borderLeftColor: '#F99417',
  },
  cell: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCell: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  nameCol: {
    minWidth: 80,
    maxWidth: 100,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  ptsCol: {
    minWidth: 40,
  },
  hitCell: {
    minWidth: 32,
  },
  hitText: {
    color: '#c5c5c5',
    fontSize: 16,
  },
  hitTextClosed: {
    color: '#4ade80',
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
    paddingHorizontal: 8,
    paddingBottom: 16,
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

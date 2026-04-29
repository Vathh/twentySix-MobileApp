import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import StatsRow from './StatsRow';
import StatsTitleRow from './StatsTitleRow';

const Stats = ({ players, playerStates }) => {
  const N = players?.length ?? 0;
  const isTwoPlayer = N === 2;

  const getThrowsBetween = (arrayOfArrays, min, max) => {
    return (arrayOfArrays || []).reduce((acc, arr) => {
      const count = (arr || []).filter((v) => v >= min && v < max).length;
      return acc + count;
    }, 0);
  };

  const getMax = (arrayOfArrays) => {
    return (arrayOfArrays || []).reduce((acc, arr) => {
      const count = (arr || []).filter((v) => v === 180).length;
      return acc + count;
    }, 0);
  };

  if (isTwoPlayer && N >= 2) {
    const s0 = playerStates[0];
    const s1 = playerStates[1];
    const player1BestLegAverage = s0?.legsAverages?.length > 0 ? Math.max(...s0.legsAverages) : s0?.currentLegAverage;
    const player2BestLegAverage = s1?.legsAverages?.length > 0 ? Math.max(...s1.legsAverages) : s1?.currentLegAverage;
    const player1BestLegThrows = s0?.dartsPerLeg?.length > 0 ? Math.min(...s0.dartsPerLeg) : '-';
    const player2BestLegThrows = s1?.dartsPerLeg?.length > 0 ? Math.min(...s1.dartsPerLeg) : '-';

    const player1Stats = {
      plus60: getThrowsBetween([...(s0?.legByLegScores ?? []), s0?.currentLegScores ?? []], 60, 80),
      plus80: getThrowsBetween([...(s0?.legByLegScores ?? []), s0?.currentLegScores ?? []], 80, 100),
      plus100: getThrowsBetween([...(s0?.legByLegScores ?? []), s0?.currentLegScores ?? []], 100, 140),
      plus140: getThrowsBetween([...(s0?.legByLegScores ?? []), s0?.currentLegScores ?? []], 140, 180),
      max: getMax([...(s0?.legByLegScores ?? []), s0?.currentLegScores ?? []])
    };
    const player2Stats = {
      plus60: getThrowsBetween([...(s1?.legByLegScores ?? []), s1?.currentLegScores ?? []], 60, 80),
      plus80: getThrowsBetween([...(s1?.legByLegScores ?? []), s1?.currentLegScores ?? []], 80, 100),
      plus100: getThrowsBetween([...(s1?.legByLegScores ?? []), s1?.currentLegScores ?? []], 100, 140),
      plus140: getThrowsBetween([...(s1?.legByLegScores ?? []), s1?.currentLegScores ?? []], 140, 180),
      max: getMax([...(s1?.legByLegScores ?? []), s1?.currentLegScores ?? []])
    };

    return (
      <View style={styles.container}>
        <View style={[styles.row, styles.darkRow]}>
          <View style={styles.leftRowSide}>
            <Text style={styles.headerText}></Text>
          </View>
          <View style={styles.rightRowSide}>
            <Text style={styles.headerText}>{players[0]?.name ?? 'Gracz'}</Text>
            <Text style={styles.headerText}>{players[1]?.name ?? 'Gracz'}</Text>
          </View>
        </View>

        <StatsTitleRow title="Średnia (3 lotki)" />

        <StatsRow title="Cała gra" player1Value={s0?.matchAverage} player2Value={s1?.matchAverage} />
        <StatsRow title="Najlepszy leg" player1Value={player1BestLegAverage} player2Value={player2BestLegAverage} />
        <StatsRow
          title="Aktualny leg"
          player1Value={isNaN(s0?.currentLegAverage) ? '-' : s0?.currentLegAverage}
          player2Value={isNaN(s1?.currentLegAverage) ? '-' : s1?.currentLegAverage}
        />

        <StatsTitleRow title="Osiągi" />

        <StatsRow title="Najlepszy leg" player1Value={player1BestLegThrows} player2Value={player2BestLegThrows} />
        <StatsRow title="60+" player1Value={player1Stats.plus60} player2Value={player2Stats.plus60} />
        <StatsRow title="80+" player1Value={player1Stats.plus80} player2Value={player2Stats.plus80} />
        <StatsRow title="100+" player1Value={player1Stats.plus100} player2Value={player2Stats.plus100} />
        <StatsRow title="140+" player1Value={player1Stats.plus140} player2Value={player2Stats.plus140} />
        <StatsRow title="180" player1Value={player1Stats.max} player2Value={player2Stats.max} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.multiScroll}>
      <StatsTitleRow title="Średnie i legi" />
      {players?.map((p, i) => {
        const s = playerStates?.[i];
        if (!s) return null;
        const bestLeg = s.legsAverages?.length > 0 ? Math.max(...s.legsAverages) : s.currentLegAverage;
        return (
          <View key={i} style={[styles.row, styles.darkRow, styles.multiRow]}>
            <Text style={styles.multiName}>{p?.name ?? 'Gracz'}</Text>
            <View style={styles.multiValues}>
              <Text style={styles.multiValue}>ms: {s.totalPointsEarned ? s.matchAverage : '-'}</Text>
              <Text style={styles.multiValue}>legi: {s.legsWon}</Text>
              <Text style={styles.multiValue}>naj. leg: {bestLeg ?? '-'}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  row: {
    flexDirection: 'row',
    paddingLeft: 10,
    paddingTop: 4,
    paddingBottom: 4
  },
  darkRow: {
    backgroundColor: 'rgba(0,0,0,.3)',
    borderBottomWidth: 1,
    borderBottomColor: '#dc8418'
  },
  leftRowSide: {
    flex: 1
  },
  rightRowSide: {
    flexDirection: 'row',
    flex: 1
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    color: '#f5f5f5',
    fontSize: 16
  },
  multiScroll: {
    paddingBottom: 24,
  },
  multiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiName: {
    flex: 0.6,
    color: '#f5f5f5',
    fontSize: 16,
    fontWeight: '600',
  },
  multiValues: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multiValue: {
    color: '#c5c5c5',
    fontSize: 14,
  },
});

export default Stats;


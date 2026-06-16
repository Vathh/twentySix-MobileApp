import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import StatsRow from './StatsRow';
import StatsTitleRow from './StatsTitleRow';
import { formatAverage, hasAverage } from '../../helpers/formatAverage';

const StatsSingleRow = ({ title, value }) => {
  const display = value == null || value === '' ? '-' : String(value);
  return (
    <View style={[styles.row, styles.lightRow]}>
      <Text style={styles.singleRowTitle}>{title}</Text>
      <Text style={styles.singleRowValue}>{display}</Text>
    </View>
  );
};

const legScoreGroups = (legByLegScores, currentLegScores) => {
  const groups = [...(legByLegScores ?? [])];
  if (currentLegScores?.length) {
    groups.push(currentLegScores);
  }
  return groups;
};

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

const buildAchievementStats = (playerState) => {
  const groups = legScoreGroups(playerState?.legByLegScores, playerState?.currentLegScores);
  return {
    plus60: getThrowsBetween(groups, 60, 80),
    plus80: getThrowsBetween(groups, 80, 100),
    plus100: getThrowsBetween(groups, 100, 140),
    plus140: getThrowsBetween(groups, 140, 180),
    max: getMax(groups),
  };
};

const PlayerStatsDetail = ({ playerState }) => {
  const s = playerState;
  const bestLegAverage =
    s?.legsAverages?.length > 0 ? Math.max(...s.legsAverages) : null;
  const bestLegThrows =
    s?.dartsPerLeg?.length > 0 ? Math.min(...s.dartsPerLeg) : null;
  const achievements = buildAchievementStats(s);

  return (
    <View style={styles.playerDetail}>
      <StatsTitleRow title="Średnia (3 lotki)" />
      <StatsSingleRow title="Cała gra" value={formatAverage(s?.matchAverage)} />
      <StatsSingleRow
        title="Najlepszy leg"
        value={hasAverage(bestLegAverage) ? formatAverage(bestLegAverage) : '-'}
      />
      <StatsSingleRow
        title="Aktualny leg"
        value={hasAverage(s?.currentLegAverage) ? formatAverage(s.currentLegAverage) : '-'}
      />

      <StatsTitleRow title="Osiągi" />
      <StatsSingleRow title="Najlepszy leg" value={bestLegThrows ?? '-'} />
      <StatsSingleRow title="60+" value={achievements.plus60} />
      <StatsSingleRow title="80+" value={achievements.plus80} />
      <StatsSingleRow title="100+" value={achievements.plus100} />
      <StatsSingleRow title="140+" value={achievements.plus140} />
      <StatsSingleRow title="180" value={achievements.max} />
    </View>
  );
};

const Stats = ({ players, playerStates }) => {
  const N = players?.length ?? 0;
  const isTwoPlayer = N === 2;
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);

  if (isTwoPlayer && N >= 2) {
    const s0 = playerStates[0];
    const s1 = playerStates[1];
    const player1BestLegAverage =
      s0?.legsAverages?.length > 0 ? Math.max(...s0.legsAverages) : null;
    const player2BestLegAverage =
      s1?.legsAverages?.length > 0 ? Math.max(...s1.legsAverages) : null;
    const player1BestLegThrows =
      s0?.dartsPerLeg?.length > 0 ? Math.min(...s0.dartsPerLeg) : null;
    const player2BestLegThrows =
      s1?.dartsPerLeg?.length > 0 ? Math.min(...s1.dartsPerLeg) : null;

    const s0LegGroups = legScoreGroups(s0?.legByLegScores, s0?.currentLegScores);
    const s1LegGroups = legScoreGroups(s1?.legByLegScores, s1?.currentLegScores);

    const player1Stats = {
      plus60: getThrowsBetween(s0LegGroups, 60, 80),
      plus80: getThrowsBetween(s0LegGroups, 80, 100),
      plus100: getThrowsBetween(s0LegGroups, 100, 140),
      plus140: getThrowsBetween(s0LegGroups, 140, 180),
      max: getMax(s0LegGroups),
    };
    const player2Stats = {
      plus60: getThrowsBetween(s1LegGroups, 60, 80),
      plus80: getThrowsBetween(s1LegGroups, 80, 100),
      plus100: getThrowsBetween(s1LegGroups, 100, 140),
      plus140: getThrowsBetween(s1LegGroups, 140, 180),
      max: getMax(s1LegGroups),
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

        <StatsRow title="Cała gra" player1Value={formatAverage(s0?.matchAverage)} player2Value={formatAverage(s1?.matchAverage)} />
        <StatsRow
          title="Najlepszy leg"
          player1Value={hasAverage(player1BestLegAverage) ? formatAverage(player1BestLegAverage) : '-'}
          player2Value={hasAverage(player2BestLegAverage) ? formatAverage(player2BestLegAverage) : '-'}
        />
        <StatsRow
          title="Aktualny leg"
          player1Value={hasAverage(s0?.currentLegAverage) ? formatAverage(s0.currentLegAverage) : '-'}
          player2Value={hasAverage(s1?.currentLegAverage) ? formatAverage(s1.currentLegAverage) : '-'}
        />

        <StatsTitleRow title="Osiągi" />

        <StatsRow
          title="Najlepszy leg"
          player1Value={player1BestLegThrows ?? '-'}
          player2Value={player2BestLegThrows ?? '-'}
        />
        <StatsRow title="60+" player1Value={player1Stats.plus60} player2Value={player2Stats.plus60} />
        <StatsRow title="80+" player1Value={player1Stats.plus80} player2Value={player2Stats.plus80} />
        <StatsRow title="100+" player1Value={player1Stats.plus100} player2Value={player2Stats.plus100} />
        <StatsRow title="140+" player1Value={player1Stats.plus140} player2Value={player2Stats.plus140} />
        <StatsRow title="180" player1Value={player1Stats.max} player2Value={player2Stats.max} />
      </View>
    );
  }

  const safeIndex = Math.min(activePlayerIndex, Math.max(0, N - 1));

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBarContent}
      >
        {players?.map((p, i) => (
          <Pressable
            key={i}
            style={[styles.tab, i === safeIndex && styles.tabActive]}
            onPress={() => setActivePlayerIndex(i)}
          >
            <Text
              style={[styles.tabText, i === safeIndex && styles.tabTextActive]}
              numberOfLines={1}
            >
              {p?.name ?? `Gracz ${i + 1}`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView style={styles.tabPanelScroll} contentContainerStyle={styles.multiScroll}>
        <PlayerStatsDetail playerState={playerStates?.[safeIndex]} />
      </ScrollView>
    </View>
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
  lightRow: {
    backgroundColor: 'rgba(0,0,0,.2)',
    borderBottomWidth: 0.5,
    borderBottomColor: '#bd7013',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  tabBarScroll: {
    maxHeight: 48,
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#dc8418',
    backgroundColor: 'rgba(0,0,0,.25)',
  },
  tabBarContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    maxWidth: 140,
  },
  tabActive: {
    backgroundColor: '#F99417',
  },
  tabText: {
    color: '#c5c5c5',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#363062',
  },
  tabPanelScroll: {
    flex: 1,
  },
  playerDetail: {
    paddingTop: 4,
  },
  singleRowTitle: {
    flex: 1,
    color: '#f5f5f5',
    fontSize: 15,
  },
  singleRowValue: {
    minWidth: 72,
    textAlign: 'right',
    color: '#f5f5f5',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Stats;

import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import StatsRow from './StatsRow';
import StatsTitleRow from './StatsTitleRow';

const Stats = ({ player1Name, player2Name, player1State, player2State, players: playersProp, playerStates: playerStatesProp }) => {
  const isMulti = Array.isArray(playersProp) && playersProp.length > 2;
  const players = isMulti ? playersProp : [];
  const playerStates = isMulti ? playerStatesProp : [];

  const player1BestLegAverage = player1State?.legsAverages?.length > 0 ? Math.max(...player1State.legsAverages) : player1State?.currentLegAverage;
  const player2BestLegAverage = player2State?.legsAverages?.length > 0 ? Math.max(...player2State.legsAverages) : player2State?.currentLegAverage;

  const player1BestLegThrows = player1State?.dartsPerLeg?.length > 0 ? Math.min(...player1State.dartsPerLeg) : "-";
  const player2BestLegThrows = player2State?.dartsPerLeg?.length > 0 ? Math.min(...player2State.dartsPerLeg) : "-";

  const getThrowsBetween = (arrayOfArrays, min, max) => {
    return arrayOfArrays.reduce((accumulator, currentArray) => {
      const filteredCount = currentArray.filter(value => value >= min && value < max).length;
      return accumulator + filteredCount;
    }, 0);
  };

  const getMax = (arrayOfArrays) => {
    return arrayOfArrays.reduce((accumulator, currentArray) => {
      const filteredCount = currentArray.filter(value => value == 180).length;
      return accumulator + filteredCount;
    }, 0);
  }

  const player1Stats = {
    plus60: getThrowsBetween([...player1State.legByLegScores, player1State.currentLegScores], 60, 80),
    plus80: getThrowsBetween([...player1State.legByLegScores, player1State.currentLegScores], 80, 100),
    plus100 : getThrowsBetween([...player1State.legByLegScores, player1State.currentLegScores], 100, 140),
    plus140: getThrowsBetween([...player1State.legByLegScores, player1State.currentLegScores], 140, 180),
    max: getMax([...player1State.legByLegScores, player1State.currentLegScores])
  }

  const player2Stats = {
    plus60: getThrowsBetween([...player2State.legByLegScores, player2State.currentLegScores], 60, 80),
    plus80: getThrowsBetween([...player2State.legByLegScores, player2State.currentLegScores], 80, 100),
    plus100 : getThrowsBetween([...player2State.legByLegScores, player2State.currentLegScores], 100, 140),
    plus140: getThrowsBetween([...player2State.legByLegScores, player2State.currentLegScores], 140, 180),
    max: getMax([...player2State.legByLegScores, player2State.currentLegScores])
  }


  if (isMulti && players.length > 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.multiScroll}>
        <StatsTitleRow title="Średnie i legi" />
        {players.map((p, i) => {
          const s = playerStates[i];
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
  }

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.darkRow]}>
        <View style={styles.leftRowSide}>
          <Text style={styles.headerText}></Text>
        </View>
        <View style={styles.rightRowSide}>
          <Text style={styles.headerText}>{player1Name}</Text>
          <Text style={styles.headerText}>{player2Name}</Text>
        </View>
      </View>

      <StatsTitleRow title="Średnia (3 lotki)"/>

      <StatsRow 
        title="Cała gra"
        player1Value= {player1State.matchAverage}
        player2Value= {player2State.matchAverage}
      />
      <StatsRow 
        title="Najlepszy leg"
        player1Value= {player1BestLegAverage}
        player2Value= {player2BestLegAverage}
      />
      <StatsRow 
        title="Aktualny leg"
        player1Value= {isNaN(player1State.currentLegAverage) ? '-' : player1State.currentLegAverage} 
        player2Value= {isNaN(player2State.currentLegAverage) ? '-' : player2State.currentLegAverage}
      />

      <StatsTitleRow title="Osiągi"/>

      <StatsRow 
        title="Najlepszy leg"
        player1Value= {player1BestLegThrows}
        player2Value= {player2BestLegThrows}
      />
      <StatsRow 
        title="60+"
        player1Value= {player1Stats.plus60}
        player2Value= {player2Stats.plus60}
      />
      <StatsRow 
        title="80+"
        player1Value= {player1Stats.plus80}
        player2Value= {player2Stats.plus80}
      />
      <StatsRow 
        title="100+"
        player1Value= {player1Stats.plus100}
        player2Value= {player2Stats.plus100}
      />
      <StatsRow 
        title="140+"
        player1Value= {player1Stats.plus140}
        player2Value= {player2Stats.plus140}
      />
      <StatsRow 
        title="180"
        player1Value= {player1Stats.max}
        player2Value= {player2Stats.max}
      />
    </View>
  )
}

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
    borderBottomWidth: .5,
    borderBottomColor: '#bd7013'
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
  title: {
    color: '#f5f5f5',
    fontSize: 16
  },
  text: {
    flex: 1,
    textAlign: 'center',
    color: '#f5f5f5'
  }
});

export default Stats

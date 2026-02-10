import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const CricketResults = ({ players, cricketStates, legsToWin }) => {
  const N = players?.length ?? 0;
  if (N < 2) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wyniki legów</Text>
      <Text style={styles.subtitle}>Mecz do {legsToWin} wygranych legów</Text>
      <View style={styles.list}>
        {players.slice(0, N).map((p, i) => {
          const legs = cricketStates[i]?.legsWon ?? 0;
          return (
            <View key={i} style={styles.row}>
              <Text style={styles.name}>{p?.name ?? 'Gracz'}</Text>
              <Text style={styles.legs}>{legs} {legs === 1 ? 'leg' : legs < 5 ? 'legi' : 'legów'}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    color: '#f5f5f5',
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  list: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  name: {
    fontSize: 18,
    color: '#e8e8e8',
    fontWeight: '600',
  },
  legs: {
    fontSize: 18,
    color: '#F99417',
    fontWeight: '700',
  },
});

export default CricketResults;

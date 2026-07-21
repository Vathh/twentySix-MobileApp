import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

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
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textDim,
    marginBottom: 20,
  },
  list: {
    backgroundColor: colors.scrimMild,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  name: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  legs: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '700',
  },
});

export default CricketResults;


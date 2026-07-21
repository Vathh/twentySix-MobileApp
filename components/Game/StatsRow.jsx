import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const StatsRow = ({ title, player1Value, player2Value }) => {
  const display = (v) => (v == null || v === '' ? '-' : String(v));

  return (
    <View style={[styles.row, styles.lightRow]}>
      <View style={styles.leftRowSide}>
        <Text style={styles.text}>{title}</Text>
      </View>
      <View style={styles.rightRowSide}>
        <Text style={styles.text}>{display(player1Value)}</Text>
        <Text style={styles.text}>{display(player2Value)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingLeft: 10,
    paddingTop: 4,
    paddingBottom: 4,
  },
  lightRow: {
    backgroundColor: colors.scrimSoft,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.accentHover,
  },
  leftRowSide: {
    flex: 1,
  },
  rightRowSide: {
    flexDirection: 'row',
    flex: 1,
  },
  text: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
  },
});

export default StatsRow;

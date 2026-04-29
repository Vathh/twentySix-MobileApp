import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const StatsRow = ({ title, playerAValue, playerBValue }) => {
  return (
    <View style={[styles.row, styles.lightRow]}>
      <View style={styles.leftRowSide}>
        <Text style={styles.text}>{title}</Text>
      </View>
      <View style={styles.rightRowSide}>
        <Text style={styles.text}>{playerAValue}</Text>
        <Text style={styles.text}>{playerBValue}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingLeft: 10,
    paddingTop: 4,
    paddingBottom: 4
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
  text: {
    flex: 1,
    textAlign: 'center',
    color: '#f5f5f5'
  }
});

export default StatsRow


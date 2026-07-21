import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'

const StatsTitleRow = ({ title }) => {
  return (
    <View style={[styles.row, styles.darkRow]}>
      <Text style={styles.title}>{title}</Text>
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
  darkRow: {
    backgroundColor: colors.scrimMild,
    borderBottomWidth: 1,
    borderBottomColor: colors.accentHover
  },
  title: {
    color: colors.text,
    fontSize: 16
  },
});

export default StatsTitleRow


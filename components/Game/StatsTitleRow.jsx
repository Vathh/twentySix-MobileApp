import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

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
    backgroundColor: 'rgba(0,0,0,.3)',
    borderBottomWidth: 1,
    borderBottomColor: '#dc8418'
  },
  title: {
    color: '#f5f5f5',
    fontSize: 16
  },
});

export default StatsTitleRow


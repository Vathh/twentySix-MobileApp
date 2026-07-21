import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { colors } from '../../theme/colors'

const HeaderTitle = () => {
  return (
    <Text style={styles.text}>twentySix</Text>
  )
}

const styles = StyleSheet.create({
  text: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 20
  }
})

export default HeaderTitle


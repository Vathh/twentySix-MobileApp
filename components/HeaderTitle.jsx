import React from 'react'
import { StyleSheet, Text } from 'react-native'

const HeaderTitle = () => {
  return (
    <Text style={styles.text}>DartScore</Text>
  )
}

const styles = StyleSheet.create({
  text: {
    color: '#F99417',
    fontWeight: 'bold',
    fontSize: 20
  }
})

export default HeaderTitle

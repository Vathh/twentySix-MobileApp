import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import useAuth from '../../hooks/useAuth'

const Home = ({ navigation }) => {

  const { auth } = useAuth()

  // Turniej: uwierzytelnienie kodem (bez konta) – sędziowanie meczów w turnieju
  const tournamentModeHandler = () => {
    navigation.navigate('TournamentCode')
  }

  // Szybki mecz: gdy zalogowany → lobby (tworzenie / zaproszenia); gdy nie – logowanie na konto
  const quickGameHandler = () => {
    if (auth?.accessToken) {
      navigation.navigate('QuickGameLobby')
    } else {
      navigation.navigate('AccountLogin')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wybierz tryb gry</Text>
      <View style={styles.form}>
        <Pressable style={styles.button} onPress={tournamentModeHandler}>
          <Text style={styles.buttonText}>Turniej</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={quickGameHandler}>
          <Text style={styles.buttonText}>Szybki mecz</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#363062',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    color: '#c5c5c5',
    marginBottom: 70,
    marginTop: 100
  },
  form: {
    alignItems: 'center'
  },
  errorMessage: {
    fontSize: 14,
    color: '#ff1e1e',
    marginBottom: 20
  },
  input: {
    marginBottom: 20,
    color: '#363062',
    backgroundColor:  '#f5f5f5cc',
    borderRadius: 5,
    width: 200,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 16
  },
  button: {
    alignItems: 'center',
    marginTop: 20,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor:  '#f5f5f5cc',
    borderRadius: 5
  },
  buttonText: {
    color: '#363062',
  }
})

export default Home


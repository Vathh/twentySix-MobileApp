import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import useAuth from '../../hooks/useAuth'
import {
	buildGameScoringParamsFromActiveMatch,
	resolveActiveFfaMatch,
} from '../../helpers/activeQuickGameMatch'

const Home = ({ navigation }) => {

  const { auth } = useAuth()
  const [activeMatch, setActiveMatch] = useState(null)

  useFocusEffect(
    useCallback(() => {
      let cancelled = false

      if (!auth?.accessToken) {
        setActiveMatch(null)
        return () => {
          cancelled = true
        }
      }

      setActiveMatch(null)

      resolveActiveFfaMatch(auth.accessToken)
        .then((match) => {
          if (!cancelled) {
            setActiveMatch(match)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setActiveMatch(null)
          }
        })

      return () => {
        cancelled = true
      }
    }, [auth?.accessToken]),
  )

  const tournamentModeHandler = () => {
    navigation.navigate('TournamentCode')
  }

  const quickGameOnlineHandler = () => {
    if (auth?.accessToken) {
      navigation.navigate('QuickGameLobby')
    } else {
      Alert.alert(
        'Quick game online',
        'Wymagane konto i internet. Zaloguj się, aby utworzyć lobby ze znajomymi.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Zaloguj', onPress: () => navigation.navigate('AccountLogin') },
        ],
      )
    }
  }

  const resumeMatchHandler = () => {
    const params = buildGameScoringParamsFromActiveMatch(activeMatch)
    if (params) {
      navigation.navigate('GameScoring', params)
    }
  }

  const trainingHandler = () => {
    navigation.navigate('TrainingMatchSetup')
  }

  const opponentNames =
    activeMatch?.players
      ?.filter((_, index) => index !== activeMatch.myPlayerIndex)
      ?.map((p) => p.name)
      ?.join(', ') ?? 'przeciwnikiem'

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wybierz tryb gry</Text>
      <View style={styles.form}>
        {activeMatch ? (
          <Pressable style={styles.buttonResume} onPress={resumeMatchHandler}>
            <Text style={styles.buttonResumeText}>Wróć do meczu</Text>
            <Text style={styles.buttonHintResume}>
              Quick game z {opponentNames}
            </Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.button} onPress={tournamentModeHandler}>
          <Text style={styles.buttonText}>Turniej</Text>
        </Pressable>
        <Pressable style={styles.buttonPrimary} onPress={quickGameOnlineHandler}>
          <Text style={styles.buttonPrimaryText}>Quick game online</Text>
          <Text style={styles.buttonHint}>Lobby, znajomi, zapis w statystykach</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={trainingHandler}>
          <Text style={styles.buttonText}>Trening</Text>
          <Text style={styles.buttonHintDark}>Bez internetu · wynik nie jest zapisywany</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#363062',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    color: '#c5c5c5',
    marginBottom: 48,
    marginTop: 100,
    textAlign: 'center',
  },
  form: {
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 320,
  },
  buttonResume: {
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#2d6a4f',
    borderRadius: 8,
  },
  buttonResumeText: {
    color: '#e8fff3',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonHintResume: {
    marginTop: 4,
    fontSize: 12,
    color: '#c8f5dc',
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f5f5f5cc',
    borderRadius: 8,
  },
  buttonPrimary: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F99417',
    borderRadius: 8,
  },
  buttonText: {
    color: '#363062',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonPrimaryText: {
    color: '#363062',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#363062aa',
    textAlign: 'center',
  },
  buttonHintDark: {
    marginTop: 4,
    fontSize: 12,
    color: '#36306299',
    textAlign: 'center',
  },
})

export default Home

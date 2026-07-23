import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import useAuth from '../../hooks/useAuth'
import {
	buildGameScoringParamsFromActiveMatch,
	clearActiveFfaLobby,
	resolveActiveFfaMatch,
} from '../../helpers/activeQuickGameMatch'
import { postFfaPresence } from '../../helpers/quickGameFfaApi'
import { colors } from '../../theme/colors'

const Home = ({ navigation }) => {

  const { auth } = useAuth()
  const [activeMatch, setActiveMatch] = useState(null)
  const [leavingMatch, setLeavingMatch] = useState(false)

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

  const leaveMatchHandler = () => {
    if (!activeMatch?.lobbyId || !auth?.accessToken || leavingMatch) {
      return
    }

    const playerCount = activeMatch?.players?.length ?? 0
    const message =
      playerCount === 2
        ? 'Opuścisz mecz bez możliwości powrotu. Przeciwnik wygra walkowerem — tak samo jak przy wyjściu z ekranu gry.'
        : 'Opuścisz mecz bez możliwości powrotu. To samo zachowanie jak przy wyjściu z ekranu gry.'

    Alert.alert('Opuścić mecz?', message, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Opuść',
        style: 'destructive',
        onPress: async () => {
          setLeavingMatch(true)
          try {
            await postFfaPresence(activeMatch.lobbyId, auth.accessToken, 'left')
          } catch {
            // i tak czyścimy lokalny stan — użytkownik chce wyjść
          }
          await clearActiveFfaLobby()
          setActiveMatch(null)
          setLeavingMatch(false)
        },
      },
    ])
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
          <View style={styles.resumeBlock}>
            <Text style={styles.resumeContext}>
              Quick game z {opponentNames}
            </Text>
            <View style={styles.resumeRow}>
              <Pressable
                style={[styles.buttonResume, styles.resumeRowButton]}
                onPress={resumeMatchHandler}
                disabled={leavingMatch}
              >
                <Text style={styles.buttonResumeText}>Wróć do meczu</Text>
              </Pressable>
              <Pressable
                style={[styles.buttonLeave, styles.resumeRowButton]}
                onPress={leaveMatchHandler}
                disabled={leavingMatch}
              >
                <Text style={styles.buttonLeaveText}>
                  {leavingMatch ? 'Opuszczanie…' : 'Opuść'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <Pressable style={styles.button} onPress={tournamentModeHandler}>
          <Text style={styles.buttonText}>Turniej</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={quickGameOnlineHandler}>
          <Text style={styles.buttonText}>Quick game online</Text>
          <Text style={styles.buttonHint}>Lobby, znajomi, zapis w statystykach</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={trainingHandler}>
          <Text style={styles.buttonText}>Trening</Text>
          <Text style={styles.buttonHint}>Bez internetu · wynik nie jest zapisywany</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    color: colors.textMuted,
    marginBottom: 48,
    marginTop: 100,
    textAlign: 'center',
  },
  form: {
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 320,
  },
  resumeBlock: {
    marginBottom: 8,
  },
  resumeContext: {
    marginBottom: 8,
    fontSize: 12,
    color: colors.successSoftText,
    textAlign: 'center',
  },
  resumeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resumeRowButton: {
    flex: 1,
  },
  buttonResume: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.successMuted,
    borderRadius: 8,
  },
  buttonResumeText: {
    color: colors.successSoftText,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonLeave: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.dangerMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonLeaveText: {
    color: colors.dangerText,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  buttonHint: {
    marginTop: 5,
    fontSize: 13,
    color: colors.text,
    opacity: 0.85,
    textAlign: 'center',
  },
})

export default Home

import React, { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import useAuth from '../../hooks/useAuth'
import { resolveActiveFfaGame } from '../../helpers/activeQuickGame'
import ActiveQuickGameActions from '../QuickGame/ActiveQuickGameActions'
import ModeTile from '../Common/ModeTile'
import { colors } from '../../theme/colors'

const Home = ({ navigation }) => {
  const { auth } = useAuth()
  const isLoggedIn = !!auth?.accessToken
  const [activeGame, setActiveGame] = useState(null)

  useFocusEffect(
    useCallback(() => {
      let cancelled = false

      if (!auth?.accessToken) {
        setActiveGame(null)
        return () => {
          cancelled = true
        }
      }

      setActiveGame(null)

      resolveActiveFfaGame(auth.accessToken)
        .then((game) => {
          if (!cancelled) {
            setActiveGame(game)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setActiveGame(null)
          }
        })

      return () => {
        cancelled = true
      }
    }, [auth?.accessToken]),
  )

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.form}>
        {activeGame ? (
          <ActiveQuickGameActions
            game={activeGame}
            accessToken={auth?.accessToken}
            navigation={navigation}
            onCleared={() => setActiveGame(null)}
            resumeLabel="Wróć do meczu"
          />
        ) : null}

        <Text style={[styles.sectionLabel, !activeGame && styles.sectionLabelFirst]}>
          Graj
        </Text>
        {isLoggedIn ? (
          <ModeTile
            variant="primary"
            icon="flash-outline"
            title="Szybka gra online"
            hint="Lobby ze znajomymi"
            onPress={() => navigation.navigate('QuickGameLobby')}
          />
        ) : null}
        {isLoggedIn ? (
          <ModeTile
            icon="trophy-outline"
            title="Mecze ligowe"
            hint="Twoje mecze w otwartym sezonie"
            onPress={() => navigation.navigate('LeagueGames')}
          />
        ) : null}
        <ModeTile
          icon="barbell-outline"
          title="Trening"
          hint={isLoggedIn ? 'Lokalnie na tym telefonie' : 'Bez konta, na tym telefonie'}
          onPress={() => navigation.navigate('TrainingHub')}
        />

        <Text style={styles.sectionLabel}>Turniej</Text>
        {isLoggedIn ? (
          <ModeTile
            icon="qr-code-outline"
            title="Dołącz do turnieju"
            hint="Kod / QR od organizatora"
            onPress={() => navigation.navigate('JoinTournament')}
          />
        ) : null}
        <ModeTile
          variant="referee"
          icon="tablet-landscape-outline"
          title="Sędziowanie turnieju"
          hint="Kod / QR od organizatora"
          onPress={() => navigation.navigate('TournamentCode')}
        />

        {isLoggedIn ? null : (
          <Text style={styles.loginHint}>Zaloguj się, by odkryć więcej.</Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  form: {
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 400,
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  sectionLabelFirst: {
    marginTop: 0,
  },
  loginHint: {
    marginTop: 24,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
})

export default Home

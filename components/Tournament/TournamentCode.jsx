import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { LOGIN_API_URL } from '../../helpers/apiConfig'
import useAuth from '../../hooks/useAuth'
import { colors } from '../../theme/colors'

/**
 * Ekran uwierzytelnienia kodem turnieju.
 * Używany gdy użytkownik wybiera "Turniej" na Home – wpisuje kod podany przez administratora,
 * aby sędziować mecze w ramach tego turnieju (widzi tylko mecze danego turnieju).
 */
const TournamentCode = () => {

  const { setAuth } = useAuth()

  const [code, setCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    setErrorMsg('')

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data?.message || 'Nieprawidłowy kod turnieju')
        return
      }

      const accessToken = data?.token
      const tournamentId = data?.tournamentId
      setAuth({ accessToken, tournamentId })
    } catch (err) {
      setErrorMsg('Nieprawidłowy kod turnieju')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Sędziowanie turnieju</Text>
      <Text style={styles.title}>Kod turnieju</Text>
      <Text style={styles.hint}>Wpisz kod podany przez administratora turnieju</Text>
      <View style={styles.form}>
        <Text style={styles.errorMessage}>{errorMsg}</Text>
        <TextInput
          style={styles.input}
          placeholder="Kod turnieju"
          value={code}
          onChangeText={setCode}
          autoCorrect={false}
          autoCapitalize="characters"
        />
        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Wejdź do turnieju</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center'
  },
  subtitle: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 40
  },
  title: {
    fontSize: 24,
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 8
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 24
  },
  form: {
    alignItems: 'center'
  },
  errorMessage: {
    fontSize: 14,
    color: colors.dangerText,
    marginBottom: 20
  },
  input: {
    marginBottom: 20,
    color: colors.text,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    width: 220,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16
  },
  button: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.accent,
    borderRadius: 5
  },
  buttonText: {
    color: colors.onAccent,
    fontWeight: 'bold'
  }
})

export default TournamentCode


import React, { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { REGISTER_API_URL, RESEND_VERIFICATION_API_URL } from '../../helpers/apiConfig'
import { colors } from '../../theme/colors'

const AccountRegister = () => {
  const navigation = useNavigation()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const parseErrorMessage = (data) => {
    if (typeof data?.message === 'string') {
      return data.message
    }
    const firstField = data?.errors ? Object.values(data.errors)?.[0] : null
    if (Array.isArray(firstField) && firstField[0]) {
      return firstField[0]
    }
    return 'Nie udało się utworzyć konta'
  }

  const handleSubmit = async () => {
    if (loading) return
    setErrorMsg('')
    setSuccessMsg('')

    if (password !== passwordConfirmation) {
      setErrorMsg('Hasła nie są identyczne')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(REGISTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(parseErrorMessage(data))
        return
      }

      setSuccessMsg(
        data?.message
          || 'Konto utworzone. Sprawdź email i kliknij link potwierdzający, aby się zalogować.',
      )
    } catch {
      setErrorMsg('Nie udało się utworzyć konta')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email || loading) return
    setErrorMsg('')
    setLoading(true)

    try {
      const response = await fetch(RESEND_VERIFICATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(parseErrorMessage(data))
        return
      }

      setSuccessMsg(data?.message || 'Wysłaliśmy link ponownie.')
    } catch {
      setErrorMsg('Nie udało się wysłać linku')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Utwórz konto</Text>
      <View style={styles.form}>
        {errorMsg ? <Text style={styles.errorMessage}>{errorMsg}</Text> : null}
        {successMsg ? <Text style={styles.successMessage}>{successMsg}</Text> : null}

        {!successMsg ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nazwa gracza"
              value={name}
              onChangeText={setName}
              autoCorrect={false}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Hasło (min. 8 znaków)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Powtórz hasło"
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : (
                <Text style={styles.buttonText}>Zarejestruj się</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : (
                <Text style={styles.buttonText}>Wyślij link ponownie</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.linkButton}
              onPress={() => navigation.navigate('AccountLogin')}
            >
              <Text style={styles.linkText}>Przejdź do logowania</Text>
            </Pressable>
          </>
        )}

        {!successMsg ? (
          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate('AccountLogin')}
          >
            <Text style={styles.linkText}>Masz już konto? Zaloguj się</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: colors.textMuted,
    marginBottom: 40,
    marginTop: 80,
  },
  form: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.dangerText,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: colors.successSoftText,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
    color: colors.text,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    width: 260,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 180,
    minHeight: 36,
    backgroundColor: colors.accent,
    borderRadius: 5,
  },
  buttonDisabled: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.onAccent,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    padding: 8,
  },
  linkText: {
    color: colors.accent,
    fontSize: 15,
  },
})

export default AccountRegister

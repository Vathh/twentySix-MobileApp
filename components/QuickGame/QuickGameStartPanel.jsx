import React, { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { ACCOUNT_LOGIN_API_URL } from '../../helpers/apiConfig';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../theme/colors';

const QuickGameStartPanel = () => {

  const { setAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (loading) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const response = await fetch(ACCOUNT_LOGIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data?.message || 'Nieprawidłowy email lub hasło');
        return;
      }

      const accessToken = data?.token;
      setAuth({
        accessToken,
        tournamentId: null,
        userId: data?.user?.id ?? null,
        playerId: data?.user?.playerId ?? null,
        playerName: data?.user?.name ?? null,
      });
    } catch (err) {
      setErrorMsg('Nieprawidłowy email lub hasło');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zaloguj się na konto</Text>
      <View style={styles.form}>
        <Text style={styles.errorMessage}>{errorMsg}</Text>
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
          placeholder="Hasło"
          value={password}
          onChangeText={setPassword}
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
            <Text style={styles.buttonText}>Zaloguj</Text>
          )}
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
  mode: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    color: colors.textMuted,
    marginBottom: 70,
    marginTop: 100
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
    width: 200,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 16
    },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingVertical: 7,
    paddingHorizontal: 14,
    minWidth: 100,
    minHeight: 34,
    backgroundColor: colors.accent,
    borderRadius: 5
  },
  buttonDisabled: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.onAccent,
  }
})

export default QuickGameStartPanel


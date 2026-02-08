import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { ACCOUNT_LOGIN_API_URL } from '../helpers/apiConfig';
import useAuth from '../hooks/useAuth';

const TournamentLogin = () => {

  const { setAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setErrorMsg('');

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
      setAuth({ accessToken, tournamentId: null });
    } catch (err) {
      setErrorMsg('Nieprawidłowy email lub hasło');
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
        />
        <TextInput
          style={styles.input}
          placeholder="Hasło"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Zaloguj</Text>
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
  mode: {
    color: '#F99417',
    fontWeight: 'bold',
    fontSize: 20,
    paddingTop: 20,
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

export default TournamentLogin

import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { AUTHENTICATE_API_URL, LOGIN_API_URL } from '../helpers/apiConfig';
import useAuth from '../hooks/useAuth';

const Home = () => {

  const { setAuth } = useAuth();

  const [loginCode, setLoginCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        code: loginCode
      }

      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true,
        body: JSON.stringify(payload)
      });
      let data = await response.json();
      
      const accessToken = data?.token;
      const tournamentId = data?.tournamentId;
      // const role = data?.role;

      setAuth({ accessToken, tournamentId });
    } catch (err) {
      if(!err?.response){
        setErrorMsg('Nazwa użytkownika lub hasło jest nieprawidłowe');
      } else if(err.response?.status === 400){
        setErrorMsg('Missing Username or Password');
      } else if(err.response?.status === 401){
        setErrorMsg('Unauthorized');
      } else {
        setErrorMsg('Login Failed');
      }
    } 
  }

  return (
    <View style={styles.container}>
      <Text style={styles.mode}>Tryb turnieju</Text>
      <Text style={styles.title}>Zaloguj się</Text>
      <View style={styles.form}>
        <Text style={styles.errorMessage}>{errorMsg}</Text>
        <TextInput 
          style={styles.input} 
          placeholder='Kod logowania' 
          value={loginCode} 
          onChangeText={text => setLoginCode(text)} 
          autoCorrect={false} 
          autoCapitalize='none'/>
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
    // marginHorizontal: 'auto',
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

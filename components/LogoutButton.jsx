import React from 'react'
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import useAuth from '../hooks/useAuth';
import { LOGOUT_API_URL } from '../helpers/apiConfig';

const LogoutButton = () => {

  const { auth, setAuth } = useAuth();

  const logOut = async () => {    
    setAuth({});
    // try{      
    //   const response = await fetch(LOGOUT_API_URL, {
    //     method: 'GET',
    //     headers: {
    //       'Authorization': `Bearer ${auth?.accessToken}`
    //     }
    //   });

    //   if(response.ok){
    //     setAuth({});
    //   }else{
    //     console.error('Blad podczas wylogowywania', response.statusText);
    //   }
    // } catch (error) {
    //   console.error('Blad podczas strzalu do API', error);
    // }
  }

  const handleLogoutBtn = () => {
    Alert.alert(
      'UWAGA',
      'Czy na pewno chcesz się wylogować?',
      [
        { text: "NIE", style: 'cancel', onPress: () => {} },
        {
          text: 'TAK',
          style: 'destructive',
          onPress: () => logOut(),
        },
      ]
    );
  }

  return (
    <Pressable style={styles.button} onPress={handleLogoutBtn}>
      <Text style={styles.text}>Wyloguj</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {

  },
  text: {
    color: '#c5c5c5',
    fontWeight: 'bold'
  }
})

export default LogoutButton

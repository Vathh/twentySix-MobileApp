import React from 'react';
import useAuth from '../hooks/useAuth';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MatchList from '../components/MatchList';
import Match from '../components/Match';
import TournamentLogin from '../components/TournamentLogin';
import Home from '../components/Home';
import HeaderTitle from '../components/HeaderTitle';
import LogoutButton from '../components/LogoutButton';

const Stack = createNativeStackNavigator();

const Screens = () => {

  const { auth } = useAuth();

  return (
    <Stack.Navigator>
      {auth?.accessToken ? (
        <>
          <Stack.Screen name="MatchList" component={MatchList}
          options={{
            headerStyle: {
              backgroundColor: '#363062'
            },
            headerTintColor: '#F99417',
            headerTitle: (props) => <HeaderTitle {...props}/>,
            headerRight: () => (
              <LogoutButton />
            )
          }}
          />
          <Stack.Screen name="Match" component={Match}
            options={{
              headerStyle: {
                backgroundColor: '#363062'
              },
              headerTintColor: '#F99417',
              headerTitle: (props) => <HeaderTitle {...props}/>,
              headerRight: () => (
                <LogoutButton />
              )
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={Home}
            options={{
              headerStyle: {
                backgroundColor: '#363062',
              },
              headerTitle: (props) => <HeaderTitle {...props}/>
            }}
          />
          <Stack.Screen name="TournamentLogin" component={TournamentLogin}
            options={{
              headerStyle: {
                backgroundColor: '#363062'
              },
              headerTintColor: '#F99417',
              headerTitle: (props) => <HeaderTitle {...props}/>,
              headerRight: () => (
                <LogoutButton />
              )
            }}
          />
        </>
      )
    }
    </Stack.Navigator>
  )
}

export default Screens

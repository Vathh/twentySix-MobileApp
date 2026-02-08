import React from 'react';
import useAuth from '../hooks/useAuth';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MatchList from '../components/MatchList';
import Match from '../components/Match';
import TournamentLogin from '../components/TournamentLogin';
import TournamentCode from '../components/TournamentCode';
import Home from '../components/Home';
import QuickGameLobby from '../components/QuickGameLobby';
import HeaderTitle from '../components/HeaderTitle';
import LogoutButton from '../components/LogoutButton';
import LoginButton from '../components/LoginButton';

const Stack = createNativeStackNavigator();

const Screens = () => {

  const { auth } = useAuth();

  const headerOptions = {
    headerStyle: { backgroundColor: '#363062' },
    headerTintColor: '#F99417',
  };

  // Niezalogowany: Home z przyciskami Turniej / Szybki mecz, logowanie, kod turnieju
  if (!auth?.accessToken) {
    return (
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            ...headerOptions,
            headerTitle: (props) => <HeaderTitle {...props} />,
            headerRight: () => <LoginButton />,
          }}
        />
        <Stack.Screen
          name="AccountLogin"
          component={TournamentLogin}
          options={{ ...headerOptions, headerTitle: 'Zaloguj się' }}
        />
        <Stack.Screen
          name="TournamentCode"
          component={TournamentCode}
          options={{ ...headerOptions, headerTitle: 'Kod turnieju' }}
        />
        <Stack.Screen
          name="QuickGameLobby"
          component={QuickGameLobby}
          options={{
            ...headerOptions,
            headerTitle: 'Szybki mecz – Lobby',
            headerRight: () => <LoginButton />,
          }}
        />
      </Stack.Navigator>
    );
  }

  // Zalogowany na konto (Szybki mecz): Home → Szybki mecz = lobby (tworzenie / zaproszenia). Lista meczów tylko w trybie turniej.
  if (auth?.accessToken && !auth?.tournamentId) {
    return (
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            ...headerOptions,
            headerTitle: (props) => <HeaderTitle {...props} />,
            headerRight: () => <LogoutButton />,
          }}
        />
        <Stack.Screen
          name="QuickGameLobby"
          component={QuickGameLobby}
          options={{
            ...headerOptions,
            headerTitle: 'Szybki mecz – Lobby',
            headerRight: () => <LogoutButton />,
          }}
        />
        <Stack.Screen
          name="Match"
          component={Match}
          options={{
            ...headerOptions,
            headerTitle: (props) => <HeaderTitle {...props} />,
            headerRight: () => <LogoutButton />,
          }}
        />
        <Stack.Screen
          name="TournamentCode"
          component={TournamentCode}
          options={{ ...headerOptions, headerTitle: 'Kod turnieju' }}
        />
      </Stack.Navigator>
    );
  }

  // Zalogowany kodem turnieju: tylko lista meczów i rozgrywka (widok turniejowy)
  return (
    <Stack.Navigator initialRouteName="MatchList">
      <Stack.Screen
        name="MatchList"
        component={MatchList}
        options={{
          ...headerOptions,
          headerTitle: (props) => <HeaderTitle {...props} />,
          headerRight: () => <LogoutButton />,
        }}
      />
      <Stack.Screen
        name="Match"
        component={Match}
        options={{
          ...headerOptions,
          headerTitle: (props) => <HeaderTitle {...props} />,
          headerRight: () => <LogoutButton />,
        }}
      />
    </Stack.Navigator>
  );
}

export default Screens

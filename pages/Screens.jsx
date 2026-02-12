import React from 'react';
import { Pressable, Text } from 'react-native';
import useAuth from '../hooks/useAuth';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MatchList from '../components/MatchList';
import Match from '../components/Match';
import TournamentLogin from '../components/TournamentLogin';
import TournamentCode from '../components/TournamentCode';
import Home from '../components/Home';
import QuickGameLobby from '../components/QuickGameLobby';
import FriendsScreen from '../components/FriendsScreen';
import LobbyInvitationsScreen from '../components/LobbyInvitationsScreen';
import MenuScreen from '../components/MenuScreen';
import HeaderTitle from '../components/HeaderTitle';
import LogoutButton from '../components/LogoutButton';
import LoginButton from '../components/LoginButton';

const Stack = createNativeStackNavigator();

const Screens = () => {

  const { auth } = useAuth();

  const headerOptions = {
    headerStyle: { backgroundColor: '#363062' },
    headerTintColor: '#F99417',
    headerTitleAlign: 'center',
  };

  // Niezalogowany: Home z przyciskami Turniej / Szybki mecz, logowanie, kod turnieju
  if (!auth?.accessToken) {
    return (
      <Stack.Navigator key="guest" initialRouteName="Home">
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

  // Zalogowany na konto (Szybki mecz): Stack z Menu (Znajomi, Zaproszenia)
  if (auth?.accessToken && !auth?.tournamentId) {
    const menuHeaderLeft = (nav) => (
      <Pressable onPress={() => nav.navigate('Menu')} style={{ padding: 8, marginLeft: 4 }}>
        <Text style={{ color: '#F99417', fontSize: 16 }}>☰ Menu</Text>
      </Pressable>
    );
    return (
      <Stack.Navigator
        key="user"
        initialRouteName="Home"
        screenOptions={({ navigation }) => ({
          ...headerOptions,
          headerLeft: () => menuHeaderLeft(navigation),
          headerRight: () => <LogoutButton />,
        })}
      >
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="QuickGameLobby"
          component={QuickGameLobby}
          options={{ headerTitle: 'Szybki mecz – Lobby' }}
        />
        <Stack.Screen
          name="Match"
          component={Match}
          options={{ headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="TournamentCode"
          component={TournamentCode}
          options={{ headerTitle: 'Kod turnieju' }}
        />
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{ headerTitle: 'Strona główna' }}
        />
        <Stack.Screen
          name="Znajomi"
          component={FriendsScreen}
          options={{ headerTitle: 'Znajomi' }}
        />
        <Stack.Screen
          name="Zaproszenia"
          component={LobbyInvitationsScreen}
          options={{ headerTitle: 'Zaproszenia do lobby' }}
        />
      </Stack.Navigator>
    );
  }

  // Zalogowany kodem turnieju: tylko lista meczów i rozgrywka (widok turniejowy)
  return (
    <Stack.Navigator key="tournament" initialRouteName="MatchList">
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

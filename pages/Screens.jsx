import React from 'react';
import { Pressable, Text } from 'react-native';
import useAuth from '../hooks/useAuth';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GameList from '../components/Game/GameList';
import GameScoringScreen from '../components/Game/GameScoringScreen';
import TournamentLogin from '../components/Tournament/TournamentLogin';
import TournamentCode from '../components/Tournament/TournamentCode';
import Home from '../components/Core/Home';
import QuickGameLobby from '../components/QuickGame/QuickGameLobby';
import TrainingMatchSetup from '../components/QuickGame/TrainingMatchSetup';
import FriendsScreen from '../components/Friends/FriendsScreen';
import InvitationsScreen from '../components/Invitations/InvitationsScreen';
import MenuScreen from '../components/Core/MenuScreen';
import HeaderTitle from '../components/Common/HeaderTitle';
import AccountMenuButton from '../components/Common/AccountMenuButton';
import LogoutButton from '../components/Common/LogoutButton';
import LoginButton from '../components/Common/LoginButton';

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
          options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="TournamentCode"
          component={TournamentCode}
          options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="QuickGameLobby"
          component={QuickGameLobby}
          options={{
            ...headerOptions,
            headerTitle: (props) => <HeaderTitle {...props} />,
            headerRight: () => <LoginButton />,
          }}
        />
        <Stack.Screen
          name="TrainingMatchSetup"
          component={TrainingMatchSetup}
          options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="GameScoring"
          component={GameScoringScreen}
          options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
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
          headerBackVisible: false,
          headerLeft: () => menuHeaderLeft(navigation),
          headerRight: () => <AccountMenuButton />,
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
          options={{ headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="TrainingMatchSetup"
          component={TrainingMatchSetup}
          options={{ headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="GameScoring"
          component={GameScoringScreen}
          options={{ headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="TournamentCode"
          component={TournamentCode}
          options={{ headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{
            headerTitle: (props) => <HeaderTitle {...props} />,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="Znajomi"
          component={FriendsScreen}
          options={{ headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
        <Stack.Screen
          name="Zaproszenia"
          component={InvitationsScreen}
          options={{ headerTitle: (props) => <HeaderTitle {...props} /> }}
        />
      </Stack.Navigator>
    );
  }

  // Zalogowany kodem turnieju: tylko lista meczów i rozgrywka (widok turniejowy)
  return (
    <Stack.Navigator key="tournament" initialRouteName="GameList">
      <Stack.Screen
        name="GameList"
        component={GameList}
        options={{
          ...headerOptions,
          headerTitle: (props) => <HeaderTitle {...props} />,
          headerRight: () => <LogoutButton />,
        }}
      />
      <Stack.Screen
        name="GameScoring"
        component={GameScoringScreen}
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


import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuth from '../hooks/useAuth';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AnimatedTabIcon from '../components/Common/AnimatedTabIcon';
import {
	TabTransitionProvider,
	withAnimatedTabScene,
} from '../components/Common/AnimatedTabScene';
import ScreenLoading from '../components/Common/ScreenLoading';
import GameList from '../components/Game/GameList';
import GameScoringScreen from '../components/Game/GameScoringScreen';
import TournamentLogin from '../components/Tournament/TournamentLogin';
import AccountRegister from '../components/Tournament/AccountRegister';
import TournamentCode from '../components/Tournament/TournamentCode';
import JoinTournamentScreen from '../components/Tournament/JoinTournamentScreen';
import Home from '../components/Core/Home';
import HomeDashboard from '../components/Core/HomeDashboard';
import QuickGameLobby from '../components/QuickGame/QuickGameLobby';
import LeagueGamesListScreen from '../components/League/LeagueGamesListScreen';
import LeagueGameLobby from '../components/League/LeagueGameLobby';
import TrainingHub from '../components/QuickGame/TrainingHub';
import TrainingMatchSetup from '../components/QuickGame/TrainingMatchSetup';
import TrainingHistoryList from '../components/QuickGame/TrainingHistoryList';
import TrainingGameDetail from '../components/QuickGame/TrainingGameDetail';
import FriendsScreen from '../components/Friends/FriendsScreen';
import InvitationsScreen from '../components/Invitations/InvitationsScreen';
import PlayerProfileScreen from '../components/PlayerProfile/PlayerProfileScreen';
import EditPlayerProfileScreen from '../components/PlayerProfile/EditPlayerProfileScreen';
import AccountScreen from '../components/Account/AccountScreen';
import MyCompetitionsScreen from '../components/Account/MyCompetitionsScreen';
import ChangePasswordScreen from '../components/Account/ChangePasswordScreen';
import CompetitionsScreen from '../components/Competitions/CompetitionsScreen';
import OrganizationsListScreen from '../components/Competitions/OrganizationsListScreen';
import SeasonsListScreen from '../components/Competitions/SeasonsListScreen';
import TournamentsListScreen from '../components/Competitions/TournamentsListScreen';
import OrganizationDetailScreen from '../components/Competitions/OrganizationDetailScreen';
import LeagueDetailScreen from '../components/Competitions/LeagueDetailScreen';
import LeagueDivisionDetailScreen from '../components/Competitions/LeagueDivisionDetailScreen';
import LeagueSeasonDetailScreen from '../components/Competitions/LeagueSeasonDetailScreen';
import SeasonDetailScreen from '../components/Competitions/SeasonDetailScreen';
import TournamentDetailScreen from '../components/Competitions/TournamentDetailScreen';
import HeaderTitle from '../components/Common/HeaderTitle';
import AccountMenuButton from '../components/Common/AccountMenuButton';
import LogoutButton from '../components/Common/LogoutButton';
import LoginButton from '../components/Common/LoginButton';
import TournamentScoringLeaveButton, {
	TournamentRefereeExitButton,
} from '../components/Game/TournamentScoringLeaveButton';
import { colors } from '../theme/colors';

const RootStack = createNativeStackNavigator();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerOptions = {
	headerStyle: { backgroundColor: colors.bg },
	headerTintColor: colors.accent,
	headerTitleAlign: 'left',
	headerTitleContainerStyle: { paddingHorizontal: 0 },
};

function tabIcon(name) {
	return ({ color, size, focused }) => (
		<AnimatedTabIcon name={name} color={color} size={size} focused={focused} />
	);
}

const stackScreenOptions = {
	...headerOptions,
	headerTitle: (props) => <HeaderTitle {...props} />,
	headerRight: () => <AccountMenuButton />,
	contentStyle: { backgroundColor: colors.bg },
};

function GrajStack() {
	return (
		<Stack.Navigator screenOptions={stackScreenOptions}>
			<Stack.Screen name="GrajHome" component={Home} />
			<Stack.Screen name="TrainingHub" component={TrainingHub} />
			<Stack.Screen name="TrainingMatchSetup" component={TrainingMatchSetup} />
			<Stack.Screen name="TrainingHistory" component={TrainingHistoryList} />
			<Stack.Screen name="TrainingGameDetail" component={TrainingGameDetail} />
			<Stack.Screen name="QuickGameLobby" component={QuickGameLobby} />
			<Stack.Screen
				name="LeagueGames"
				component={LeagueGamesListScreen}
				options={{ title: 'Mecze ligowe' }}
			/>
			<Stack.Screen
				name="LeagueGameLobby"
				component={LeagueGameLobby}
				options={{ title: 'Lobby ligowe' }}
			/>
			<Stack.Screen name="TournamentCode" component={TournamentCode} />
			<Stack.Screen name="JoinTournament" component={JoinTournamentScreen} />
		</Stack.Navigator>
	);
}

function RozgrywkiStack() {
	return (
		<Stack.Navigator screenOptions={stackScreenOptions}>
			<Stack.Screen name="RozgrywkiHome" component={CompetitionsScreen} />
			<Stack.Screen name="OrganizationsList" component={OrganizationsListScreen} />
			<Stack.Screen name="SeasonsList" component={SeasonsListScreen} />
			<Stack.Screen name="TournamentsList" component={TournamentsListScreen} />
			<Stack.Screen name="OrganizationDetail" component={OrganizationDetailScreen} />
			<Stack.Screen name="LeagueDetail" component={LeagueDetailScreen} />
			<Stack.Screen name="LeagueDivisionDetail" component={LeagueDivisionDetailScreen} />
			<Stack.Screen name="LeagueSeasonDetail" component={LeagueSeasonDetailScreen} />
			<Stack.Screen name="SeasonDetail" component={SeasonDetailScreen} />
			<Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
			<Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
			<Stack.Screen
				name="EditPlayerProfile"
				component={EditPlayerProfileScreen}
				options={{ title: 'Edycja profilu' }}
			/>
		</Stack.Navigator>
	);
}

function ZnajomiStack() {
	return (
		<Stack.Navigator screenOptions={stackScreenOptions}>
			<Stack.Screen name="ZnajomiHome" component={FriendsScreen} />
			<Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
			<Stack.Screen
				name="EditPlayerProfile"
				component={EditPlayerProfileScreen}
				options={{ title: 'Edycja profilu' }}
			/>
		</Stack.Navigator>
	);
}

function KontoStack() {
	return (
		<Stack.Navigator screenOptions={stackScreenOptions}>
			<Stack.Screen name="KontoHome" component={AccountScreen} />
			<Stack.Screen
				name="MyCompetitions"
				component={MyCompetitionsScreen}
				options={{ title: 'Gdzie gram' }}
			/>
			<Stack.Screen name="OrganizationDetail" component={OrganizationDetailScreen} />
			<Stack.Screen name="LeagueDetail" component={LeagueDetailScreen} />
			<Stack.Screen name="LeagueDivisionDetail" component={LeagueDivisionDetailScreen} />
			<Stack.Screen name="LeagueSeasonDetail" component={LeagueSeasonDetailScreen} />
			<Stack.Screen name="SeasonDetail" component={SeasonDetailScreen} />
			<Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
			<Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
			<Stack.Screen
				name="EditPlayerProfile"
				component={EditPlayerProfileScreen}
				options={{ title: 'Edycja profilu' }}
			/>
			<Stack.Screen
				name="ChangePassword"
				component={ChangePasswordScreen}
				options={{ title: 'Zmień hasło' }}
			/>
		</Stack.Navigator>
	);
}

function HiddenHomeStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="HomeDashboard" component={HomeDashboard} />
		</Stack.Navigator>
	);
}

const GrajTab = withAnimatedTabScene(GrajStack, { skipInitial: true, tabName: 'Graj' });
const RozgrywkiTab = withAnimatedTabScene(RozgrywkiStack, { tabName: 'Rozgrywki' });
const ZnajomiTab = withAnimatedTabScene(ZnajomiStack, { tabName: 'Znajomi' });
const ZaproszeniaTab = withAnimatedTabScene(InvitationsScreen, { tabName: 'Zaproszenia' });
const KontoTab = withAnimatedTabScene(KontoStack, { tabName: 'Konto' });

/** Dolny pasek: Graj / Rozgrywki / Znajomi / Zaproszenia / Konto (+ ukryty Home). */
function UserMainTabs() {
	return (
		<TabTransitionProvider>
			<UserMainTabsNavigator />
		</TabTransitionProvider>
	);
}

function UserMainTabsNavigator() {
	const insets = useSafeAreaInsets();

	return (
		<Tab.Navigator
			id="UserMainTabs"
			initialRouteName="Graj"
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: colors.bg,
					borderTopColor: colors.border,
					borderTopWidth: 1,
				},
				tabBarSafeAreaInsets: { bottom: insets.bottom + 6 },
				tabBarActiveTintColor: colors.accent,
				tabBarInactiveTintColor: colors.textMuted,
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: '600',
				},
			}}
		>
			<Tab.Screen
				name="Home"
				component={HiddenHomeStack}
				options={{
					tabBarButton: () => null,
				}}
			/>
			<Tab.Screen
				name="Graj"
				component={GrajTab}
				options={{
					tabBarLabel: 'Graj',
					tabBarIcon: tabIcon('play-circle-outline'),
				}}
			/>
			<Tab.Screen
				name="Rozgrywki"
				component={RozgrywkiTab}
				options={{
					tabBarLabel: 'Rozgrywki',
					tabBarIcon: tabIcon('trophy-outline'),
				}}
			/>
			<Tab.Screen
				name="Znajomi"
				component={ZnajomiTab}
				options={{
					tabBarLabel: 'Znajomi',
					tabBarIcon: tabIcon('people-outline'),
				}}
			/>
			<Tab.Screen
				name="Zaproszenia"
				component={ZaproszeniaTab}
				options={{
					...headerOptions,
					headerShown: true,
					headerTitle: (props) => <HeaderTitle {...props} />,
					headerRight: () => <AccountMenuButton />,
					tabBarLabel: 'Zaproszenia',
					tabBarIcon: tabIcon('mail-outline'),
				}}
			/>
			<Tab.Screen
				name="Konto"
				component={KontoTab}
				options={{
					tabBarLabel: 'Konto',
					tabBarIcon: tabIcon('person-outline'),
				}}
			/>
		</Tab.Navigator>
	);
}

const Screens = () => {
	const { auth, authLoading } = useAuth();
	const insets = useSafeAreaInsets();
	const bottomPad = Math.max(insets.bottom, 10);
	const paddedContent = { backgroundColor: colors.bg, paddingBottom: bottomPad };

	if (authLoading) {
		return <ScreenLoading />;
	}

	// Niezalogowany: Home = widok gry (bez dolnego paska)
	if (!auth?.accessToken) {
		return (
			<RootStack.Navigator
				key="guest"
				initialRouteName="Home"
				screenOptions={{ contentStyle: paddedContent }}
			>
				<RootStack.Screen
					name="Home"
					component={Home}
					options={{
						...headerOptions,
						headerTitle: (props) => <HeaderTitle {...props} />,
						headerRight: () => <LoginButton />,
					}}
				/>
				<RootStack.Screen
					name="AccountLogin"
					component={TournamentLogin}
					options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
				/>
				<RootStack.Screen
					name="AccountRegister"
					component={AccountRegister}
					options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
				/>
				<RootStack.Screen
					name="TournamentCode"
					component={TournamentCode}
					options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
				/>
				<RootStack.Screen
					name="JoinTournament"
					component={JoinTournamentScreen}
					options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
				/>
				<RootStack.Screen
					name="QuickGameLobby"
					component={QuickGameLobby}
					options={{
						...headerOptions,
						headerTitle: (props) => <HeaderTitle {...props} />,
						headerRight: () => <LoginButton />,
					}}
				/>
				<RootStack.Screen
					name="TrainingHub"
					component={TrainingHub}
					options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
				/>
				<RootStack.Screen
					name="TrainingMatchSetup"
					component={TrainingMatchSetup}
					options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
				/>
				<RootStack.Screen
					name="TrainingHistory"
					component={TrainingHistoryList}
					options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
				/>
				<RootStack.Screen
					name="TrainingGameDetail"
					component={TrainingGameDetail}
					options={{ ...headerOptions, headerTitle: (props) => <HeaderTitle {...props} /> }}
				/>
				<RootStack.Screen
					name="GameScoring"
					component={GameScoringScreen}
					options={{
						...headerOptions,
						headerTitle: (props) => <HeaderTitle {...props} />,
						// Bottom inset obsługuje GameScoringScreen — bez podwójnego paddingu.
						contentStyle: { backgroundColor: colors.bg },
					}}
				/>
			</RootStack.Navigator>
		);
	}

	// Zalogowany na konto: taby z zagnieżdżonymi stackami (tab bar widoczny wszędzie
	// poza GameScoring na root stacku).
	if (auth?.accessToken && !auth?.tournamentId) {
		return (
			<RootStack.Navigator key="user" initialRouteName="MainTabs">
				<RootStack.Screen
					name="MainTabs"
					component={UserMainTabs}
					options={{ headerShown: false }}
				/>
				<RootStack.Screen
					name="GameScoring"
					component={GameScoringScreen}
					options={{
						...headerOptions,
						headerTitle: (props) => <HeaderTitle {...props} />,
						headerRight: () => <AccountMenuButton />,
						contentStyle: { backgroundColor: colors.bg },
					}}
				/>
			</RootStack.Navigator>
		);
	}

	// Zalogowany kodem turnieju: tylko lista meczów i rozgrywka (widok turniejowy)
	return (
		<RootStack.Navigator
			key="tournament"
			initialRouteName="GameList"
			screenOptions={{ contentStyle: paddedContent }}
		>
			<RootStack.Screen
				name="GameList"
				component={GameList}
				options={{
					...headerOptions,
					headerBackVisible: false,
					headerTitle: (props) => <HeaderTitle {...props} />,
					headerLeft: () => <TournamentRefereeExitButton />,
					headerRight: () => <LogoutButton />,
				}}
			/>
			<RootStack.Screen
				name="GameScoring"
				component={GameScoringScreen}
				options={{
					...headerOptions,
					headerBackVisible: false,
					headerTitle: (props) => <HeaderTitle {...props} />,
					headerLeft: () => <TournamentScoringLeaveButton />,
					contentStyle: { backgroundColor: colors.bg },
				}}
			/>
		</RootStack.Navigator>
	);
};

export default Screens;

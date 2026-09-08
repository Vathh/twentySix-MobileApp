import { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ExpoKeepAwakeTag, deactivateKeepAwake } from 'expo-keep-awake';
import { AuthProvider } from './context/AuthProvider';
import { ConfirmProvider } from './context/ConfirmProvider';
import PushNotificationsBootstrap from './components/Common/PushNotificationsBootstrap';
import Screens from './pages/Screens';
import { navigate, navigationRef } from './helpers/navigationRef';
import { colors } from './theme/colors';

const linking = {
	prefixes: ['twentysix://', 'https://dartscore.studiokam.pl'],
	config: {
		screens: {
			JoinTournament: {
				path: 'join-tournament/:code',
				parse: {
					code: (code) => String(code ?? '').toUpperCase(),
				},
			},
			TournamentCode: {
				path: 'tablet-login/:code',
				parse: {
					code: (code) => String(code ?? '').toUpperCase(),
				},
			},
		},
	},
};

function extractJoinCodeFromUrl(url) {
	if (!url || typeof url !== 'string') return null;
	const match = url.match(/join-tournament\/([A-Za-z0-9]+)/i);
	return match?.[1] ? match[1].toUpperCase() : null;
}

function extractTabletLoginCodeFromUrl(url) {
	if (!url || typeof url !== 'string') return null;
	const match = url.match(/tablet-login\/([A-Za-z0-9]+)/i);
	return match?.[1] ? match[1].toUpperCase() : null;
}

/**
 * Expo w dev (`withDevTools`) włącza keep-awake na domyślnym tagu, gdy
 * `expo-keep-awake` jest w zależnościach — przez to ekran nie gaśnie nigdzie.
 * Wyłączamy to; keep-awake zostaje tylko na GameScoringScreen.
 */
function useAllowScreenSleepOutsideScoring() {
	useEffect(() => {
		const timer = setTimeout(() => {
			void deactivateKeepAwake(ExpoKeepAwakeTag);
		}, 0);
		return () => clearTimeout(timer);
	}, []);
}

function useJoinTournamentDeepLink() {
	useEffect(() => {
		const openJoin = (url) => {
			const code = extractJoinCodeFromUrl(url);
			if (!code) return;
			setTimeout(() => navigate('JoinTournament', { code }), 300);
		};

		Linking.getInitialURL().then((url) => {
			if (url) openJoin(url);
		});

		const sub = Linking.addEventListener('url', ({ url }) => openJoin(url));
		return () => sub.remove();
	}, []);
}

function useTabletLoginDeepLink() {
	useEffect(() => {
		const openTabletLogin = (url) => {
			const code = extractTabletLoginCodeFromUrl(url);
			if (!code) return;
			setTimeout(() => navigate('TournamentCode', { code }), 300);
		};

		Linking.getInitialURL().then((url) => {
			if (url) openTabletLogin(url);
		});

		const sub = Linking.addEventListener('url', ({ url }) => openTabletLogin(url));
		return () => sub.remove();
	}, []);
}

export default function AppShell() {
	useAllowScreenSleepOutsideScoring();
	useJoinTournamentDeepLink();
	useTabletLoginDeepLink();

	// Bez ręcznego paddingTop: na Androidzie (Expo 54 edge-to-edge)
	// native stack już dokłada inset do headera — dodatkowy padding dawał
	// podwójną lukę pod paskiem statusu.
	return (
		<View style={styles.container}>
			<GestureHandlerRootView style={styles.gesture}>
				<StatusBar style="light" />
				<ConfirmProvider>
					<NavigationContainer ref={navigationRef} linking={linking}>
						<AuthProvider>
							<PushNotificationsBootstrap />
							<Screens />
						</AuthProvider>
					</NavigationContainer>
				</ConfirmProvider>
			</GestureHandlerRootView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	gesture: { flex: 1 },
});

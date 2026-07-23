import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ExpoKeepAwakeTag, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthProvider';
import PushNotificationsBootstrap from './components/Common/PushNotificationsBootstrap';
import Screens from './pages/Screens';
import { navigationRef } from './helpers/navigationRef';
import { colors } from './theme/colors';

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

export default function AppShell() {
	useAllowScreenSleepOutsideScoring();
	const insets = useSafeAreaInsets();
	const topInset =
		insets.top > 0
			? insets.top
			: Platform.OS === 'android'
				? (RNStatusBar.currentHeight ?? 24)
				: 0;
	const bottomInset = Math.max(insets.bottom, 10);

	return (
		<View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
			<GestureHandlerRootView style={styles.gesture}>
				<StatusBar style="light" />
				<NavigationContainer ref={navigationRef}>
					<AuthProvider>
						<PushNotificationsBootstrap />
						<Screens />
					</AuthProvider>
				</NavigationContainer>
			</GestureHandlerRootView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg },
	gesture: { flex: 1 },
});

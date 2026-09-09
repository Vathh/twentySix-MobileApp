import 'react-native-gesture-handler';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initTheme } from './theme/colors';
import AppIntro from './components/Common/AppIntro';
import { IntroOverlayProvider } from './context/IntroOverlayContext';
import { preloadSvgAssets } from './helpers/svgAssets';

// pusher-js (web build) oczekuje `self` — w RN jest tylko `global`
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
	global.self = global;
}

/**
 * Ładuje motyw z AsyncStorage i XML logo z plików SVG PRZED require AppShell,
 * żeby StyleSheet.create dostał właściwe hex z aktywnej palety,
 * a intro/header nie parsowały 240 KB stringów w JS.
 */
export default function App() {
	const [ready, setReady] = useState(false);
	const [drawDone, setDrawDone] = useState(false);
	const [flyDone, setFlyDone] = useState(false);
	const [introDone, setIntroDone] = useState(false);

	useEffect(() => {
		Promise.all([
			initTheme(),
			preloadSvgAssets().catch((error) => {
				console.warn('svg assets', error);
			}),
		]).finally(() => setReady(true));
	}, []);

	const handleDrawComplete = useCallback(() => {
		setDrawDone(true);
	}, []);

	const handleFlyComplete = useCallback(() => {
		setFlyDone(true);
	}, []);

	const handleRevealComplete = useCallback(() => {
		setIntroDone(true);
	}, []);

	useEffect(() => {
		if (!flyDone || introDone) {
			return undefined;
		}
		const timer = setTimeout(() => setIntroDone(true), 2000);
		return () => clearTimeout(timer);
	}, [flyDone, introDone]);

	if (!ready) {
		return (
			<View style={bootStyles.boot}>
				<ActivityIndicator size="large" color="#F59E0B" />
			</View>
		);
	}

	const AppShell = require('./AppShell').default;

	return (
		<IntroOverlayProvider
			introActive={!introDone}
			revealRest={flyDone && !introDone}
			onRevealComplete={handleRevealComplete}
		>
			<SafeAreaProvider>
				<View style={bootStyles.root}>
					{drawDone ? <AppShell /> : null}
					{!introDone ? (
						<View style={bootStyles.introOverlay}>
							<AppIntro
								onDrawComplete={handleDrawComplete}
								onFlyComplete={handleFlyComplete}
							/>
						</View>
					) : null}
				</View>
			</SafeAreaProvider>
		</IntroOverlayProvider>
	);
}

const bootStyles = StyleSheet.create({
	boot: {
		flex: 1,
		backgroundColor: '#141418',
		justifyContent: 'center',
		alignItems: 'center',
	},
	root: {
		flex: 1,
		backgroundColor: '#141418',
	},
	introOverlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 50,
		elevation: 50,
	},
});

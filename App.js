import 'react-native-gesture-handler';
import './theme/installUiScale';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initTheme } from './theme/colors';
import AppIntro from './components/Common/AppIntro';
import {
	IntroOverlayProvider,
	useIntroOverlay,
} from './context/IntroOverlayContext';
import { getIntroLogotypXml, preloadSvgAssets } from './helpers/svgAssets';

/** Wspólny układ dla AppShell i overlay — pomiary slotu logo są względem tego hosta. */
function IntroCoordinateHost({ children }) {
	const { coordinateHostRef } = useIntroOverlay();
	return (
		<View ref={coordinateHostRef} collapsable={false} style={bootStyles.root}>
			{children}
		</View>
	);
}

// pusher-js (web build) oczekuje `self` — w RN jest tylko `global`
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
	global.self = global;
}

/**
 * Ładuje motyw z AsyncStorage i XML logo PRZED require AppShell,
 * żeby StyleSheet.create dostał właściwe hex z aktywnej palety.
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

	useEffect(() => {
		if (!ready || getIntroLogotypXml()) {
			return;
		}
		setDrawDone(true);
		setFlyDone(true);
		setIntroDone(true);
	}, [ready]);

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
				<IntroCoordinateHost>
					{drawDone ? <AppShell /> : null}
					{!introDone ? (
						<View style={bootStyles.introOverlay}>
							<AppIntro
								onDrawComplete={handleDrawComplete}
								onFlyComplete={handleFlyComplete}
							/>
						</View>
					) : null}
				</IntroCoordinateHost>
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

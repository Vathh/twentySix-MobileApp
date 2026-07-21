import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initTheme } from './theme/colors';

// pusher-js (web build) oczekuje `self` — w RN jest tylko `global`
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
	global.self = global;
}

/**
 * Ładuje motyw z AsyncStorage PRZED require AppShell / Screens,
 * żeby StyleSheet.create dostał właściwe hex z aktywnej palety.
 */
export default function App() {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		initTheme().finally(() => setReady(true));
	}, []);

	if (!ready) {
		return (
			<View style={bootStyles.boot}>
				<ActivityIndicator size="large" color="#F59E0B" />
			</View>
		);
	}

	const AppShell = require('./AppShell').default;

	return (
		<SafeAreaProvider>
			<AppShell />
		</SafeAreaProvider>
	);
}

const bootStyles = {
	boot: {
		flex: 1,
		backgroundColor: '#141418',
		justifyContent: 'center',
		alignItems: 'center',
	},
};

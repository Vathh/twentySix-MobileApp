import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

/** Widoczne taby dolnego paska — bez ukrytego Home. */
export const VISIBLE_TAB_ORDER = [
	'Graj',
	'Rozgrywki',
	'Zaproszenia',
	'Konto',
];

const SHIFT_PX = 22;
const SHIFT_MS = 280;
const FADE_MS = 200;
const EASING = Easing.bezier(0.22, 1, 0.36, 1);

const TabTransitionContext = createContext({
	indexRef: { current: 0 },
});

export function TabTransitionProvider({ children }) {
	const indexRef = useRef(0);
	const value = useMemo(() => ({ indexRef }), [indexRef]);
	return (
		<TabTransitionContext.Provider value={value}>
			{children}
		</TabTransitionContext.Provider>
	);
}

export function useTabTransition() {
	return useContext(TabTransitionContext);
}

/**
 * Lekkie wejście taba: przesunięcie w stronę zmiany + zasłona koloru tła.
 * Bez opacity na samym ekranie — native stack źle znosi przezroczystość rodzica.
 */
const AnimatedTabScene = ({ children, skipInitial = false, tabName }) => {
	const isFocused = useIsFocused();
	const { indexRef } = useTabTransition();
	const skipNext = useRef(skipInitial);
	const overlay = useSharedValue(skipInitial ? 0 : 1);
	const translateX = useSharedValue(0);

	useEffect(() => {
		const next = VISIBLE_TAB_ORDER.indexOf(tabName);

		if (!isFocused) {
			overlay.value = 1;
			translateX.value = 0;
			return;
		}

		if (skipNext.current) {
			skipNext.current = false;
			if (next >= 0) {
				indexRef.current = next;
			}
			overlay.value = 0;
			translateX.value = 0;
			return;
		}

		const prev = indexRef.current;
		const dir = next >= 0 && next < prev ? -1 : 1;
		if (next >= 0) {
			indexRef.current = next;
		}

		overlay.value = 1;
		translateX.value = dir * SHIFT_PX;
		overlay.value = withTiming(0, { duration: FADE_MS, easing: EASING });
		translateX.value = withTiming(0, { duration: SHIFT_MS, easing: EASING });
	}, [indexRef, isFocused, overlay, tabName, translateX]);

	const shiftStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	const fadeStyle = useAnimatedStyle(() => ({
		opacity: overlay.value,
	}));

	return (
		<View style={styles.root}>
			<Animated.View style={[styles.fill, shiftStyle]}>{children}</Animated.View>
			<Animated.View pointerEvents="none" style={[styles.cover, fadeStyle]} />
		</View>
	);
};

export function withAnimatedTabScene(Component, options = {}) {
	function AnimatedTabSceneHost(props) {
		return (
			<AnimatedTabScene skipInitial={options.skipInitial} tabName={options.tabName}>
				<Component {...props} />
			</AnimatedTabScene>
		);
	}
	AnimatedTabSceneHost.displayName = `AnimatedTab(${options.tabName || Component.displayName || Component.name || 'Screen'})`;
	return AnimatedTabSceneHost;
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		overflow: 'hidden',
		backgroundColor: colors.bg,
	},
	fill: {
		flex: 1,
	},
	cover: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: colors.bg,
	},
});

export default AnimatedTabScene;

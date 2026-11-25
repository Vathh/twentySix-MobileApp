import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DOWN = { duration: 70, easing: Easing.out(Easing.quad) };
const UP = { duration: 110, easing: Easing.out(Easing.cubic) };
const SCALE = 0.94;
const FLASH = 'rgba(255,255,255,0.16)';

/**
 * Przycisk treningowy: krótki scale + flesz przy naciśnięciu.
 * Drop-in zamiast Pressable na padach scoringu.
 */
export default function TrainingPressable({
	style,
	disabled = false,
	onPress,
	onPressIn,
	onPressOut,
	children,
	...rest
}) {
	const scale = useSharedValue(1);
	const flash = useSharedValue(0);

	const scaleStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));
	const flashStyle = useAnimatedStyle(() => ({
		opacity: flash.value,
	}));

	const handleIn = useCallback((event) => {
		if (!disabled) {
			scale.value = withTiming(SCALE, DOWN);
			flash.value = withTiming(1, DOWN);
		}
		onPressIn?.(event);
	}, [disabled, flash, onPressIn, scale]);

	const handleOut = useCallback((event) => {
		scale.value = withTiming(1, UP);
		flash.value = withTiming(0, UP);
		onPressOut?.(event);
	}, [flash, onPressOut, scale]);

	const resolvedStyle = typeof style === 'function'
		? (state) => [style(state), styles.host, scaleStyle]
		: [style, styles.host, scaleStyle];

	return (
		<AnimatedPressable
			{...rest}
			disabled={disabled}
			onPress={onPress}
			onPressIn={handleIn}
			onPressOut={handleOut}
			style={resolvedStyle}
		>
			{children}
			<Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
		</AnimatedPressable>
	);
}

const styles = StyleSheet.create({
	host: {
		overflow: 'hidden',
	},
	flash: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: FLASH,
	},
});

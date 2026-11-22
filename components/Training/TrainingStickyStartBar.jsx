import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

/**
 * Sticky dolny pasek z głównym CTA startu sesji.
 */
export default function TrainingStickyStartBar({ label, onPress, disabled }) {
	const insets = useSafeAreaInsets();
	if (!label || !onPress) {
		return null;
	}
	return (
		<View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ disabled: Boolean(disabled) }}
				disabled={disabled}
				onPress={onPress}
				style={({ pressed }) => [
					styles.button,
					pressed && !disabled && styles.buttonPressed,
					disabled && styles.buttonDisabled,
				]}
			>
				<Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		paddingHorizontal: 24,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.bgDeep,
	},
	button: {
		minHeight: 52,
		borderRadius: 12,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
		maxWidth: 480,
		alignSelf: 'center',
		width: '100%',
	},
	buttonPressed: {
		backgroundColor: colors.accentHover,
	},
	buttonDisabled: {
		opacity: 0.45,
	},
	label: {
		color: colors.onAccent,
		fontSize: 16,
		fontWeight: '700',
	},
	labelDisabled: {
		color: colors.onAccent,
	},
});

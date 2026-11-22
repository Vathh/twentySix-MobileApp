import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Live score / remaining w play.
 */
export default function TrainingPlayScore({
	label = 'Wynik',
	value,
	size = 'default',
	accessibilityLabel,
}) {
	const large = size === 'large';
	return (
		<View
			style={styles.wrap}
			accessibilityRole="text"
			accessibilityLabel={accessibilityLabel || `${label} ${value}`}
		>
			<Text style={styles.caption}>{label}</Text>
			<Text style={[styles.value, large && styles.valueLarge]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		alignItems: 'center',
		marginBottom: 16,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 16,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	caption: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	value: {
		marginTop: 4,
		color: colors.accent,
		fontSize: 40,
		lineHeight: 46,
		fontWeight: '800',
		fontVariant: ['tabular-nums'],
		letterSpacing: -0.6,
	},
	valueLarge: {
		fontSize: 56,
		lineHeight: 62,
	},
});

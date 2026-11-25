import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import TickingScore from '../Game/TickingScore';

/**
 * Live score / remaining w play — liczby animują jak w H2H (TickingScore).
 */
export default function TrainingPlayScore({
	label = 'Wynik',
	value,
	size = 'default',
	accessibilityLabel,
	animateUp = true,
}) {
	const large = size === 'large';
	const numeric = Number.isFinite(Number(value));

	return (
		<View
			style={styles.wrap}
			accessibilityRole="text"
			accessibilityLabel={accessibilityLabel || `${label} ${value}`}
		>
			<Text style={styles.caption}>{label}</Text>
			{numeric ? (
				<TickingScore
					value={Number(value)}
					animateUp={animateUp}
					style={[styles.value, large && styles.valueLarge]}
				/>
			) : (
				<Text style={[styles.value, large && styles.valueLarge]}>{value}</Text>
			)}
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

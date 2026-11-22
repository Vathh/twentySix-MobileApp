import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Pasek czasu sesji treningowej.
 */
export default function TrainingPlayTimer({
	label = 'Zostało',
	value,
	progress = 0,
	urgent = false,
	compact = false,
}) {
	return (
		<View
			style={[styles.bar, compact && styles.barCompact]}
			accessibilityRole="text"
			accessibilityLabel={`${label} ${value}`}
		>
			<Text style={[styles.caption, compact && styles.captionCompact]}>{label}</Text>
			<Text style={[
				styles.value,
				compact && styles.valueCompact,
				urgent && styles.valueUrgent,
			]}
			>
				{value}
			</Text>
			<View style={styles.track}>
				<View
					style={[
						styles.fill,
						urgent && styles.fillUrgent,
						{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` },
					]}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 14,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		backgroundColor: colors.bgDeep,
	},
	barCompact: {
		paddingTop: 8,
		paddingBottom: 10,
		backgroundColor: colors.bg,
	},
	caption: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		textAlign: 'center',
	},
	captionCompact: {
		fontSize: 13,
	},
	value: {
		marginTop: 2,
		marginBottom: 10,
		color: colors.text,
		fontSize: 32,
		lineHeight: 38,
		fontWeight: '800',
		fontVariant: ['tabular-nums'],
		textAlign: 'center',
		letterSpacing: -0.4,
	},
	valueCompact: {
		fontSize: 28,
		lineHeight: 34,
	},
	valueUrgent: {
		color: colors.warning,
	},
	track: {
		alignSelf: 'stretch',
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.bgElevated,
		overflow: 'hidden',
	},
	fill: {
		height: '100%',
		borderRadius: 4,
		backgroundColor: colors.accent,
	},
	fillUrgent: {
		backgroundColor: colors.warning,
	},
});

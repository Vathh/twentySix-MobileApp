import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Wspólny ekran wyniku sesji treningowej.
 *
 * @param {{
 *   hero?: { label: string, value: string|number },
 *   rows?: Array<{ label: string, value: string|number }>,
 *   syncLabel?: string,
 *   children?: React.ReactNode,
 *   primaryLabel?: string,
 *   onPrimary?: () => void,
 *   secondaryLabel?: string,
 *   onSecondary?: () => void,
 * }} props
 */
export default function TrainingSessionResult({
	hero,
	rows = [],
	syncLabel,
	children,
	primaryLabel,
	onPrimary,
	secondaryLabel,
	onSecondary,
}) {
	return (
		<View style={styles.wrap}>
			{hero ? (
				<View style={styles.hero}>
					<Text style={styles.heroLabel}>{hero.label}</Text>
					<Text style={styles.heroValue}>{hero.value}</Text>
				</View>
			) : null}
			{rows.length > 0 ? (
				<View style={styles.card}>
					{rows.map((row, index) => (
						<View
							key={`${row.label}-${index}`}
							style={[styles.row, index === rows.length - 1 && styles.rowLast]}
						>
							<Text style={styles.rowLabel}>{row.label}</Text>
							<Text style={styles.rowValue}>{row.value}</Text>
						</View>
					))}
				</View>
			) : null}
			{children}
			{syncLabel ? <Text style={styles.sync}>{syncLabel}</Text> : null}
			{primaryLabel && onPrimary ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={primaryLabel}
					onPress={onPrimary}
					style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
				>
					<Text style={styles.primaryText}>{primaryLabel}</Text>
				</Pressable>
			) : null}
			{secondaryLabel && onSecondary ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={secondaryLabel}
					onPress={onSecondary}
					style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
				>
					<Text style={styles.secondaryText}>{secondaryLabel}</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
	},
	hero: {
		alignItems: 'center',
		marginBottom: 20,
		paddingVertical: 20,
		paddingHorizontal: 16,
		borderRadius: 18,
		backgroundColor: colors.accentMuted,
		borderWidth: 1,
		borderColor: colors.accentBorder,
	},
	heroLabel: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	heroValue: {
		marginTop: 6,
		color: colors.accent,
		fontSize: 48,
		lineHeight: 54,
		fontWeight: '800',
		fontVariant: ['tabular-nums'],
		letterSpacing: -0.8,
	},
	card: {
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
		paddingHorizontal: 14,
		marginBottom: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	rowLast: {
		borderBottomWidth: 0,
	},
	rowLabel: {
		flex: 1,
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '600',
	},
	rowValue: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	sync: {
		marginBottom: 16,
		color: colors.textDim,
		fontSize: 13,
		textAlign: 'center',
	},
	primary: {
		minHeight: 52,
		borderRadius: 12,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
	},
	primaryPressed: {
		backgroundColor: colors.accentHover,
	},
	primaryText: {
		color: colors.onAccent,
		fontSize: 16,
		fontWeight: '700',
	},
	secondary: {
		minHeight: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	secondaryText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
});

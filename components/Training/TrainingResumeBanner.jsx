import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Wyróżniony baner wznowienia wiszącej sesji.
 */
export default function TrainingResumeBanner({
	title,
	primaryLabel = 'Wznów',
	onPrimary,
	secondaryLabel,
	onSecondary,
}) {
	return (
		<View style={styles.banner}>
			<View style={styles.head}>
				<View style={styles.iconWrap}>
					<Ionicons name="refresh-outline" size={scaleSize(18)} color={colors.accent} />
				</View>
				<Text style={styles.title}>{title}</Text>
			</View>
			<View style={styles.row}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={primaryLabel}
					onPress={onPrimary}
					style={({ pressed }) => [styles.button, styles.primary, pressed && styles.primaryPressed]}
				>
					<Text style={styles.primaryText}>{primaryLabel}</Text>
				</Pressable>
				{secondaryLabel && onSecondary ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={secondaryLabel}
						onPress={onSecondary}
						style={({ pressed }) => [styles.button, styles.ghost, pressed && styles.ghostPressed]}
					>
						<Text style={styles.ghostText}>{secondaryLabel}</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {
		marginBottom: 16,
		padding: 14,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: colors.accentBorder,
		backgroundColor: colors.accentMuted,
	},
	head: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginBottom: 12,
	},
	iconWrap: {
		width: 32,
		height: 32,
		borderRadius: 9,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentSoft,
	},
	title: {
		flex: 1,
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
		lineHeight: 20,
	},
	row: {
		flexDirection: 'row',
		gap: 8,
	},
	button: {
		flex: 1,
		minHeight: 42,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	primary: {
		backgroundColor: colors.accent,
	},
	primaryPressed: {
		backgroundColor: colors.accentHover,
	},
	primaryText: {
		color: colors.onAccent,
		fontSize: 14,
		fontWeight: '700',
	},
	ghost: {
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: 'transparent',
	},
	ghostPressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	ghostText: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
	},
});

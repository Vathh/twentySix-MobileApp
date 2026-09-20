import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Kafelek hubu (Graj / Rozgrywki): ikona + tytuł + hint.
 *
 * @param {{
 *   icon: string,
 *   title: string,
 *   hint?: string,
 *   onPress: () => void,
 *   variant?: 'default' | 'primary' | 'referee',
 * }} props
 */
export default function ModeTile({
	icon,
	title,
	hint,
	onPress,
	variant = 'default',
}) {
	const isPrimary = variant === 'primary';
	const isReferee = variant === 'referee';

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={hint ? `${title}. ${hint}` : title}
			style={({ pressed }) => [
				styles.tile,
				isPrimary && styles.tilePrimary,
				isReferee && styles.tileReferee,
				pressed && (isPrimary ? styles.tilePrimaryPressed : styles.tilePressed),
			]}
			onPress={onPress}
		>
			<View style={[styles.tileIcon, isPrimary && styles.tileIconPrimary]}>
				<Ionicons
					name={icon}
					size={scaleSize(22)}
					color={isPrimary ? colors.onAccent : colors.accent}
				/>
			</View>
			<View style={styles.tileText}>
				<Text style={[styles.tileTitle, isPrimary && styles.tileTitlePrimary]}>
					{title}
				</Text>
				{hint ? (
					<Text style={[styles.tileHint, isPrimary && styles.tileHintPrimary]}>
						{hint}
					</Text>
				) : null}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	tile: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
		paddingVertical: 14,
		paddingHorizontal: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		borderRadius: 10,
		gap: 12,
	},
	tilePrimary: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	tileReferee: {
		borderColor: colors.accentBorder,
	},
	tilePressed: {
		backgroundColor: colors.bgElevatedHover,
	},
	tilePrimaryPressed: {
		backgroundColor: colors.accentHover,
		borderColor: colors.accentHover,
	},
	tileIcon: {
		width: 40,
		height: 40,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
	},
	tileIconPrimary: {
		backgroundColor: colors.accentSoftStrong,
	},
	tileText: {
		flex: 1,
	},
	tileTitle: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
	tileTitlePrimary: {
		color: colors.onAccent,
	},
	tileHint: {
		marginTop: 3,
		fontSize: 13,
		color: colors.textMuted,
	},
	tileHintPrimary: {
		color: colors.onAccentHint,
	},
});

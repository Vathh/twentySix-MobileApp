import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Kafelek siatki 2×2 na hubie Trening.
 */
export default function TrainingGridTile({ icon, title, hint, onPress }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={hint ? `${title}. ${hint}` : title}
			onPress={onPress}
			style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
		>
			<View style={styles.iconWrap}>
				<Ionicons name={icon} size={scaleSize(22)} color={colors.accent} />
			</View>
			<Text style={styles.title} numberOfLines={2}>{title}</Text>
			{hint ? <Text style={styles.hint} numberOfLines={2}>{hint}</Text> : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	tile: {
		flex: 1,
		minHeight: 118,
		padding: 14,
		borderRadius: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
	},
	tilePressed: {
		backgroundColor: colors.bgElevatedHover,
		borderColor: colors.accentBorder,
	},
	iconWrap: {
		width: 40,
		height: 40,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
		marginBottom: 12,
	},
	title: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
		lineHeight: 20,
	},
	hint: {
		marginTop: 4,
		color: colors.textMuted,
		fontSize: 12,
		lineHeight: 16,
	},
});

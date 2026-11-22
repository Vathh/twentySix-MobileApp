import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Duży CTA startu treningu na hubie.
 */
export default function TrainingHeroCta({ title, subtitle, onPress }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
			onPress={onPress}
			style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
		>
			<View style={styles.iconWrap}>
				<Ionicons name="play" size={scaleSize(26)} color={colors.accent} />
			</View>
			<View style={styles.copy}>
				<Text style={styles.title}>{title}</Text>
				{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
			</View>
			<Ionicons name="chevron-forward" size={scaleSize(20)} color={colors.onAccentHint} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	cta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		paddingVertical: 18,
		paddingHorizontal: 16,
		borderRadius: 16,
		backgroundColor: colors.accent,
		marginBottom: 20,
	},
	ctaPressed: {
		backgroundColor: colors.accentHover,
	},
	iconWrap: {
		width: 48,
		height: 48,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.onAccent,
	},
	copy: {
		flex: 1,
	},
	title: {
		color: colors.onAccent,
		fontSize: 18,
		fontWeight: '800',
		letterSpacing: -0.2,
	},
	subtitle: {
		marginTop: 3,
		color: colors.onAccentHint,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
	},
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Pusty stan listy treningowej — ikona, tekst, opcjonalne CTA.
 */
export default function TrainingEmptyState({
	icon = 'fitness-outline',
	title,
	body,
	actionLabel,
	onAction,
	style,
}) {
	return (
		<View style={[styles.wrap, style]}>
			<View style={styles.iconWrap}>
				<Ionicons name={icon} size={scaleSize(28)} color={colors.accent} />
			</View>
			{title ? <Text style={styles.title}>{title}</Text> : null}
			{body ? <Text style={styles.body}>{body}</Text> : null}
			{actionLabel && onAction ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={actionLabel}
					onPress={onAction}
					style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
				>
					<Text style={styles.actionText}>{actionLabel}</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		alignItems: 'center',
		paddingVertical: 28,
		paddingHorizontal: 16,
	},
	iconWrap: {
		width: 56,
		height: 56,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
		borderWidth: 1,
		borderColor: colors.accentBorder,
		marginBottom: 14,
	},
	title: {
		color: colors.text,
		fontSize: 17,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 6,
	},
	body: {
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 21,
		textAlign: 'center',
		maxWidth: 320,
	},
	action: {
		marginTop: 16,
		minHeight: 42,
		paddingHorizontal: 18,
		borderRadius: 10,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionPressed: {
		backgroundColor: colors.accentHover,
	},
	actionText: {
		color: colors.onAccent,
		fontSize: 14,
		fontWeight: '700',
	},
});

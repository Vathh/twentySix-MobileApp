import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const LABELS = {
	plan: 'Plan',
	exercise: 'Ćwiczenie',
	challenge: 'Wyzwanie',
	event: 'Event',
};

/**
 * Mały chip rodzaju treści treningowej.
 */
export default function TrainingKindChip({ kind, style }) {
	const label = LABELS[kind];
	if (!label) {
		return null;
	}
	return (
		<View style={[styles.chip, style]}>
			<Text style={styles.text}>{label}</Text>
		</View>
	);
}

export function trainingKindLabel(kind) {
	return LABELS[kind] || '';
}

const styles = StyleSheet.create({
	chip: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		backgroundColor: colors.accentMuted,
		borderWidth: 1,
		borderColor: colors.accentBorder,
	},
	text: {
		color: colors.accent,
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.3,
		textTransform: 'uppercase',
	},
});

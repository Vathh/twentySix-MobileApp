import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const ROWS = [
	[1, 2, 3, 4, 5],
	[6, 7, 8, 9, 10],
	[11, 12, 13, 14, 15],
	[16, 17, 18, 19, 20],
];

const MODIFIERS = [
	['single', 'Single'],
	['double', 'Double'],
	['triple', 'Triple'],
];

export default function TrainingDartPad({
	modifier,
	disabled,
	undoDisabled,
	onModifier,
	onNumber,
	onBull,
	onUndo,
	onAbort,
}) {
	return (
		<View>
			<View style={styles.row}>
				{MODIFIERS.map(([value, label]) => {
					const selected = modifier === value;
					return (
						<Pressable
							key={value}
							accessibilityRole="button"
							accessibilityLabel={label}
							accessibilityState={{ selected, disabled }}
							disabled={disabled}
							onPress={() => onModifier(value)}
							style={[styles.choice, selected && styles.choiceSelected, disabled && styles.disabled]}
						>
							<Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
						</Pressable>
					);
				})}
			</View>
			{ROWS.map((row) => (
				<View key={row[0]} style={styles.row}>
					{row.map((number) => (
						<Pressable
							key={number}
							accessibilityRole="button"
							accessibilityLabel={String(number)}
							disabled={disabled}
							onPress={() => onNumber(number)}
							style={[styles.key, disabled && styles.disabled]}
						>
							<Text style={styles.keyText}>{number}</Text>
						</Pressable>
					))}
				</View>
			))}
			<View style={styles.row}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Outer"
					disabled={disabled}
					onPress={() => onBull('outer')}
					style={[styles.choice, disabled && styles.disabled]}
				>
					<Text style={styles.choiceText}>Outer</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Inner"
					disabled={disabled}
					onPress={() => onBull('inner')}
					style={[styles.choice, disabled && styles.disabled]}
				>
					<Text style={styles.choiceText}>Inner</Text>
				</Pressable>
			</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Cofnij"
				disabled={disabled || undoDisabled}
				onPress={onUndo}
				style={[styles.secondary, (disabled || undoDisabled) && styles.disabled]}
			>
				<Text style={styles.secondaryText}>Cofnij</Text>
			</Pressable>
			{onAbort ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Przerwij"
					disabled={disabled}
					onPress={onAbort}
					style={[styles.ghost, disabled && styles.disabled]}
				>
					<Text style={styles.ghostText}>Przerwij</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	key: {
		flex: 1,
		minHeight: 48,
		borderRadius: 12,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	keyText: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '700',
	},
	choice: {
		flex: 1,
		minHeight: 44,
		borderRadius: 12,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	choiceSelected: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	choiceText: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
	},
	choiceTextSelected: {
		color: colors.onAccent,
	},
	secondary: {
		minHeight: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	secondaryText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	ghost: {
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 12,
	},
	ghostText: {
		color: colors.textMuted,
		fontSize: 15,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.4,
	},
});

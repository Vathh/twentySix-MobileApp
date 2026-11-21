import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dartFromPad } from '../../helpers/training/checkoutBull81Exercise';
import { colors } from '../../theme/colors';
import CheckoutBull81Reel from './CheckoutBull81Reel';

const NUMBER_ROWS = [
	[20, 19, 18, 17, 16],
	[15, 14, 13, 12, 11],
	[10, 9, 8, 7, 6],
	[5, 4, 3, 2, 1],
];

export default function CheckoutBull81Board({
	view,
	disabled,
	undoDisabled,
	onDart,
	onUndo,
	onAbort,
}) {
	const [modifier, setModifier] = useState(null);

	const throwDart = (baseValue) => {
		const dart = dartFromPad(baseValue, modifier);
		if (!dart || disabled) {
			return;
		}
		setModifier(null);
		onDart(dart);
	};

	return (
		<View>
			<CheckoutBull81Reel checkout={view.checkout} />
			<Text
				style={styles.remaining}
				accessibilityRole="text"
				accessibilityLabel={`Licznik ${view.remaining}`}
			>
				{view.remaining}
			</Text>
			<Text
				style={styles.thrown}
				accessibilityElementsHidden={view.openLabels.length === 0}
			>
				{view.openLabels.join('  ')}
			</Text>
			<Text style={styles.dart} accessibilityRole="text">{`Lotka nr ${view.dartsInVisit + 1}`}</Text>
			<DartPad
				modifier={modifier}
				disabled={disabled}
				onModifier={setModifier}
				onDart={throwDart}
				onUndo={onUndo}
				undoDisabled={undoDisabled || disabled}
			/>
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

function DartPad({ modifier, disabled, onModifier, onDart, onUndo, undoDisabled }) {
	const mod = (value, label) => {
		const selected = modifier === value;
		return (
			<Pressable
				key={value}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ selected, disabled }}
				disabled={disabled}
				onPress={() => onModifier(selected ? null : value)}
				style={[styles.mod, selected && styles.modOn, disabled && styles.disabled]}
			>
				<Text style={[styles.modText, selected && styles.modTextOn]}>{label}</Text>
			</Pressable>
		);
	};

	return (
		<View>
			<View style={styles.row}>
				{mod('double', 'D')}
				{mod('triple', 'T')}
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="0"
					disabled={disabled}
					onPress={() => onDart(0)}
					style={[styles.key, disabled && styles.disabled]}
				>
					<Text style={styles.keyText}>0</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="25"
					disabled={disabled || modifier === 'triple'}
					onPress={() => onDart(25)}
					style={[styles.key, (disabled || modifier === 'triple') && styles.disabled]}
				>
					<Text style={styles.keyText}>25</Text>
				</Pressable>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Cofnij"
					disabled={undoDisabled}
					onPress={onUndo}
					style={[styles.key, undoDisabled && styles.disabled]}
				>
					<Text style={styles.keyText}>Cofnij</Text>
				</Pressable>
			</View>
			{NUMBER_ROWS.map((row) => (
				<View key={row[0]} style={styles.row}>
					{row.map((number) => (
						<Pressable
							key={number}
							accessibilityRole="button"
							accessibilityLabel={String(number)}
							disabled={disabled}
							onPress={() => onDart(number)}
							style={[styles.key, disabled && styles.disabled]}
						>
							<Text style={styles.keyText}>{number}</Text>
						</Pressable>
					))}
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	remaining: {
		textAlign: 'center',
		marginTop: 2,
		color: colors.text,
		fontSize: 56,
		lineHeight: 64,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	thrown: {
		textAlign: 'center',
		marginTop: 4,
		height: 22,
		lineHeight: 22,
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '700',
	},
	dart: {
		textAlign: 'center',
		marginTop: 12,
		marginBottom: 12,
		color: colors.text,
		fontSize: 20,
		fontWeight: '700',
	},
	row: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	key: {
		flex: 1,
		minHeight: 48,
		borderRadius: 10,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
	},
	keyText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	mod: {
		flex: 1,
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modOn: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	modText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	modTextOn: {
		color: colors.onAccent,
	},
	ghost: {
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.textMuted,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 12,
	},
	ghostText: {
		color: colors.textMuted,
		fontSize: 16,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.4,
	},
});

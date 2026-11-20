import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canFinishWithCheck } from '../../helpers/gameScoring/checkoutCheck';
import {
	INPUT_PER_DART,
	dartFromPad,
	interpretCatch20Sum,
} from '../../helpers/training/catch20Exercise';
import { colors } from '../../theme/colors';

const NUMBER_ROWS = [
	[20, 19, 18, 17, 16],
	[15, 14, 13, 12, 11],
	[10, 9, 8, 7, 6],
	[5, 4, 3, 2, 1],
];

export default function Catch20Board({
	view,
	inputMode,
	disabled,
	undoDisabled,
	onDart,
	onSum,
	onUndo,
	onAbort,
}) {
	const [modifier, setModifier] = useState(null);
	const [typed, setTyped] = useState('');
	const [pending, setPending] = useState(null);
	const perDart = inputMode === INPUT_PER_DART;
	const blocked = disabled || pending != null;

	const throwDart = (baseValue) => {
		const dart = dartFromPad(baseValue, modifier);
		if (!dart || blocked) {
			return;
		}
		setModifier(null);
		onDart(dart);
	};

	const submitSum = (points) => {
		const kind = interpretCatch20Sum(view.remaining, points);
		if (kind == null || disabled) {
			return;
		}
		if (kind === 'confirm') {
			setPending(points);
			return;
		}
		setTyped('');
		onSum(points, false);
	};

	const confirmClose = () => {
		const points = pending;
		setPending(null);
		setTyped('');
		onSum(points, true);
	};

	return (
		<View>
			<Text style={styles.checkout} accessibilityRole="text">{`Checkout ${view.checkout}`}</Text>
			<Text
				style={styles.remaining}
				accessibilityRole="text"
				accessibilityLabel={`Licznik ${view.remaining}`}
			>
				{view.remaining}
			</Text>
			{perDart ? (
				<Text
					style={styles.thrown}
					accessibilityElementsHidden={view.openLabels.length === 0}
				>
					{view.openLabels.join('  ')}
				</Text>
			) : null}
			<Text style={styles.visit} accessibilityRole="text">{`Wizyta ${view.visit}`}</Text>
			{perDart ? (
				<Text style={styles.dart} accessibilityRole="text">{`Lotka nr ${view.dartsInVisit + 1}`}</Text>
			) : null}
			{pending != null ? (
				<View style={styles.confirm}>
					<Text style={styles.confirmText}>Suma schodzi do zera. Zamknąć checkout?</Text>
					<View style={styles.confirmRow}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Anuluj"
							onPress={() => setPending(null)}
							style={styles.secondary}
						>
							<Text style={styles.secondaryText}>Anuluj</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Zamknij"
							onPress={confirmClose}
							style={styles.primary}
						>
							<Text style={styles.primaryText}>Zamknij</Text>
						</Pressable>
					</View>
				</View>
			) : null}
			{perDart ? (
				<DartPad
					modifier={modifier}
					disabled={blocked}
					onModifier={setModifier}
					onDart={throwDart}
					onUndo={onUndo}
					undoDisabled={undoDisabled || blocked}
				/>
			) : (
				<SumPad
					typed={typed}
					disabled={blocked}
					checkEnabled={!blocked && canFinishWithCheck(view.remaining)}
					onType={setTyped}
					onOk={() => {
						if (typed === '') {
							return;
						}
						submitSum(Number(typed));
					}}
					onCheck={() => submitSum(view.remaining)}
					onLeave={() => {
						if (typed === '') {
							return;
						}
						submitSum(view.remaining - Number(typed));
					}}
					onUndo={onUndo}
					undoDisabled={undoDisabled || blocked}
				/>
			)}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Przerwij"
				disabled={disabled}
				onPress={onAbort}
				style={[styles.ghost, disabled && styles.disabled]}
			>
				<Text style={styles.ghostText}>Przerwij</Text>
			</Pressable>
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

function SumPad({
	typed,
	disabled,
	checkEnabled,
	onType,
	onOk,
	onCheck,
	onLeave,
	onUndo,
	undoDisabled,
}) {
	const push = (digit) => {
		if (disabled) {
			return;
		}
		const next = `${typed}${digit}`.replace(/^0+(?=\d)/, '');
		if (Number(next) > 180) {
			return;
		}
		onType(next);
	};

	const key = (label, onPress, enabled = !disabled) => (
		<Pressable
			key={label}
			accessibilityRole="button"
			accessibilityLabel={label}
			disabled={!enabled}
			onPress={onPress}
			style={[styles.key, !enabled && styles.disabled]}
		>
			<Text style={styles.keyText}>{label}</Text>
		</Pressable>
	);

	return (
		<View>
			<Text style={styles.typed} accessibilityRole="text">
				{typed === '' ? 'Wprowadź wynik' : typed}
			</Text>
			{[
				['1', '2', '3'],
				['4', '5', '6'],
				['7', '8', '9'],
			].map((row) => (
				<View key={row[0]} style={styles.row}>
					{row.map((digit) => key(digit, () => push(digit)))}
				</View>
			))}
			<View style={styles.row}>
				{key('C', () => onType(''))}
				{key('0', () => push('0'))}
				{key('OK', onOk)}
			</View>
			<View style={styles.row}>
				{key('Zostało', onLeave)}
				{key('Check', onCheck, checkEnabled)}
			</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Cofnij"
				disabled={undoDisabled}
				onPress={onUndo}
				style={[styles.undo, undoDisabled && styles.disabled]}
			>
				<Text style={styles.secondaryText}>Cofnij</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	checkout: {
		textAlign: 'center',
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
	},
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
	visit: {
		textAlign: 'center',
		marginTop: 12,
		marginBottom: 4,
		color: colors.text,
		fontSize: 20,
		fontWeight: '700',
	},
	dart: {
		textAlign: 'center',
		marginBottom: 12,
		color: colors.text,
		fontSize: 20,
		fontWeight: '700',
	},
	typed: {
		textAlign: 'center',
		minHeight: 28,
		marginBottom: 12,
		color: colors.text,
		fontSize: 22,
		fontWeight: '700',
	},
	confirm: {
		marginBottom: 12,
		padding: 12,
		borderRadius: 12,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.accentBorder,
	},
	confirmText: {
		color: colors.text,
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 12,
	},
	confirmRow: {
		flexDirection: 'row',
		gap: 8,
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
	primary: {
		flex: 1,
		minHeight: 48,
		borderRadius: 10,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryText: {
		color: colors.onAccent,
		fontSize: 16,
		fontWeight: '700',
	},
	secondary: {
		flex: 1,
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	undo: {
		minHeight: 48,
		borderRadius: 10,
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
		minHeight: 48,
		alignItems: 'center',
		justifyContent: 'center',
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

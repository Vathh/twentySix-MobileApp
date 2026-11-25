import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TrainingPressable from './TrainingPressable';
import { dartFromPad } from '../../helpers/training/catch20Exercise';
import { INPUT_PER_DART, MAX_SUM } from '../../helpers/training/scoring65Exercise';
import { colors } from '../../theme/colors';
import TickingScore from '../Game/TickingScore';

const SETTLE_HOLD_MS = 320;

const NUMBER_ROWS = [
	[20, 19, 18, 17, 16],
	[15, 14, 13, 12, 11],
	[10, 9, 8, 7, 6],
	[5, 4, 3, 2, 1],
];

export default function Scoring65Board({
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
	const [tickValue, setTickValue] = useState(0);
	const perDart = inputMode === INPUT_PER_DART;

	useEffect(() => {
		if (!perDart) {
			setTickValue(0);
			return undefined;
		}
		if (view.settled) {
			setTickValue(view.running);
			const timer = setTimeout(() => setTickValue(0), SETTLE_HOLD_MS);
			return () => clearTimeout(timer);
		}
		setTickValue(view.running);
		return undefined;
	}, [perDart, view.running, view.settled, view.approaches]);

	const throwDart = (baseValue) => {
		const dart = dartFromPad(baseValue, modifier);
		if (!dart || disabled) {
			return;
		}
		setModifier(null);
		onDart(dart);
	};

	const submitSum = () => {
		if (typed === '' || disabled) {
			return;
		}
		const points = Number(typed);
		if (!Number.isInteger(points) || points < 0 || points > MAX_SUM) {
			return;
		}
		setTyped('');
		onSum(points);
	};

	return (
		<View>
			<View
				accessibilityRole="text"
				accessibilityLabel={`Punkty ${view.points}`}
				style={styles.points}
			>
				<Text style={styles.pointsCaption}>Punkty</Text>
				<TickingScore value={view.points} animateUp style={styles.pointsValue} />
			</View>
			<Text style={styles.instruction} accessibilityRole="text">
				Zdobądź jak najwięcej punktów w trzech lotkach. Wynik 65+ daje punkt do ćwiczenia.
			</Text>
			{perDart ? (
				<View>
					<TickingScore
						value={tickValue}
						animateUp
						style={styles.running}
						accessibilityRole="text"
						accessibilityLabel={`Suma ${view.running}`}
					/>
					<Text style={styles.thrown}>
						{view.openLabels.join('  ')}
					</Text>
					<DartPad
						modifier={modifier}
						disabled={disabled}
						undoDisabled={undoDisabled || disabled}
						onModifier={setModifier}
						onDart={throwDart}
						onUndo={onUndo}
					/>
				</View>
			) : (
				<SumPad
					typed={typed}
					disabled={disabled}
					onType={setTyped}
					onOk={submitSum}
					onUndo={onUndo}
					undoDisabled={undoDisabled || disabled}
				/>
			)}
			{onAbort ? (
				<TrainingPressable
					accessibilityRole="button"
					accessibilityLabel="Przerwij"
					disabled={disabled}
					onPress={onAbort}
					style={[styles.ghost, disabled && styles.disabled]}
				>
					<Text style={styles.ghostText}>Przerwij</Text>
				</TrainingPressable>
			) : null}
		</View>
	);
}

function DartPad({ modifier, disabled, undoDisabled, onModifier, onDart, onUndo }) {
	const mod = (value, label) => {
		const selected = modifier === value;
		return (
			<TrainingPressable
				key={value}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ selected, disabled }}
				disabled={disabled}
				onPress={() => onModifier(selected ? null : value)}
				style={[styles.mod, selected && styles.modOn, disabled && styles.disabled]}
			>
				<Text style={[styles.modText, selected && styles.modTextOn]}>{label}</Text>
			</TrainingPressable>
		);
	};

	return (
		<View>
			<View style={styles.row}>
				{mod('double', 'D')}
				{mod('triple', 'T')}
				<TrainingPressable
					accessibilityRole="button"
					accessibilityLabel="0"
					disabled={disabled}
					onPress={() => onDart(0)}
					style={[styles.key, disabled && styles.disabled]}
				>
					<Text style={styles.keyText}>0</Text>
				</TrainingPressable>
				<TrainingPressable
					accessibilityRole="button"
					accessibilityLabel="25"
					disabled={disabled || modifier === 'triple'}
					onPress={() => onDart(25)}
					style={[styles.key, (disabled || modifier === 'triple') && styles.disabled]}
				>
					<Text style={styles.keyText}>25</Text>
				</TrainingPressable>
				<TrainingPressable
					accessibilityRole="button"
					accessibilityLabel="Cofnij"
					disabled={undoDisabled}
					onPress={onUndo}
					style={[styles.key, undoDisabled && styles.disabled]}
				>
					<Text style={styles.keyText}>Cofnij</Text>
				</TrainingPressable>
			</View>
			{NUMBER_ROWS.map((row) => (
				<View key={row[0]} style={styles.row}>
					{row.map((number) => (
						<TrainingPressable
							key={number}
							accessibilityRole="button"
							accessibilityLabel={String(number)}
							disabled={disabled}
							onPress={() => onDart(number)}
							style={[styles.key, disabled && styles.disabled]}
						>
							<Text style={styles.keyText}>{number}</Text>
						</TrainingPressable>
					))}
				</View>
			))}
		</View>
	);
}

function SumPad({ typed, disabled, onType, onOk, onUndo, undoDisabled }) {
	const push = (digit) => {
		if (disabled) {
			return;
		}
		const next = `${typed}${digit}`.replace(/^0+(?=\d)/, '');
		if (Number(next) > MAX_SUM) {
			return;
		}
		onType(next);
	};

	const key = (label, onPress, enabled = !disabled, accent = false) => (
		<TrainingPressable
			key={label}
			accessibilityRole="button"
			accessibilityLabel={label}
			disabled={!enabled}
			onPress={onPress}
			style={[styles.key, accent && styles.okKey, !enabled && styles.disabled]}
		>
			<Text style={styles.keyText}>{label}</Text>
		</TrainingPressable>
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
				{key('OK', onOk, !disabled, true)}
			</View>
			<TrainingPressable
				accessibilityRole="button"
				accessibilityLabel="Cofnij"
				disabled={undoDisabled}
				onPress={onUndo}
				style={[styles.undo, undoDisabled && styles.disabled]}
			>
				<Text style={styles.secondaryText}>Cofnij</Text>
			</TrainingPressable>
		</View>
	);
}

const styles = StyleSheet.create({
	points: {
		alignItems: 'center',
		marginBottom: 8,
	},
	pointsCaption: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
	},
	pointsValue: {
		marginTop: 2,
		color: colors.text,
		fontSize: 40,
		lineHeight: 46,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	instruction: {
		textAlign: 'center',
		color: colors.textSecondary,
		fontSize: 22,
		lineHeight: 30,
		fontWeight: '600',
		marginBottom: 16,
	},
	running: {
		textAlign: 'center',
		color: colors.text,
		fontSize: 56,
		lineHeight: 64,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	thrown: {
		textAlign: 'center',
		marginTop: 4,
		marginBottom: 12,
		height: 22,
		lineHeight: 22,
		color: colors.textSecondary,
		fontSize: 16,
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
	okKey: {
		borderColor: colors.accent,
		borderWidth: 2,
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

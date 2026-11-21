import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { scoringPressureInstruction } from '../../helpers/training/scoringUnderPressureExercise';
import { colors } from '../../theme/colors';

const RINGS = [
	['triple', 'Triple'],
	['double', 'Double'],
	['single', 'Single'],
];

const ROTATION = [20, 19, 18];

function OutcomeButton({ label, accessibilityLabel, disabled, ring, onPress }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel || label}
			disabled={disabled}
			onPress={onPress}
			style={[styles.outcome, styles[ring], disabled && styles.disabled]}
		>
			<Text style={[styles.outcomeText, styles[`${ring}Text`]]}>{label}</Text>
		</Pressable>
	);
}

function MissButton({ disabled, onPress }) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel="Pudło"
			disabled={disabled}
			onPress={onPress}
			style={[styles.miss, disabled && styles.disabled]}
		>
			<Text style={styles.missText}>Pudło</Text>
		</Pressable>
	);
}

export default function ScoringPressureBoard({
	variant,
	aimNumber,
	dartNumber,
	disabled,
	undoDisabled,
	onDart,
	onUndo,
	onAbort,
}) {
	const rotation = variant === '20/19/18';
	const throwRing = (ring, number) => {
		onDart(number == null ? { ring } : { ring, number });
	};

	return (
		<View>
			<Text style={styles.instruction}>
				{scoringPressureInstruction(variant).map((part, index) => (
					<Text key={index} style={part.strong ? styles.instructionStrong : null}>
						{part.text}
					</Text>
				))}
			</Text>
			<Text style={styles.dartLabel} accessibilityRole="text">{`Lotka nr ${dartNumber}`}</Text>
			{rotation ? (
				<View>
					{ROTATION.map((number) => {
						const active = aimNumber === number;
						return (
							<View
								key={number}
								accessibilityRole="text"
								accessibilityLabel={`Sektor ${number}`}
								accessibilityState={{ selected: active }}
								style={[styles.rotationRow, active && styles.rotationRowActive]}
							>
								<Text style={[styles.rotationNumber, active && styles.rotationNumberActive]}>
									{number}
								</Text>
								{RINGS.map(([ring, label]) => (
									<OutcomeButton
										key={ring}
										label={label}
										accessibilityLabel={`${label} ${number}`}
										ring={ring}
										disabled={disabled}
										onPress={() => throwRing(ring, number)}
									/>
								))}
							</View>
						);
					})}
					<MissButton disabled={disabled} onPress={() => throwRing('miss')} />
				</View>
			) : (
				<View>
					<View style={styles.row}>
						{RINGS.map(([ring, label]) => (
							<OutcomeButton
								key={ring}
								label={label}
								ring={ring}
								disabled={disabled}
								onPress={() => throwRing(ring)}
							/>
						))}
					</View>
					<MissButton disabled={disabled} onPress={() => throwRing('miss')} />
				</View>
			)}
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
					style={styles.ghost}
				>
					<Text style={styles.ghostText}>Przerwij</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	instruction: {
		textAlign: 'center',
		color: colors.textSecondary,
		fontSize: 28,
		lineHeight: 36,
		fontWeight: '600',
		marginBottom: 12,
	},
	instructionStrong: {
		color: colors.text,
		fontWeight: '800',
	},
	dartLabel: {
		textAlign: 'center',
		color: colors.text,
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '700',
		marginBottom: 20,
	},
	row: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	outcome: {
		flex: 1,
		minHeight: 72,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
	},
	triple: {
		backgroundColor: colors.danger,
	},
	tripleText: {
		color: colors.text,
	},
	double: {
		backgroundColor: colors.accent,
	},
	doubleText: {
		color: colors.onAccent,
	},
	single: {
		backgroundColor: colors.info,
	},
	singleText: {
		color: colors.onLight,
	},
	outcomeText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
		textAlign: 'center',
	},
	miss: {
		minHeight: 72,
		borderRadius: 12,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
		marginBottom: 20,
	},
	missText: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '700',
	},
	rotationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
		padding: 6,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	rotationRowActive: {
		borderColor: colors.accent,
		backgroundColor: colors.accentMuted,
	},
	rotationNumber: {
		width: 36,
		color: colors.textMuted,
		fontSize: 20,
		fontWeight: '700',
		textAlign: 'center',
	},
	rotationNumberActive: {
		color: colors.accent,
	},
	secondary: {
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	secondaryText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	ghost: {
		minHeight: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.textMuted,
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

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TrainingPressable from './TrainingPressable';
import {
	aimInstruction,
	nineDartsReelTargets,
	nineDartsReelWindow,
} from '../../helpers/training/nineDartsExercise';
import { colors } from '../../theme/colors';
import SectorTargetReel from './SectorTargetReel';

const RINGS = [
	['triple', 'Triple'],
	['double', 'Double'],
	['single', 'Single'],
];

function OutcomeButton({ label, accessibilityLabel, disabled, ring, onPress }) {
	return (
		<TrainingPressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel || label}
			disabled={disabled}
			onPress={onPress}
			style={[styles.outcome, styles[ring], disabled && styles.disabled]}
		>
			<Text style={[styles.outcomeText, styles[`${ring}Text`]]}>{label}</Text>
		</TrainingPressable>
	);
}

function MissButton({ disabled, onPress, fill }) {
	return (
		<TrainingPressable
			accessibilityRole="button"
			accessibilityLabel="Pudło"
			disabled={disabled}
			onPress={onPress}
			style={[styles.miss, fill && styles.missFill, disabled && styles.disabled]}
		>
			<Text style={styles.missText}>Pudło</Text>
		</TrainingPressable>
	);
}

export default function NineDartsBoard({
	aim,
	dartNumber,
	disabled,
	undoDisabled,
	onDart,
	onUndo,
}) {
	const stage = aim?.stage ?? 0;
	const throwRing = (ring, number) => {
		onDart(number == null ? { ring } : { ring, number });
	};
	const reelTargets = nineDartsReelTargets();
	const reelWindow = nineDartsReelWindow(aim);

	return (
		<View>
			{reelWindow ? (
				<SectorTargetReel
					targets={reelTargets}
					windowStart={reelWindow.windowStart}
					activeOffset={reelWindow.activeOffset}
				/>
			) : null}
			<Text style={styles.instruction}>
				{aimInstruction(aim).map((part, index) => (
					<Text key={index} style={part.strong ? styles.instructionStrong : null}>
						{part.text}
					</Text>
				))}
			</Text>
			<Text style={styles.dartLabel} accessibilityRole="text">{`Lotka nr ${dartNumber}`}</Text>
			{stage === 0 ? (
				<View style={[styles.row, styles.bullRow]}>
					<OutcomeButton
						label="Czerwony środek"
						ring="inner"
						disabled={disabled}
						onPress={() => throwRing('inner')}
					/>
					<OutcomeButton
						label="Zielony środek"
						ring="outer"
						disabled={disabled}
						onPress={() => throwRing('outer')}
					/>
					<View style={styles.missSlot}>
						<MissButton fill disabled={disabled} onPress={() => throwRing('miss')} />
					</View>
				</View>
			) : null}
			{stage === 1 || stage === 2 || stage === 3 ? (
				<View>
					<View style={styles.row}>
						{RINGS.map(([ring, label]) => (
							<OutcomeButton
								key={ring}
								label={label}
								accessibilityLabel={aim?.number != null ? `${label} ${aim.number}` : label}
								ring={ring}
								disabled={disabled}
								onPress={() => throwRing(ring, aim?.number)}
							/>
						))}
					</View>
					<MissButton disabled={disabled} onPress={() => throwRing('miss')} />
				</View>
			) : null}
			<TrainingPressable
				accessibilityRole="button"
				accessibilityLabel="Cofnij"
				disabled={disabled || undoDisabled}
				onPress={onUndo}
				style={[styles.secondary, (disabled || undoDisabled) && styles.disabled]}
			>
				<Text style={styles.secondaryText}>Cofnij</Text>
			</TrainingPressable>
		</View>
	);
}

const styles = StyleSheet.create({
	instruction: {
		textAlign: 'center',
		color: colors.textSecondary,
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '600',
		letterSpacing: -0.2,
		marginBottom: 10,
	},
	instructionStrong: {
		color: colors.text,
		fontWeight: '800',
	},
	dartLabel: {
		textAlign: 'center',
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		marginBottom: 18,
	},
	row: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
	},
	bullRow: {
		marginBottom: 20,
	},
	outcome: {
		flex: 1,
		minHeight: 72,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 4,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
	},
	inner: {
		backgroundColor: colors.bgElevated,
		borderColor: colors.accentBorder,
	},
	innerText: {
		color: colors.text,
		fontSize: 13,
	},
	outer: {
		backgroundColor: colors.accentMuted,
		borderColor: colors.accentBorder,
	},
	outerText: {
		color: colors.accent,
		fontSize: 13,
	},
	triple: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	tripleText: {
		color: colors.onAccent,
	},
	double: {
		backgroundColor: colors.accentMuted,
		borderColor: colors.accentBorder,
	},
	doubleText: {
		color: colors.accent,
	},
	single: {
		backgroundColor: colors.bgElevated,
		borderColor: colors.borderStrong,
	},
	singleText: {
		color: colors.text,
	},
	outcomeText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '800',
		textAlign: 'center',
	},
	missSlot: {
		flex: 1,
	},
	miss: {
		minHeight: 72,
		borderRadius: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
		marginBottom: 20,
	},
	missFill: {
		flex: 1,
		marginBottom: 0,
	},
	missText: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '800',
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
	disabled: {
		opacity: 0.4,
	},
});

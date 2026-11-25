import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TrainingPressable from './TrainingPressable';
import { playFailShort, playSuccessShort } from '../../helpers/gameSounds/playGameSound';
import { BULL_INNER_LABEL } from '../../helpers/training/bullLabels';
import { colors } from '../../theme/colors';
import { dartIndexReelWindow, targetIndexReelWindow } from '../../helpers/training/targetReelWindow';
import SectorTargetReel from './SectorTargetReel';

const SHANGHAI_RINGS = [
	['triple', 'Triple'],
	['double', 'Double'],
	['single', 'Single'],
];

/**
 * Pad do Shanghai / Doubles (ćwiczenia z biblioteki) + karuzela celów.
 */
export default function ShanghaiDoublesBoard({
	target,
	targets = [],
	dartIndex = 0,
	disabled = false,
	undoDisabled = false,
	onDart,
	onUndo,
}) {
	if (!target) {
		return null;
	}

	const list = Array.isArray(targets) ? targets : [];
	const visitSize = Math.max(1, Number(target.visitSize) || 3);
	const reelWindow = target.stageType === 'shanghai'
		? targetIndexReelWindow(Math.floor(dartIndex / visitSize), list.length)
		: dartIndexReelWindow(dartIndex, list.length);

	return (
		<View style={styles.wrap}>
			{reelWindow ? (
				<SectorTargetReel
					targets={list}
					windowStart={reelWindow.windowStart}
					activeOffset={reelWindow.activeOffset}
					formatLabel={(value) => (value === 'Bull' ? BULL_INNER_LABEL : String(value))}
				/>
			) : null}
			<Text style={styles.dartCounter}>
				Lotka {target.dartNumber} z {visitSize}
			</Text>
			{target.stageType === 'shanghai' ? (
				<View style={styles.column}>
					<View style={styles.row}>
						{SHANGHAI_RINGS.map(([ring, label]) => (
							<TrainingPressable
								key={ring}
								accessibilityRole="button"
								accessibilityLabel={label}
								disabled={disabled}
								style={[styles.outcome, styles[ring], disabled && styles.disabled]}
								onPress={() => onDart?.(ring)}
							>
								<Text style={[styles.outcomeText, styles[`${ring}Text`]]}>{label}</Text>
							</TrainingPressable>
						))}
					</View>
					<TrainingPressable
						accessibilityRole="button"
						accessibilityLabel="Pudło"
						disabled={disabled}
						style={[styles.miss, disabled && styles.disabled]}
						onPress={() => onDart?.('miss')}
					>
						<Text style={styles.missText}>Pudło</Text>
					</TrainingPressable>
				</View>
			) : (
				<View style={styles.outcomeRow}>
					<TrainingPressable
						accessibilityRole="button"
						accessibilityLabel="Pudło"
						disabled={disabled}
						style={[styles.action, styles.missHalf, styles.half, disabled && styles.disabled]}
						onPress={() => {
							playFailShort();
							onDart?.('miss');
						}}
					>
						<Text style={styles.missText}>Pudło</Text>
					</TrainingPressable>
					<TrainingPressable
						accessibilityRole="button"
						accessibilityLabel="Trafiona"
						disabled={disabled}
						style={[styles.action, styles.hit, styles.half, disabled && styles.disabled]}
						onPress={() => {
							playSuccessShort();
							onDart?.(target.isBull ? 'inner' : 'double');
						}}
					>
						<Text style={styles.hitText}>Trafiona</Text>
					</TrainingPressable>
				</View>
			)}
			<TrainingPressable
				accessibilityRole="button"
				accessibilityLabel="Cofnij"
				disabled={disabled || undoDisabled}
				style={[styles.tool, (disabled || undoDisabled) && styles.disabled]}
				onPress={onUndo}
			>
				<Text style={styles.toolText}>Cofnij</Text>
			</TrainingPressable>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
		alignSelf: 'stretch',
	},
	dartCounter: {
		marginTop: 0,
		marginBottom: 18,
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.4,
		textAlign: 'center',
	},
	column: {
		width: '100%',
	},
	row: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 8,
		width: '100%',
	},
	outcomeRow: {
		flexDirection: 'row',
		gap: 10,
		width: '100%',
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
	action: {
		minHeight: 56,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	half: {
		flex: 1,
	},
	hit: {
		backgroundColor: colors.accent,
		borderWidth: 1.5,
		borderColor: colors.accent,
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
		marginBottom: 4,
	},
	missHalf: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
	},
	hitText: {
		color: colors.onAccent,
		fontSize: 18,
		fontWeight: '800',
	},
	missText: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '800',
	},
	tool: {
		marginTop: 16,
		minHeight: 48,
		alignSelf: 'stretch',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
	toolText: {
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.45,
	},
});

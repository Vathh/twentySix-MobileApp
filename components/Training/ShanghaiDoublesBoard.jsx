import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { shanghaiDoublesAimText } from '../../helpers/training/shanghaiDoublesExercises';
import TrainingPlayScore from './TrainingPlayScore';

/**
 * Pad do Shanghai / Doubles (ćwiczenia z biblioteki).
 */
export default function ShanghaiDoublesBoard({
	target,
	disabled = false,
	undoDisabled = false,
	onDart,
	onUndo,
}) {
	if (!target) {
		return null;
	}

	return (
		<View style={styles.wrap}>
			<Text style={styles.aim}>{shanghaiDoublesAimText(target)}</Text>
			<TrainingPlayScore
				label="Cel"
				value={target.targetLabel}
				size="large"
				accessibilityLabel={target.targetLabel}
			/>
			<Text style={styles.dartCounter}>
				Lotka {target.dartNumber} z {target.visitSize}
			</Text>
			{target.stageType === 'shanghai' ? (
				<View style={styles.grid}>
					{[
						['single', 'Single'],
						['double', 'Double'],
						['triple', 'Triple'],
						['miss', 'Pudło'],
					].map(([ring, label]) => (
						<Pressable
							key={ring}
							accessibilityRole="button"
							accessibilityLabel={label}
							disabled={disabled}
							style={[
								styles.action,
								ring === 'miss' ? styles.miss : styles.hit,
								disabled && styles.disabled,
							]}
							onPress={() => onDart?.(ring)}
						>
							<Text style={ring === 'miss' ? styles.missText : styles.hitText}>{label}</Text>
						</Pressable>
					))}
				</View>
			) : (
				<View style={styles.outcomeRow}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Pudło"
						disabled={disabled}
						style={[styles.action, styles.miss, styles.half, disabled && styles.disabled]}
						onPress={() => onDart?.('miss')}
					>
						<Text style={styles.missText}>Pudło</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={target.isBull ? 'Inner bull' : 'Trafiona'}
						disabled={disabled}
						style={[styles.action, styles.hit, styles.half, disabled && styles.disabled]}
						onPress={() => onDart?.(target.isBull ? 'inner' : 'double')}
					>
						<Text style={styles.hitText}>{target.isBull ? 'Inner bull' : 'Trafiona'}</Text>
					</Pressable>
				</View>
			)}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Cofnij"
				disabled={disabled || undoDisabled}
				style={[styles.tool, (disabled || undoDisabled) && styles.disabled]}
				onPress={onUndo}
			>
				<Text style={styles.toolText}>Cofnij</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		width: '100%',
		alignItems: 'center',
	},
	aim: {
		textAlign: 'center',
		color: colors.text,
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		marginBottom: 12,
	},
	dartCounter: {
		marginTop: 8,
		marginBottom: 18,
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		justifyContent: 'center',
		width: '100%',
	},
	outcomeRow: {
		flexDirection: 'row',
		gap: 10,
		width: '100%',
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
		minWidth: '45%',
	},
	miss: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		minWidth: '45%',
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
		alignSelf: 'center',
		paddingVertical: 10,
		paddingHorizontal: 14,
	},
	toolText: {
		color: colors.textSecondary,
		fontSize: 15,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.45,
	},
});

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
	DEFAULT_MATCH_FORMAT,
	GAME_TYPE_OPTIONS,
	GAME_TYPE_X01,
	BOB27_MODE_EASY,
	BOB27_MODE_HARD,
	BOB27_BULL_WITH,
	BOB27_BULL_WITHOUT,
	STARTING_SCORE_OPTIONS,
	formatMatchLabel,
	hidesX01MatchFields,
	isAtcFormat,
	isBob27Format,
	isCatch40Format,
	isCricket56Format,
	isCricketFormat,
	normalizeMatchFormat,
} from '../../helpers/matchFormat/matchFormat';
import { colors } from '../../theme/colors';
import SelectMenu from '../Core/SelectMenu';
import {
	DEFAULT_DART_LIMIT,
	snapDartLimit,
} from '../../helpers/matchFormat/dartLimitRules';

const LEGS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const SETS_OPTIONS = [1, 2, 3];

function stepInOptions(options, current, delta) {
	const idx = options.indexOf(current);
	const safeIdx = idx >= 0 ? idx : 0;
	const nextIdx = Math.min(options.length - 1, Math.max(0, safeIdx + delta));
	return options[nextIdx];
}

function Stepper({ label, value, onDecrement, onIncrement, disabled }) {
	return (
		<View style={styles.stepperBlock}>
			<Text style={styles.label}>{label}</Text>
			<View style={styles.countRow}>
				<Pressable
					style={[styles.countBtn, disabled && styles.countBtnDisabled]}
					onPress={onDecrement}
					disabled={disabled}
				>
					<Text style={styles.countBtnText}>−</Text>
				</Pressable>
				<Text style={styles.countValue}>{value}</Text>
				<Pressable
					style={[styles.countBtn, disabled && styles.countBtnDisabled]}
					onPress={onIncrement}
					disabled={disabled}
				>
					<Text style={styles.countBtnText}>+</Text>
				</Pressable>
			</View>
		</View>
	);
}

export default function MatchFormatPicker({
	value,
	onChange,
	disabled = false,
	showGameTypeSelect = true,
	showDartLimit = true,
}) {
	const format = normalizeMatchFormat(value);
	const cricket = isCricketFormat(format);
	const bob27 = isBob27Format(format);
	const atc = isAtcFormat(format);
	const catch40 = isCatch40Format(format);
	const cricket56 = isCricket56Format(format);
	const hideX01Fields = hidesX01MatchFields(format);

	const setField = (patch) => onChange(normalizeMatchFormat({ ...format, ...patch }));

	const setGameType = (gameType) => {
		setField({
			gameType,
			setsToWinMatch: gameType === GAME_TYPE_X01 ? format.setsToWinMatch : 1,
		});
	};

	return (
		<View style={styles.wrap}>
			<Text style={styles.sectionLabel}>Format gry</Text>
			<Text style={styles.preview}>{formatMatchLabel(format)}</Text>

			{showGameTypeSelect && (
				<SelectMenu
					label="Tryb gry"
					value={format.gameType}
					options={GAME_TYPE_OPTIONS}
					onChange={setGameType}
					disabled={disabled}
				/>
			)}

			{bob27 && (
				<View style={styles.typeRow}>
					<Pressable
						style={[
							styles.typeBtn,
							format.bob27Mode === BOB27_MODE_HARD && styles.typeBtnActive,
							disabled && styles.countBtnDisabled,
						]}
						disabled={disabled}
						onPress={() => setField({ bob27Mode: BOB27_MODE_HARD })}
					>
						<Text
							style={[
								styles.typeBtnText,
								format.bob27Mode === BOB27_MODE_HARD && styles.typeBtnTextActive,
							]}
						>
							Hard
						</Text>
					</Pressable>
					<Pressable
						style={[
							styles.typeBtn,
							format.bob27Mode === BOB27_MODE_EASY && styles.typeBtnActive,
							disabled && styles.countBtnDisabled,
						]}
						disabled={disabled}
						onPress={() => setField({ bob27Mode: BOB27_MODE_EASY })}
					>
						<Text
							style={[
								styles.typeBtnText,
								format.bob27Mode === BOB27_MODE_EASY && styles.typeBtnTextActive,
							]}
						>
							Easy
						</Text>
					</Pressable>
				</View>
			)}
			{bob27 ? (
				<Text style={styles.modeHint}>
					{format.bob27Mode === BOB27_MODE_EASY
						? 'Easy: gra trwa przy ujemnym wyniku.'
						: 'Hard: wynik ≤ 0 kończy grę (wypadasz).'}
				</Text>
			) : null}
			{bob27 && (
				<View style={styles.typeRow}>
					<Pressable
						style={[
							styles.typeBtn,
							format.bob27Bull === BOB27_BULL_WITH && styles.typeBtnActive,
							disabled && styles.countBtnDisabled,
						]}
						disabled={disabled}
						onPress={() => setField({ bob27Bull: BOB27_BULL_WITH })}
					>
						<Text
							style={[
								styles.typeBtnText,
								format.bob27Bull === BOB27_BULL_WITH && styles.typeBtnTextActive,
							]}
						>
							Z bullem
						</Text>
					</Pressable>
					<Pressable
						style={[
							styles.typeBtn,
							format.bob27Bull === BOB27_BULL_WITHOUT && styles.typeBtnActive,
							disabled && styles.countBtnDisabled,
						]}
						disabled={disabled}
						onPress={() => setField({ bob27Bull: BOB27_BULL_WITHOUT })}
					>
						<Text
							style={[
								styles.typeBtnText,
								format.bob27Bull === BOB27_BULL_WITHOUT && styles.typeBtnTextActive,
							]}
						>
							Bez bulla
						</Text>
					</Pressable>
				</View>
			)}
			{bob27 ? (
				<Text style={styles.modeHint}>
					{format.bob27Bull === BOB27_BULL_WITHOUT
						? 'Bez bulla: ostatni cel to D20.'
						: 'Z bullem: po D20 inner bull (50). Outer nie liczy się.'}
				</Text>
			) : null}
			{cricket ? (
				<Text style={styles.modeHint}>
					Standard scoring, tylko legi (bez setów).
				</Text>
			) : null}
			{atc ? (
				<Text style={styles.modeHint}>
					1 → 20 → bull. Dowolny segment, bez przeskoków.
				</Text>
			) : null}
			{catch40 ? (
				<Text style={styles.modeHint}>
					Checkouty 61–100, max 6 lotek. 2 lotki = 3 pkt, 3 = 2, 4–6 = 1. 99 w 3 lotki = 3. Double out.
				</Text>
			) : null}
			{cricket56 ? (
				<Text style={styles.modeHint}>
					7 rund: 15–20 i bull. S=1, D=2, T=3; bull outer=1, inner=2. Perfect 60.
				</Text>
			) : null}

			{!hideX01Fields && (
				<Stepper
					label="Punkty startowe"
					value={format.startingScore}
					disabled={disabled}
					onDecrement={() =>
						setField({
							startingScore: stepInOptions(
								STARTING_SCORE_OPTIONS,
								format.startingScore,
								-1,
							),
						})
					}
					onIncrement={() =>
						setField({
							startingScore: stepInOptions(
								STARTING_SCORE_OPTIONS,
								format.startingScore,
								1,
							),
						})
					}
				/>
			)}

			<Stepper
				label={hideX01Fields ? 'Legi do wygrania meczu' : 'Legi do wygrania seta'}
				value={format.legsToWinSet}
				disabled={disabled}
				onDecrement={() =>
					setField({
						legsToWinSet: stepInOptions(LEGS_OPTIONS, format.legsToWinSet, -1),
					})
				}
				onIncrement={() =>
					setField({
						legsToWinSet: stepInOptions(LEGS_OPTIONS, format.legsToWinSet, 1),
					})
				}
			/>

			{!hideX01Fields && (
				<Stepper
					label="Sety do wygrania meczu"
					value={format.setsToWinMatch}
					disabled={disabled}
					onDecrement={() =>
						setField({
							setsToWinMatch: stepInOptions(
								SETS_OPTIONS,
								format.setsToWinMatch,
								-1,
							),
						})
					}
					onIncrement={() =>
						setField({
							setsToWinMatch: stepInOptions(
								SETS_OPTIONS,
								format.setsToWinMatch,
								1,
							),
						})
					}
				/>
			)}
			{!hideX01Fields && showDartLimit && (
				<View style={styles.stepperBlock}>
					<Pressable
						style={[styles.checkRow, disabled && styles.countBtnDisabled]}
						disabled={disabled}
						onPress={() =>
							setField({
								dartLimit: format.dartLimit == null ? DEFAULT_DART_LIMIT : null,
							})
						}
					>
						<View style={[styles.checkbox, format.dartLimit != null && styles.checkboxOn]}>
							{format.dartLimit != null ? (
								<Text style={styles.checkboxMark}>✓</Text>
							) : null}
						</View>
						<Text style={styles.label}>Ogranicznik lotek</Text>
					</Pressable>
					{format.dartLimit != null ? (
						<Stepper
							label="Limit lotek na zawodnika w legu"
							value={format.dartLimit}
							disabled={disabled}
							onDecrement={() =>
								setField({
									dartLimit: snapDartLimit(format.dartLimit - 3),
								})
							}
							onIncrement={() =>
								setField({
									dartLimit: snapDartLimit(format.dartLimit + 3),
								})
							}
						/>
					) : null}
				</View>
			)}
		</View>
	);
}

export { DEFAULT_MATCH_FORMAT };

const styles = StyleSheet.create({
	wrap: { marginBottom: 16 },
	sectionLabel: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 6,
		color: colors.text,
		textAlign: 'center',
	},
	preview: {
		fontSize: 16,
		color: colors.accent,
		marginBottom: 12,
		textAlign: 'center',
		fontWeight: '500',
	},
	typeRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginBottom: 12,
		justifyContent: 'center',
	},
	typeBtn: {
		flex: 1,
		minWidth: 90,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
		alignItems: 'center',
	},
	typeBtnActive: {
		borderColor: colors.accent,
		backgroundColor: colors.bgElevated,
	},
	typeBtnText: {
		fontSize: 15,
		color: colors.textMuted,
		fontWeight: '600',
	},
	typeBtnTextActive: {
		color: colors.accent,
	},
	modeHint: {
		fontSize: 13,
		color: colors.textMuted,
		textAlign: 'center',
		marginBottom: 8,
	},
	checkRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		marginBottom: 8,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bgElevated,
	},
	checkboxOn: {
		borderColor: colors.accent,
	},
	checkboxMark: {
		color: colors.accent,
		fontSize: 16,
		fontWeight: '700',
	},
	stepperBlock: {
		marginTop: 8,
		marginBottom: 4,
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 14,
		color: colors.text,
	},
	countRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 20,
	},
	countBtn: {
		width: 44,
		height: 44,
		borderRadius: 8,
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countBtnDisabled: {
		opacity: 0.4,
	},
	countBtnText: {
		fontSize: 24,
		color: colors.text,
		fontWeight: '600',
	},
	countValue: {
		fontSize: 28,
		color: colors.accent,
		minWidth: 64,
		textAlign: 'center',
	},
});

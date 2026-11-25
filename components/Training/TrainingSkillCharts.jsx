import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Sparkline from '../Common/Sparkline';
import { formatAverage } from '../../helpers/formatAverage';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

export const TRAINING_SKILL_WINDOWS = [
	{ key: '90d', label: '3 mies.' },
	{ key: '180d', label: '6 mies.' },
	{ key: '270d', label: '9 mies.' },
	{ key: '360d', label: '12 mies.' },
];

function FilterBar({ options, value, onChange, disabled }) {
	return (
		<View style={styles.seg}>
			{options.map((option) => {
				const on = option.key === value;
				return (
					<Pressable
						key={option.key}
						onPress={() => onChange(option.key)}
						disabled={disabled}
						style={[styles.segBtn, on && styles.segBtnOn]}
						accessibilityRole="button"
						accessibilityState={{ selected: on, disabled }}
					>
						<Text style={[styles.segText, on && styles.segTextOn]}>{option.label}</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

/**
 * Wykresy średniej 3-lotkowej i double % z chipami okresu i strzałkami offsetu.
 */
const TrainingSkillCharts = ({
	windowKey,
	onWindowChange,
	offset,
	onOffsetChange,
	data,
	loading,
	error,
	onRetry,
}) => {
	const hero = data?.hero ?? {};
	const range = data?.range;
	const sparkPoints = data?.series?.x01_average;
	const doublePoints = data?.series?.double_pct;
	const hasSpark = (sparkPoints ?? []).filter((point) => point?.value != null).length >= 2;
	const hasDoubleSpark = (doublePoints ?? []).filter((point) => point?.value != null).length >= 2;
	const canGoBack = Boolean(data?.canGoBack);
	const canGoForward = Boolean(data?.canGoForward);

	return (
		<View style={styles.wrap}>
			<View style={styles.head}>
				<Text style={styles.title}>Statystyki</Text>
				{loading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
			</View>

			<FilterBar
				options={TRAINING_SKILL_WINDOWS}
				value={windowKey}
				disabled={loading}
				onChange={onWindowChange}
			/>

			<View style={styles.navRow}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Wcześniejszy okres"
					disabled={loading || !canGoBack}
					onPress={() => onOffsetChange(offset + 1)}
					hitSlop={8}
					style={[styles.navBtn, (!canGoBack || loading) && styles.navBtnDisabled]}
				>
					<Ionicons
						name="chevron-back"
						size={scaleSize(20)}
						color={canGoBack && !loading ? colors.accent : colors.textMuted}
					/>
				</Pressable>
				<Text style={styles.rangeLabel}>
					{range?.start && range?.end ? `${range.start} – ${range.end}` : '—'}
				</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Późniejszy okres"
					disabled={loading || !canGoForward}
					onPress={() => onOffsetChange(Math.max(0, offset - 1))}
					hitSlop={8}
					style={[styles.navBtn, (!canGoForward || loading) && styles.navBtnDisabled]}
				>
					<Ionicons
						name="chevron-forward"
						size={scaleSize(20)}
						color={canGoForward && !loading ? colors.accent : colors.textMuted}
					/>
				</Pressable>
			</View>

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.error}>{error}</Text>
					{onRetry ? (
						<Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
							<Text style={styles.retryText}>Spróbuj ponownie</Text>
						</Pressable>
					) : null}
				</View>
			) : null}

			{!error ? (
				<>
					<View style={styles.heroRow}>
						<View style={styles.heroCard}>
							<Text style={styles.kicker}>Średnia 3 lotki</Text>
							<Text style={styles.heroValue}>
								{hero.hasX01 ? formatAverage(hero.x01Average).replace('-', '–') : '–'}
							</Text>
						</View>
						<View style={styles.heroCard}>
							<Text style={styles.kicker}>Double %</Text>
							<Text style={styles.heroValue}>
								{hero.hasDoubles && hero.doublePct != null ? `${hero.doublePct}%` : '–'}
							</Text>
							{hero.doubleLabel ? (
								<Text style={styles.heroHint}>{hero.doubleLabel}</Text>
							) : null}
						</View>
					</View>

					{hasSpark ? (
						<View style={styles.chartCard}>
							<Text style={styles.kicker}>Trend średniej</Text>
							<Sparkline points={sparkPoints} formatValue={(value) => formatAverage(value)} />
						</View>
					) : (
						<Text style={styles.empty}>Za mało danych do wykresu średniej w tym okresie.</Text>
					)}
					{hasDoubleSpark ? (
						<View style={styles.chartCard}>
							<Text style={styles.kicker}>Trend double %</Text>
							<Sparkline
								points={doublePoints}
								formatValue={(value) => `${Math.round(Number(value))}%`}
								stroke={colors.success}
							/>
						</View>
					) : (
						<Text style={styles.empty}>Za mało danych do wykresu double % w tym okresie.</Text>
					)}
				</>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: {
		marginBottom: 18,
		gap: 10,
	},
	head: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	title: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '800',
		letterSpacing: -0.2,
	},
	seg: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		backgroundColor: colors.bgElevated,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 3,
		gap: 2,
	},
	segBtn: {
		paddingVertical: 7,
		paddingHorizontal: 8,
		borderRadius: 8,
	},
	segBtnOn: {
		backgroundColor: colors.accentMuted,
	},
	segText: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textMuted,
	},
	segTextOn: {
		color: colors.accent,
	},
	navRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	navBtn: {
		width: 40,
		height: 40,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
		alignItems: 'center',
		justifyContent: 'center',
	},
	navBtnDisabled: {
		opacity: 0.45,
	},
	rangeLabel: {
		flex: 1,
		textAlign: 'center',
		color: colors.textSecondary,
		fontSize: 13,
		fontWeight: '600',
	},
	errorBox: {
		gap: 8,
	},
	error: {
		color: colors.warning,
		fontSize: 14,
	},
	retry: {
		alignSelf: 'flex-start',
		minHeight: 36,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	retryText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '700',
	},
	heroRow: {
		flexDirection: 'row',
		gap: 10,
	},
	heroCard: {
		flex: 1,
		backgroundColor: colors.bgElevated,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		padding: 14,
	},
	kicker: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		color: colors.textMuted,
		marginBottom: 6,
	},
	heroValue: {
		fontSize: 24,
		fontWeight: '800',
		color: colors.text,
	},
	heroHint: {
		marginTop: 4,
		fontSize: 12,
		color: colors.textMuted,
		fontWeight: '600',
	},
	chartCard: {
		backgroundColor: colors.bgElevated,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		padding: 14,
	},
	empty: {
		color: colors.textMuted,
		fontSize: 13,
		lineHeight: 18,
	},
});

export default TrainingSkillCharts;

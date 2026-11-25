import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TrainingAimRings from './TrainingAimRings';
import {
	AIM_GROUP_LABELS,
	AIM_GROUP_ORDER,
	groupAimsByKind,
	highlightAims,
	overallAimAccuracy,
} from '../../helpers/training/sectorAimGroups';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';

/**
 * Skuteczność sektorów (30 dni) z nawigacją strzałkami między miesiącami.
 */
const TrainingSectorStatsSection = ({
	offset,
	onOffsetChange,
	data,
	loading,
	error,
	onRetry,
}) => {
	const aims = Array.isArray(data?.aims) ? data.aims : [];
	const range = data?.range;
	const canGoBack = Boolean(data?.canGoBack);
	const canGoForward = Boolean(data?.canGoForward);

	const overall = useMemo(() => overallAimAccuracy(aims), [aims]);
	const highlights = useMemo(() => highlightAims(aims), [aims]);
	const groups = useMemo(() => groupAimsByKind(aims), [aims]);
	const openableGroups = useMemo(
		() => AIM_GROUP_ORDER.filter((key) => (groups[key] || []).length > 0),
		[groups],
	);

	return (
		<View style={styles.wrap}>
			<View style={styles.head}>
				<Text style={styles.title}>Skuteczność sektorów</Text>
				{loading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
			</View>
			<Text style={styles.hint}>Okres zawsze 30 dni.</Text>

			<View style={styles.navRow}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Wcześniejszy miesiąc"
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
					accessibilityLabel="Późniejszy miesiąc"
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

			{!error && aims.length > 0 ? (
				<>
					<View style={styles.overallCard}>
						<Text style={styles.overallKicker}>Ogólna skuteczność</Text>
						<Text style={styles.overallValue}>{`${overall.percent}%`}</Text>
						<Text style={styles.overallMeta}>{`${overall.hits}/${overall.attempts}`}</Text>
					</View>

					{highlights.best.length > 0 ? (
						<TrainingAimRings
							aims={highlights.best}
							title="Najlepsze"
							collapsible={false}
							sortBy="percent"
						/>
					) : null}

					{highlights.worst.length > 0 ? (
						<TrainingAimRings
							aims={highlights.worst}
							title="Najsłabsze"
							collapsible={false}
							sortBy="percent"
						/>
					) : null}

					{openableGroups.map((key) => (
						<TrainingAimRings
							key={key}
							aims={groups[key]}
							title={AIM_GROUP_LABELS[key]}
							defaultOpen={false}
							collapsible
							sortBy="board"
						/>
					))}
				</>
			) : null}

			{!error && !loading && aims.length === 0 ? (
				<Text style={styles.empty}>Brak danych o sektorach w tym miesiącu.</Text>
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
	hint: {
		color: colors.textMuted,
		fontSize: 13,
		lineHeight: 18,
		marginTop: -4,
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
	overallCard: {
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
	},
	overallKicker: {
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		marginBottom: 4,
	},
	overallValue: {
		color: colors.accent,
		fontSize: 28,
		fontWeight: '800',
		letterSpacing: -0.5,
	},
	overallMeta: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '600',
	},
	empty: {
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
	},
});

export default TrainingSectorStatsSection;

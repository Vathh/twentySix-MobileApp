import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchTrainingAnalysis } from '../../helpers/training/trainingApi';
import { formatHistoryDate } from '../../helpers/training/trainingHistoryMerge';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';
import TrainingActivityChart from './TrainingActivityChart';
import TrainingSegmentedControl from './TrainingSegmentedControl';

function clampProgress(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return 0;
	}
	return Math.min(100, Math.max(0, n <= 1 ? n * 100 : n));
}

function formatGoalFigure(goal, field) {
	const raw = goal?.[field];
	if (goal?.unit === 'percent') {
		return `${raw}%`;
	}
	return String(raw ?? '—');
}

function medalAccent(color) {
	const key = String(color || '').toLowerCase();
	if (key.includes('złot') || key.includes('gold')) {
		return '#EAB308';
	}
	if (key.includes('srebr') || key.includes('silver')) {
		return '#A1A1AA';
	}
	if (key.includes('brąz') || key.includes('bronze')) {
		return '#D97706';
	}
	return colors.accent;
}

/**
 * Dashboard analizy: snapshot licznika, celów, odznak i rekordów.
 */
const TrainingAnalysisScreen = () => {
	const navigation = useNavigation();
	const { auth } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [data, setData] = useState(null);
	const [activityDays, setActivityDays] = useState(30);

	const load = useCallback(async () => {
		if (!auth?.accessToken) {
			setError('Zaloguj się, żeby zobaczyć analizę.');
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const result = await fetchTrainingAnalysis(auth.accessToken);
			if (!result.ok) {
				setData(null);
				setError(result.data?.message || 'Nie udało się pobrać analizy.');
				return;
			}
			setData(result.data);
		} finally {
			setLoading(false);
		}
	}, [auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	const goals = Array.isArray(data?.goals) ? data.goals : [];
	const badges = Array.isArray(data?.badges) ? data.badges : [];
	const medals = Array.isArray(data?.medals) ? data.medals.filter((row) => !row.placeholder) : [];
	const records = Array.isArray(data?.records) ? data.records : [];
	const activityPoints = useMemo(() => {
		const points = Array.isArray(data?.activity?.points) ? data.activity.points : [];
		const span = activityDays === 90 ? 90 : 30;
		return points.slice(-span);
	}, [data?.activity?.points, activityDays]);

	const snapshot = useMemo(() => {
		const goalsDone = goals.filter((row) => row.completed).length;
		const badgeLevels = badges.filter((row) => row.level).length;
		const topRecords = [...records]
			.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
			.slice(0, 5);
		const focusGoals = [...goals]
			.sort((a, b) => {
				if (a.completed !== b.completed) {
					return a.completed ? 1 : -1;
				}
				return clampProgress(b.progress) - clampProgress(a.progress);
			})
			.slice(0, 3);
		return {
			completed: Number(data?.completedExerciseCount) || 0,
			goalsDone,
			goalsTotal: goals.length,
			badgeLevels,
			badgesTotal: badges.length,
			medalCount: medals.length,
			recordCount: records.length,
			topRecords,
			focusGoals,
		};
	}, [data, goals, badges, medals, records]);

	return (
		<ScrollView
			style={styles.screen}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			{loading ? (
				<ActivityIndicator color={colors.accent} style={styles.loader} />
			) : null}

			{error ? (
				<View style={styles.errorCard}>
					<Text style={styles.error}>{error}</Text>
					<Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
						<Text style={styles.retryText}>Spróbuj ponownie</Text>
					</Pressable>
				</View>
			) : null}

			{!loading && !error ? (
				<>
					<View style={styles.hero}>
						<Text style={styles.heroEyebrow}>Twój trening</Text>
						<Text style={styles.heroValue}>{snapshot.completed}</Text>
						<Text style={styles.heroLabel}>ukończonych ćwiczeń</Text>
						<View style={styles.statRow}>
							<View style={styles.statChip}>
								<Text style={styles.statValue}>{snapshot.goalsDone}/{snapshot.goalsTotal || '—'}</Text>
								<Text style={styles.statLabel}>cele</Text>
							</View>
							<View style={styles.statChip}>
								<Text style={styles.statValue}>{snapshot.badgeLevels}/{snapshot.badgesTotal || '—'}</Text>
								<Text style={styles.statLabel}>odznaki</Text>
							</View>
							<View style={styles.statChip}>
								<Text style={styles.statValue}>{snapshot.recordCount}</Text>
								<Text style={styles.statLabel}>rekordy</Text>
							</View>
						</View>
					</View>

					<View style={styles.sectionHead}>
						<Text style={styles.sectionTitle}>Cele w toku</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Wszystkie cele"
							onPress={() => navigation.navigate('TrainingGoals')}
							hitSlop={8}
						>
							<Text style={styles.sectionLink}>Wszystkie</Text>
						</Pressable>
					</View>
					{snapshot.focusGoals.length === 0 ? (
						<Text style={styles.empty}>Brak celów do pokazania.</Text>
					) : (
						snapshot.focusGoals.map((goal) => {
							const pct = clampProgress(goal.progress);
							return (
								<View key={goal.id} style={styles.goalCard}>
									<View style={styles.goalTop}>
										<View style={styles.goalCopy}>
											<Text style={styles.goalName} numberOfLines={2}>{goal.name}</Text>
											<Text style={styles.goalMeta}>
												{formatGoalFigure(goal, 'value')}
												{'  ·  cel '}
												{formatGoalFigure(goal, 'threshold')}
											</Text>
										</View>
										<View style={[styles.goalBadge, goal.completed && styles.goalBadgeDone]}>
											<Text style={[styles.goalBadgeText, goal.completed && styles.goalBadgeTextDone]}>
												{goal.completed ? 'OK' : `${Math.round(pct)}%`}
											</Text>
										</View>
									</View>
									<View style={styles.barTrack}>
										<View style={[styles.barFill, { width: `${pct}%` }]} />
									</View>
								</View>
							);
						})
					)}

					<View style={styles.sectionHead}>
						<Text style={styles.sectionTitle}>Odznaki i medale</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Cele i odznaki"
							onPress={() => navigation.navigate('TrainingGoals')}
							hitSlop={8}
						>
							<Text style={styles.sectionLink}>Szczegóły</Text>
						</Pressable>
					</View>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.awardStrip}
					>
						{badges.map((badge) => {
							const earned = Boolean(badge.level);
							return (
								<View key={badge.id} style={[styles.awardCard, !earned && styles.awardMuted]}>
									<View style={[styles.awardIcon, earned ? styles.awardIconOn : null]}>
										<Ionicons
											name={earned ? 'ribbon' : 'ribbon-outline'}
											size={scaleSize(22)}
											color={earned ? colors.accent : colors.textMuted}
										/>
									</View>
									<Text style={styles.awardName} numberOfLines={2}>{badge.name}</Text>
									<Text style={styles.awardMeta} numberOfLines={1}>
										{badge.levelLabel || `Do ${badge.nextLevelLabel || 'startu'}`}
									</Text>
									<View style={styles.miniTrack}>
										<View
											style={[
												styles.miniFill,
												{ width: `${clampProgress(badge.progressToNext)}%` },
											]}
										/>
									</View>
								</View>
							);
						})}
						{medals.map((medal) => {
							const accent = medalAccent(medal.color);
							return (
								<View key={medal.id} style={styles.awardCard}>
									<View style={[styles.awardIcon, { borderColor: accent, backgroundColor: colors.accentMuted }]}>
										<Ionicons name="medal" size={scaleSize(22)} color={accent} />
									</View>
									<Text style={styles.awardName} numberOfLines={2}>
										{medal.eventName || medal.name || 'Medal'}
									</Text>
									<Text style={styles.awardMeta} numberOfLines={1}>{medal.color || '—'}</Text>
								</View>
							);
						})}
						{badges.length === 0 && medals.length === 0 ? (
							<Text style={styles.emptyInline}>Odznaki pojawią się wraz z postępem.</Text>
						) : null}
					</ScrollView>

					<View style={styles.sectionHead}>
						<Text style={styles.sectionTitle}>Najlepsze wyniki</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Wszystkie rekordy"
							onPress={() => navigation.navigate('TrainingRecords')}
							hitSlop={8}
						>
							<Text style={styles.sectionLink}>Wszystkie</Text>
						</Pressable>
					</View>
					{snapshot.topRecords.length === 0 ? (
						<Text style={styles.empty}>Ukończ ćwiczenie z wynikiem, żeby zobaczyć rekord.</Text>
					) : (
						<View style={styles.recordList}>
							{snapshot.topRecords.map((row, index) => (
								<View key={row.exerciseKey} style={styles.recordRow}>
									<View style={[styles.rank, index === 0 && styles.rankFirst]}>
										<Text style={[styles.rankText, index === 0 && styles.rankTextFirst]}>
											{index + 1}
										</Text>
									</View>
									<View style={styles.recordCopy}>
										<Text style={styles.recordName} numberOfLines={1}>{row.name}</Text>
										{row.achievedAt ? (
											<Text style={styles.recordDate}>{formatHistoryDate(row.achievedAt)}</Text>
										) : null}
									</View>
									<Text style={styles.recordScore}>{row.score}</Text>
								</View>
							))}
						</View>
					)}

					<View style={[styles.sectionHead, styles.activityHead]}>
						<Text style={styles.sectionTitle}>Aktywność</Text>
					</View>
					<Text style={styles.activityHint}>
						Liczba ukończonych ćwiczeń na dzień. Plan z kilkoma ćwiczeniami liczy każde osobno.
					</Text>
					<TrainingSegmentedControl
						options={[
							{ key: '30', label: '30 dni' },
							{ key: '90', label: '90 dni' },
						]}
						value={String(activityDays)}
						onChange={(key) => setActivityDays(key === '90' ? 90 : 30)}
						style={styles.activityToggle}
					/>
					<View style={styles.activityCard}>
						<TrainingActivityChart points={activityPoints} />
					</View>
				</>
			) : null}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 40,
	},
	loader: {
		marginTop: 28,
	},
	errorCard: {
		padding: 16,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
		gap: 12,
	},
	error: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.warning,
	},
	retry: {
		alignSelf: 'flex-start',
		minHeight: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	retryText: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
	hero: {
		paddingVertical: 22,
		paddingHorizontal: 18,
		borderRadius: 18,
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		marginBottom: 22,
	},
	heroEyebrow: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.7,
		textTransform: 'uppercase',
		marginBottom: 8,
	},
	heroValue: {
		color: colors.accent,
		fontSize: 48,
		fontWeight: '800',
		letterSpacing: -1.2,
		lineHeight: 52,
	},
	heroLabel: {
		marginTop: 2,
		color: colors.textSecondary,
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 16,
	},
	statRow: {
		flexDirection: 'row',
		gap: 8,
	},
	statChip: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderRadius: 12,
		backgroundColor: colors.bg,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
	},
	statValue: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '800',
	},
	statLabel: {
		marginTop: 2,
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	sectionHead: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
		marginTop: 4,
	},
	sectionTitle: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '800',
		letterSpacing: -0.2,
	},
	sectionLink: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
	goalCard: {
		marginBottom: 10,
		padding: 14,
		borderRadius: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 10,
	},
	goalTop: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	goalCopy: {
		flex: 1,
		gap: 4,
	},
	goalName: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
		lineHeight: 20,
	},
	goalMeta: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '600',
	},
	goalBadge: {
		minWidth: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.accentMuted,
		borderWidth: 1.5,
		borderColor: colors.accentBorder,
		paddingHorizontal: 8,
	},
	goalBadgeDone: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	goalBadgeText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '800',
	},
	goalBadgeTextDone: {
		color: colors.onAccent,
	},
	barTrack: {
		height: 8,
		borderRadius: 999,
		backgroundColor: colors.bg,
		overflow: 'hidden',
	},
	barFill: {
		height: '100%',
		backgroundColor: colors.accent,
		borderRadius: 999,
	},
	awardStrip: {
		paddingBottom: 8,
		paddingRight: 8,
		gap: 10,
	},
	awardCard: {
		width: 132,
		padding: 12,
		borderRadius: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		gap: 8,
	},
	awardMuted: {
		opacity: 0.72,
	},
	awardIcon: {
		width: 42,
		height: 42,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bg,
		borderWidth: 1,
		borderColor: colors.border,
	},
	awardIconOn: {
		backgroundColor: colors.accentMuted,
		borderColor: colors.accentBorder,
	},
	awardName: {
		color: colors.text,
		fontSize: 13,
		fontWeight: '700',
		lineHeight: 17,
		minHeight: 34,
	},
	awardMeta: {
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '600',
	},
	miniTrack: {
		height: 4,
		borderRadius: 999,
		backgroundColor: colors.bg,
		overflow: 'hidden',
		marginTop: 2,
	},
	miniFill: {
		height: '100%',
		backgroundColor: colors.accent,
	},
	recordList: {
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
		overflow: 'hidden',
	},
	recordRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	rank: {
		width: 28,
		height: 28,
		borderRadius: 9,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bg,
		borderWidth: 1,
		borderColor: colors.border,
	},
	rankFirst: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	rankText: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '800',
	},
	rankTextFirst: {
		color: colors.onAccent,
	},
	recordCopy: {
		flex: 1,
		gap: 2,
	},
	recordName: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
	},
	recordDate: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '600',
	},
	recordScore: {
		color: colors.accent,
		fontSize: 18,
		fontWeight: '800',
		letterSpacing: -0.3,
	},
	empty: {
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 12,
	},
	emptyInline: {
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
		paddingVertical: 18,
		paddingRight: 20,
	},
	activityHead: {
		marginTop: 20,
	},
	activityHint: {
		color: colors.textMuted,
		fontSize: 13,
		lineHeight: 18,
		marginBottom: 12,
		marginTop: -4,
	},
	activityToggle: {
		marginBottom: 12,
	},
	activityCard: {
		paddingVertical: 12,
		paddingHorizontal: 10,
		borderRadius: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.borderStrong,
	},
});

export default TrainingAnalysisScreen;

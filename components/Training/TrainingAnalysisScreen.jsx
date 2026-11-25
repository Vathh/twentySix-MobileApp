import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
	fetchTrainingAnalysis,
	fetchTrainingSectorStats,
	fetchTrainingSkillStats,
} from '../../helpers/training/trainingApi';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';
import TrainingActivityChart from './TrainingActivityChart';
import TrainingSegmentedControl from './TrainingSegmentedControl';
import TrainingSkillCharts from './TrainingSkillCharts';
import TrainingSectorStatsSection from './TrainingSectorStatsSection';

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
 * Dashboard analizy: licznik, skill charts, sektory, medale, aktywność.
 */
const TrainingAnalysisScreen = () => {
	const navigation = useNavigation();
	const { auth } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [data, setData] = useState(null);
	const [activityDays, setActivityDays] = useState(30);

	const [skillWindow, setSkillWindow] = useState('90d');
	const [skillOffset, setSkillOffset] = useState(0);
	const [skillData, setSkillData] = useState(null);
	const [skillLoading, setSkillLoading] = useState(false);
	const [skillError, setSkillError] = useState(null);

	const [sectorOffset, setSectorOffset] = useState(0);
	const [sectorData, setSectorData] = useState(null);
	const [sectorLoading, setSectorLoading] = useState(false);
	const [sectorError, setSectorError] = useState(null);

	const loadAnalysis = useCallback(async () => {
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

	const loadSkill = useCallback(async (windowKey, offset) => {
		if (!auth?.accessToken) {
			setSkillError('Zaloguj się, żeby zobaczyć statystyki.');
			return;
		}
		setSkillLoading(true);
		setSkillError(null);
		try {
			const result = await fetchTrainingSkillStats(auth.accessToken, windowKey, offset);
			if (!result.ok) {
				setSkillData(null);
				setSkillError(result.data?.message || 'Nie udało się pobrać statystyk.');
				return;
			}
			setSkillData(result.data);
		} finally {
			setSkillLoading(false);
		}
	}, [auth?.accessToken]);

	const loadSector = useCallback(async (offset) => {
		if (!auth?.accessToken) {
			setSectorError('Zaloguj się, żeby zobaczyć skuteczność.');
			return;
		}
		setSectorLoading(true);
		setSectorError(null);
		try {
			const result = await fetchTrainingSectorStats(auth.accessToken, offset);
			if (!result.ok) {
				setSectorData(null);
				setSectorError(result.data?.message || 'Nie udało się pobrać skuteczności.');
				return;
			}
			setSectorData(result.data);
		} finally {
			setSectorLoading(false);
		}
	}, [auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			loadAnalysis();
		}, [loadAnalysis]),
	);

	useEffect(() => {
		loadSkill(skillWindow, skillOffset);
	}, [loadSkill, skillWindow, skillOffset]);

	useEffect(() => {
		loadSector(sectorOffset);
	}, [loadSector, sectorOffset]);

	const medals = Array.isArray(data?.medals)
		? data.medals.filter((row) => !row.placeholder)
		: [];
	const activityPoints = useMemo(() => {
		const points = Array.isArray(data?.activity?.points) ? data.activity.points : [];
		const span = activityDays === 90 ? 90 : 30;
		return points.slice(-span);
	}, [data?.activity?.points, activityDays]);
	const completed = Number(data?.completedExerciseCount) || 0;

	const onSkillWindowChange = (key) => {
		setSkillWindow(key);
		setSkillOffset(0);
	};

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
					<Pressable accessibilityRole="button" onPress={loadAnalysis} style={styles.retry}>
						<Text style={styles.retryText}>Spróbuj ponownie</Text>
					</Pressable>
				</View>
			) : null}

			{!loading && !error ? (
				<>
					<View style={styles.hero}>
						<Text style={styles.heroEyebrow}>Twój trening</Text>
						<Text style={styles.heroValue}>{completed}</Text>
						<Text style={styles.heroLabel}>ukończonych ćwiczeń</Text>
					</View>

					<TrainingSkillCharts
						windowKey={skillWindow}
						onWindowChange={onSkillWindowChange}
						offset={skillOffset}
						onOffsetChange={setSkillOffset}
						data={skillData}
						loading={skillLoading}
						error={skillError}
						onRetry={() => loadSkill(skillWindow, skillOffset)}
					/>

					<TrainingSectorStatsSection
						offset={sectorOffset}
						onOffsetChange={setSectorOffset}
						data={sectorData}
						loading={sectorLoading}
						error={sectorError}
						onRetry={() => loadSector(sectorOffset)}
					/>

					{medals.length > 0 ? (
						<>
							<View style={styles.sectionHead}>
								<Text style={styles.sectionTitle}>Medale</Text>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel="Wszystkie medale"
									onPress={() => navigation.navigate('TrainingMedals')}
									hitSlop={8}
								>
									<Text style={styles.sectionLink}>Wszystkie</Text>
								</Pressable>
							</View>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.awardStrip}
							>
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
							</ScrollView>
						</>
					) : null}

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
		marginBottom: 16,
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
	awardStrip: {
		paddingBottom: 8,
		paddingRight: 8,
		gap: 10,
		marginBottom: 8,
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
	activityHead: {
		marginTop: 12,
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

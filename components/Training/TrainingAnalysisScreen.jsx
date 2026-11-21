import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { fetchTrainingAnalysis } from '../../helpers/training/trainingApi';
import { colors } from '../../theme/colors';

function progressPercent(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return 0;
	}
	return Math.min(100, Math.max(0, n <= 1 ? n * 100 : n));
}

/**
 * Analiza: licznik, cele i odznaki z jednego endpointu.
 * Wykres aktywności — osobny projekt UI.
 */
const TrainingAnalysisScreen = () => {
	const { auth } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [data, setData] = useState(null);

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
	const medals = Array.isArray(data?.medals) ? data.medals : [];
	const records = Array.isArray(data?.records) ? data.records : [];

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<Text style={styles.title}>Analiza zawodnika</Text>
			{loading ? (
				<ActivityIndicator color={colors.accent} style={styles.loader} />
			) : error ? (
				<View style={styles.block}>
					<Text style={styles.error}>{error}</Text>
					<Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
						<Text style={styles.retryText}>Spróbuj ponownie</Text>
					</Pressable>
				</View>
			) : (
				<>
					<View style={styles.block}>
						<Text style={styles.label}>Ukończone ćwiczenia</Text>
						<Text style={styles.count}>{Number(data?.completedExerciseCount) || 0}</Text>
					</View>

					<Text style={styles.section}>Cele</Text>
					{goals.map((goal) => (
						<View key={goal.id} style={styles.card}>
							<View style={styles.row}>
								<Text style={styles.cardTitle}>{goal.name}</Text>
								<Text style={styles.cardMeta}>
									{goal.value}
									{goal.unit === 'percent' ? '%' : ''}
									{' / '}
									{goal.threshold}
									{goal.unit === 'percent' ? '%' : ''}
								</Text>
							</View>
							<View style={styles.barTrack}>
								<View style={[styles.barFill, { width: `${progressPercent(goal.progress)}%` }]} />
							</View>
						</View>
					))}

					<Text style={styles.section}>Odznaki i medale</Text>
					<View style={styles.slotRow}>
						{badges.map((badge) => (
							<View key={badge.id} style={styles.slot}>
								<Text style={styles.slotName}>{badge.name}</Text>
								<Text style={styles.slotMeta}>{badge.levelLabel || '—'}</Text>
							</View>
						))}
						{medals.filter((m) => !m.placeholder).map((medal) => (
							<View key={medal.id} style={styles.slot}>
								<Text style={styles.slotName}>{medal.eventName || 'Medal'}</Text>
								<Text style={styles.slotMeta}>{medal.color}</Text>
							</View>
						))}
					</View>

					<Text style={styles.section}>Rekordy ({records.length})</Text>
					{records.length === 0 ? (
						<Text style={styles.hint}>Brak rekordów.</Text>
					) : (
						records.slice(0, 8).map((row) => (
							<View key={row.exerciseKey} style={styles.row}>
								<Text style={styles.cardTitle}>{row.name}</Text>
								<Text style={styles.cardMeta}>{row.score}</Text>
							</View>
						))
					)}

					<Text style={styles.hint}>
						Wykres aktywności dopracujemy osobno. Pełne cele i odznaki są też na swoich kafelkach.
					</Text>
				</>
			)}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		padding: 24,
		paddingBottom: 40,
	},
	title: {
		fontSize: 22,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 20,
	},
	loader: {
		marginTop: 24,
	},
	block: {
		marginBottom: 20,
		gap: 8,
	},
	label: {
		fontSize: 13,
		fontWeight: '700',
		color: colors.textMuted,
		textTransform: 'uppercase',
	},
	count: {
		fontSize: 36,
		fontWeight: '700',
		color: colors.text,
	},
	section: {
		marginTop: 8,
		marginBottom: 12,
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
	},
	card: {
		marginBottom: 10,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
		gap: 8,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
		marginBottom: 6,
	},
	cardTitle: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
		flex: 1,
	},
	cardMeta: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
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
	},
	slotRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginBottom: 16,
	},
	slot: {
		minWidth: '40%',
		paddingVertical: 8,
	},
	slotName: {
		color: colors.text,
		fontWeight: '700',
		fontSize: 14,
	},
	slotMeta: {
		color: colors.textMuted,
		fontSize: 12,
		marginTop: 2,
	},
	hint: {
		marginTop: 12,
		fontSize: 14,
		lineHeight: 20,
		color: colors.textMuted,
	},
	error: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.warning,
	},
	retry: {
		marginTop: 12,
		alignSelf: 'flex-start',
		minHeight: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	retryText: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
});

export default TrainingAnalysisScreen;

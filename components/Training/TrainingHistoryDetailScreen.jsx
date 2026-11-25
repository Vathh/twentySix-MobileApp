import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { getTrainingGameById } from '../../helpers/trainingHistory/persistTrainingHistory';
import { fetchTrainingHistoryDetail } from '../../helpers/training/trainingApi';
import {
	formatHistoryDate,
	kindLabel,
	serverToHistoryItem,
} from '../../helpers/training/trainingHistoryMerge';
import { colors } from '../../theme/colors';
import TrainingAimRings from './TrainingAimRings';

const TrainingHistoryDetailScreen = ({ navigation, route }) => {
	const seed = route?.params?.item;
	const { auth } = useAuth();
	const [item, setItem] = useState(seed || null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);

	useFocusEffect(
		useCallback(() => {
			let live = true;
			(async () => {
				if (!seed) {
					setError('Brak danych sesji.');
					return;
				}
				if (seed.kind === 'free_play') {
					const game = seed.raw || await getTrainingGameById(seed.localId);
					if (!live) {
						return;
					}
					if (!game) {
						setError('Szczegóły niedostępne offline.');
						return;
					}
					setItem({ ...seed, raw: game });
					return;
				}
				if (seed.source === 'outbox' || seed.stats) {
					setItem(seed);
					return;
				}
				if (!auth?.accessToken || !seed.id || String(seed.id).startsWith('local:')) {
					setError('Szczegóły niedostępne offline.');
					return;
				}
				setLoading(true);
				const result = await fetchTrainingHistoryDetail(auth.accessToken, seed.id);
				if (!live) {
					return;
				}
				setLoading(false);
				if (!result.ok) {
					setError(result.status === 0 || result.status >= 500
						? 'Szczegóły niedostępne offline.'
						: (result.data?.message || 'Nie udało się pobrać szczegółów.'));
					return;
				}
				setItem(serverToHistoryItem(result.data));
			})();
			return () => {
				live = false;
			};
		}, [seed, auth?.accessToken]),
	);

	if (loading && !item) {
		return (
			<View style={styles.center}>
				<ActivityIndicator color={colors.accent} />
			</View>
		);
	}

	if (error && !item) {
		return (
			<View style={styles.center}>
				<Text style={styles.error}>{error}</Text>
				<Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.secondary}>
					<Text style={styles.secondaryText}>Wróć do historii</Text>
				</Pressable>
			</View>
		);
	}

	if (!item) {
		return <View style={styles.screen} />;
	}

	const aims = item.stats?.aims || item.raw?.stats?.aims || [];
	const results = item.results || item.stats?.items || item.raw?.results || [];
	const free = item.kind === 'free_play' ? item.raw : null;

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<Text style={styles.name}>{item.name}</Text>
			<Text style={styles.meta}>
				{item.kindLabel || kindLabel(item.kind)}
				{' · '}
				{formatHistoryDate(item.completedAt)}
			</Text>
			{error ? <Text style={styles.error}>{error}</Text> : null}

			{item.kind !== 'free_play' ? (
				<>
					<Text style={styles.label}>Wynik</Text>
					<Text style={styles.value}>{item.score == null ? '—' : String(item.score)}</Text>
				</>
			) : null}

			{free ? (
				<View>
					<Text style={styles.label}>Zwycięzca</Text>
					<Text style={styles.value}>{free.winnerName || '—'}</Text>
					<Text style={styles.label}>Gracze</Text>
					{(free.players || []).map((player, index) => (
						<Text key={`${player.name}-${index}`} style={styles.line}>
							{player.name}
							{player.legsWon != null ? ` · legi ${player.legsWon}` : ''}
							{player.matchAverage != null ? ` · avg ${player.matchAverage}` : ''}
						</Text>
					))}
				</View>
			) : null}

			{Array.isArray(aims) && aims.length > 0 ? (
				<TrainingAimRings aims={aims} />
			) : null}

			{item.kind === 'plan' && Array.isArray(results) && results.length > 0 ? (
				<>
					<Text style={styles.section}>Elementy planu</Text>
					{results.filter((row) => row.kind === 'exercise').map((row) => (
						<View key={`${row.position}-${row.exerciseKey}`} style={styles.planRow}>
							<Text style={styles.planName}>{row.name || row.exerciseKey}</Text>
							<Text style={styles.planMeta}>
								{row.status === 'skipped' ? 'Pominięty' : (row.scored === false ? 'Rozgrzewka · ' : '')}
								{row.status === 'skipped' ? '' : (row.score ?? 0)}
							</Text>
						</View>
					))}
				</>
			) : null}

			<Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.secondary}>
				<Text style={styles.secondaryText}>Wróć do historii</Text>
			</Pressable>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		padding: 20,
		paddingBottom: 40,
	},
	center: {
		flex: 1,
		backgroundColor: colors.bg,
		justifyContent: 'center',
		padding: 24,
	},
	name: {
		color: colors.text,
		fontSize: 24,
		fontWeight: '700',
	},
	meta: {
		marginTop: 6,
		marginBottom: 16,
		color: colors.textMuted,
		fontSize: 14,
	},
	label: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
	},
	value: {
		marginTop: 4,
		marginBottom: 16,
		color: colors.text,
		fontSize: 32,
		fontWeight: '700',
	},
	section: {
		marginTop: 8,
		marginBottom: 8,
		color: colors.text,
		fontSize: 17,
		fontWeight: '700',
	},
	line: {
		color: colors.textSecondary,
		fontSize: 15,
		marginBottom: 6,
	},
	planRow: {
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	planName: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	planMeta: {
		marginTop: 4,
		color: colors.textMuted,
		fontSize: 13,
	},
	error: {
		marginBottom: 12,
		color: colors.warning,
		fontSize: 14,
	},
	secondary: {
		marginTop: 24,
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
});

export default TrainingHistoryDetailScreen;

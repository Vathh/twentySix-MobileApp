import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { exerciseDisplayName } from '../../helpers/training/exerciseVariantFavorites';
import { loadCachedRecords, refreshRecords } from '../../helpers/training/recordsCache';
import { formatHistoryDate } from '../../helpers/training/trainingHistoryMerge';
import { colors } from '../../theme/colors';

const TrainingRecordsScreen = () => {
	const { auth } = useAuth();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		if (!auth?.accessToken || !auth?.userId) {
			setError('Zaloguj się, żeby zobaczyć rekordy.');
			setLoading(false);
			return;
		}
		setError(null);
		const cached = await loadCachedRecords(auth.userId);
		if (cached) {
			setItems(cached.items);
			setLoading(false);
		} else {
			setLoading(true);
		}
		const fresh = await refreshRecords(auth.userId, auth.accessToken);
		setLoading(false);
		if (!fresh) {
			if (!cached) {
				setItems([]);
				setError('Nie udało się pobrać rekordów.');
			}
			return;
		}
		setItems(fresh.items);
	}, [auth?.accessToken, auth?.userId]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			{loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
			{error ? (
				<View>
					<Text style={styles.error}>{error}</Text>
					<Pressable accessibilityRole="button" onPress={load} style={styles.retry}>
						<Text style={styles.retryText}>Spróbuj ponownie</Text>
					</Pressable>
				</View>
			) : null}
			{!loading && !error && items.length === 0 ? (
				<Text style={styles.empty}>Brak rekordów. Ukończ ćwiczenie z wynikiem, żeby tu weszło.</Text>
			) : null}
			{items.map((row) => (
				<View key={`${row.exerciseKey}:${row.variant || ''}`} style={styles.row}>
					<View style={styles.main}>
						<Text style={styles.name}>
							{exerciseDisplayName(row.exerciseKey, row.variant, row.name)}
						</Text>
						<Text style={styles.meta}>{formatHistoryDate(row.achievedAt)}</Text>
					</View>
					<Text style={styles.score}>{row.score}</Text>
				</View>
			))}
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
	loader: {
		marginTop: 24,
	},
	error: {
		color: colors.warning,
		fontSize: 14,
		marginBottom: 12,
	},
	retry: {
		minHeight: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	retryText: {
		color: colors.text,
		fontWeight: '700',
	},
	empty: {
		color: colors.textMuted,
		fontSize: 15,
		lineHeight: 22,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
		gap: 12,
	},
	main: {
		flex: 1,
	},
	name: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	meta: {
		marginTop: 4,
		color: colors.textMuted,
		fontSize: 13,
	},
	score: {
		color: colors.accent,
		fontSize: 22,
		fontWeight: '800',
		fontVariant: ['tabular-nums'],
	},
});

export default TrainingRecordsScreen;

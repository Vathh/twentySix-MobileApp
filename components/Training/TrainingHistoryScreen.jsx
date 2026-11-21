import React, { useCallback, useRef, useState } from 'react';
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
import { useConfirm } from '../../context/ConfirmProvider';
import {
	clearTrainingHistory,
	loadTrainingHistory,
} from '../../helpers/trainingHistory/persistTrainingHistory';
import {
	deleteTrainingHistory,
	fetchTrainingHistory,
} from '../../helpers/training/trainingApi';
import {
	clearHistoryCache,
	loadHistoryCache,
	rememberSyncedHistory,
} from '../../helpers/training/trainingHistoryCache';
import {
	HISTORY_DAY_OPTIONS,
	HISTORY_KINDS,
	activeFilterCount,
	formatHistoryDate,
	mergeHistoryLists,
	serverKindsFromFilter,
	serverToHistoryItem,
	syncStatusLabel,
} from '../../helpers/training/trainingHistoryMerge';
import {
	clearTrainingOutbox,
	flushTrainingOutbox,
	loadTrainingOutbox,
} from '../../helpers/training/trainingSessionStore';
import { colors } from '../../theme/colors';

const TrainingHistoryScreen = ({ navigation }) => {
	const { auth } = useAuth();
	const confirm = useConfirm();
	const [kinds, setKinds] = useState([]);
	const [days, setDays] = useState(null);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [items, setItems] = useState([]);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [wiping, setWiping] = useState(false);
	const [error, setError] = useState(null);
	const [cursor, setCursor] = useState(null);
	const keepListOnFocus = useRef(false);

	const rebuildLocal = useCallback(async (remote = [], nextKinds = kinds, nextDays = days) => {
		const [outbox, cache, freePlay] = await Promise.all([
			loadTrainingOutbox(auth?.userId),
			loadHistoryCache(auth?.userId),
			loadTrainingHistory(),
		]);
		const pending = (outbox || []).filter((row) => row && (row.sync === 'pending' || row.sync === 'rejected'));
		return mergeHistoryLists({
			outbox: pending,
			cache,
			freePlay,
			remote,
		}, nextKinds, nextDays);
	}, [auth?.userId, kinds, days]);

	const loadFirst = useCallback(async (nextKinds = kinds, nextDays = days) => {
		if (!auth?.accessToken) {
			setError('Zaloguj się, żeby zobaczyć historię.');
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await flushTrainingOutbox(auth.userId, auth.accessToken);
			const serverKinds = serverKindsFromFilter(nextKinds);
			let remote = [];
			let more = false;
			let nextCursor = null;

			if (serverKinds === null || serverKinds.length > 0) {
				const result = await fetchTrainingHistory(auth.accessToken, {
					kinds: serverKinds === null ? undefined : serverKinds,
					days: nextDays || undefined,
				});
				if (!result.ok) {
					const localOnly = await rebuildLocal([], nextKinds, nextDays);
					setItems(localOnly);
					setHasMore(false);
					setCursor(null);
					setError(result.status === 0 || result.status >= 500
						? 'Brak sieci. Pokazuję lokalną kopię.'
						: (result.data?.message || 'Nie udało się pobrać historii.'));
					return;
				}
				remote = (result.data?.items || []).map(serverToHistoryItem).filter(Boolean);
				more = Boolean(result.data?.hasMore);
				const last = remote[remote.length - 1];
				nextCursor = last ? { beforeCompletedAt: last.completedAt, beforeId: last.id } : null;
				await rememberSyncedHistory(auth.userId, remote);
			}

			const merged = await rebuildLocal(remote, nextKinds, nextDays);
			setItems(merged);
			setHasMore(more);
			setCursor(nextCursor);
		} finally {
			setLoading(false);
		}
	}, [auth?.accessToken, auth?.userId, kinds, days, rebuildLocal]);

	useFocusEffect(
		useCallback(() => {
			if (keepListOnFocus.current) {
				keepListOnFocus.current = false;
				return;
			}
			loadFirst();
		}, [loadFirst]),
	);

	const loadMore = async () => {
		if (!auth?.accessToken || !hasMore || !cursor || loadingMore) {
			return;
		}
		const serverKinds = serverKindsFromFilter(kinds);
		if (serverKinds !== null && serverKinds.length === 0) {
			setHasMore(false);
			return;
		}
		setLoadingMore(true);
		setError(null);
		try {
			const result = await fetchTrainingHistory(auth.accessToken, {
				kinds: serverKinds === null ? undefined : serverKinds,
				days: days || undefined,
				beforeCompletedAt: cursor.beforeCompletedAt,
				beforeId: cursor.beforeId,
			});
			if (!result.ok) {
				setError(result.status === 0 || result.status >= 500
					? 'Brak sieci. Nie dociągnięto kolejnych pozycji.'
					: (result.data?.message || 'Nie udało się załadować więcej.'));
				return;
			}
			const remote = (result.data?.items || []).map(serverToHistoryItem).filter(Boolean);
			await rememberSyncedHistory(auth.userId, remote);
			const remoteAll = [
				...items.filter((row) => row.source === 'server'),
				...remote,
			];
			setItems(await rebuildLocal(remoteAll));
			setHasMore(Boolean(result.data?.hasMore));
			const last = remote[remote.length - 1];
			setCursor(last ? { beforeCompletedAt: last.completedAt, beforeId: last.id } : null);
		} finally {
			setLoadingMore(false);
		}
	};

	const toggleKind = (key) => {
		setKinds((prev) => (
			prev.includes(key) ? prev.filter((row) => row !== key) : [...prev, key]
		));
	};

	const applyFilters = () => {
		setFiltersOpen(false);
		loadFirst(kinds, days);
	};

	const clearFilters = () => {
		setKinds([]);
		setDays(null);
		setFiltersOpen(false);
		loadFirst([], null);
	};

	const filterCount = activeFilterCount(kinds, days);

	const openItem = (item) => {
		keepListOnFocus.current = true;
		navigation.navigate('TrainingHistoryDetail', { item });
	};

	const wipeHistory = async () => {
		if (!auth?.accessToken || wiping) {
			return;
		}
		const ok = await confirm({
			title: 'Usunąć historię treningową?',
			message: 'Znikną wszystkie ukończone treningi, rekordy, cele, odznaki i opublikowane wyniki. Tej operacji nie cofniesz z aplikacji.',
			confirmLabel: 'Usuń historię',
		});
		if (!ok) {
			return;
		}
		setWiping(true);
		setError(null);
		try {
			const result = await deleteTrainingHistory(auth.accessToken);
			if (!result.ok) {
				setError(result.data?.message || 'Nie udało się usunąć historii.');
				return;
			}
			await Promise.all([
				clearHistoryCache(auth.userId),
				clearTrainingOutbox(auth.userId),
				clearTrainingHistory(),
			]);
			setItems([]);
			setHasMore(false);
			setCursor(null);
		} finally {
			setWiping(false);
		}
	};

	return (
		<View style={styles.screen}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.filterBar}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={filterCount ? `Filtruj (${filterCount})` : 'Filtruj'}
						onPress={() => setFiltersOpen((open) => !open)}
						style={styles.filterButton}
					>
						<Text style={styles.filterButtonText}>
							{filterCount ? `Filtruj (${filterCount})` : 'Filtruj'}
						</Text>
					</Pressable>
					{filterCount ? (
						<Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearButton}>
							<Text style={styles.clearButtonText}>Wyczyść filtry</Text>
						</Pressable>
					) : null}
				</View>

				{filtersOpen ? (
					<View style={styles.filters}>
						<Text style={styles.filterLabel}>Rodzaj</Text>
						<View style={styles.chips}>
							{HISTORY_KINDS.map((row) => {
								const on = kinds.includes(row.key);
								return (
									<Pressable
										key={row.key}
										accessibilityRole="button"
										accessibilityState={{ selected: on }}
										onPress={() => toggleKind(row.key)}
										style={[styles.chip, on && styles.chipOn]}
									>
										<Text style={[styles.chipText, on && styles.chipTextOn]}>{row.label}</Text>
									</Pressable>
								);
							})}
						</View>
						<Text style={styles.filterLabel}>Zakres</Text>
						<View style={styles.chips}>
							{HISTORY_DAY_OPTIONS.map((value) => {
								const on = days === value;
								return (
									<Pressable
										key={value}
										accessibilityRole="button"
										accessibilityState={{ selected: on }}
										onPress={() => setDays(on ? null : value)}
										style={[styles.chip, on && styles.chipOn]}
									>
										<Text style={[styles.chipText, on && styles.chipTextOn]}>{value} dni</Text>
									</Pressable>
								);
							})}
						</View>
						<Pressable accessibilityRole="button" onPress={applyFilters} style={styles.apply}>
							<Text style={styles.applyText}>Zastosuj</Text>
						</Pressable>
					</View>
				) : null}

				{error ? <Text style={styles.error}>{error}</Text> : null}
				{loading ? (
					<ActivityIndicator color={colors.accent} style={styles.loader} />
				) : items.length === 0 ? (
					<Text style={styles.empty}>Brak treningów.</Text>
				) : (
					items.map((item) => {
						const sync = syncStatusLabel(item.sync);
						return (
							<Pressable
								key={`${item.source}-${item.id}-${item.clientSessionId}`}
								accessibilityRole="button"
								onPress={() => openItem(item)}
								style={styles.row}
							>
								<View style={styles.rowMain}>
									<Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
									<Text style={styles.rowMeta}>
										{item.kindLabel || item.kind}
										{' · '}
										{formatHistoryDate(item.completedAt)}
									</Text>
									{sync ? <Text style={styles.sync}>{sync}</Text> : null}
								</View>
								<Text style={styles.rowScore}>
									{item.scoreLabel || (item.score == null ? '—' : String(item.score))}
								</Text>
							</Pressable>
						);
					})
				)}

				{hasMore ? (
					<Pressable
						accessibilityRole="button"
						disabled={loadingMore}
						onPress={loadMore}
						style={[styles.more, loadingMore && styles.disabled]}
					>
						<Text style={styles.moreText}>{loadingMore ? 'Ładowanie…' : 'Załaduj więcej'}</Text>
					</Pressable>
				) : null}

				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Usuń historię treningową"
					disabled={wiping || !auth?.accessToken}
					onPress={wipeHistory}
					style={[styles.wipe, (wiping || !auth?.accessToken) && styles.disabled]}
				>
					<Text style={styles.wipeText}>
						{wiping ? 'Usuwanie…' : 'Usuń historię treningową'}
					</Text>
				</Pressable>
			</ScrollView>
		</View>
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
	filterBar: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginBottom: 12,
	},
	filterButton: {
		minHeight: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	filterButtonText: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
	},
	clearButton: {
		paddingVertical: 8,
	},
	clearButtonText: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
	filters: {
		marginBottom: 16,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
		gap: 10,
	},
	filterLabel: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	chip: {
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	chipOn: {
		borderColor: colors.accent,
	},
	chipText: {
		color: colors.text,
		fontSize: 13,
		fontWeight: '600',
	},
	chipTextOn: {
		color: colors.accent,
	},
	apply: {
		marginTop: 4,
		minHeight: 44,
		borderRadius: 10,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	applyText: {
		color: colors.onAccent,
		fontSize: 15,
		fontWeight: '700',
	},
	error: {
		marginBottom: 12,
		color: colors.warning,
		fontSize: 14,
		lineHeight: 20,
	},
	loader: {
		marginTop: 24,
	},
	empty: {
		marginTop: 24,
		color: colors.textMuted,
		fontSize: 15,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
		gap: 12,
	},
	rowMain: {
		flex: 1,
	},
	rowName: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	rowMeta: {
		marginTop: 4,
		color: colors.textMuted,
		fontSize: 13,
	},
	sync: {
		marginTop: 4,
		color: colors.accent,
		fontSize: 12,
		fontWeight: '700',
	},
	rowScore: {
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '700',
	},
	more: {
		marginTop: 16,
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	moreText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	wipe: {
		marginTop: 28,
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.danger,
		alignItems: 'center',
		justifyContent: 'center',
	},
	wipeText: {
		color: colors.danger,
		fontSize: 15,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.5,
	},
});

export default TrainingHistoryScreen;

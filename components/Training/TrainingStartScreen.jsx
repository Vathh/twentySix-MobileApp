import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	FAVORITE_ADDED,
	FAVORITE_REMOVED,
	addTrainingFavorite,
	removeTrainingFavorite,
} from '../../helpers/training/trainingApi';
import { groupBobsFavorites } from '../../helpers/training/bobs27Group';
import { groupClockFavorites } from '../../helpers/training/clockGroup';
import {
	applyFavoriteRemoved,
	loadCachedFavorites,
	refreshFavorites,
} from '../../helpers/training/favoritesCache';
import { loadRecentTraining } from '../../helpers/training/recentTrainingStore';
import {
	START_TAB_FAVORITES,
	loadTrainingStartTab,
	saveTrainingStartTab,
} from '../../helpers/training/trainingStartPrefs';
import { colors } from '../../theme/colors';
import TrainingCard from './TrainingCard';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';

const TABS = [
	{ key: 'favorites', label: 'Ulubione' },
	{ key: 'recent', label: 'Ostatnie' },
];

function flattenFavorites(data) {
	const challenges = Array.isArray(data?.challenges) ? data.challenges : [];
	const plans = Array.isArray(data?.plans) ? data.plans : [];
	const exercises = groupBobsFavorites(groupClockFavorites(data?.exercises ?? []));
	return [...challenges, ...plans, ...exercises];
}

/**
 * Szybki start: zakładki Ulubione i Ostatnie bez podziału na rodzaj treści.
 * Ulubione i wybrana zakładka żyją w pamięci lokalnej; sieć odświeża w tle.
 */
const TrainingStartScreen = ({ navigation }) => {
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const [tab, setTab] = useState(START_TAB_FAVORITES);
	const [favorites, setFavorites] = useState([]);
	const [recent, setRecent] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let live = true;
		loadTrainingStartTab(auth?.userId).then((saved) => {
			if (live) {
				setTab(saved);
			}
		});
		return () => {
			live = false;
		};
	}, [auth?.userId]);

	const selectTab = (next) => {
		setTab(next);
		saveTrainingStartTab(auth?.userId, next);
	};

	const load = useCallback(async () => {
		if (!auth?.accessToken) {
			setLoading(false);
			setError('Zaloguj się, żeby rozpocząć trening.');
			setFavorites([]);
			setRecent([]);
			return;
		}

		const [cached, recentItems] = await Promise.all([
			loadCachedFavorites(auth.userId),
			loadRecentTraining(auth.userId),
		]);
		setRecent(Array.isArray(recentItems) ? recentItems : []);
		if (cached) {
			setFavorites(flattenFavorites(cached));
			setError(null);
			setLoading(false);
		} else {
			setLoading(true);
		}

		const refreshed = await refreshFavorites(auth.userId, auth.accessToken);
		if (!refreshed) {
			if (!cached) {
				setError('Nie udało się wczytać ulubionych.');
				setFavorites([]);
			}
			setLoading(false);
			return;
		}
		setFavorites(flattenFavorites(refreshed));
		setError(null);
		setLoading(false);
	}, [auth?.accessToken, auth?.userId]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	const items = tab === 'favorites' ? favorites : recent;
	const emptyText = tab === 'favorites'
		? 'Brak ulubionych. Dodaj gwiazdkę przy planie, wyzwaniu lub ćwiczeniu.'
		: 'Brak ostatnio rozpoczętych. Pojawią się po starcie treningu.';

	const toggleFavorite = async (item) => {
		if (!auth?.accessToken || item.kind == null || item.id == null) {
			return;
		}
		const keys = item.clockKeys ?? item.bobsKeys ?? [item.id];
		const kind = item.kind;
		const removing = Boolean(item.favorite) || tab === 'favorites';
		let changed = false;
		for (const key of keys) {
			const result = removing
				? await removeTrainingFavorite(auth.accessToken, key, kind)
				: await addTrainingFavorite(auth.accessToken, key, kind);
			if (!result.ok) {
				show(result.data?.message || 'Nie udało się zapisać.');
				load();
				return;
			}
			changed = changed
				|| Boolean(result.data?.removed)
				|| Boolean(result.data?.created);
			if (result.data?.created) {
				show(FAVORITE_ADDED);
			}
			if (result.data?.removed) {
				show(FAVORITE_REMOVED);
			}
		}
		if (!changed) {
			return;
		}
		if (tab === 'favorites' && removing) {
			const gone = new Set(keys);
			setFavorites((current) => current.filter((row) => (
				!gone.has(row.id) && !gone.has(row.exerciseKey)
			)));
			await applyFavoriteRemoved(auth.userId, kind, keys);
			return;
		}
		load();
	};

	return (
		<View style={styles.container}>
			<TrainingNotice text={text} />
			<FlatList
				data={items}
				keyExtractor={(item) => item.key || `${item.kind}:${item.id}`}
				contentContainerStyle={styles.content}
				ListHeaderComponent={
					<View>
						<Text style={styles.title}>Rozpocznij trening</Text>
						<View style={styles.tabs}>
							{TABS.map((entry) => {
								const selected = entry.key === tab;
								return (
									<Pressable
										key={entry.key}
										accessibilityRole="button"
										accessibilityState={{ selected }}
										onPress={() => selectTab(entry.key)}
										style={[styles.tab, selected && styles.tabOn]}
									>
										<Text style={[styles.tabText, selected && styles.tabTextOn]}>
											{entry.label}
										</Text>
									</Pressable>
								);
							})}
						</View>
						{error ? <Text style={styles.empty}>{error}</Text> : null}
						{loading && items.length === 0 ? <Text style={styles.empty}>Ładowanie…</Text> : null}
						{!loading && !error && items.length === 0 ? (
							<Text style={styles.empty}>{emptyText}</Text>
						) : null}
					</View>
				}
				renderItem={({ item }) => (
					tab === 'favorites' ? (
						<TrainingCard
							item={{ ...item, favorite: true }}
							onPress={() => navigation.navigate('TrainingDefinition', { id: item.id })}
							onToggleFavorite={() => toggleFavorite(item)}
						/>
					) : (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={item.name}
							style={styles.recentRow}
							onPress={() => navigation.navigate('TrainingDefinition', { id: item.id })}
						>
							<Text style={styles.recentName} numberOfLines={1}>
								{item.name}
							</Text>
						</Pressable>
					)
				)}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	content: {
		paddingHorizontal: 24,
		paddingVertical: 24,
		width: '100%',
		maxWidth: 480,
		alignSelf: 'center',
	},
	title: {
		fontSize: 22,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 16,
	},
	tabs: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 16,
	},
	tab: {
		flex: 1,
		minHeight: 40,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	tabOn: {
		backgroundColor: colors.accentMuted,
		borderColor: colors.accentBorder,
	},
	tabText: {
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '700',
	},
	tabTextOn: {
		color: colors.text,
	},
	empty: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.textMuted,
		marginBottom: 8,
	},
	recentRow: {
		backgroundColor: colors.bgElevated,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 14,
		marginBottom: 8,
	},
	recentName: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
});

export default TrainingStartScreen;

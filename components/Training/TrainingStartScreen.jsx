import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	FAVORITE_ADDED,
	FAVORITE_REMOVED,
	addTrainingFavorite,
	removeTrainingFavorite,
} from '../../helpers/training/trainingApi';
import {
	decorateFavoriteExercises,
	favoriteItemKey,
	playRouteFromFavoriteItem,
} from '../../helpers/training/exerciseVariantFavorites';
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
import TrainingEmptyState from './TrainingEmptyState';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';
import TrainingSegmentedControl from './TrainingSegmentedControl';

const TABS = [
	{ key: 'favorites', label: 'Ulubione' },
	{ key: 'recent', label: 'Ostatnie' },
];

function flattenFavorites(data) {
	const challenges = Array.isArray(data?.challenges) ? data.challenges : [];
	const plans = Array.isArray(data?.plans) ? data.plans : [];
	const exercises = decorateFavoriteExercises(data?.exercises ?? []);
	return [...challenges, ...plans, ...exercises];
}

function openItem(navigation, item) {
	if (item?.kind === 'exercise') {
		const route = playRouteFromFavoriteItem(item);
		if (route) {
			navigation.navigate(route.screen, route.params);
			return;
		}
	}
	navigation.navigate('TrainingDefinition', { id: item.id });
}

/**
 * Szybki start: Ulubione i Ostatnie. Ćwiczenia z wariantami startują od razu do gry.
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
		setRecent(decorateFavoriteExercises(Array.isArray(recentItems) ? recentItems : []));
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
	const emptyBody = tab === 'favorites'
		? 'Dodaj gwiazdkę przy wariancie ćwiczenia, planie lub wyzwaniu — pojawią się tutaj.'
		: 'Po starcie treningu ostatnie sesje pojawią się na tej liście.';

	const toggleFavorite = async (item) => {
		if (!auth?.accessToken || item.kind == null || item.id == null) {
			return;
		}
		const exerciseKey = item.exerciseKey || item.id;
		const variant = item.variant || null;
		const removing = Boolean(item.favorite) || tab === 'favorites';
		const result = removing
			? await removeTrainingFavorite(auth.accessToken, exerciseKey, item.kind, variant)
			: await addTrainingFavorite(auth.accessToken, exerciseKey, item.kind, variant);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się zapisać.');
			load();
			return;
		}
		if (result.data?.created) {
			show(FAVORITE_ADDED);
		}
		if (result.data?.removed) {
			show(FAVORITE_REMOVED);
		}
		if (tab === 'favorites' && removing) {
			const gone = favoriteItemKey(item);
			setFavorites((current) => current.filter((row) => favoriteItemKey(row) !== gone));
			await applyFavoriteRemoved(auth.userId, item.kind, {
				id: exerciseKey,
				exerciseKey,
				variant,
			});
			return;
		}
		load();
	};

	return (
		<View style={styles.container}>
			<TrainingNotice text={text} />
			<FlatList
				data={items}
				keyExtractor={(item) => item.key || favoriteItemKey(item) || `${item.kind}:${item.id}`}
				contentContainerStyle={styles.content}
				ListHeaderComponent={
					<View style={styles.header}>
						<Text style={styles.eyebrow}>Szybki start</Text>
						<Text style={styles.title}>Rozpocznij trening</Text>
						<TrainingSegmentedControl
							options={TABS}
							value={tab}
							onChange={selectTab}
							style={styles.tabs}
						/>
						{error ? <Text style={styles.error}>{error}</Text> : null}
						{loading && items.length === 0 ? <Text style={styles.loading}>Ładowanie…</Text> : null}
						{!loading && !error && items.length === 0 ? (
							<TrainingEmptyState
								icon={tab === 'favorites' ? 'star-outline' : 'time-outline'}
								title={tab === 'favorites' ? 'Brak ulubionych' : 'Brak ostatnich'}
								body={emptyBody}
								actionLabel={tab === 'favorites' ? 'Przejdź do biblioteki' : undefined}
								onAction={tab === 'favorites'
									? () => navigation.navigate('TrainingCatalog', { kind: 'exercises' })
									: undefined}
							/>
						) : null}
					</View>
				}
				renderItem={({ item }) => (
					tab === 'favorites' ? (
						<TrainingCard
							item={{ ...item, favorite: true }}
							onPress={() => openItem(navigation, item)}
							onToggleFavorite={() => toggleFavorite(item)}
						/>
					) : (
						<TrainingCard
							item={item}
							onPress={() => openItem(navigation, item)}
						/>
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
		padding: 20,
		paddingBottom: 40,
		gap: 10,
		flexGrow: 1,
	},
	header: {
		marginBottom: 4,
		gap: 8,
	},
	eyebrow: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	title: {
		color: colors.text,
		fontSize: 26,
		fontWeight: '800',
		letterSpacing: -0.4,
		marginBottom: 4,
	},
	tabs: {
		marginBottom: 8,
	},
	error: {
		color: colors.warning,
		fontSize: 14,
		lineHeight: 20,
	},
	loading: {
		color: colors.textMuted,
		fontSize: 14,
	},
});

export default TrainingStartScreen;

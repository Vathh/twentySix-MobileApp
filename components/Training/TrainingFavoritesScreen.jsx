import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	FAVORITE_REMOVED,
	removeTrainingFavorite,
	reorderTrainingFavorites,
} from '../../helpers/training/trainingApi';
import {
	decorateFavoriteExercises,
	favoriteItemKey,
	playRouteFromFavoriteItem,
} from '../../helpers/training/exerciseVariantFavorites';
import {
	EMPTY_FAVORITES,
	applyFavoriteRemoved,
	loadCachedFavorites,
	refreshFavorites,
	replaceFavoriteList,
} from '../../helpers/training/favoritesCache';
import { colors } from '../../theme/colors';
import TrainingCard from './TrainingCard';
import TrainingEmptyState from './TrainingEmptyState';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';
import TrainingSegmentedControl from './TrainingSegmentedControl';

const TABS = [
	{ key: 'challenges', label: 'Wyzwania' },
	{ key: 'plans', label: 'Plany' },
	{ key: 'exercises', label: 'Ćwiczenia' },
];

const EMPTY = EMPTY_FAVORITES;

const sameOrder = (left, right) =>
	left.length === right.length
	&& left.every((item, index) => favoriteItemKey(item) === favoriteItemKey(right[index]));

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
 * Zakładka startuje od Wyzwań przy każdym wejściu. Aplikacja jej nie zapamiętuje.
 * Ćwiczenia z wariantami: osobne kafelki → od razu do gry.
 */
const TrainingFavoritesScreen = ({ navigation }) => {
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const [tab, setTab] = useState('challenges');
	const [lists, setLists] = useState(EMPTY);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		if (!auth?.accessToken) {
			setLoading(false);
			setError('Zaloguj się, żeby zobaczyć ulubione.');
			return;
		}
		const cached = await loadCachedFavorites(auth.userId);
		if (cached) {
			setLists(cached);
			setError(null);
			setLoading(false);
		} else {
			setLoading(true);
		}
		const refreshed = await refreshFavorites(auth.userId, auth.accessToken);
		if (!refreshed) {
			if (!cached) {
				setError('Nie udało się wczytać ulubionych.');
			}
			setLoading(false);
			return;
		}
		setLists(refreshed);
		setError(null);
		setLoading(false);
	}, [auth?.accessToken, auth?.userId]);

	useFocusEffect(
		useCallback(() => {
			setTab('challenges');
			load();
		}, [load]),
	);

	const stored = lists[tab] ?? [];
	const items = tab === 'exercises' ? decorateFavoriteExercises(stored) : stored;

	const remove = async (item) => {
		if (!auth?.accessToken) {
			return;
		}
		const exerciseKey = item.exerciseKey || item.id;
		const variant = item.variant || null;
		const result = await removeTrainingFavorite(
			auth.accessToken,
			exerciseKey,
			item.kind,
			item.kind === 'exercise' ? variant : null,
		);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się zapisać.');
			load();
			return;
		}
		if (result.data?.removed) {
			show(FAVORITE_REMOVED);
			const next = await applyFavoriteRemoved(
				auth.userId,
				item.kind,
				item.kind === 'exercise'
					? { id: exerciseKey, exerciseKey, variant }
					: item.id,
			);
			if (next) {
				setLists(next);
			}
		}
	};

	const reorder = async (next) => {
		if (!auth?.accessToken || sameOrder(items, next)) {
			return;
		}
		setLists((current) => ({
			...current,
			[tab]: next,
		}));
		await replaceFavoriteList(auth.userId, tab, next);
		const result = await reorderTrainingFavorites(
			auth.accessToken,
			tab,
			tab === 'exercises'
				? next.map((item) => ({
					exerciseKey: item.exerciseKey || item.id,
					variant: item.variant || '',
				}))
				: next.map((item) => item.id),
		);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się zapisać kolejności.');
			load();
			return;
		}
		if (Array.isArray(result.data?.items)) {
			setLists((current) => ({ ...current, [tab]: result.data.items }));
			await replaceFavoriteList(auth.userId, tab, result.data.items);
		}
	};

	return (
		<View style={styles.container}>
			<TrainingNotice text={text} />
			<View style={styles.header}>
				<Text style={styles.eyebrow}>Twoje</Text>
				<Text style={styles.title}>Ulubione</Text>
				<TrainingSegmentedControl
					options={TABS}
					value={tab}
					onChange={setTab}
					style={styles.tabs}
				/>
				{error ? <Text style={styles.empty}>{error}</Text> : null}
				{loading && items.length === 0 ? <Text style={styles.empty}>Ładowanie…</Text> : null}
				{!loading && !error && items.length === 0 ? (
					<TrainingEmptyState
						icon="star-outline"
						title="Brak ulubionych"
						body="Dodaj gwiazdkę przy wariancie ćwiczenia, planie lub wyzwaniu."
					/>
				) : null}
			</View>
			{items.length > 0 ? (
				<DraggableFlatList
					key={tab}
					data={items}
					keyExtractor={(item) => favoriteItemKey(item)}
					onDragEnd={({ data }) => reorder(data)}
					containerStyle={styles.list}
					contentContainerStyle={styles.listContent}
					renderItem={({ item, drag, isActive }) => (
						<ScaleDecorator>
							<TrainingCard
								item={{ ...item, favorite: true }}
								dragging={isActive}
								drag={drag}
								onPress={() => openItem(navigation, item)}
								onToggleFavorite={() => remove(item)}
							/>
						</ScaleDecorator>
					)}
				/>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	header: {
		paddingHorizontal: 24,
		paddingTop: 24,
		width: '100%',
		maxWidth: 480,
		alignSelf: 'center',
	},
	eyebrow: {
		color: colors.accent,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
		marginBottom: 6,
	},
	title: {
		fontSize: 26,
		fontWeight: '800',
		color: colors.text,
		letterSpacing: -0.3,
		marginBottom: 16,
	},
	tabs: {
		marginBottom: 16,
	},
	empty: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.textMuted,
		marginBottom: 8,
	},
	list: {
		flex: 1,
	},
	listContent: {
		paddingHorizontal: 24,
		paddingBottom: 24,
		width: '100%',
		maxWidth: 480,
		alignSelf: 'center',
	},
});

export default TrainingFavoritesScreen;

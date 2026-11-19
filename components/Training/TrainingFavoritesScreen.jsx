import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	FAVORITE_REMOVED,
	fetchTrainingFavorites,
	removeTrainingFavorite,
	reorderTrainingFavorites,
} from '../../helpers/training/trainingApi';
import { colors } from '../../theme/colors';
import TrainingCard from './TrainingCard';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';

const TABS = [
	{ key: 'challenges', label: 'Wyzwania' },
	{ key: 'plans', label: 'Plany' },
	{ key: 'exercises', label: 'Ćwiczenia' },
];

const EMPTY = { challenges: [], plans: [], exercises: [] };

const sameOrder = (left, right) =>
	left.length === right.length && left.every((item, index) => item.id === right[index]?.id);

/**
 * Zakładka startuje od Wyzwań przy każdym wejściu. Aplikacja jej nie zapamiętuje.
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
		const result = await fetchTrainingFavorites(auth.accessToken);
		if (!result.ok) {
			setError(result.data?.message || 'Nie udało się wczytać ulubionych.');
			setLoading(false);
			return;
		}
		setLists({
			challenges: result.data?.challenges ?? [],
			plans: result.data?.plans ?? [],
			exercises: result.data?.exercises ?? [],
		});
		setError(null);
		setLoading(false);
	}, [auth?.accessToken]);

	useFocusEffect(
		useCallback(() => {
			setTab('challenges');
			load();
		}, [load]),
	);

	const items = lists[tab] ?? [];

	const remove = async (item) => {
		if (!auth?.accessToken) {
			return;
		}
		const result = await removeTrainingFavorite(auth.accessToken, item.id, item.kind);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się zapisać.');
			return;
		}
		if (result.data?.removed) {
			show(FAVORITE_REMOVED);
			setLists((current) => ({
				...current,
				[tab]: (current[tab] ?? []).filter((row) => row.id !== item.id),
			}));
		}
	};

	const reorder = async (next) => {
		if (!auth?.accessToken || sameOrder(items, next)) {
			return;
		}
		setLists((current) => ({ ...current, [tab]: next }));
		const result = await reorderTrainingFavorites(
			auth.accessToken,
			tab,
			next.map((item) => item.id),
		);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się zapisać kolejności.');
			load();
			return;
		}
		if (Array.isArray(result.data?.items)) {
			setLists((current) => ({ ...current, [tab]: result.data.items }));
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TrainingNotice text={text} />
				<Text style={styles.title}>Ulubione</Text>
				<View style={styles.tabs}>
					{TABS.map((item) => {
						const selected = item.key === tab;
						return (
							<Pressable
								key={item.key}
								accessibilityRole="button"
								accessibilityState={{ selected }}
								onPress={() => setTab(item.key)}
								style={[styles.tab, selected && styles.tabOn]}
							>
								<Text style={[styles.tabText, selected && styles.tabTextOn]}>{item.label}</Text>
							</Pressable>
						);
					})}
				</View>
				{error ? <Text style={styles.empty}>{error}</Text> : null}
				{loading && items.length === 0 ? <Text style={styles.empty}>Ładowanie…</Text> : null}
				{!loading && !error && items.length === 0 ? (
					<Text style={styles.empty}>Brak ulubionych.</Text>
				) : null}
			</View>
			{items.length > 0 ? (
				<DraggableFlatList
					key={tab}
					data={items}
					keyExtractor={(item) => String(item.id)}
					onDragEnd={({ data }) => reorder(data)}
					containerStyle={styles.list}
					contentContainerStyle={styles.listContent}
					renderItem={({ item, drag, isActive }) => (
						<ScaleDecorator>
							<TrainingCard
								item={item}
								dragging={isActive}
								drag={drag}
								onPress={() => navigation.navigate('TrainingDefinition', { id: item.id })}
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
		alignItems: 'center',
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: colors.bgElevated,
	},
	tabOn: {
		backgroundColor: colors.accent,
	},
	tabText: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
	},
	tabTextOn: {
		color: colors.onAccent,
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

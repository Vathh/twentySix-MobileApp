import React, { useCallback, useState } from 'react';
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
	loadCachedCatalog,
	refreshCatalogKind,
	saveCachedCatalog,
} from '../../helpers/training/catalogCache';
import {
	applyFavoriteCreated,
	applyFavoriteRemoved,
} from '../../helpers/training/favoritesCache';
import { groupBobsCatalog } from '../../helpers/training/bobs27Group';
import { groupClockCatalog } from '../../helpers/training/clockGroup';
import { colors } from '../../theme/colors';
import { TRAINING_SECTIONS } from './trainingSections';
import TrainingCard from './TrainingCard';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';

const TITLES = {
	plans: 'Plany treningowe',
	exercises: 'Biblioteka',
	challenges: 'Wyzwania',
};

function presentExercises(exerciseRows, challengeRows = []) {
	return [
		...groupBobsCatalog(groupClockCatalog(exerciseRows)),
		...(Array.isArray(challengeRows) ? challengeRows : []),
	];
}

function present(kind, rows, challengeRows) {
	return kind === 'exercises' ? presentExercises(rows, challengeRows) : rows;
}

/**
 * Lista z lokalnego cache; odświeżenie w tle podmienia, gdy serwer ma coś innego.
 * Biblioteka łączy ćwiczenia z wyzwaniami (np. 54-Dart).
 */
const TrainingCatalogScreen = ({ navigation, route }) => {
	const kind = route?.params?.kind;
	const section = TRAINING_SECTIONS[kind] ?? { empty: 'Brak pozycji.' };
	const title = route?.params?.title || TITLES[kind] || 'Trening';
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const [items, setItems] = useState([]);
	const [rawItems, setRawItems] = useState([]);
	const [challengeItems, setChallengeItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		if (!auth?.accessToken || !kind) {
			setLoading(false);
			setError('Zaloguj się, żeby zobaczyć tę listę.');
			return;
		}
		const cached = await loadCachedCatalog(auth.userId, kind);
		const cachedChallenges = kind === 'exercises'
			? await loadCachedCatalog(auth.userId, 'challenges')
			: null;
		const hasCachedLibrary = Boolean(
			(cached && cached.length > 0)
			|| (kind === 'exercises' && cachedChallenges && cachedChallenges.length > 0),
		);
		if (hasCachedLibrary) {
			setRawItems(cached ?? []);
			setChallengeItems(cachedChallenges ?? []);
			setItems(present(kind, cached ?? [], cachedChallenges));
			setError(null);
			setLoading(false);
		} else {
			setLoading(true);
		}

		const refreshed = await refreshCatalogKind(auth.userId, auth.accessToken, kind);
		const refreshedChallenges = kind === 'exercises'
			? await refreshCatalogKind(auth.userId, auth.accessToken, 'challenges')
			: null;
		if (!refreshed) {
			if (!hasCachedLibrary) {
				setError('Nie udało się wczytać listy.');
			}
			setLoading(false);
			return;
		}
		const nextChallenges = refreshedChallenges?.items ?? cachedChallenges ?? [];
		setRawItems(refreshed.items);
		setChallengeItems(nextChallenges);
		setItems(present(kind, refreshed.items, nextChallenges));
		setError(null);
		setLoading(false);
	}, [auth?.accessToken, auth?.userId, kind]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	const toggle = async (item) => {
		if (!auth?.accessToken || (item.inactive && !item.favorite)) {
			return;
		}
		const result = item.favorite
			? await removeTrainingFavorite(auth.accessToken, item.id, item.kind)
			: await addTrainingFavorite(auth.accessToken, item.id, item.kind);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się zapisać.');
			return;
		}
		if (result.data?.created) {
			show(FAVORITE_ADDED);
		}
		if (result.data?.removed) {
			show(FAVORITE_REMOVED);
		}
		const favorite = item.favorite ? result.data?.removed === false : true;
		if (favorite) {
			await applyFavoriteCreated(auth.userId, item.kind, result.data?.item ?? { ...item, favorite: true });
		} else {
			await applyFavoriteRemoved(auth.userId, item.kind, item.id);
		}
		if (kind === 'exercises' && item.kind === 'challenge') {
			const nextChallenges = challengeItems.map((row) => (
				row.id === item.id ? { ...row, favorite } : row
			));
			setChallengeItems(nextChallenges);
			setItems(present(kind, rawItems, nextChallenges));
			await saveCachedCatalog(auth.userId, 'challenges', nextChallenges);
			return;
		}
		const nextRaw = rawItems.map((row) => (row.id === item.id ? { ...row, favorite } : row));
		setRawItems(nextRaw);
		setItems(present(kind, nextRaw, challengeItems));
		await saveCachedCatalog(auth.userId, kind, nextRaw);
	};

	return (
		<View style={styles.container}>
			<TrainingNotice text={text} />
			<FlatList
				data={items}
				keyExtractor={(item) => `${item.kind}:${item.id}`}
				contentContainerStyle={styles.content}
				ListHeaderComponent={
					<View>
						<Text style={styles.title}>{title}</Text>
						{error ? <Text style={styles.empty}>{error}</Text> : null}
						{loading && items.length === 0 ? <Text style={styles.empty}>Ładowanie…</Text> : null}
						{!loading && !error && items.length === 0 ? (
							<Text style={styles.empty}>{section.empty}</Text>
						) : null}
					</View>
				}
				renderItem={({ item }) => (
					<TrainingCard
						item={item}
						onPress={() => navigation.navigate('TrainingDefinition', { id: item.id })}
						onToggleFavorite={() => toggle(item)}
					/>
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
	empty: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.textMuted,
		marginBottom: 8,
	},
});

export default TrainingCatalogScreen;

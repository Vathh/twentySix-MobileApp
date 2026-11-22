import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { hasDetailVariantFavorites } from '../../helpers/training/exerciseVariantFavorites';
import { colors } from '../../theme/colors';
import { TRAINING_SECTIONS } from './trainingSections';
import TrainingCard from './TrainingCard';
import TrainingEmptyState from './TrainingEmptyState';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';

const TITLES = {
	plans: 'Plany treningowe',
	exercises: 'Biblioteka',
	challenges: 'Wyzwania',
	events: 'Eventy',
};

function byNamePl(left, right) {
	return String(left?.name ?? '').localeCompare(String(right?.name ?? ''), 'pl', {
		sensitivity: 'base',
	});
}

function presentExercises(exerciseRows, challengeRows = []) {
	const grouped = [
		...groupBobsCatalog(groupClockCatalog(exerciseRows)),
		...(Array.isArray(challengeRows) ? challengeRows : []),
	];
	return grouped.slice().sort(byNamePl);
}

function present(kind, rows, challengeRows) {
	return kind === 'exercises' ? presentExercises(rows, challengeRows) : rows;
}

function countLabel(count) {
	if (count === 1) {
		return '1 pozycja';
	}
	if (count > 1 && count < 5) {
		return `${count} pozycje`;
	}
	return `${count} pozycji`;
}

/**
 * Lista z lokalnego cache; odświeżenie w tle podmienia, gdy serwer ma coś innego.
 * Biblioteka łączy ćwiczenia z wyzwaniami (np. 54-Dart), sort A–Z i lokalne wyszukiwanie.
 */
const TrainingCatalogScreen = ({ navigation, route }) => {
	const kind = route?.params?.kind;
	const section = TRAINING_SECTIONS[kind] ?? { empty: 'Brak pozycji.', icon: 'library-outline' };
	const title = route?.params?.title || TITLES[kind] || 'Trening';
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const [items, setItems] = useState([]);
	const [rawItems, setRawItems] = useState([]);
	const [challengeItems, setChallengeItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [query, setQuery] = useState('');

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

	const filteredItems = useMemo(() => {
		const needle = query.trim().toLocaleLowerCase('pl');
		if (!needle || kind !== 'exercises') {
			return items;
		}
		return items.filter((item) => String(item?.name ?? '').toLocaleLowerCase('pl').includes(needle));
	}, [items, kind, query]);

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

	const showSearch = kind === 'exercises';
	const needle = query.trim();
	const listEmpty = !loading && !error && items.length === 0;
	const filterEmpty = !loading && !error && items.length > 0 && filteredItems.length === 0;

	return (
		<View style={styles.container}>
			<TrainingNotice text={text} />
			<FlatList
				data={filteredItems}
				keyExtractor={(item) => `${item.kind}:${item.id}`}
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				ListHeaderComponent={
					<View style={styles.header}>
						<Text style={styles.eyebrow}>Katalog</Text>
						<Text style={styles.title}>{title}</Text>
						{section.hint ? <Text style={styles.subtitle}>{section.hint}</Text> : null}
						{showSearch ? (
							<TextInput
								style={styles.search}
								value={query}
								onChangeText={setQuery}
								placeholder="Szukaj ćwiczenia"
								placeholderTextColor={colors.placeholder}
								autoCapitalize="none"
								autoCorrect={false}
								clearButtonMode="while-editing"
							/>
						) : null}
						{!loading && !error && filteredItems.length > 0 ? (
							<Text style={styles.count}>{countLabel(filteredItems.length)}</Text>
						) : null}
						{error ? <Text style={styles.error}>{error}</Text> : null}
						{loading && items.length === 0 ? <Text style={styles.loading}>Ładowanie…</Text> : null}
						{listEmpty ? (
							<TrainingEmptyState
								icon={section.icon}
								title={section.empty}
								body="Sprawdź później albo wybierz inną sekcję z hubu Trening."
							/>
						) : null}
						{filterEmpty ? (
							<TrainingEmptyState
								icon="search-outline"
								title="Brak wyników"
								body={`Nic nie pasuje do „${needle}”. Spróbuj innej frazy.`}
							/>
						) : null}
					</View>
				}
				renderItem={({ item }) => (
					<TrainingCard
						item={item}
						onPress={() => navigation.navigate('TrainingDefinition', { id: item.id })}
						onToggleFavorite={
							item.kind === 'exercise' && hasDetailVariantFavorites(item)
								? undefined
								: () => toggle(item)
						}
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
	header: {
		marginBottom: 8,
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
	},
	subtitle: {
		marginTop: 6,
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 4,
	},
	search: {
		marginTop: 14,
		marginBottom: 4,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
		color: colors.text,
		fontSize: 15,
	},
	count: {
		marginTop: 10,
		marginBottom: 8,
		color: colors.textDim,
		fontSize: 13,
		fontWeight: '700',
	},
	error: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.dangerText,
		marginTop: 8,
		marginBottom: 8,
	},
	loading: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.textMuted,
		marginTop: 8,
		marginBottom: 8,
	},
});

export default TrainingCatalogScreen;

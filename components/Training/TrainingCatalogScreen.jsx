import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import {
	FAVORITE_ADDED,
	FAVORITE_REMOVED,
	addTrainingFavorite,
	fetchTrainingCatalog,
	removeTrainingFavorite,
} from '../../helpers/training/trainingApi';
import { colors } from '../../theme/colors';
import { TRAINING_SECTIONS } from './trainingSections';
import TrainingCard from './TrainingCard';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';

const TITLES = {
	plans: 'Plany',
	exercises: 'Biblioteka ćwiczeń',
	challenges: 'Wyzwania',
};

/**
 * Lista aktywnych definicji, żeby gwiazdka miała gdzie stać.
 * Wyszukiwarka i filtr trudności dochodzą z katalogiem ćwiczeń.
 */
const TrainingCatalogScreen = ({ navigation, route }) => {
	const kind = route?.params?.kind;
	const section = TRAINING_SECTIONS[kind] ?? { empty: 'Brak pozycji.' };
	const title = route?.params?.title || TITLES[kind] || 'Trening';
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		if (!auth?.accessToken || !kind) {
			setLoading(false);
			setError('Zaloguj się, żeby zobaczyć tę listę.');
			return;
		}
		const result = await fetchTrainingCatalog(auth.accessToken, kind);
		if (!result.ok) {
			setError(result.data?.message || 'Nie udało się wczytać listy.');
			setLoading(false);
			return;
		}
		setItems(Array.isArray(result.data?.items) ? result.data.items : []);
		setError(null);
		setLoading(false);
	}, [auth?.accessToken, kind]);

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
		setItems((current) =>
			current.map((row) => (row.id === item.id ? { ...row, favorite } : row)),
		);
	};

	return (
		<View style={styles.container}>
			<FlatList
				data={items}
				keyExtractor={(item) => String(item.id)}
				contentContainerStyle={styles.content}
				ListHeaderComponent={
					<View>
						<TrainingNotice text={text} />
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

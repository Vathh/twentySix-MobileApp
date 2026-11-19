import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { loadCachedDefinition, saveCachedDefinition } from '../../helpers/training/definitionCache';
import { canPlayClock } from '../../helpers/training/clockExercise';
import { canPlayLooseThrows } from '../../helpers/training/looseThrowsExercise';
import { canPlaySectorClock } from '../../helpers/training/sectorClockExercise';
import {
	FAVORITE_ADDED,
	FAVORITE_REMOVED,
	addTrainingFavorite,
	fetchTrainingDefinition,
	removeTrainingFavorite,
} from '../../helpers/training/trainingApi';
import { trainingInitials } from '../../helpers/training/trainingInitials';
import { trainingMeta } from '../../helpers/training/trainingMeta';
import { colors } from '../../theme/colors';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';
import TrainingStar from './TrainingStar';

const TrainingDefinitionScreen = ({ navigation, route }) => {
	const id = route?.params?.id;
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const [item, setItem] = useState(null);
	const [error, setError] = useState(null);
	const [imageFailed, setImageFailed] = useState(false);

	const load = useCallback(async () => {
		if (!auth?.accessToken || !id) {
			setError('Zaloguj się, żeby zobaczyć tę treść.');
			return;
		}
		const result = await fetchTrainingDefinition(auth.accessToken, id);
		if (!result.ok) {
			if (result.status !== 404 && result.status !== 401) {
				const cached = await loadCachedDefinition(auth.userId, id);
				if (cached) {
					setItem(cached);
					setError(null);
					setImageFailed(false);
					return;
				}
			}
			setItem(null);
			setError(result.data?.message || 'Nie ma takiej treści.');
			return;
		}
		setItem(result.data);
		setError(null);
		setImageFailed(false);
		await saveCachedDefinition(auth.userId, result.data);
	}, [auth?.accessToken, auth?.userId, id]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	const toggle = async () => {
		if (!auth?.accessToken || !item || (item.inactive && !item.favorite)) {
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
		const next = {
			...item,
			favorite: item.favorite ? result.data?.removed === false : true,
		};
		setItem(next);
		await saveCachedDefinition(auth.userId, next);
	};

	const meta = trainingMeta(item);
	const showImage = Boolean(item?.imageUrl) && !imageFailed;

	return (
		<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
			<TrainingNotice text={text} />
			{error ? <Text style={styles.empty}>{error}</Text> : null}
			{item ? (
				<View>
					<View style={styles.head}>
						{showImage ? (
							<Image
								source={{ uri: item.imageUrl }}
								style={styles.mark}
								onError={() => setImageFailed(true)}
							/>
						) : (
							<View style={styles.mark}>
								<Text style={styles.initials}>{trainingInitials(item.name)}</Text>
							</View>
						)}
						<View style={styles.copy}>
							<Text style={styles.title}>{item.name}</Text>
							{meta ? <Text style={styles.meta}>{meta}</Text> : null}
						</View>
						<TrainingStar
							favorite={item.favorite}
							disabled={item.inactive && !item.favorite}
							onPress={toggle}
						/>
					</View>
					{item.inactive ? (
						<Text style={styles.inactive}>Nieaktywne. Nie da się tego rozpocząć.</Text>
					) : null}
					{item.description ? <Text style={styles.description}>{item.description}</Text> : null}
					{canPlayClock(item) || canPlaySectorClock(item) || canPlayLooseThrows(item) ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Rozpocznij"
							style={styles.start}
							onPress={() => navigation.navigate('TrainingExercise', { definition: item })}
						>
							<Text style={styles.startText}>Rozpocznij</Text>
						</Pressable>
					) : null}
					{item.kind === 'exercise' && !item.inactive && !canPlayClock(item) && !canPlaySectorClock(item) && !canPlayLooseThrows(item) ? (
						<Text style={styles.later}>To ćwiczenie nie jest jeszcze dostępne.</Text>
					) : null}
				</View>
			) : null}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scroll: {
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
	head: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	mark: {
		width: 64,
		height: 64,
		borderRadius: 14,
		backgroundColor: colors.accentMuted,
		alignItems: 'center',
		justifyContent: 'center',
	},
	initials: {
		color: colors.accent,
		fontSize: 18,
		fontWeight: '700',
	},
	copy: {
		flex: 1,
	},
	title: {
		fontSize: 22,
		fontWeight: '600',
		color: colors.text,
	},
	meta: {
		marginTop: 4,
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
	},
	inactive: {
		marginTop: 16,
		color: colors.warning,
		fontSize: 15,
		fontWeight: '700',
	},
	description: {
		marginTop: 16,
		color: colors.textSecondary,
		fontSize: 15,
		lineHeight: 22,
	},
	start: {
		marginTop: 24,
		minHeight: 48,
		borderRadius: 10,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	startText: {
		color: colors.onAccent,
		fontSize: 16,
		fontWeight: '700',
	},
	later: {
		marginTop: 24,
		color: colors.textMuted,
		fontSize: 15,
		lineHeight: 22,
	},
	empty: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.textMuted,
	},
});

export default TrainingDefinitionScreen;

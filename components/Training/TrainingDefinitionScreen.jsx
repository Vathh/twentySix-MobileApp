import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { loadCachedDefinition, saveCachedDefinition } from '../../helpers/training/definitionCache';
import { canPlayCatch20 } from '../../helpers/training/catch20Exercise';
import { canPlayCheckout41 } from '../../helpers/training/checkout41Exercise';
import { canPlayCheckoutBull81 } from '../../helpers/training/checkoutBull81Exercise';
import { canPlayScoring65 } from '../../helpers/training/scoring65Exercise';
import {
	SCORING_PRESSURE_VARIANTS,
	canPlayScoringPressure,
} from '../../helpers/training/scoringUnderPressureExercise';
import { canPlayClock } from '../../helpers/training/clockExercise';
import {
	CLOCK_NAME,
	CLOCK_VARIANTS,
	clockPlayDefinition,
	clockVariantId,
	isClockKey,
} from '../../helpers/training/clockGroup';
import { canPlayLooseThrows } from '../../helpers/training/looseThrowsExercise';
import { canPlayBob27Easy } from '../../helpers/training/bobs27EasyExercise';
import { canPlayBob27Hard } from '../../helpers/training/bobs27HardExercise';
import { canPlayBullCounter } from '../../helpers/training/bullCounterExercise';
import { NINE_DARTS_VARIANTS, canPlayNineDarts } from '../../helpers/training/nineDartsExercise';
import { canPlaySectorClock } from '../../helpers/training/sectorClockExercise';
import { canPlaySingles } from '../../helpers/training/singlesUnderPressureExercise';
import {
	FAVORITE_ADDED,
	FAVORITE_REMOVED,
	addTrainingFavorite,
	fetchTrainingDefinition,
	removeTrainingFavorite,
} from '../../helpers/training/trainingApi';
import { loadTrainingInputMode, saveTrainingInputMode } from '../../helpers/training/trainingInputMode';
import { trainingInitials } from '../../helpers/training/trainingInitials';
import { trainingMeta } from '../../helpers/training/trainingMeta';
import { SCORING_MODES } from '../../hooks/useGameSettings';
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
	const [inputMode, setInputMode] = useState(SCORING_MODES.SUM);
	const [variant, setVariant] = useState('20');
	const [dartVariant, setDartVariant] = useState('9');
	const [clockVariant, setClockVariant] = useState('fast');

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
					if (isClockKey(cached?.exerciseKey)) {
						setClockVariant(clockVariantId(cached.exerciseKey));
					}
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
		if (isClockKey(result.data?.exerciseKey)) {
			setClockVariant(clockVariantId(result.data.exerciseKey));
		}
		setError(null);
		setImageFailed(false);
		await saveCachedDefinition(auth.userId, result.data);
	}, [auth?.accessToken, auth?.userId, id]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	useEffect(() => {
		let live = true;
		loadTrainingInputMode(auth?.userId).then((mode) => {
			if (live) {
				setInputMode(mode);
			}
		});
		return () => {
			live = false;
		};
	}, [auth?.userId]);

	const chooseInputMode = (mode) => {
		setInputMode(mode);
		saveTrainingInputMode(auth?.userId, mode);
	};

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
	const scoreInput = Boolean(item && (canPlayCatch20(item) || canPlayCheckout41(item) || canPlayScoring65(item)));
	const playable = Boolean(
		item
		&& (
			canPlayClock(item)
			|| canPlaySectorClock(item)
			|| canPlayLooseThrows(item)
			|| canPlayNineDarts(item)
			|| canPlayBob27Easy(item)
			|| canPlayBob27Hard(item)
			|| canPlayBullCounter(item)
			|| canPlayCatch20(item)
			|| canPlayCheckout41(item)
			|| canPlayCheckoutBull81(item)
			|| canPlayScoring65(item)
			|| canPlayScoringPressure(item)
			|| canPlaySingles(item)
		),
	);

	return (
		<View style={styles.scroll}>
			<TrainingNotice text={text} />
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
							<Text style={styles.title}>{isClockKey(item.exerciseKey) ? CLOCK_NAME : item.name}</Text>
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
					{scoreInput ? (
						<View style={styles.modes}>
							{[
								[SCORING_MODES.SUM, 'Suma trzech rzutów'],
								[SCORING_MODES.PER_DART, 'Każdy rzut osobno'],
							].map(([mode, label]) => {
								const selected = inputMode === mode;
								return (
									<Pressable
										key={mode}
										accessibilityRole="button"
										accessibilityLabel={label}
										accessibilityState={{ selected }}
										onPress={() => chooseInputMode(mode)}
										style={[styles.mode, styles.variant, selected && styles.variantOn]}
									>
										<Text style={[styles.modeText, selected && styles.variantTextOn]}>{label}</Text>
									</Pressable>
								);
							})}
						</View>
					) : null}
					{canPlayNineDarts(item) ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Wariant</Text>
							{NINE_DARTS_VARIANTS.map((option) => {
								const selected = dartVariant === option.id;
								return (
									<Pressable
										key={option.id}
										accessibilityRole="button"
										accessibilityLabel={option.label}
										accessibilityState={{ selected }}
										onPress={() => setDartVariant(option.id)}
										style={[styles.mode, styles.variant, selected && styles.variantOn]}
									>
										<Text style={[styles.modeText, selected && styles.variantTextOn]}>{option.label}</Text>
									</Pressable>
								);
							})}
						</View>
					) : null}
					{isClockKey(item.exerciseKey) ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Wariant</Text>
							{CLOCK_VARIANTS.map((option) => {
								const selected = clockVariant === option.id;
								return (
									<Pressable
										key={option.id}
										accessibilityRole="button"
										accessibilityLabel={option.label}
										accessibilityState={{ selected }}
										onPress={() => setClockVariant(option.id)}
										style={[styles.mode, styles.variant, selected && styles.variantOn]}
									>
										<Text style={[styles.modeText, selected && styles.variantTextOn]}>{option.label}</Text>
									</Pressable>
								);
							})}
						</View>
					) : null}
					{canPlayScoringPressure(item) ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Wariant</Text>
							{SCORING_PRESSURE_VARIANTS.map((option) => {
								const selected = variant === option;
								return (
									<Pressable
										key={option}
										accessibilityRole="button"
										accessibilityLabel={`Wariant ${option}`}
										accessibilityState={{ selected }}
										onPress={() => setVariant(option)}
										style={[styles.mode, styles.variant, selected && styles.variantOn]}
									>
										<Text style={[styles.modeText, selected && styles.variantTextOn]}>{option}</Text>
									</Pressable>
								);
							})}
						</View>
					) : null}
					{playable ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Rozpocznij"
							style={styles.start}
							onPress={() => navigation.navigate('TrainingExercise', {
								definition: isClockKey(item.exerciseKey) ? clockPlayDefinition(item, clockVariant) : item,
								inputMode: scoreInput ? inputMode : undefined,
								variant: canPlayScoringPressure(item) ? variant : canPlayNineDarts(item) ? dartVariant : undefined,
							})}
						>
							<Text style={styles.startText}>Rozpocznij</Text>
						</Pressable>
					) : null}
					{item.kind === 'exercise' && !item.inactive && !playable ? (
						<Text style={styles.later}>To ćwiczenie nie jest jeszcze dostępne.</Text>
					) : null}
				</View>
				) : null}
			</ScrollView>
		</View>
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
	modes: {
		marginTop: 24,
		gap: 8,
	},
	variantCaption: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 4,
	},
	mode: {
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	variant: {
		borderWidth: 2,
	},
	variantOn: {
		backgroundColor: colors.bgElevated,
		borderColor: colors.accent,
	},
	modeText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	variantTextOn: {
		color: colors.accent,
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

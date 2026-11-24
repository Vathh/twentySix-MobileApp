import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { loadCachedDefinition, saveCachedDefinition } from '../../helpers/training/definitionCache';
import {
	applyFavoriteCreated,
	applyFavoriteRemoved,
	loadCachedFavorites,
	refreshFavorites,
} from '../../helpers/training/favoritesCache';
import { canPlayCatch20 } from '../../helpers/training/catch20Exercise';
import { canPlayCheckout41 } from '../../helpers/training/checkout41Exercise';
import { canPlayCheckoutBull81 } from '../../helpers/training/checkoutBull81Exercise';
import { canPlayScoring65 } from '../../helpers/training/scoring65Exercise';
import {
	canPlayScoringPressure,
} from '../../helpers/training/scoringUnderPressureExercise';
import { canPlayClock } from '../../helpers/training/clockExercise';
import {
	BOBS_NAME,
	bobsPlayDefinition,
	bobsVariantId,
	isBobsKey,
} from '../../helpers/training/bobs27Group';
import {
	CLOCK_NAME,
	clockPlayDefinition,
	clockVariantId,
	isClockKey,
} from '../../helpers/training/clockGroup';
import { canPlayLooseThrows } from '../../helpers/training/looseThrowsExercise';
import { canPlayBob27Easy } from '../../helpers/training/bobs27EasyExercise';
import { canPlayBob27Hard } from '../../helpers/training/bobs27HardExercise';
import { canPlayBullCounter } from '../../helpers/training/bullCounterExercise';
import { canPlayNineDarts } from '../../helpers/training/nineDartsExercise';
import { canPlaySectorClock } from '../../helpers/training/sectorClockExercise';
import { canPlaySingles } from '../../helpers/training/singlesUnderPressureExercise';
import { canPlayChallenge } from '../../helpers/training/challengeSession';
import { canPlayShanghaiDoubles } from '../../helpers/training/shanghaiDoublesExercises';
import {
	detailVariantOptions,
	hasDetailVariantFavorites,
	isVariantFavorited,
} from '../../helpers/training/exerciseVariantFavorites';
import {
	FAVORITE_ADDED,
	FAVORITE_REMOVED,
	addTrainingFavorite,
	fetchChallengeAttempts,
	fetchChallengeRanking,
	fetchTrainingDefinition,
	publishChallengeSession,
	removeTrainingFavorite,
	withdrawChallengePublication,
} from '../../helpers/training/trainingApi';
import { loadTrainingInputMode, saveTrainingInputMode } from '../../helpers/training/trainingInputMode';
import { trainingInitials } from '../../helpers/training/trainingInitials';
import { libraryInstructionsFor } from '../../helpers/training/exerciseLibraryInstructions';
import { trainingMeta } from '../../helpers/training/trainingMeta';
import { SCORING_MODES } from '../../hooks/useGameSettings';
import { colors } from '../../theme/colors';
import TrainingGuideAccordion from './TrainingGuideAccordion';
import TrainingKindChip from './TrainingKindChip';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';
import TrainingSegmentedControl from './TrainingSegmentedControl';
import TrainingStar from './TrainingStar';
import TrainingStickyStartBar from './TrainingStickyStartBar';

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
	const [bobsVariant, setBobsVariant] = useState('easy');
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewRows, setPreviewRows] = useState(() => new Set());
	const [challengeTab, setChallengeTab] = useState('info');
	const [ranking, setRanking] = useState(null);
	const [attempts, setAttempts] = useState(null);
	const [rankingLoading, setRankingLoading] = useState(false);
	const [publishingAttemptId, setPublishingAttemptId] = useState(null);
	const [favoriteExercises, setFavoriteExercises] = useState([]);

	const applyDefinition = (definition) => {
		setItem(definition);
		if (isClockKey(definition?.exerciseKey)) {
			setClockVariant(clockVariantId(definition.exerciseKey));
		}
		if (isBobsKey(definition?.exerciseKey)) {
			setBobsVariant(bobsVariantId(definition.exerciseKey));
		}
		setError(null);
		setImageFailed(false);
	};

	const load = useCallback(async () => {
		if (!id) {
			setError('Nie ma takiej treści.');
			return;
		}
		const cached = await loadCachedDefinition(auth?.userId, id);
		if (cached) {
			applyDefinition(cached);
		}
		if (!auth?.accessToken) {
			if (!cached) {
				setError('Zaloguj się, żeby zobaczyć tę treść.');
			}
			return;
		}
		const result = await fetchTrainingDefinition(auth.accessToken, id);
		if (!result.ok) {
			if (cached) {
				return;
			}
			setItem(null);
			setError(result.data?.message || 'Nie ma takiej treści.');
			return;
		}
		applyDefinition(result.data);
		await saveCachedDefinition(auth.userId, result.data);
	}, [auth?.accessToken, auth?.userId, id]);

	const loadFavoriteExercises = useCallback(async () => {
		if (!auth?.userId) {
			setFavoriteExercises([]);
			return;
		}
		const cached = await loadCachedFavorites(auth.userId);
		if (cached?.exercises) {
			setFavoriteExercises(cached.exercises);
		}
		if (!auth?.accessToken) {
			return;
		}
		const refreshed = await refreshFavorites(auth.userId, auth.accessToken);
		if (refreshed?.exercises) {
			setFavoriteExercises(refreshed.exercises);
		}
	}, [auth?.accessToken, auth?.userId]);

	useFocusEffect(
		useCallback(() => {
			load();
			loadFavoriteExercises();
		}, [load, loadFavoriteExercises]),
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

	const variantFavoriteOptions = item && hasDetailVariantFavorites(item)
		? detailVariantOptions(item)
		: [];

	const toggle = async () => {
		if (!auth?.accessToken || !item || (item.inactive && !item.favorite)) {
			return;
		}
		if (hasDetailVariantFavorites(item)) {
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
		if (next.favorite) {
			await applyFavoriteCreated(auth.userId, next.kind, result.data?.item ?? next);
		} else {
			await applyFavoriteRemoved(auth.userId, item.kind, item.id);
		}
	};

	const toggleVariantFavorite = async (optionKey) => {
		if (!auth?.accessToken || !item || item.inactive) {
			return;
		}
		const option = variantFavoriteOptions.find((row) => row.id === optionKey);
		if (!option) {
			return;
		}
		const favorited = isVariantFavorited(favoriteExercises, option.exerciseKey, option.variant);
		const result = favorited
			? await removeTrainingFavorite(
				auth.accessToken,
				option.exerciseKey,
				'exercise',
				option.variant || null,
			)
			: await addTrainingFavorite(
				auth.accessToken,
				option.exerciseKey,
				'exercise',
				option.variant || null,
			);
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
		const card = result.data?.item ?? {
			id: option.exerciseKey,
			exerciseKey: option.exerciseKey,
			kind: 'exercise',
			variant: option.variant || null,
			name: item.name,
			favorite: true,
		};
		if (favorited) {
			const nextLists = await applyFavoriteRemoved(auth.userId, 'exercise', {
				id: option.exerciseKey,
				exerciseKey: option.exerciseKey,
				variant: option.variant || null,
			});
			setFavoriteExercises(nextLists?.exercises ?? []);
		} else {
			const nextLists = await applyFavoriteCreated(auth.userId, 'exercise', card);
			setFavoriteExercises(nextLists?.exercises ?? []);
		}
	};

	const variantFavoriteProps = variantFavoriteOptions.length > 0
		? {
			isFavorite: (key) => {
				const option = variantFavoriteOptions.find((row) => row.id === key);
				return option
					? isVariantFavorited(favoriteExercises, option.exerciseKey, option.variant)
					: false;
			},
			onToggleFavorite: toggleVariantFavorite,
			favoriteDisabled: Boolean(item?.inactive),
		}
		: {};

	const meta = trainingMeta(item);
	const showImage = Boolean(item?.imageUrl) && !imageFailed;
	const isPlan = item?.kind === 'plan';
	const planItems = Array.isArray(item?.items) ? item.items : [];
	const scoreInput = Boolean(item && (canPlayCatch20(item) || canPlayCheckout41(item) || canPlayScoring65(item)));
	const libraryGuide = libraryInstructionsFor(item, {
		clockVariant,
		dartVariant,
		pressureVariant: variant,
		bobsVariant,
	});
	const guideNoun = item?.kind === 'challenge' ? 'wyzwania' : 'ćwiczenia';
	const playable = Boolean(
		item
		&& !isPlan
		&& item.kind !== 'challenge'
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
			|| canPlayShanghaiDoubles(item)
		),
	);
	const challengeStartable = Boolean(item && canPlayChallenge(item));
	const planStartable = Boolean(isPlan && !item.inactive && planItems.length > 0);
	const eventStartable = Boolean(
		item
		&& item.kind === 'event'
		&& !item.inactive
		&& item.status !== 'finished'
		&& item.status !== 'paused'
		&& Array.isArray(item.items)
		&& item.items.some((row) => row.kind === 'exercise'),
	);

	const loadChallengeExtras = useCallback(async () => {
		if (!auth?.accessToken || !item || item.kind !== 'challenge' || item.inactive) {
			return;
		}
		setRankingLoading(true);
		const [rankResult, attemptResult] = await Promise.all([
			fetchChallengeRanking(auth.accessToken, item.id),
			fetchChallengeAttempts(auth.accessToken, item.id),
		]);
		setRankingLoading(false);
		if (rankResult.ok) {
			setRanking(rankResult.data);
		}
		if (attemptResult.ok) {
			setAttempts(attemptResult.data);
		}
	}, [auth?.accessToken, item]);

	useEffect(() => {
		if (item?.kind === 'challenge' && challengeTab !== 'info') {
			loadChallengeExtras();
		}
	}, [item?.kind, challengeTab, loadChallengeExtras]);

	const canPublishAttempt = (row) => {
		if (!row?.id || row.published) {
			return false;
		}
		const publishedScore = attempts?.publishedScore;
		return publishedScore == null || Number(row.score) > Number(publishedScore);
	};

	const publishAttempt = async (row) => {
		if (!auth?.accessToken || !row?.id || publishingAttemptId || !canPublishAttempt(row)) {
			return;
		}
		setPublishingAttemptId(row.id);
		const result = await publishChallengeSession(auth.accessToken, row.id);
		setPublishingAttemptId(null);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się opublikować.');
			return;
		}
		show(result.data?.message || 'Opublikowano.');
		await loadChallengeExtras();
	};

	const togglePreviewRow = (position) => {
		setPreviewRows((prev) => {
			const next = new Set(prev);
			if (next.has(position)) {
				next.delete(position);
			} else {
				next.add(position);
			}
			return next;
		});
	};

	const planItemMeta = (row) => {
		if (row.kind === 'break') {
			return `${row.breakSeconds ?? 0} s`;
		}
		if (row.durationSeconds) {
			return `${row.durationSeconds} s`;
		}
		if (row.dartCount) {
			return `${row.dartCount} lotek`;
		}
		return '';
	};

	const displayName = item
		? (isClockKey(item.exerciseKey)
			? CLOCK_NAME
			: isBobsKey(item.exerciseKey)
				? BOBS_NAME
				: item.name)
		: '';

	const startAction = (() => {
		if (playable) {
			return {
				label: 'Rozpocznij',
				onPress: () => navigation.navigate('TrainingExercise', {
					definition: isClockKey(item.exerciseKey)
						? clockPlayDefinition(item, clockVariant)
						: isBobsKey(item.exerciseKey)
							? bobsPlayDefinition(item, bobsVariant)
							: item,
					inputMode: scoreInput ? inputMode : undefined,
					variant: canPlayScoringPressure(item) ? variant : canPlayNineDarts(item) ? dartVariant : undefined,
				}),
			};
		}
		if (challengeStartable) {
			return {
				label: 'Rozpocznij',
				onPress: () => navigation.navigate('TrainingChallenge', { definition: item }),
			};
		}
		if (eventStartable) {
			return {
				label: 'Rozpocznij',
				onPress: () => navigation.navigate('TrainingEvent', { event: item }),
			};
		}
		if (planStartable) {
			return {
				label: 'Rozpocznij plan',
				onPress: () => navigation.navigate('TrainingPlan', { plan: item }),
			};
		}
		return null;
	})();

	const guideSections = libraryGuide
		? [
			{ key: 'goal', title: `Cel ${guideNoun}`, body: libraryGuide.goal },
			{ key: 'how', title: 'Jak wykonywać ćwiczenia?', lines: libraryGuide.how },
			{ key: 'scoring', title: 'Zasady punktacji', lines: libraryGuide.scoring },
			{ key: 'limit', title: 'Czas / liczba lotek', body: libraryGuide.limit },
		]
		: [];

	return (
		<View style={styles.screen}>
			<TrainingNotice text={text} />
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[styles.content, startAction ? styles.contentWithBar : null]}
			>
				{error ? <Text style={styles.empty}>{error}</Text> : null}
				{item ? (
				<View>
					<View style={styles.hero}>
						{showImage ? (
							<Image
								source={{ uri: item.imageUrl }}
								style={styles.heroMark}
								onError={() => setImageFailed(true)}
							/>
						) : (
							<View style={styles.heroMark}>
								<Text style={styles.heroInitials}>{trainingInitials(displayName)}</Text>
							</View>
						)}
						<View style={styles.heroCopy}>
							{item.kind ? <TrainingKindChip kind={item.kind} style={styles.kindChip} /> : null}
							<Text style={styles.title}>{displayName}</Text>
							{meta ? <Text style={styles.meta}>{meta}</Text> : null}
						</View>
						{hasDetailVariantFavorites(item) ? null : (
							<TrainingStar
								favorite={item.favorite}
								disabled={item.inactive && !item.favorite}
								onPress={toggle}
							/>
						)}
					</View>
					{item.inactive ? (
						<Text style={styles.inactive}>Nieaktywne. Nie da się tego rozpocząć.</Text>
					) : null}
					{item.kind === 'challenge' ? (
						<TrainingSegmentedControl
							options={[
								{ key: 'info', label: 'Opis' },
								{ key: 'ranking', label: 'Ranking' },
								{ key: 'history', label: 'Historia' },
							]}
							value={challengeTab}
							onChange={setChallengeTab}
							style={styles.tabs}
						/>
					) : null}
					{(item.kind !== 'challenge' || challengeTab === 'info') && item.description ? (
						<Text style={styles.description}>{item.description}</Text>
					) : null}
					{item.kind === 'challenge' && challengeTab === 'ranking' ? (
						<View style={styles.challengeBlock}>
							{rankingLoading && !ranking ? <Text style={styles.meta}>Ładowanie…</Text> : null}
							{ranking?.emptyMessage ? <Text style={styles.empty}>{ranking.emptyMessage}</Text> : null}
							{(ranking?.items || []).map((row) => (
								<View key={`${row.userId}-${row.place}`} style={styles.rankRow}>
									<Text style={styles.rankPlace}>{row.place}</Text>
									<Text style={styles.rankName}>{row.name}</Text>
									<Text style={styles.rankScore}>{row.score}</Text>
								</View>
							))}
							{ranking?.mine ? (
								<View style={[styles.rankRow, styles.rankMine]}>
									<Text style={styles.rankPlace}>{ranking.mine.place}</Text>
									<Text style={styles.rankName}>{ranking.mine.name} (Ty)</Text>
									<Text style={styles.rankScore}>{ranking.mine.score}</Text>
								</View>
							) : null}
							{ranking?.nextOffset != null ? (
								<Pressable
									accessibilityRole="button"
									style={styles.more}
									onPress={async () => {
										const more = await fetchChallengeRanking(auth.accessToken, item.id, {
											offset: ranking.nextOffset,
										});
										if (more.ok) {
											setRanking((prev) => ({
												...more.data,
												items: [...(prev?.items || []), ...(more.data.items || [])],
											}));
										}
									}}
								>
									<Text style={styles.moreText}>Pokaż więcej</Text>
								</Pressable>
							) : null}
							{attempts?.publishedScore != null ? (
								<Pressable
									accessibilityRole="button"
									style={styles.withdraw}
									onPress={async () => {
										const result = await withdrawChallengePublication(auth.accessToken, item.id);
										if (!result.ok) {
											show(result.data?.message || 'Nie udało się wycofać.');
											return;
										}
										show('Wycofano publikację.');
										loadChallengeExtras();
									}}
								>
									<Text style={styles.withdrawText}>Wycofaj publikację</Text>
								</Pressable>
							) : null}
						</View>
					) : null}
					{item.kind === 'challenge' && challengeTab === 'history' ? (
						<View style={styles.challengeBlock}>
							{(attempts?.items || []).length === 0 ? (
								<Text style={styles.empty}>Brak ukończonych prób.</Text>
							) : (
								(attempts?.items || []).map((row) => (
									<View key={row.id} style={styles.attemptRow}>
										<View style={styles.rankRow}>
											<Text style={styles.rankName}>
												{row.completedAt ? new Date(row.completedAt).toLocaleDateString('pl-PL') : '—'}
												{row.published ? ' · opublikowane' : ''}
											</Text>
											<Text style={styles.rankScore}>{row.score}</Text>
										</View>
										{canPublishAttempt(row) ? (
											<Pressable
												accessibilityRole="button"
												accessibilityLabel="Opublikuj wynik"
												style={styles.publishAttempt}
												disabled={publishingAttemptId != null}
												onPress={() => publishAttempt(row)}
											>
												<Text style={styles.publishAttemptText}>
													{publishingAttemptId === row.id ? 'Publikowanie…' : 'Opublikuj wynik'}
												</Text>
											</Pressable>
										) : null}
									</View>
								))
							)}
						</View>
					) : null}
					{isPlan && typeof item.completionCount === 'number' ? (
						<Text style={styles.meta}>Ukończenia: {item.completionCount}</Text>
					) : null}
					{isPlan ? (
						<View style={styles.previewBlock}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Podgląd planu"
								onPress={() => setPreviewOpen((open) => !open)}
								style={styles.previewToggle}
							>
								<Text style={styles.previewToggleText}>
									{previewOpen ? 'Zwiń podgląd planu' : 'Podgląd planu'}
								</Text>
							</Pressable>
							{previewOpen ? (
								<View style={styles.previewList}>
									{planItems.map((row) => {
										const expanded = previewRows.has(row.position);
										return (
											<View key={`${row.position}-${row.kind}-${row.exerciseKey || 'break'}`} style={styles.previewRow}>
												<Pressable
													accessibilityRole="button"
													onPress={() => row.kind === 'exercise' && togglePreviewRow(row.position)}
													style={styles.previewHead}
												>
													<Text style={styles.previewName}>
														{row.position}. {row.name || (row.kind === 'break' ? 'Przerwa' : row.exerciseKey)}
													</Text>
													<Text style={styles.previewMeta}>{planItemMeta(row)}</Text>
												</Pressable>
												{expanded && row.kind === 'exercise' ? (
													<Text style={styles.previewDescription}>
														{row.description
															|| libraryInstructionsFor(row)?.goal
															|| 'Ćwiczenie z biblioteki treningowej.'}
													</Text>
												) : null}
												{expanded && row.kind === 'break' && row.description ? (
													<Text style={styles.previewDescription}>{row.description}</Text>
												) : null}
											</View>
										);
									})}
								</View>
							) : null}
						</View>
					) : null}
					{scoreInput ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Tryb wpisywania</Text>
							<TrainingSegmentedControl
								options={[
									{ key: SCORING_MODES.SUM, label: 'Suma 3 rzutów' },
									{ key: SCORING_MODES.PER_DART, label: 'Każdy osobno' },
								]}
								value={inputMode}
								onChange={chooseInputMode}
							/>
						</View>
					) : null}
					{canPlayNineDarts(item) ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Wariant</Text>
							<TrainingSegmentedControl
								options={variantFavoriteOptions.map((option) => ({
									key: option.id,
									label: option.label,
								}))}
								value={dartVariant}
								onChange={setDartVariant}
								{...variantFavoriteProps}
							/>
						</View>
					) : null}
					{isClockKey(item.exerciseKey) ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Wariant</Text>
							<TrainingSegmentedControl
								options={variantFavoriteOptions.map((option) => ({
									key: option.id,
									label: option.label,
								}))}
								value={clockVariant}
								onChange={setClockVariant}
								{...variantFavoriteProps}
							/>
						</View>
					) : null}
					{isBobsKey(item.exerciseKey) ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Wariant</Text>
							<TrainingSegmentedControl
								options={variantFavoriteOptions.map((option) => ({
									key: option.id,
									label: option.label,
								}))}
								value={bobsVariant}
								onChange={setBobsVariant}
								{...variantFavoriteProps}
							/>
						</View>
					) : null}
					{canPlayScoringPressure(item) ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Wariant</Text>
							<TrainingSegmentedControl
								options={variantFavoriteOptions.map((option) => ({
									key: option.id,
									label: option.label,
								}))}
								value={variant}
								onChange={setVariant}
								{...variantFavoriteProps}
							/>
						</View>
					) : null}
					{libraryGuide && (item.kind !== 'challenge' || challengeTab === 'info') ? (
						<TrainingGuideAccordion sections={guideSections} />
					) : null}
					{item?.kind === 'event' && item.status === 'finished' ? (
						<Text style={styles.meta}>Event zakończony. Zobacz klasyfikację w Analizie (medale).</Text>
					) : null}
					{item?.kind === 'event' && item.status === 'paused' ? (
						<Text style={styles.inactive}>Event wstrzymany. Otwarte próby można dokończyć z banera.</Text>
					) : null}
					{item.kind === 'exercise' && !item.inactive && !playable ? (
						<Text style={styles.later}>To ćwiczenie nie jest jeszcze dostępne.</Text>
					) : null}
					{item.kind === 'challenge' && !item.inactive && !challengeStartable ? (
						<Text style={styles.later}>To wyzwanie nie jest jeszcze dostępne.</Text>
					) : null}
				</View>
				) : null}
			</ScrollView>
			{startAction ? (
				<TrainingStickyStartBar
					label={startAction.label}
					onPress={startAction.onPress}
				/>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
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
	contentWithBar: {
		paddingBottom: 32,
	},
	hero: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 14,
		paddingBottom: 4,
	},
	heroMark: {
		width: 76,
		height: 76,
		borderRadius: 18,
		backgroundColor: colors.accentMuted,
		borderWidth: 1,
		borderColor: colors.accentBorder,
		alignItems: 'center',
		justifyContent: 'center',
	},
	heroInitials: {
		color: colors.accent,
		fontSize: 22,
		fontWeight: '800',
	},
	heroCopy: {
		flex: 1,
		minWidth: 0,
		paddingTop: 2,
	},
	kindChip: {
		marginBottom: 8,
	},
	title: {
		fontSize: 24,
		fontWeight: '800',
		color: colors.text,
		letterSpacing: -0.3,
		lineHeight: 30,
	},
	meta: {
		marginTop: 6,
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
		marginTop: 22,
		gap: 8,
	},
	variantCaption: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 2,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	later: {
		marginTop: 24,
		color: colors.textMuted,
		fontSize: 15,
		lineHeight: 22,
	},
	previewBlock: {
		marginTop: 20,
	},
	previewToggle: {
		minHeight: 46,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		backgroundColor: colors.bgElevated,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 12,
	},
	previewToggleText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	previewList: {
		marginTop: 12,
		gap: 8,
	},
	previewRow: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: colors.bgElevated,
	},
	previewHead: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	previewName: {
		flex: 1,
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
	},
	previewMeta: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '600',
	},
	previewDescription: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		color: colors.textSecondary,
		fontSize: 14,
		lineHeight: 20,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	tabs: {
		marginTop: 18,
	},
	challengeBlock: {
		marginTop: 16,
		gap: 8,
		padding: 12,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	attemptRow: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
		paddingBottom: 4,
	},
	rankRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
	},
	publishAttempt: {
		alignSelf: 'flex-start',
		paddingVertical: 6,
		paddingHorizontal: 2,
		marginBottom: 6,
	},
	publishAttemptText: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
	rankMine: {
		marginTop: 8,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
		paddingTop: 10,
	},
	rankPlace: {
		width: 28,
		color: colors.accent,
		fontWeight: '700',
	},
	rankName: {
		flex: 1,
		color: colors.text,
		fontSize: 15,
	},
	rankScore: {
		color: colors.text,
		fontWeight: '700',
		fontSize: 15,
	},
	more: {
		marginTop: 8,
		alignItems: 'center',
		paddingVertical: 10,
	},
	moreText: {
		color: colors.accent,
		fontWeight: '700',
	},
	withdraw: {
		marginTop: 12,
		alignItems: 'center',
		paddingVertical: 10,
	},
	withdrawText: {
		color: colors.textSecondary,
		fontWeight: '600',
	},
	empty: {
		fontSize: 15,
		lineHeight: 22,
		color: colors.textMuted,
	},
});

export default TrainingDefinitionScreen;

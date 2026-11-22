import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useAuth from '../../hooks/useAuth';
import { loadCachedDefinition, saveCachedDefinition } from '../../helpers/training/definitionCache';
import {
	applyFavoriteCreated,
	applyFavoriteRemoved,
} from '../../helpers/training/favoritesCache';
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
	BOBS_NAME,
	BOBS_VARIANTS,
	bobsPlayDefinition,
	bobsVariantId,
	isBobsKey,
} from '../../helpers/training/bobs27Group';
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
import { canPlayFiftyFourDart } from '../../helpers/training/fiftyFourDartChallenge';
import {
	FAVORITE_ADDED,
	FAVORITE_REMOVED,
	addTrainingFavorite,
	fetchChallengeAttempts,
	fetchChallengeRanking,
	fetchTrainingDefinition,
	removeTrainingFavorite,
	withdrawChallengePublication,
} from '../../helpers/training/trainingApi';
import { loadTrainingInputMode, saveTrainingInputMode } from '../../helpers/training/trainingInputMode';
import { trainingInitials } from '../../helpers/training/trainingInitials';
import { libraryInstructionsFor } from '../../helpers/training/exerciseLibraryInstructions';
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
	const [bobsVariant, setBobsVariant] = useState('easy');
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewRows, setPreviewRows] = useState(() => new Set());
	const [challengeTab, setChallengeTab] = useState('info');
	const [ranking, setRanking] = useState(null);
	const [attempts, setAttempts] = useState(null);
	const [rankingLoading, setRankingLoading] = useState(false);

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
		if (next.favorite) {
			await applyFavoriteCreated(auth.userId, next.kind, result.data?.item ?? next);
		} else {
			await applyFavoriteRemoved(auth.userId, item.kind, item.id);
		}
	};

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
		),
	);
	const challengeStartable = Boolean(item && canPlayFiftyFourDart(item));
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
							<Text style={styles.title}>
								{isClockKey(item.exerciseKey)
									? CLOCK_NAME
									: isBobsKey(item.exerciseKey)
										? BOBS_NAME
										: item.name}
							</Text>
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
					{item.kind === 'challenge' ? (
						<View style={styles.tabs}>
							{[
								['info', 'Opis'],
								['ranking', 'Ranking'],
								['history', 'Historia'],
							].map(([key, label]) => {
								const selected = challengeTab === key;
								return (
									<Pressable
										key={key}
										accessibilityRole="button"
										accessibilityState={{ selected }}
										onPress={() => setChallengeTab(key)}
										style={[styles.tab, selected && styles.tabOn]}
									>
										<Text style={[styles.tabText, selected && styles.tabTextOn]}>{label}</Text>
									</Pressable>
								);
							})}
						</View>
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
									<View key={row.id} style={styles.rankRow}>
										<Text style={styles.rankName}>
											{row.completedAt ? new Date(row.completedAt).toLocaleDateString('pl-PL') : '—'}
											{row.published ? ' · opublikowane' : ''}
										</Text>
										<Text style={styles.rankScore}>{row.score}</Text>
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
												{expanded && row.description ? (
													<Text style={styles.previewDescription}>{row.description}</Text>
												) : null}
												{expanded && !row.description && row.kind === 'exercise' ? (
													<Text style={styles.previewDescription}>Bez opisu.</Text>
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
					{isBobsKey(item.exerciseKey) ? (
						<View style={styles.modes}>
							<Text style={styles.variantCaption}>Wariant</Text>
							{BOBS_VARIANTS.map((option) => {
								const selected = bobsVariant === option.id;
								return (
									<Pressable
										key={option.id}
										accessibilityRole="button"
										accessibilityLabel={option.label}
										accessibilityState={{ selected }}
										onPress={() => setBobsVariant(option.id)}
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
					{libraryGuide && (item.kind !== 'challenge' || challengeTab === 'info') ? (
						<View style={styles.guide}>
							<Text style={styles.guideHeading}>Cel {guideNoun}</Text>
							<Text style={styles.guideBody}>{libraryGuide.goal}</Text>
							<Text style={styles.guideHeading}>Jak wykonywać ćwiczenia?</Text>
							{libraryGuide.how.map((line, index) => (
								<Text key={`how-${index}`} style={styles.guideBody}>{line}</Text>
							))}
							<Text style={styles.guideHeading}>Zasady punktacji</Text>
							{libraryGuide.scoring.map((line, index) => (
								<Text key={`score-${index}`} style={styles.guideBody}>{line}</Text>
							))}
							<Text style={styles.guideHeading}>Czas / liczba lotek</Text>
							<Text style={styles.guideBody}>{libraryGuide.limit}</Text>
						</View>
					) : null}
					{playable ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Rozpocznij"
							style={styles.start}
							onPress={() => navigation.navigate('TrainingExercise', {
								definition: isClockKey(item.exerciseKey)
									? clockPlayDefinition(item, clockVariant)
									: isBobsKey(item.exerciseKey)
										? bobsPlayDefinition(item, bobsVariant)
										: item,
								inputMode: scoreInput ? inputMode : undefined,
								variant: canPlayScoringPressure(item) ? variant : canPlayNineDarts(item) ? dartVariant : undefined,
							})}
						>
							<Text style={styles.startText}>Rozpocznij</Text>
						</Pressable>
					) : null}
					{challengeStartable ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Rozpocznij wyzwanie"
							style={styles.start}
							onPress={() => navigation.navigate('TrainingChallenge', { definition: item })}
						>
							<Text style={styles.startText}>Rozpocznij</Text>
						</Pressable>
					) : null}
					{eventStartable ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Rozpocznij event"
							style={styles.start}
							onPress={() => navigation.navigate('TrainingEvent', { event: item })}
						>
							<Text style={styles.startText}>Rozpocznij</Text>
						</Pressable>
					) : null}
					{item?.kind === 'event' && item.status === 'finished' ? (
						<Text style={styles.meta}>Event zakończony. Zobacz klasyfikację w Analizie (medale).</Text>
					) : null}
					{item?.kind === 'event' && item.status === 'paused' ? (
						<Text style={styles.inactive}>Event wstrzymany. Otwarte próby można dokończyć z banera.</Text>
					) : null}
					{planStartable ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Rozpocznij plan"
							style={styles.start}
							onPress={() => navigation.navigate('TrainingPlan', { plan: item })}
						>
							<Text style={styles.startText}>Rozpocznij plan</Text>
						</Pressable>
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
	guide: {
		marginTop: 20,
		gap: 6,
	},
	guideHeading: {
		marginTop: 10,
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	guideBody: {
		color: colors.textSecondary,
		fontSize: 14,
		lineHeight: 21,
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
	previewBlock: {
		marginTop: 20,
	},
	previewToggle: {
		minHeight: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
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
		borderRadius: 10,
		overflow: 'hidden',
	},
	previewHead: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 12,
		backgroundColor: colors.bgElevated,
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
		flexDirection: 'row',
		gap: 8,
		marginTop: 16,
	},
	tab: {
		flex: 1,
		minHeight: 40,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bgElevated,
	},
	tabOn: {
		borderColor: colors.accent,
		backgroundColor: colors.accentMuted,
	},
	tabText: {
		color: colors.textSecondary,
		fontSize: 13,
		fontWeight: '600',
	},
	tabTextOn: {
		color: colors.accent,
	},
	challengeBlock: {
		marginTop: 16,
		gap: 8,
	},
	rankRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	rankMine: {
		marginTop: 8,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
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

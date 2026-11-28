import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import useAuth from '../../hooks/useAuth';
import useTrainingKeepAwake from '../../hooks/useTrainingKeepAwake';
import { createClientSessionId } from '../../helpers/training/clientSessionId';
import {
	canPlayChallenge,
	challengeProgressLabel,
	emptyChallengeHang,
	finalizeChallengeHang,
	planItemAt,
	recordChallengeExercise,
	slotToExerciseDefinition,
	slotVariant,
} from '../../helpers/training/challengeSession';
import { libraryInstructionsFor } from '../../helpers/training/exerciseLibraryInstructions';
import { rememberRecentTraining } from '../../helpers/training/recentTrainingStore';
import { loadTrainingInputMode } from '../../helpers/training/trainingInputMode';
import {
	enqueueTrainingCompletion,
	flushTrainingOutbox,
} from '../../helpers/training/trainingSessionStore';
import { applyCompletionToRecordsCache } from '../../helpers/training/recordsCache';
import {
	fetchChallengeRanking,
	publishChallengeSession,
	withdrawChallengePublication,
} from '../../helpers/training/trainingApi';
import { colors } from '../../theme/colors';
import TrainingAbortSheet from './TrainingAbortSheet';
import TrainingExerciseScreen from './TrainingExerciseScreen';
import TrainingHelpModal, { helpSectionsFromGuide } from './TrainingHelpModal';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';
import TrainingSessionResult from './TrainingSessionResult';

const ABORT_TEXT = 'Przerwać wyzwanie? Ta próba przepadnie.';

const TrainingChallengeScreen = ({ navigation, route }) => {
	const definition = route?.params?.definition;
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const userId = auth?.userId;
	const accessToken = auth?.accessToken;
	const [hang, setHang] = useState(null);
	const [prompt, setPrompt] = useState(null);
	const [publishInfo, setPublishInfo] = useState(null);
	const [publishing, setPublishing] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const hangRef = useRef(null);
	const leaving = useRef(false);
	const summaryId = useRef(null);
	const userIdRef = useRef(userId);
	const accessTokenRef = useRef(accessToken);
	userIdRef.current = userId;
	accessTokenRef.current = accessToken;

	const playing = hang?.phase === 'running';
	useTrainingKeepAwake(playing);

	const persist = useCallback((next) => {
		hangRef.current = next;
		setHang(next);
	}, []);

	const begin = useCallback(async () => {
		if (!canPlayChallenge(definition)) {
			return;
		}
		leaving.current = false;
		summaryId.current = null;
		setPrompt(null);
		setPublishInfo(null);
		const inputMode = await loadTrainingInputMode(userIdRef.current);
		const next = emptyChallengeHang(definition, createClientSessionId(), inputMode);
		persist(next);
		rememberRecentTraining(userIdRef.current, {
			id: definition.id,
			kind: 'challenge',
			name: definition.name,
		});
	}, [definition, persist]);

	useEffect(() => {
		begin();
	}, [begin]);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: definition?.name || 'Wyzwanie',
			headerBackTitleVisible: false,
			headerRight: () => (
				playing ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Menu wyzwania"
						onPress={() => setMenuOpen(true)}
						hitSlop={12}
						style={styles.menuButton}
					>
						<Text style={styles.menuButtonText}>⋯</Text>
					</Pressable>
				) : null
			),
		});
	}, [navigation, definition?.name, playing]);

	useEffect(() => {
		const unsubscribe = navigation.addListener('beforeRemove', (event) => {
			if (leaving.current || hang?.phase === 'summary' || hang?.phase !== 'running') {
				return;
			}
			event.preventDefault();
			setPrompt('abort');
		});
		return unsubscribe;
	}, [navigation, hang?.phase]);

	const leaveHome = () => {
		leaving.current = true;
		navigation.navigate('TrainingHome');
	};

	const finishExercise = async (completion) => {
		const current = hangRef.current;
		if (!current || current.phase !== 'running') {
			return;
		}
		const item = planItemAt(current.plan, current.index);
		const next = recordChallengeExercise(current, item, completion);
		if (next.phase === 'summary') {
			const done = finalizeChallengeHang(next);
			persist(done);
			await syncSummary(done);
			return;
		}
		persist(next);
	};

	const syncSummary = async (done) => {
		const record = done.summary;
		if (!record) {
			return;
		}
		summaryId.current = record.clientSessionId;
		try {
			await applyCompletionToRecordsCache(userIdRef.current, record);
			await enqueueTrainingCompletion(userIdRef.current, record);
			const items = await flushTrainingOutbox(userIdRef.current, accessTokenRef.current);
			if (summaryId.current !== record.clientSessionId) {
				return;
			}
			const saved = items.find((row) => row.clientSessionId === record.clientSessionId);
			const nextSummary = saved ?? record;
			persist({ ...done, summary: nextSummary });
			if (saved?.id && accessTokenRef.current && definition?.id) {
				const ranking = await fetchChallengeRanking(accessTokenRef.current, definition.id, { limit: 1 });
				if (ranking.ok) {
					const publishedScore = ranking.data?.publishedScore ?? null;
					setPublishInfo({
						publishedScore,
						canPublish: publishedScore == null || nextSummary.score > publishedScore,
					});
				} else {
					setPublishInfo({ publishedScore: null, canPublish: true });
				}
			}
		} catch {
			setPublishInfo({ publishedScore: null, canPublish: true });
		}
	};

	const confirmAbort = () => {
		setPrompt(null);
		leaveHome();
	};

	const onPublish = async () => {
		const summary = hangRef.current?.summary;
		if (!summary?.id || !accessTokenRef.current || publishing) {
			return;
		}
		setPublishing(true);
		const result = await publishChallengeSession(accessTokenRef.current, summary.id);
		setPublishing(false);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się opublikować.');
			return;
		}
		show(result.data?.message || 'Opublikowano.');
		setPublishInfo((prev) => ({
			...(prev || {}),
			publishedScore: result.data?.score ?? summary.score,
			canPublish: false,
			place: result.data?.place,
		}));
	};

	const onWithdraw = async () => {
		if (!definition?.id || !accessTokenRef.current || publishing) {
			return;
		}
		setPublishing(true);
		const result = await withdrawChallengePublication(accessTokenRef.current, definition.id);
		setPublishing(false);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się wycofać.');
			return;
		}
		show('Wycofano publikację.');
		setPublishInfo((prev) => ({
			...(prev || {}),
			publishedScore: null,
			canPublish: true,
			place: null,
		}));
	};

	if (!hang) {
		return (
			<View style={styles.root}>
				<TrainingNotice text={text} />
				<Text style={styles.hint}>
					{canPlayChallenge(definition) ? 'Ładowanie…' : 'To wyzwanie nie ma ćwiczeń.'}
				</Text>
			</View>
		);
	}

	if (hang.phase === 'summary' && hang.summary) {
		const summary = hang.summary;
		const syncHint = summary.sync === 'pending'
			? 'Zapisze się po połączeniu.'
			: summary.sync === 'rejected'
				? 'Nie zapisano. Wyzwanie nie jest już dostępne.'
				: undefined;
		return (
			<View style={styles.root}>
				<TrainingNotice text={text} />
				<TrainingSessionResult
					hero={{ label: 'Wynik', value: summary.score }}
					rows={(summary.results || []).map((row) => ({
						label: row.name,
						value: row.scored ? row.score : 'Rozgrzewka',
					}))}
					syncLabel={syncHint}
					primaryLabel={publishInfo?.canPublish && summary.id ? 'Opublikuj wynik' : undefined}
					onPrimary={publishInfo?.canPublish && summary.id ? onPublish : undefined}
					secondaryLabel="Spróbuj ponownie"
					onSecondary={begin}
				>
					{publishInfo?.publishedScore != null && !publishInfo?.canPublish ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Wycofaj publikację"
							style={styles.secondary}
							disabled={publishing}
							onPress={onWithdraw}
						>
							<Text style={styles.secondaryText}>Wycofaj publikację</Text>
						</Pressable>
					) : null}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Wróć"
						style={styles.ghost}
						onPress={leaveHome}
					>
						<Text style={styles.ghostText}>Wróć</Text>
					</Pressable>
				</TrainingSessionResult>
			</View>
		);
	}

	const item = planItemAt(hang.plan, hang.index);
	const exerciseDefinition = item ? slotToExerciseDefinition(hang.plan, item) : null;
	const exerciseKey = `${hang.clientSessionId || 'challenge'}-${hang.index}-${item?.exerciseKey || 'x'}`;
	const helpSections = helpSectionsFromGuide(libraryInstructionsFor(exerciseDefinition, {
		dartVariant: item?.dartCount,
		pressureVariant: slotVariant(item),
	}));

	if (!exerciseDefinition) {
		return (
			<View style={styles.root}>
				<Text style={styles.hint}>Brak ćwiczeń w wyzwaniu.</Text>
			</View>
		);
	}

	return (
		<View style={styles.root}>
			<TrainingNotice text={text} />
			<View style={styles.chrome}>
				<Text style={styles.progress}>{challengeProgressLabel(hang.index, hang.total)}</Text>
				<Text style={styles.title} numberOfLines={1}>{exerciseDefinition.name}</Text>
			</View>
			<View style={styles.exerciseHost} key={exerciseKey}>
				<TrainingExerciseScreen
					navigation={navigation}
					route={{
						params: {
							definition: exerciseDefinition,
							variant: slotVariant(item),
							inputMode: hang.inputMode,
						},
					}}
					planHost={{
						definition: exerciseDefinition,
						inputMode: hang.inputMode,
						initialSession: hang.exerciseSession,
						paused: false,
						allowManualPause: false,
						onSessionChange: (session) => {
							const current = hangRef.current;
							if (!current || current.phase !== 'running') {
								return;
							}
							persist({ ...current, exerciseSession: session });
						},
						onComplete: (record) => {
							finishExercise(record);
						},
					}}
				/>
			</View>
			<Modal
				visible={menuOpen}
				transparent
				animationType="fade"
				presentationStyle="overFullScreen"
				statusBarTranslucent
				onRequestClose={() => setMenuOpen(false)}
			>
				<Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
					<View style={styles.menuSheet}>
						<Pressable
							accessibilityRole="button"
							onPress={() => {
								setMenuOpen(false);
								setHelpOpen(true);
							}}
							style={styles.menuItem}
						>
							<Text style={styles.menuItemText}>Pomoc</Text>
						</Pressable>
					</View>
				</Pressable>
			</Modal>
			<TrainingHelpModal
				visible={helpOpen}
				sections={helpSections}
				fallbackText={exerciseDefinition.description || definition?.description || null}
				onClose={() => setHelpOpen(false)}
			/>
			<TrainingAbortSheet
				visible={prompt === 'abort'}
				text={ABORT_TEXT}
				onCancel={() => setPrompt(null)}
				onConfirm={confirmAbort}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	exerciseHost: {
		flex: 1,
	},
	hint: {
		marginTop: 24,
		paddingHorizontal: 24,
		color: colors.textMuted,
		fontSize: 15,
		textAlign: 'center',
	},
	chrome: {
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		backgroundColor: colors.bgDeep,
	},
	progress: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	title: {
		marginTop: 2,
		color: colors.text,
		fontSize: 17,
		fontWeight: '800',
	},
	menuButton: {
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	menuButtonText: {
		color: colors.text,
		fontSize: 28,
		fontWeight: '700',
		lineHeight: 30,
	},
	menuBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		justifyContent: 'flex-start',
		alignItems: 'flex-end',
		paddingTop: 56,
		paddingRight: 12,
	},
	menuSheet: {
		minWidth: 180,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
		overflow: 'hidden',
	},
	menuItem: {
		paddingHorizontal: 16,
		paddingVertical: 14,
	},
	menuItemText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
	secondary: {
		marginTop: 10,
		alignItems: 'center',
		paddingVertical: 12,
	},
	secondaryText: {
		color: colors.textSecondary,
		fontWeight: '600',
	},
	ghost: {
		marginTop: 4,
		alignItems: 'center',
		paddingVertical: 12,
	},
	ghostText: {
		color: colors.textMuted,
		fontWeight: '600',
	},
});

export default TrainingChallengeScreen;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { createClientSessionId } from '../../helpers/training/clientSessionId';
import {
	canPlayFiftyFourDart,
	currentTarget,
	fiftyFourAimText,
	fiftyFourCompletion,
	recordFiftyFourDart,
	startFiftyFourSession,
	undoFiftyFourDart,
} from '../../helpers/training/fiftyFourDartChallenge';
import {
	fetchChallengeRanking,
	publishChallengeSession,
	withdrawChallengePublication,
} from '../../helpers/training/trainingApi';
import {
	enqueueTrainingCompletion,
	flushTrainingOutbox,
} from '../../helpers/training/trainingSessionStore';
import { playClick } from '../../helpers/gameSounds/playGameSound';
import { colors } from '../../theme/colors';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';
import TrainingPlayChrome from './TrainingPlayChrome';
import TrainingPlayScore from './TrainingPlayScore';
import TrainingSessionResult from './TrainingSessionResult';

const ABORT_TEXT = 'Przerwać wyzwanie? Ta próba przepadnie.';

const TrainingChallengeScreen = ({ navigation, route }) => {
	const definition = route?.params?.definition;
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const [session, setSession] = useState(null);
	const [summary, setSummary] = useState(null);
	const [prompt, setPrompt] = useState(null);
	const [publishInfo, setPublishInfo] = useState(null);
	const [publishing, setPublishing] = useState(false);
	const sessionRef = useRef(null);
	const leaving = useRef(false);
	const summaryId = useRef(null);
	const userIdRef = useRef(auth?.userId);
	const accessTokenRef = useRef(auth?.accessToken);

	useEffect(() => {
		userIdRef.current = auth?.userId;
		accessTokenRef.current = auth?.accessToken;
	}, [auth?.userId, auth?.accessToken]);

	useEffect(() => {
		sessionRef.current = session;
	}, [session]);

	const begin = useCallback(() => {
		if (!canPlayFiftyFourDart(definition)) {
			return;
		}
		leaving.current = false;
		summaryId.current = null;
		setSummary(null);
		setPublishInfo(null);
		setPrompt(null);
		setSession(startFiftyFourSession(definition, createClientSessionId()));
	}, [definition]);

	useEffect(() => {
		begin();
	}, [begin]);

	useEffect(() => {
		navigation.setOptions({ title: definition?.name || 'Wyzwanie', headerBackTitleVisible: false });
	}, [navigation, definition?.name]);

	useEffect(() => {
		const unsubscribe = navigation.addListener('beforeRemove', (event) => {
			if (leaving.current || summary || !session || session.status !== 'playing') {
				return;
			}
			event.preventDefault();
			setPrompt('abort');
		});
		return unsubscribe;
	}, [navigation, session, summary]);

	const leaveHome = () => {
		leaving.current = true;
		navigation.navigate('TrainingHome');
	};

	const finish = async (next) => {
		const record = fiftyFourCompletion(next, new Date().toISOString());
		summaryId.current = record.clientSessionId;
		setSummary(record);
		setSession(next);
		try {
			await enqueueTrainingCompletion(userIdRef.current, record);
			const items = await flushTrainingOutbox(userIdRef.current, accessTokenRef.current);
			if (summaryId.current !== record.clientSessionId) {
				return;
			}
			const saved = items.find((item) => item.clientSessionId === record.clientSessionId);
			setSummary(saved ?? record);
			if (saved?.id && accessTokenRef.current) {
				const ranking = await fetchChallengeRanking(accessTokenRef.current, definition.id, { limit: 1 });
				if (ranking.ok) {
					const publishedScore = ranking.data?.publishedScore ?? null;
					setPublishInfo({
						publishedScore,
						canPublish: publishedScore == null || record.score > publishedScore,
					});
				} else {
					setPublishInfo({ publishedScore: null, canPublish: true });
				}
			}
		} catch {
			setSummary(record);
			setPublishInfo({ publishedScore: null, canPublish: true });
		}
	};

	const applyDart = (ring) => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || prompt) {
			return;
		}
		const { session: next, visitClosed } = recordFiftyFourDart(current, ring);
		setSession(next);
		if (visitClosed) {
			playClick();
		}
		if (next.status === 'completed') {
			finish(next);
		}
	};

	const undo = () => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || prompt) {
			return;
		}
		setSession(undoFiftyFourDart(current));
	};

	const confirmAbort = () => {
		setPrompt(null);
		leaveHome();
	};

	const onPublish = async () => {
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

	const target = currentTarget(session);
	const stages = summary?.stats?.stages || [];

	if (summary) {
		const syncHint = summary.sync === 'pending'
			? 'Zapisze się po połączeniu.'
			: summary.sync === 'rejected'
				? 'Nie zapisano. Wyzwanie nie jest już dostępne.'
				: undefined;
		return (
			<View style={styles.root}>
				<TrainingNotice text={text} />
				<TrainingPlayChrome hideHeader title={definition?.name}>
					<TrainingSessionResult
						hero={{ label: 'Wynik', value: summary.score }}
						rows={stages.map((stage) => ({ label: stage.label, value: stage.score }))}
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
				</TrainingPlayChrome>
			</View>
		);
	}

	return (
		<TrainingPlayChrome
			title={definition?.name}
			onAbort={() => setPrompt('abort')}
			abortVisible={prompt === 'abort'}
			abortText={ABORT_TEXT}
			onAbortCancel={() => setPrompt(null)}
			onAbortConfirm={confirmAbort}
		>
			{target ? (
				<>
					<Text style={styles.aim}>{fiftyFourAimText(target)}</Text>
					<TrainingPlayScore
						label="Cel"
						value={target.targetLabel}
						size="large"
						accessibilityLabel={target.targetLabel}
					/>
					<Text style={styles.dartCounter}>Lotka {target.dartNumber} z {target.visitSize}</Text>
					{target.stageType === 'shanghai' ? (
						<View style={styles.grid}>
							{[
								['single', 'Single'],
								['double', 'Double'],
								['triple', 'Triple'],
								['miss', 'Pudło'],
							].map(([ring, label]) => (
								<Pressable
									key={ring}
									accessibilityRole="button"
									accessibilityLabel={label}
									style={[styles.action, ring === 'miss' ? styles.miss : styles.hit]}
									onPress={() => applyDart(ring)}
								>
									<Text style={ring === 'miss' ? styles.missText : styles.hitText}>{label}</Text>
								</Pressable>
							))}
						</View>
					) : (
						<View style={styles.outcomeRow}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Pudło"
								style={[styles.action, styles.miss, styles.half]}
								onPress={() => applyDart('miss')}
							>
								<Text style={styles.missText}>Pudło</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={target.isBull ? 'Inner bull' : 'Trafiona'}
								style={[styles.action, styles.hit, styles.half]}
								onPress={() => applyDart(target.isBull ? 'inner' : 'double')}
							>
								<Text style={styles.hitText}>{target.isBull ? 'Inner bull' : 'Trafiona'}</Text>
							</Pressable>
						</View>
					)}
					<Pressable accessibilityRole="button" accessibilityLabel="Cofnij" style={styles.tool} onPress={undo}>
						<Text style={styles.toolText}>Cofnij</Text>
					</Pressable>
				</>
			) : (
				<Text style={styles.empty}>Ładowanie…</Text>
			)}
		</TrainingPlayChrome>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	aim: {
		fontSize: 18,
		fontWeight: '700',
		color: colors.text,
		textAlign: 'center',
		marginBottom: 12,
		letterSpacing: -0.2,
	},
	dartCounter: {
		fontSize: 14,
		color: colors.textMuted,
		textAlign: 'center',
		marginBottom: 20,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		justifyContent: 'center',
	},
	outcomeRow: {
		flexDirection: 'row',
		gap: 12,
	},
	action: {
		minHeight: 88,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	half: {
		flex: 1,
	},
	hit: {
		backgroundColor: colors.accent,
		borderWidth: 1.5,
		borderColor: colors.accent,
		minWidth: '45%',
	},
	miss: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		minWidth: '45%',
	},
	hitText: {
		color: colors.onAccent,
		fontSize: 18,
		fontWeight: '800',
	},
	missText: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '800',
	},
	tool: {
		marginTop: 16,
		minHeight: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
	},
	toolText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	secondary: {
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		marginBottom: 10,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	secondaryText: {
		color: colors.text,
		fontWeight: '600',
		fontSize: 16,
	},
	ghost: {
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 4,
	},
	ghostText: {
		color: colors.textSecondary,
		fontSize: 16,
	},
	empty: {
		textAlign: 'center',
		color: colors.textSecondary,
		marginTop: 40,
	},
});

export default TrainingChallengeScreen;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import useAuth from '../../hooks/useAuth';
import { createClientSessionId } from '../../helpers/training/clientSessionId';
import {
	canPlayFiftyFourDart,
	currentTarget,
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
		return (
			<View style={styles.root}>
				<TrainingNotice text={text} />
				<ScrollView contentContainerStyle={styles.content}>
					<Text accessibilityRole="header" style={styles.header}>{definition?.name}</Text>
					<Text style={styles.scoreLabel}>Wynik</Text>
					<Text style={styles.score}>{summary.score}</Text>
					{stages.map((stage) => (
						<View key={stage.id} style={styles.stageRow}>
							<Text style={styles.stageName}>{stage.label}</Text>
							<Text style={styles.stageScore}>{stage.score}</Text>
						</View>
					))}
					{summary.sync === 'pending' ? (
						<Text style={styles.syncHint}>Zapisze się po połączeniu.</Text>
					) : null}
					{summary.sync === 'rejected' ? (
						<Text style={styles.syncHint}>Nie zapisano. Wyzwanie nie jest już dostępne.</Text>
					) : null}
					{publishInfo?.canPublish && summary.id ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Opublikuj wynik"
							style={styles.primary}
							disabled={publishing}
							onPress={onPublish}
						>
							<Text style={styles.primaryText}>Opublikuj wynik</Text>
						</Pressable>
					) : null}
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
						accessibilityLabel="Spróbuj ponownie"
						style={styles.secondary}
						onPress={begin}
					>
						<Text style={styles.secondaryText}>Spróbuj ponownie</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Wróć"
						style={styles.ghost}
						onPress={leaveHome}
					>
						<Text style={styles.ghostText}>Wróć</Text>
					</Pressable>
				</ScrollView>
			</View>
		);
	}

	return (
		<View style={styles.root}>
			<Text accessibilityRole="header" style={styles.header}>{definition?.name}</Text>
			{target ? (
				<>
					<Text style={styles.target}>{target.targetLabel}</Text>
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
					<View style={styles.tools}>
						<Pressable accessibilityRole="button" accessibilityLabel="Cofnij" style={styles.tool} onPress={undo}>
							<Text style={styles.toolText}>Cofnij</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Przerwij"
							style={styles.tool}
							onPress={() => setPrompt('abort')}
						>
							<Text style={styles.toolText}>Przerwij</Text>
						</Pressable>
					</View>
				</>
			) : (
				<Text style={styles.empty}>Ładowanie…</Text>
			)}

			<Modal visible={prompt === 'abort'} transparent animationType="fade" onRequestClose={() => setPrompt(null)}>
				<View style={styles.modalBackdrop}>
					<View style={styles.modalCard}>
						<Text style={styles.modalText}>{ABORT_TEXT}</Text>
						<View style={styles.modalActions}>
							<Pressable style={styles.secondary} onPress={() => setPrompt(null)}>
								<Text style={styles.secondaryText}>Anuluj</Text>
							</Pressable>
							<Pressable style={styles.primary} onPress={confirmAbort}>
								<Text style={styles.primaryText}>Przerwij</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.bg,
		paddingHorizontal: 24,
		paddingTop: 16,
	},
	content: {
		paddingBottom: 40,
		gap: 12,
	},
	header: {
		fontSize: 22,
		fontWeight: '700',
		color: colors.text,
		textAlign: 'center',
		marginBottom: 16,
	},
	target: {
		fontSize: 64,
		fontWeight: '800',
		color: colors.accent,
		textAlign: 'center',
		marginTop: 24,
	},
	dartCounter: {
		fontSize: 16,
		color: colors.textSecondary,
		textAlign: 'center',
		marginBottom: 28,
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
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	half: {
		flex: 1,
	},
	hit: {
		backgroundColor: colors.success,
		minWidth: '45%',
	},
	miss: {
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		minWidth: '45%',
	},
	hitText: {
		color: colors.onSuccess || '#fff',
		fontSize: 20,
		fontWeight: '700',
	},
	missText: {
		color: colors.text,
		fontSize: 20,
		fontWeight: '700',
	},
	tools: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 24,
	},
	tool: {
		paddingVertical: 12,
		paddingHorizontal: 8,
	},
	toolText: {
		color: colors.textSecondary,
		fontSize: 16,
	},
	scoreLabel: {
		textAlign: 'center',
		color: colors.textSecondary,
		fontSize: 14,
	},
	score: {
		textAlign: 'center',
		fontSize: 48,
		fontWeight: '800',
		color: colors.accent,
		marginBottom: 12,
	},
	stageRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	stageName: {
		color: colors.text,
		fontSize: 16,
	},
	stageScore: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
	syncHint: {
		color: colors.textSecondary,
		textAlign: 'center',
		marginTop: 8,
	},
	primary: {
		backgroundColor: colors.accent,
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 8,
	},
	primaryText: {
		color: colors.onAccent || '#141418',
		fontWeight: '700',
		fontSize: 16,
	},
	secondary: {
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 8,
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
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		justifyContent: 'center',
		padding: 24,
	},
	modalCard: {
		backgroundColor: colors.bg,
		borderRadius: 16,
		padding: 20,
		gap: 16,
	},
	modalText: {
		color: colors.text,
		fontSize: 16,
		textAlign: 'center',
	},
	modalActions: {
		gap: 8,
	},
});

export default TrainingChallengeScreen;

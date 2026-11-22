import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import useAuth from '../../hooks/useAuth';
import { createClientSessionId } from '../../helpers/training/clientSessionId';
import {
	clearHangingEvent,
	emptyEventHang,
	loadHangingEvent,
	saveHangingEvent,
} from '../../helpers/training/eventAttemptStore';
import {
	eventAsPlan,
	eventProgressLabel,
	finalizeEventHang,
	planItemAt,
	recordEventExercise,
	slotToExerciseDefinition,
} from '../../helpers/training/eventSession';
import { loadTrainingInputMode } from '../../helpers/training/trainingInputMode';
import {
	abortEventAttempt,
	completeEventAttempt,
	fetchEventClassification,
	startEventAttempt,
} from '../../helpers/training/trainingApi';
import { colors } from '../../theme/colors';
import { scaleSize } from '../../theme/uiScale';
import TrainingAbortSheet from './TrainingAbortSheet';
import TrainingExerciseScreen from './TrainingExerciseScreen';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';
import TrainingSessionResult from './TrainingSessionResult';

const ABORT_TEXT = 'Przerwać event? Ta próba przepadnie i zużyje slot w oknie.';

const TrainingEventScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const { text, show } = useTrainingNotice();
	const userId = auth?.userId;
	const accessToken = auth?.accessToken;
	const [hang, setHang] = useState(null);
	const [prompt, setPrompt] = useState(null);
	const [classification, setClassification] = useState(null);
	const [offline, setOffline] = useState(false);
	const hangRef = useRef(null);
	const leaving = useRef(false);

	const persist = useCallback(async (next) => {
		hangRef.current = next;
		setHang(next);
		if (!next || next.phase === 'summary') {
			await clearHangingEvent(userId);
			if (next?.phase === 'summary') {
				await saveHangingEvent(userId, next);
			}
			return;
		}
		await saveHangingEvent(userId, { ...next, updatedAt: Date.now() });
	}, [userId]);

	useEffect(() => {
		const unsub = NetInfo.addEventListener((state) => {
			setOffline(!(state.isConnected && state.isInternetReachable !== false));
		});
		return unsub;
	}, []);

	useEffect(() => {
		let live = true;
		(async () => {
			const resume = route?.params?.resume;
			const eventParam = route?.params?.event;
			const existing = await loadHangingEvent(userId);
			if (!live) {
				return;
			}
			if ((resume || !eventParam) && existing?.phase === 'running') {
				hangRef.current = existing;
				setHang(existing);
				return;
			}
			if (!eventParam || !accessToken) {
				return;
			}
			const net = await NetInfo.fetch();
			if (!(net.isConnected && net.isInternetReachable !== false)) {
				show('Event wymaga połączenia z siecią.');
				return;
			}
			const clientAttemptId = createClientSessionId();
			const started = await startEventAttempt(accessToken, eventParam.id, clientAttemptId);
			if (!started.ok) {
				if (started.data?.reason === 'training_event_attempt_open') {
					const current = await loadHangingEvent(userId);
					if (current?.phase === 'running') {
						hangRef.current = current;
						setHang(current);
						return;
					}
				}
				show(started.data?.message || 'Nie udało się zacząć próby.');
				return;
			}
			const inputMode = await loadTrainingInputMode(userId);
			const plan = eventAsPlan(eventParam);
			const next = {
				...emptyEventHang(eventParam, clientAttemptId, inputMode, started.data?.attempt),
				plan,
			};
			await persist(next);
		})();
		return () => {
			live = false;
		};
	}, [accessToken, persist, route?.params?.event, route?.params?.resume, show, userId]);

	useEffect(() => {
		navigation.setOptions({ title: hang?.event?.name || route?.params?.event?.name || 'Event' });
	}, [navigation, hang?.event?.name, route?.params?.event?.name]);

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
		const next = recordEventExercise(current, item, completion);
		if (next.phase === 'summary') {
			const done = finalizeEventHang(next);
			await persist(done);
			await submitComplete(done);
			return;
		}
		await persist(next);
	};

	const submitComplete = async (done) => {
		if (!accessToken || !done?.summary) {
			return;
		}
		const net = await NetInfo.fetch();
		if (!(net.isConnected && net.isInternetReachable !== false)) {
			show('Połącz się z siecią, żeby zapisać wynik eventu.');
			return;
		}
		const body = {
			completedAt: done.summary.completedAt,
			score: done.summary.score,
			stats: done.summary.stats,
			items: done.summary.items,
		};
		const result = await completeEventAttempt(
			accessToken,
			done.definitionId,
			done.clientAttemptId,
			body,
		);
		if (!result.ok) {
			show(result.data?.message || 'Nie udało się zapisać próby.');
			return;
		}
		await clearHangingEvent(userId);
		const classResult = await fetchEventClassification(accessToken, done.definitionId);
		if (classResult.ok) {
			setClassification(classResult.data);
		}
		await persist({
			...done,
			summary: { ...done.summary, sync: 'synced', id: result.data?.sessionId },
		});
	};

	const confirmAbort = async () => {
		setPrompt(null);
		const current = hangRef.current;
		if (!current) {
			leaveHome();
			return;
		}
		if (accessToken) {
			await abortEventAttempt(accessToken, current.definitionId, current.clientAttemptId);
		}
		await clearHangingEvent(userId);
		hangRef.current = null;
		setHang(null);
		leaveHome();
	};

	if (!hang) {
		return (
			<View style={styles.root}>
				<TrainingNotice text={text} />
				<Text style={styles.hint}>{offline ? 'Brak sieci.' : 'Ładowanie…'}</Text>
			</View>
		);
	}

	if (hang.phase === 'summary' && hang.summary) {
		return (
			<View style={styles.root}>
				<TrainingNotice text={text} />
				<ScrollView contentContainerStyle={styles.content}>
					<TrainingSessionResult
						hero={{ label: 'Wynik', value: hang.summary.score }}
						rows={(hang.summary.results || []).map((row) => ({
							label: row.name,
							value: row.scored ? row.score : 'Rozgrzewka',
						}))}
						secondaryLabel="Wróć"
						onSecondary={leaveHome}
					>
						{classification?.mine ? (
							<Text style={styles.place}>
								Miejsce {classification.mine.place}
								{classification.mine.medal ? ` · ${classification.mine.medal}` : ''}
							</Text>
						) : null}
					</TrainingSessionResult>
				</ScrollView>
			</View>
		);
	}

	const item = planItemAt(hang.plan, hang.index);
	const definition = item ? slotToExerciseDefinition(hang.plan, item) : null;

	if (!definition) {
		return (
			<View style={styles.root}>
				<Text style={styles.hint}>Brak ćwiczeń w evencie.</Text>
			</View>
		);
	}

	return (
		<View style={styles.root}>
			{offline ? (
				<Text style={styles.offline}>Brak sieci — stan próby jest zapisany. Wznów po połączeniu.</Text>
			) : null}
			<View style={styles.chrome}>
				<View style={styles.chromeCopy}>
					<Text style={styles.progress}>{eventProgressLabel(hang.index, hang.total)}</Text>
					<Text style={styles.eventName} numberOfLines={1}>{hang.event?.name || 'Event'}</Text>
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Przerwij"
					onPress={() => setPrompt('abort')}
					style={styles.abortIcon}
				>
					<Ionicons name="close" size={scaleSize(20)} color={colors.textMuted} />
				</Pressable>
			</View>
			<TrainingExerciseScreen
				navigation={navigation}
				planHost={{
					definition,
					inputMode: hang.inputMode,
					initialSession: hang.exerciseSession,
					paused: offline,
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
	root: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 24, gap: 10, maxWidth: 480, width: '100%', alignSelf: 'center' },
	place: {
		textAlign: 'center',
		color: colors.accent,
		fontWeight: '700',
		marginBottom: 16,
		fontSize: 15,
	},
	hint: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
	offline: {
		backgroundColor: colors.warningMuted,
		color: colors.warning,
		padding: 10,
		textAlign: 'center',
		fontWeight: '600',
	},
	chrome: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		backgroundColor: colors.bgDeep,
	},
	chromeCopy: { flex: 1, minWidth: 0 },
	progress: {
		color: colors.textMuted,
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	eventName: {
		marginTop: 2,
		color: colors.text,
		fontSize: 16,
		fontWeight: '800',
	},
	abortIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
	},
});

export default TrainingEventScreen;

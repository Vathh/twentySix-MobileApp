import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import TrainingExerciseScreen from './TrainingExerciseScreen';
import TrainingNotice, { useTrainingNotice } from './TrainingNotice';

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
					<Text style={styles.header}>{hang.event?.name}</Text>
					<Text style={styles.scoreLabel}>Wynik</Text>
					<Text style={styles.score}>{hang.summary.score}</Text>
					{(hang.summary.results || []).map((row) => (
						<View key={`${row.position}-${row.exerciseKey}`} style={styles.row}>
							<Text style={styles.rowName}>{row.name}</Text>
							<Text style={styles.rowScore}>{row.scored ? row.score : 'Rozgrzewka'}</Text>
						</View>
					))}
					{classification?.mine ? (
						<Text style={styles.place}>
							Miejsce {classification.mine.place}
							{classification.mine.medal ? ` · ${classification.mine.medal}` : ''}
						</Text>
					) : null}
					<Pressable style={styles.ghost} onPress={leaveHome}>
						<Text style={styles.ghostText}>Wróć</Text>
					</Pressable>
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
			<Text style={styles.progress}>{eventProgressLabel(hang.index, hang.total)}</Text>
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
			<Pressable style={styles.abort} onPress={() => setPrompt('abort')}>
				<Text style={styles.abortText}>Przerwij</Text>
			</Pressable>
			<Modal
				visible={prompt === 'abort'}
				transparent
				animationType="fade"
				presentationStyle="overFullScreen"
				statusBarTranslucent
				onRequestClose={() => setPrompt(null)}
			>
				<View style={styles.modalBackdrop}>
					<View style={styles.modalCard}>
						<Text style={styles.modalText}>{ABORT_TEXT}</Text>
						<Pressable style={styles.secondary} onPress={() => setPrompt(null)}>
							<Text style={styles.secondaryText}>Anuluj</Text>
						</Pressable>
						<Pressable style={styles.primary} onPress={confirmAbort}>
							<Text style={styles.primaryText}>Przerwij</Text>
						</Pressable>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.bg },
	content: { padding: 24, gap: 10 },
	header: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
	scoreLabel: { textAlign: 'center', color: colors.textSecondary },
	score: { textAlign: 'center', fontSize: 44, fontWeight: '800', color: colors.accent },
	row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
	rowName: { color: colors.text },
	rowScore: { color: colors.text, fontWeight: '600' },
	place: { textAlign: 'center', color: colors.accent, fontWeight: '700', marginTop: 12 },
	hint: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
	offline: { backgroundColor: colors.warningMuted, color: colors.warning, padding: 10, textAlign: 'center' },
	progress: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 6 },
	abort: { alignItems: 'center', paddingVertical: 14 },
	abortText: { color: colors.textSecondary, fontSize: 16 },
	ghost: { alignItems: 'center', paddingVertical: 14 },
	ghostText: { color: colors.textSecondary },
	modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
	modalCard: { backgroundColor: colors.bg, borderRadius: 16, padding: 20, gap: 10 },
	modalText: { color: colors.text, textAlign: 'center', marginBottom: 8 },
	primary: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
	primaryText: { color: colors.onAccent, fontWeight: '700' },
	secondary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
	secondaryText: { color: colors.text, fontWeight: '600' },
});

export default TrainingEventScreen;

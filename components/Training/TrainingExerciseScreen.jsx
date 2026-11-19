import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import useAuth from '../../hooks/useAuth';
import { createClientSessionId } from '../../helpers/training/clientSessionId';
import {
	canPlayClock,
	clockCompletion,
	currentVisit,
	recordOutcome,
	startClockSession,
	targetLabel,
	undoDart,
} from '../../helpers/training/clockExercise';
import {
	LOOSE_THROWS_MECHANIC,
	canPlayLooseThrows,
	expireLooseThrows,
	looseThrowsCompletion,
	startLooseThrowsSession,
} from '../../helpers/training/looseThrowsExercise';
import {
	SECTOR_AIM_TEXT,
	SECTOR_CLOCK_MECHANIC,
	TICK_MS,
	canPlaySectorClock,
	currentSectorVisit,
	expireSectorClock,
	formatRemaining,
	recordSectorOutcome,
	scheduleCues,
	sectorClockCompletion,
	startSectorClockSession,
	undoSectorDart,
	visibleRemainingMs,
} from '../../helpers/training/sectorClockExercise';
import { playFinalBell, playTicking, stopTicking } from '../../helpers/gameSounds/playGameSound';
import { rememberRecentTraining } from '../../helpers/training/recentTrainingStore';
import { syncLabel } from '../../helpers/training/trainingSessionSync';
import {
	enqueueTrainingCompletion,
	flushTrainingOutbox,
} from '../../helpers/training/trainingSessionStore';
import { colors } from '../../theme/colors';

const ABORT_TEXT = 'Przerwać ćwiczenie? Ta sesja przepadnie.';
const AIM_TEXT = 'Celuj kolejno po jednej lotce w te sektory';
const SHEET_HIDDEN = 320;

function canPlay(definition) {
	return canPlayClock(definition) || canPlaySectorClock(definition) || canPlayLooseThrows(definition);
}

function isSectorClock(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === SECTOR_CLOCK_MECHANIC;
}

function isLooseThrows(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === LOOSE_THROWS_MECHANIC;
}

function isTimed(sessionOrDefinition) {
	return isSectorClock(sessionOrDefinition) || isLooseThrows(sessionOrDefinition);
}

function startSession(definition) {
	const clientSessionId = createClientSessionId();
	if (canPlayLooseThrows(definition)) {
		return startLooseThrowsSession(definition, clientSessionId);
	}
	if (canPlaySectorClock(definition)) {
		return startSectorClockSession(definition, clientSessionId);
	}
	return startClockSession(definition, clientSessionId);
}

function completionFor(session, completedAt) {
	if (isLooseThrows(session)) {
		return looseThrowsCompletion(session, completedAt);
	}
	if (isSectorClock(session)) {
		return sectorClockCompletion(session, completedAt);
	}
	return clockCompletion(session, completedAt);
}

const TrainingExerciseScreen = ({ navigation, route }) => {
	const definition = route?.params?.definition;
	const { auth } = useAuth();
	const userId = auth?.userId;
	const accessToken = auth?.accessToken;
	const [session, setSession] = useState(null);
	const [now, setNow] = useState(() => Date.now());
	const sessionRef = useRef(null);
	const [prompt, setPrompt] = useState(null);
	const [sheetMounted, setSheetMounted] = useState(false);
	const sheetY = useSharedValue(SHEET_HIDDEN);
	const [summary, setSummary] = useState(null);
	const summaryId = useRef(null);
	const leaving = useRef(false);
	const userIdRef = useRef(userId);
	const accessTokenRef = useRef(accessToken);
	userIdRef.current = userId;
	accessTokenRef.current = accessToken;

	const playing = session?.status === 'playing' && !summary;
	const started = useRef(false);

	if (prompt && !sheetMounted) {
		setSheetMounted(true);
	}

	useEffect(() => {
		if (!sheetMounted) {
			return undefined;
		}
		const open = Boolean(prompt);
		sheetY.value = withTiming(open ? 0 : SHEET_HIDDEN, {
			duration: open ? 280 : 200,
			easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
		}, (finished) => {
			if (finished && !open) {
				runOnJS(setSheetMounted)(false);
			}
		});
		return undefined;
	}, [prompt, sheetMounted, sheetY]);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: sheetY.value }],
	}));

	const begin = (nextDefinition, nextUserId) => {
		const next = startSession(nextDefinition);
		sessionRef.current = next;
		setPrompt(null);
		setSummary(null);
		summaryId.current = null;
		setSession(next);
		rememberRecentTraining(nextUserId, {
			id: nextDefinition.id,
			kind: 'exercise',
			name: nextDefinition.name,
		});
	};

	const applySession = (next) => {
		sessionRef.current = next;
		setSession(next);
		if (next?.status === 'completed') {
			finish(next);
		}
	};

	useLayoutEffect(() => {
		navigation.setOptions({ title: definition?.name || 'Ćwiczenie' });
	}, [navigation, definition?.name]);

	useEffect(() => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || !isTimed(current)) {
			return undefined;
		}
		const runEndsAt = current.endsAt;
		const cues = scheduleCues(runEndsAt, Date.now());
		let ended = false;
		const timeUp = () => {
			const live = sessionRef.current;
			if (ended || !live || live.endsAt !== runEndsAt || live.status !== 'playing') {
				return;
			}
			ended = true;
			setPrompt(null);
			playFinalBell();
			applySession(isLooseThrows(live) ? expireLooseThrows(live) : expireSectorClock(live));
		};
		setNow(Date.now());
		const tickTimer = setTimeout(() => {
			const live = sessionRef.current;
			if (ended || !live || live.endsAt !== runEndsAt || live.status !== 'playing') {
				return;
			}
			const fresh = scheduleCues(runEndsAt, Date.now());
			if (fresh.endDelayMs <= 0) {
				return;
			}
			playTicking(fresh.tickPositionSeconds);
		}, cues.tickDelayMs);
		const endTimer = setTimeout(timeUp, cues.endDelayMs);
		const display = setInterval(() => {
			setNow(Date.now());
			if (Date.now() >= runEndsAt) {
				timeUp();
			}
		}, 250);
		return () => {
			clearTimeout(tickTimer);
			clearTimeout(endTimer);
			clearInterval(display);
			stopTicking();
		};
	}, [session?.clientSessionId, session?.status, session?.endsAt]);

	useEffect(() => {
		if (started.current || !canPlay(definition)) {
			return;
		}
		started.current = true;
		begin(definition, userIdRef.current);
	}, [definition]);

	useEffect(() => {
		const unsubscribe = navigation.addListener('beforeRemove', (event) => {
			if (leaving.current || !playing) {
				return;
			}
			event.preventDefault();
			setPrompt('abort');
		});
		return unsubscribe;
	}, [navigation, playing]);

	const leaveHome = () => {
		leaving.current = true;
		navigation.navigate('TrainingHome');
	};

	const finish = async (next) => {
		const record = completionFor(next, new Date().toISOString());
		summaryId.current = record.clientSessionId;
		setSummary(record);
		try {
			await enqueueTrainingCompletion(userIdRef.current, record);
			const items = await flushTrainingOutbox(userIdRef.current, accessTokenRef.current);
			if (summaryId.current !== record.clientSessionId) {
				return;
			}
			const saved = items.find((item) => item.clientSessionId === record.clientSessionId);
			setSummary(saved ?? record);
		} catch {
			setSummary(record);
		}
	};

	const submit = (hit) => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || prompt) {
			return;
		}
		applySession((isSectorClock(current) ? recordSectorOutcome : recordOutcome)(current, hit));
	};

	const undo = () => {
		const current = sessionRef.current;
		if (!current || prompt) {
			return;
		}
		applySession((isSectorClock(current) ? undoSectorDart : undoDart)(current));
	};

	useEffect(() => {
		if (summary?.sync !== 'pending') {
			return undefined;
		}
		let cancelled = false;
		const send = async () => {
			const items = await flushTrainingOutbox(userIdRef.current, accessToken);
			if (cancelled || summaryId.current == null) {
				return;
			}
			const saved = items.find((item) => item.clientSessionId === summaryId.current);
			if (saved) {
				setSummary(saved);
			}
		};
		const unsubscribe = NetInfo.addEventListener((state) => {
			if (state.isConnected) {
				send();
			}
		});
		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [summary?.sync, summary?.clientSessionId, accessToken]);

	const confirmPrompt = () => {
		setPrompt(null);
		leaveHome();
	};

	const repeat = () => {
		if (canPlay(definition)) {
			begin(definition, userId);
		}
	};

	if (!canPlay(definition)) {
		return (
			<View style={styles.fallback}>
				<Text style={styles.fallbackText}>Nie da się teraz rozpocząć tego ćwiczenia.</Text>
				<Pressable accessibilityRole="button" onPress={leaveHome} style={styles.primary}>
					<Text style={styles.primaryText}>Powrót do ekranu treningu</Text>
				</Pressable>
			</View>
		);
	}

	if (!session) {
		return <View style={styles.screen} />;
	}

	const loose = isLooseThrows(session);
	const visit = loose ? null : (isSectorClock(session) ? currentSectorVisit(session) : currentVisit(session));
	const dartLabel = visit ? `Lotka nr ${(session.darts.length % 3) + 1}` : '';
	const instruction = isSectorClock(session) ? SECTOR_AIM_TEXT : AIM_TEXT;
	const timed = isTimed(session);
	const remaining = timed ? visibleRemainingMs(session, now) : 0;
	const duration = timed ? session.durationMs : 0;
	const elapsed = Math.max(0, duration - remaining);
	const clockLabel = formatRemaining(remaining);
	const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;
	const clockUrgent = remaining <= TICK_MS;
	const showClock = playing && isSectorClock(session);
	const showLooseClock = playing && loose;

	return (
		<View style={styles.screen}>
			{showClock ? (
				<View
					style={styles.clockBar}
					accessibilityRole="text"
					accessibilityLabel={`Zostało ${clockLabel}`}
				>
					<Text style={styles.clockCaption}>Zostało</Text>
					<Text style={[styles.clockValue, clockUrgent && styles.clockUrgent]}>{clockLabel}</Text>
					<View style={styles.clockTrack}>
						<View
							style={[
								styles.clockFill,
								clockUrgent && styles.clockFillUrgent,
								{ width: `${progress * 100}%` },
							]}
						/>
					</View>
				</View>
			) : null}
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				{showLooseClock ? (
					<View style={styles.looseClock}>
						<View
							accessibilityRole="text"
							accessibilityLabel={`Zostało ${clockLabel}`}
							style={styles.looseClockFace}
						>
							<Text style={styles.looseCaption}>Zostało</Text>
							<Text style={[styles.looseValue, clockUrgent && styles.clockUrgent]}>{clockLabel}</Text>
							<View style={styles.clockTrack}>
								<View
									style={[
										styles.clockFill,
										clockUrgent && styles.clockFillUrgent,
										{ width: `${progress * 100}%` },
									]}
								/>
							</View>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Przerwij"
							disabled={Boolean(prompt)}
							onPress={() => setPrompt('abort')}
							style={styles.ghost}
						>
							<Text style={styles.ghostText}>Przerwij</Text>
						</Pressable>
					</View>
				) : null}
				{playing && visit ? (
					<View>
						<Text style={styles.instruction}>{instruction}</Text>
						<View style={styles.targets}>
							{visit.targets.map((target, offset) => {
								const active = offset === visit.activeOffset;
								const label = targetLabel(target);
								return (
									<View
										key={`${target.kind}-${target.number ?? 'bull'}`}
										accessibilityRole="text"
										accessibilityLabel={target.kind === 'bull' ? 'Bull' : `Sektor ${label}`}
										accessibilityState={{ selected: active }}
										style={[styles.targetCell, active && styles.targetCellActive]}
									>
										<Text style={[
											styles.targetText,
											active && styles.targetTextActive,
											label.length > 2 && (active ? styles.targetTextLongActive : styles.targetTextLong),
										]}>
											{label}
										</Text>
									</View>
								);
							})}
							{Array.from({ length: Math.max(0, 3 - visit.targets.length) }, (_, index) => (
								<View key={`empty-${index}`} style={styles.targetSpacer} />
							))}
						</View>
						<Text style={styles.dartLabel} accessibilityRole="text">{dartLabel}</Text>
						<View style={styles.outcomeRow}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Pudło"
								disabled={Boolean(prompt)}
								onPress={() => submit(false)}
								style={[styles.miss, prompt && styles.disabled]}
							>
								<Text style={styles.missText}>Pudło</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Trafiona"
								disabled={Boolean(prompt)}
								onPress={() => submit(true)}
								style={[styles.hit, prompt && styles.disabled]}
							>
								<Text style={styles.hitText}>Trafiona</Text>
							</Pressable>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Cofnij"
							disabled={Boolean(prompt) || session.darts.length === 0}
							onPress={undo}
							style={[styles.secondary, (prompt || session.darts.length === 0) && styles.disabled]}
						>
							<Text style={styles.secondaryText}>Cofnij</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Przerwij"
							disabled={Boolean(prompt)}
							onPress={() => setPrompt('abort')}
							style={styles.ghost}
						>
							<Text style={styles.ghostText}>Przerwij</Text>
						</Pressable>
					</View>
				) : null}
				{summary ? (
					<View>
						<Text style={styles.summaryName}>{summary.name}</Text>
						{isLooseThrows(summary) ? (
							<View>
								<Text style={styles.statLabel}>Czas</Text>
								<Text style={styles.statValue}>{formatRemaining((summary.stats.elapsedSeconds ?? 0) * 1000)}</Text>
							</View>
						) : (
							<View>
								<Text style={styles.statLabel}>Trafienia</Text>
								<Text style={styles.statValue}>{summary.stats.hits} z {summary.stats.attempts}</Text>
								<Text style={styles.statLabel}>Procent</Text>
								<Text style={styles.statValue}>{summary.stats.percent}%</Text>
							</View>
						)}
						<Text style={styles.sync}>{syncLabel(summary.sync)}</Text>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Powtórz ćwiczenie"
							onPress={repeat}
							style={styles.primary}
						>
							<Text style={styles.primaryText}>Powtórz ćwiczenie</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Powrót do ekranu treningu"
							onPress={leaveHome}
							style={styles.secondary}
						>
							<Text style={styles.secondaryText}>Powrót do ekranu treningu</Text>
						</Pressable>
					</View>
				) : null}
			</ScrollView>
			{sheetMounted ? (
				<Animated.View pointerEvents={prompt ? 'auto' : 'none'} style={[styles.prompt, sheetStyle]}>
					<Text style={styles.promptText}>{ABORT_TEXT}</Text>
					<View style={styles.promptRow}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Anuluj"
							onPress={() => setPrompt(null)}
							style={[styles.secondary, styles.promptButton]}
						>
							<Text style={styles.secondaryText}>Anuluj</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Przerwij"
							onPress={confirmPrompt}
							style={[styles.primary, styles.promptButton]}
						>
							<Text style={styles.primaryText}>Przerwij</Text>
						</Pressable>
					</View>
				</Animated.View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
		overflow: 'hidden',
	},
	scroll: {
		flex: 1,
	},
	content: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
		width: '100%',
		maxWidth: 480,
		alignSelf: 'center',
	},
	clockBar: {
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		backgroundColor: colors.bg,
	},
	clockCaption: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
		textAlign: 'center',
	},
	clockValue: {
		marginTop: 2,
		marginBottom: 10,
		color: colors.text,
		fontSize: 28,
		lineHeight: 34,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
		textAlign: 'center',
	},
	clockUrgent: {
		color: colors.warning,
	},
	clockTrack: {
		alignSelf: 'stretch',
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.bgElevated,
		overflow: 'hidden',
	},
	clockFill: {
		height: '100%',
		borderRadius: 4,
		backgroundColor: colors.accent,
	},
	clockFillUrgent: {
		backgroundColor: colors.warning,
	},
	looseClock: {
		alignItems: 'center',
		width: '100%',
	},
	looseClockFace: {
		alignSelf: 'stretch',
		alignItems: 'center',
		marginBottom: 28,
	},
	looseCaption: {
		color: colors.textMuted,
		fontSize: 16,
		fontWeight: '700',
		textAlign: 'center',
	},
	looseValue: {
		marginTop: 8,
		marginBottom: 28,
		color: colors.text,
		fontSize: 72,
		lineHeight: 80,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
		textAlign: 'center',
	},
	instruction: {
		textAlign: 'center',
		color: colors.textSecondary,
		fontSize: 22,
		lineHeight: 30,
		fontWeight: '600',
		marginBottom: 20,
	},
	targets: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	targetSpacer: {
		flex: 1,
	},
	dartLabel: {
		textAlign: 'center',
		color: colors.text,
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '700',
		marginBottom: 20,
	},
	targetCell: {
		flex: 1,
		minHeight: 112,
		borderRadius: 16,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	targetCellActive: {
		backgroundColor: colors.accent,
		borderColor: colors.accent,
	},
	targetText: {
		color: colors.textMuted,
		fontSize: 40,
		fontWeight: '700',
	},
	targetTextActive: {
		color: colors.onAccent,
		fontSize: 48,
	},
	targetTextLong: {
		fontSize: 28,
	},
	targetTextLongActive: {
		fontSize: 32,
	},
	outcomeRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 20,
	},
	hit: {
		flex: 1,
		minHeight: 88,
		borderRadius: 12,
		backgroundColor: colors.success,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	hitText: {
		color: colors.onSuccess,
		fontSize: 20,
		fontWeight: '700',
	},
	miss: {
		flex: 1,
		minHeight: 88,
		borderRadius: 12,
		backgroundColor: colors.bgElevated,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	missText: {
		color: colors.text,
		fontSize: 20,
		fontWeight: '700',
	},
	ghost: {
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ghostText: {
		color: colors.textMuted,
		fontSize: 15,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.4,
	},
	summaryName: {
		color: colors.text,
		fontSize: 22,
		fontWeight: '700',
		marginBottom: 20,
	},
	statLabel: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
	},
	statValue: {
		marginTop: 4,
		marginBottom: 16,
		color: colors.text,
		fontSize: 32,
		fontWeight: '700',
	},
	sync: {
		marginBottom: 20,
		color: colors.textSecondary,
		fontSize: 15,
	},
	primary: {
		minHeight: 48,
		borderRadius: 10,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	primaryText: {
		color: colors.onAccent,
		fontSize: 16,
		fontWeight: '700',
	},
	secondary: {
		minHeight: 48,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	secondaryText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	prompt: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 2,
		elevation: 8,
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 24,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.bgElevated,
	},
	promptText: {
		color: colors.text,
		fontSize: 16,
		lineHeight: 22,
		marginBottom: 12,
	},
	promptRow: {
		flexDirection: 'row',
		gap: 8,
	},
	promptButton: {
		flex: 1,
		marginBottom: 0,
	},
	fallback: {
		flex: 1,
		backgroundColor: colors.bg,
		paddingHorizontal: 24,
		paddingVertical: 24,
		justifyContent: 'center',
	},
	fallbackText: {
		color: colors.textMuted,
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 16,
	},
});

export default TrainingExerciseScreen;

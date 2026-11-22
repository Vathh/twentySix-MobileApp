import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import useAuth from '../../hooks/useAuth';
import { createClientSessionId } from '../../helpers/training/clientSessionId';
import { loadTrainingInputMode } from '../../helpers/training/trainingInputMode';
import { rememberRecentTraining } from '../../helpers/training/recentTrainingStore';
import {
	enqueueTrainingCompletion,
	flushTrainingOutbox,
} from '../../helpers/training/trainingSessionStore';
import { syncLabel } from '../../helpers/training/trainingSessionSync';
import {
	advanceHang,
	currentTitle,
	emptyPlanHang,
	extendBreak,
	finalizeHang,
	pauseBreak,
	planItemAt,
	planProgressLabel,
	recordBreakResult,
	recordExerciseResult,
	resumeBreak,
	slotToExerciseDefinition,
	slotVariant,
	startBreakState,
} from '../../helpers/training/planSession';
import { clearHangingPlan, loadHangingPlan, saveHangingPlan } from '../../helpers/training/planSessionStore';
import {
	formatRemaining,
	visibleRemainingMs,
	TICK_MS,
} from '../../helpers/training/sectorClockExercise';
import { colors } from '../../theme/colors';
import TrainingAimRings from './TrainingAimRings';
import TrainingExerciseScreen from './TrainingExerciseScreen';

const MENU = 'menu';
const SKIP = 'skip';
const END = 'end';
const REPEAT = 'repeat';

const TrainingPlanScreen = ({ navigation, route }) => {
	const { auth } = useAuth();
	const userId = auth?.userId;
	const accessToken = auth?.accessToken;
	const [hang, setHang] = useState(null);
	const [now, setNow] = useState(() => Date.now());
	const [menuOpen, setMenuOpen] = useState(false);
	const [prompt, setPrompt] = useState(null);
	const hangRef = useRef(null);
	const leaving = useRef(false);
	const summaryId = useRef(null);
	const userIdRef = useRef(userId);
	const accessTokenRef = useRef(accessToken);
	userIdRef.current = userId;
	accessTokenRef.current = accessToken;

	const persist = useCallback(async (next) => {
		hangRef.current = next;
		setHang(next);
		if (!next || next.phase === 'summary') {
			await clearHangingPlan(userIdRef.current);
			return;
		}
		await saveHangingPlan(userIdRef.current, next);
	}, []);

	useEffect(() => {
		let live = true;
		(async () => {
			const resume = route?.params?.resume;
			const plan = route?.params?.plan;
			const existing = await loadHangingPlan(userId);
			if (!live) {
				return;
			}
			if ((resume || !plan) && existing && existing.phase === 'running') {
				hangRef.current = existing;
				setHang(existing);
				return;
			}
			if (!plan || !Array.isArray(plan.items) || plan.items.length === 0) {
				return;
			}
			const inputMode = await loadTrainingInputMode(userId);
			const next = emptyPlanHang(plan, createClientSessionId(), inputMode);
			const first = planItemAt(plan, 0);
			if (first?.kind === 'break') {
				next.break = startBreakState(first);
			}
			await rememberRecentTraining(userId, {
				id: plan.id,
				kind: 'plan',
				name: plan.name,
			});
			if (!live) {
				return;
			}
			await persist(next);
		})();
		return () => {
			live = false;
		};
	}, [userId, route?.params?.plan, route?.params?.resume, persist]);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: hang?.plan?.name || 'Plan',
			headerRight: () => (
				hang?.phase === 'running' ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Menu planu"
						onPress={() => setMenuOpen(true)}
						hitSlop={12}
						style={styles.menuButton}
					>
						<Text style={styles.menuButtonText}>⋯</Text>
					</Pressable>
				) : null
			),
		});
	}, [navigation, hang?.phase, hang?.plan?.name]);

	useEffect(() => {
		const current = hangRef.current;
		if (!current || current.phase !== 'running' || !current.break || current.break.paused || current.paused) {
			return undefined;
		}
		const endsAt = current.break.endsAt;
		if (!endsAt) {
			return undefined;
		}
		setNow(Date.now());
		const tick = setInterval(() => {
			const stamp = Date.now();
			setNow(stamp);
			if (stamp >= endsAt) {
				finishBreak('completed');
			}
		}, 250);
		return () => clearInterval(tick);
	}, [hang?.index, hang?.break?.endsAt, hang?.break?.paused, hang?.paused, hang?.phase]);

	useEffect(() => {
		const unsubscribe = navigation.addListener('beforeRemove', (event) => {
			if (leaving.current || hangRef.current?.phase !== 'running') {
				return;
			}
			event.preventDefault();
			setPrompt(END);
		});
		return unsubscribe;
	}, [navigation]);

	const finishBreak = async (status) => {
		const current = hangRef.current;
		if (!current || current.phase !== 'running') {
			return;
		}
		const item = planItemAt(current.plan, current.index);
		if (!item || item.kind !== 'break') {
			return;
		}
		let next = recordBreakResult(current, item, status);
		next = advanceHang(next);
		await persist(next);
		if (next.phase === 'summary') {
			await syncSummary(next.summary);
		}
	};

	const finishExercise = async (completion, status = 'completed') => {
		const current = hangRef.current;
		if (!current || current.phase !== 'running') {
			return;
		}
		const item = planItemAt(current.plan, current.index);
		if (!item || item.kind !== 'exercise') {
			return;
		}
		let next = recordExerciseResult(current, item, completion, status);
		next = advanceHang(next);
		await persist(next);
		if (next.phase === 'summary') {
			await syncSummary(next.summary);
		}
	};

	const syncSummary = async (summary) => {
		if (!summary) {
			return;
		}
		summaryId.current = summary.clientSessionId;
		try {
			await enqueueTrainingCompletion(userIdRef.current, summary);
			const items = await flushTrainingOutbox(userIdRef.current, accessTokenRef.current);
			if (summaryId.current !== summary.clientSessionId) {
				return;
			}
			const saved = items.find((row) => row.clientSessionId === summary.clientSessionId);
			const current = hangRef.current;
			if (current?.summary?.clientSessionId === summary.clientSessionId) {
				await persist({
					...current,
					summary: saved ?? summary,
				});
			}
		} catch {
			// zostaje pending
		}
	};

	useEffect(() => {
		if (hang?.summary?.sync !== 'pending') {
			return undefined;
		}
		let cancelled = false;
		const send = async () => {
			const items = await flushTrainingOutbox(userIdRef.current, accessToken);
			if (cancelled || summaryId.current == null) {
				return;
			}
			const saved = items.find((row) => row.clientSessionId === summaryId.current);
			const current = hangRef.current;
			if (saved && current?.summary?.clientSessionId === summaryId.current) {
				await persist({ ...current, summary: saved });
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
	}, [hang?.summary?.sync, hang?.summary?.clientSessionId, accessToken, persist]);

	const leaveHome = () => {
		leaving.current = true;
		navigation.navigate('TrainingHome');
	};

	const togglePause = async () => {
		const current = hangRef.current;
		if (!current || current.phase !== 'running') {
			return;
		}
		setMenuOpen(false);
		const paused = !current.paused;
		let next = { ...current, paused };
		if (current.break) {
			next.break = paused
				? pauseBreak(current.break)
				: resumeBreak(current.break);
		}
		await persist(next);
	};

	const confirmPrompt = async () => {
		const kind = prompt;
		setPrompt(null);
		setMenuOpen(false);
		const current = hangRef.current;
		if (!current) {
			return;
		}
		if (kind === SKIP) {
			const item = planItemAt(current.plan, current.index);
			if (item?.kind === 'break') {
				await finishBreak('skipped');
				return;
			}
			await finishExercise(null, 'skipped');
			return;
		}
		if (kind === END) {
			await clearHangingPlan(userIdRef.current);
			hangRef.current = null;
			setHang(null);
			leaveHome();
			return;
		}
		if (kind === REPEAT && current.plan && !current.plan.inactive) {
			const inputMode = await loadTrainingInputMode(userId);
			const next = emptyPlanHang(current.plan, createClientSessionId(), inputMode);
			const first = planItemAt(current.plan, 0);
			if (first?.kind === 'break') {
				next.break = startBreakState(first);
			}
			await persist(next);
		}
	};

	const addMinute = async () => {
		const current = hangRef.current;
		if (!current?.break || current.paused) {
			return;
		}
		await persist({
			...current,
			break: extendBreak(current.break),
		});
	};

	const item = hang ? planItemAt(hang.plan, hang.index) : null;
	const exerciseDefinition = item?.kind === 'exercise'
		? slotToExerciseDefinition(hang.plan, item)
		: null;
	const exerciseKey = `${hang?.clientSessionId || 'plan'}-${hang?.index ?? 0}-${item?.exerciseKey || 'x'}`;

	const planHost = (!hang || hang.phase !== 'running' || item?.kind !== 'exercise' || !exerciseDefinition)
		? null
		: {
			definition: exerciseDefinition,
			inputMode: hang.inputMode,
			paused: hang.paused,
			initialSession: hang.exerciseSession,
			onSessionChange: (session) => {
				const live = hangRef.current;
				if (!live || live.phase !== 'running') {
					return;
				}
				const next = { ...live, exerciseSession: session };
				hangRef.current = next;
				saveHangingPlan(userIdRef.current, next);
			},
			onComplete: (record) => {
				finishExercise(record, 'completed');
			},
		};

	if (!hang) {
		return <View style={styles.screen} />;
	}

	if (hang.phase === 'summary' && hang.summary) {
		return (
			<SummaryView
				summary={hang.summary}
				plan={hang.plan}
				onHome={leaveHome}
				onRepeat={() => setPrompt(REPEAT)}
				prompt={prompt}
				onCancelPrompt={() => setPrompt(null)}
				onConfirmPrompt={confirmPrompt}
			/>
		);
	}

	const breakState = hang.break;
	const breakRemaining = breakState
		? visibleRemainingMs(
			{
				durationMs: breakState.durationMs,
				endsAt: breakState.endsAt,
				remainingMs: breakState.remainingMs,
			},
			now,
		)
		: 0;
	const breakProgress = breakState?.durationMs
		? Math.min(1, Math.max(0, (breakState.durationMs - breakRemaining) / breakState.durationMs))
		: 0;
	const title = currentTitle(hang);
	const progress = planProgressLabel(hang.index, hang.total);

	return (
		<View style={styles.screen}>
			<View style={styles.chrome}>
				<Text style={styles.progress}>{progress}</Text>
				<Text style={styles.title}>{title}</Text>
				{hang.paused ? <Text style={styles.paused}>Pauza</Text> : null}
			</View>

			{item?.kind === 'break' && breakState ? (
				<View style={styles.breakBody}>
					<Text style={styles.clockCaption}>Zostało</Text>
					<Text style={[styles.clockValue, breakRemaining <= TICK_MS && styles.clockUrgent]}>
						{formatRemaining(breakRemaining)}
					</Text>
					<View style={styles.clockTrack}>
						<View style={[styles.clockFill, { width: `${breakProgress * 100}%` }]} />
					</View>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Dodaj minutę"
						disabled={hang.paused}
						onPress={addMinute}
						style={[styles.secondary, hang.paused && styles.disabled]}
					>
						<Text style={styles.secondaryText}>+1 minuta</Text>
					</Pressable>
				</View>
			) : null}

			{item?.kind === 'exercise' && planHost ? (
				<View style={styles.exerciseHost} key={exerciseKey}>
					<TrainingExerciseScreen
						navigation={navigation}
						route={{ params: { definition: exerciseDefinition, variant: slotVariant(item), inputMode: hang.inputMode } }}
						planHost={planHost}
					/>
				</View>
			) : null}

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
						<Pressable accessibilityRole="button" onPress={togglePause} style={styles.menuItem}>
							<Text style={styles.menuItemText}>{hang.paused ? 'Wznów' : 'Pauza'}</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							onPress={() => {
								setMenuOpen(false);
								setPrompt(SKIP);
							}}
							style={styles.menuItem}
						>
							<Text style={styles.menuItemText}>
								{item?.kind === 'break' ? 'Pomiń przerwę' : 'Pomiń ćwiczenie'}
							</Text>
						</Pressable>
						<Pressable
							accessibilityRole="button"
							onPress={() => {
								setMenuOpen(false);
								setPrompt(END);
							}}
							style={styles.menuItem}
						>
							<Text style={[styles.menuItemText, styles.dangerText]}>Zakończ plan</Text>
						</Pressable>
					</View>
				</Pressable>
			</Modal>

			<ConfirmSheet
				prompt={prompt}
				itemKind={item?.kind}
				onCancel={() => setPrompt(null)}
				onConfirm={confirmPrompt}
			/>
		</View>
	);
};

function ConfirmSheet({ prompt, itemKind, onCancel, onConfirm }) {
	if (!prompt || prompt === REPEAT) {
		return null;
	}
	const text = prompt === SKIP
		? (itemKind === 'break'
			? 'Pominąć tę przerwę?'
			: 'Pominąć to ćwiczenie?')
		: 'Zakończyć plan wcześniej? Sesja nie wejdzie do historii.';
	return (
		<View style={styles.prompt}>
			<Text style={styles.promptText}>{text}</Text>
			<View style={styles.promptRow}>
				<Pressable accessibilityRole="button" onPress={onCancel} style={[styles.secondary, styles.promptButton]}>
					<Text style={styles.secondaryText}>Anuluj</Text>
				</Pressable>
				<Pressable accessibilityRole="button" onPress={onConfirm} style={[styles.primary, styles.promptButton]}>
					<Text style={styles.primaryText}>{prompt === SKIP ? 'Pomiń' : 'Zakończ'}</Text>
				</Pressable>
			</View>
		</View>
	);
}

function SummaryView({ summary, plan, onHome, onRepeat, prompt, onCancelPrompt, onConfirmPrompt }) {
	const [open, setOpen] = useState(() => new Set());
	const toggle = (position) => {
		setOpen((prev) => {
			const next = new Set(prev);
			if (next.has(position)) {
				next.delete(position);
			} else {
				next.add(position);
			}
			return next;
		});
	};
	const inactive = Boolean(plan?.inactive || summary.inactive);
	const dateLabel = summary.completedAt
		? new Date(summary.completedAt).toLocaleDateString('pl-PL')
		: '';

	return (
		<View style={styles.screen}>
			<ScrollView contentContainerStyle={styles.summaryContent}>
				<Text style={styles.summaryName}>{summary.name || plan?.name}</Text>
				{dateLabel ? <Text style={styles.summaryMeta}>{dateLabel}</Text> : null}
				<Text style={styles.statLabel}>Łączna punktacja</Text>
				<Text style={styles.statValue}>{summary.score ?? 0}</Text>
				<Text style={styles.sync}>{syncLabel(summary.sync)}</Text>

				{(summary.stats?.aims?.length > 0) ? (
					<>
						<Text style={styles.sectionLabel}>Skuteczność</Text>
						<TrainingAimRings aims={summary.stats.aims} />
					</>
				) : null}

				<Text style={styles.sectionLabel}>Ćwiczenia</Text>
				{(summary.results || []).filter((row) => row.kind === 'exercise').map((row) => {
					const expanded = open.has(row.position);
					return (
						<View key={`${row.position}-${row.exerciseKey}`} style={styles.rowCard}>
							<Pressable accessibilityRole="button" onPress={() => toggle(row.position)} style={styles.rowHead}>
								<View style={styles.rowTitles}>
									<Text style={styles.rowName}>{row.name}</Text>
									{row.status === 'skipped' ? (
										<View style={styles.badge}><Text style={styles.badgeText}>Pominięty</Text></View>
									) : null}
									{row.scored === false && row.status !== 'skipped' ? (
										<View style={styles.badge}><Text style={styles.badgeText}>Rozgrzewka</Text></View>
									) : null}
								</View>
								<Text style={styles.rowScore}>
									{row.status === 'skipped' ? '—' : (row.score ?? 0)}
								</Text>
							</Pressable>
							{expanded && row.status !== 'skipped' ? (
								<View style={styles.rowBody}>
									{row.aims?.length ? <TrainingAimRings aims={row.aims} /> : (
										<Text style={styles.summaryMeta}>Bez celów lotek.</Text>
									)}
								</View>
							) : null}
						</View>
					);
				})}

				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Powtórz plan"
					disabled={inactive}
					onPress={onRepeat}
					style={[styles.primary, inactive && styles.disabled]}
				>
					<Text style={styles.primaryText}>Powtórz plan</Text>
				</Pressable>
				<Pressable accessibilityRole="button" onPress={onHome} style={styles.secondary}>
					<Text style={styles.secondaryText}>Powrót do ekranu treningu</Text>
				</Pressable>
			</ScrollView>

			{prompt === REPEAT ? (
				<View style={styles.prompt}>
					<Text style={styles.promptText}>Czy na pewno chcesz rozpocząć ten plan ponownie?</Text>
					<View style={styles.promptRow}>
						<Pressable accessibilityRole="button" onPress={onCancelPrompt} style={[styles.secondary, styles.promptButton]}>
							<Text style={styles.secondaryText}>Anuluj</Text>
						</Pressable>
						<Pressable accessibilityRole="button" onPress={onConfirmPrompt} style={[styles.primary, styles.promptButton]}>
							<Text style={styles.primaryText}>Rozpocznij</Text>
						</Pressable>
					</View>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: colors.bg,
	},
	chrome: {
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	progress: {
		textAlign: 'center',
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '700',
	},
	title: {
		marginTop: 4,
		textAlign: 'center',
		color: colors.text,
		fontSize: 22,
		fontWeight: '700',
	},
	paused: {
		marginTop: 4,
		textAlign: 'center',
		color: colors.accent,
		fontSize: 13,
		fontWeight: '700',
	},
	breakBody: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	exerciseHost: {
		flex: 1,
	},
	clockCaption: {
		textAlign: 'center',
		color: colors.textMuted,
		fontSize: 14,
		fontWeight: '700',
	},
	clockValue: {
		marginTop: 4,
		textAlign: 'center',
		color: colors.text,
		fontSize: 48,
		fontWeight: '700',
	},
	clockUrgent: {
		color: colors.dangerAlt,
	},
	clockTrack: {
		marginTop: 16,
		marginBottom: 24,
		height: 8,
		borderRadius: 999,
		backgroundColor: colors.bgElevated,
		overflow: 'hidden',
	},
	clockFill: {
		height: '100%',
		backgroundColor: colors.accent,
	},
	menuButton: {
		paddingHorizontal: 12,
		paddingVertical: 4,
	},
	menuButtonText: {
		color: colors.text,
		fontSize: 28,
		fontWeight: '700',
		lineHeight: 28,
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
		minWidth: 200,
		backgroundColor: colors.bgElevated,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
	},
	menuItem: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border,
	},
	menuItemText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
	},
	dangerText: {
		color: colors.dangerAlt,
	},
	primary: {
		minHeight: 48,
		borderRadius: 10,
		backgroundColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	primaryText: {
		color: colors.bgDeep,
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
		marginBottom: 8,
	},
	secondaryText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.4,
	},
	prompt: {
		position: 'absolute',
		left: 16,
		right: 16,
		bottom: 24,
		backgroundColor: colors.bgElevated,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 16,
	},
	promptText: {
		color: colors.text,
		fontSize: 16,
		fontWeight: '600',
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
	summaryContent: {
		padding: 20,
		paddingBottom: 40,
	},
	summaryName: {
		color: colors.text,
		fontSize: 24,
		fontWeight: '700',
	},
	summaryMeta: {
		marginTop: 4,
		marginBottom: 12,
		color: colors.textMuted,
		fontSize: 14,
	},
	statLabel: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
	},
	statValue: {
		marginTop: 4,
		marginBottom: 8,
		color: colors.text,
		fontSize: 36,
		fontWeight: '700',
	},
	sync: {
		marginBottom: 16,
		color: colors.textSecondary,
		fontSize: 14,
	},
	sectionLabel: {
		marginTop: 8,
		marginBottom: 8,
		color: colors.text,
		fontSize: 17,
		fontWeight: '700',
	},
	rowCard: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: 12,
		marginBottom: 8,
		overflow: 'hidden',
	},
	rowHead: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 12,
		backgroundColor: colors.bgElevated,
	},
	rowTitles: {
		flex: 1,
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 6,
		paddingRight: 8,
	},
	rowName: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	rowScore: {
		color: colors.textSecondary,
		fontSize: 16,
		fontWeight: '700',
	},
	rowBody: {
		padding: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.border,
	},
	badge: {
		borderRadius: 999,
		borderWidth: 1,
		borderColor: colors.borderStrong,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	badgeText: {
		color: colors.textMuted,
		fontSize: 11,
		fontWeight: '700',
	},
});

export default TrainingPlanScreen;

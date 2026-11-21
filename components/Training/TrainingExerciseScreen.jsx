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
	CLOCK_MECHANIC,
	DOUBLES_AIM_TEXT,
	DOUBLES_CLOCK_MECHANIC,
	canPlayClock,
	clockCompletion,
	currentVisit,
	recordOutcome,
	startClockSession,
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
	NINE_DARTS_MECHANIC,
	canPlayNineDarts,
	currentAim,
	nineDartsCompletion,
	recordNineDart,
	startNineDartsSession,
	undoNineDart,
} from '../../helpers/training/nineDartsExercise';
import {
	BOB27_EASY_AIM_TEXT,
	BOB27_EASY_MECHANIC,
	bob27EasyCompletion,
	canPlayBob27Easy,
	currentBob27EasyVisit,
	expireBob27Easy,
	recordBob27EasyDart,
	startBob27EasySession,
	undoBob27EasyDart,
} from '../../helpers/training/bobs27EasyExercise';
import {
	canPlayCatch20,
	catch20Completion,
	catch20View,
	expireCatch20,
	recordCatch20Dart,
	recordCatch20Sum,
	startCatch20Session,
	undoCatch20,
	CATCH20_MECHANIC,
} from '../../helpers/training/catch20Exercise';
import {
	CHECKOUT_41_MECHANIC,
	canPlayCheckout41,
	checkout41Completion,
	checkout41View,
	expireCheckout41,
	recordCheckout41Check,
	recordCheckout41Dart,
	recordCheckout41Fail,
	startCheckout41Session,
	undoCheckout41,
} from '../../helpers/training/checkout41Exercise';
import {
	CHECKOUT_BULL_81_MECHANIC,
	canPlayCheckoutBull81,
	checkoutBull81Completion,
	checkoutBull81View,
	expireCheckoutBull81,
	recordCheckoutBull81Dart,
	startCheckoutBull81Session,
	undoCheckoutBull81,
} from '../../helpers/training/checkoutBull81Exercise';
import {
	SCORING_65_MECHANIC,
	canPlayScoring65,
	expireScoring65,
	recordScoring65Dart,
	recordScoring65Sum,
	scoring65Completion,
	scoring65View,
	startScoring65Session,
	undoScoring65,
} from '../../helpers/training/scoring65Exercise';
import {
	SCORING_PRESSURE_MECHANIC,
	canPlayScoringPressure,
	currentScoringPressureAim,
	expireScoringPressure,
	recordScoringPressureDart,
	scoringPressureCompletion,
	scoringPressureStreak,
	startScoringPressureSession,
	undoScoringPressureDart,
} from '../../helpers/training/scoringUnderPressureExercise';
import {
	SINGLES_AIM_TEXT,
	SINGLES_MECHANIC,
	canPlaySingles,
	currentSinglesVisit,
	expireSingles,
	recordSinglesOutcome,
	singlesCompletion,
	startSinglesSession,
	undoSinglesDart,
} from '../../helpers/training/singlesUnderPressureExercise';
import {
	bob27HardAimText,
	bob27HardCompletion,
	bob27HardScore,
	BOB27_HARD_MECHANIC,
	canPlayBob27Hard,
	currentBob27HardVisit,
	expireBob27Hard,
	recordBob27HardDart,
	startBob27HardSession,
	undoBob27HardDart,
} from '../../helpers/training/bobs27HardExercise';
import {
	BULL_COUNTER_AIM_TEXT,
	BULL_COUNTER_MECHANIC,
	bullCounterCompletion,
	bullCounterScore,
	canPlayBullCounter,
	expireBullCounter,
	recordBullCounterDart,
	startBullCounterSession,
	undoBullCounterDart,
} from '../../helpers/training/bullCounterExercise';
import Catch20Board from './Catch20Board';
import Checkout41Board from './Checkout41Board';
import CheckoutBull81Board from './CheckoutBull81Board';
import Scoring65Board from './Scoring65Board';
import NineDartsBoard from './NineDartsBoard';
import ScoringPressureBoard from './ScoringPressureBoard';
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
import { formatAverage } from '../../helpers/formatAverage';
import { playFinalBell, playTicking, stopTicking } from '../../helpers/gameSounds/playGameSound';
import SectorTargetReel from './SectorTargetReel';
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
	return canPlayClock(definition)
		|| canPlaySectorClock(definition)
		|| canPlayLooseThrows(definition)
		|| canPlayNineDarts(definition)
		|| canPlayBob27Easy(definition)
		|| canPlayBob27Hard(definition)
		|| canPlayBullCounter(definition)
		|| canPlayCatch20(definition)
		|| canPlayCheckout41(definition)
		|| canPlayCheckoutBull81(definition)
		|| canPlayScoring65(definition)
		|| canPlayScoringPressure(definition)
		|| canPlaySingles(definition);
}

function isSectorClock(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === SECTOR_CLOCK_MECHANIC;
}

function isDoublesClock(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === DOUBLES_CLOCK_MECHANIC;
}

function isLooseThrows(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === LOOSE_THROWS_MECHANIC;
}

function isNineDarts(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === NINE_DARTS_MECHANIC;
}

function isBob27Easy(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === BOB27_EASY_MECHANIC;
}

function isBob27Hard(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === BOB27_HARD_MECHANIC;
}

function isBob27(sessionOrDefinition) {
	return isBob27Easy(sessionOrDefinition) || isBob27Hard(sessionOrDefinition);
}

function isBullCounter(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === BULL_COUNTER_MECHANIC;
}

function isCatch20(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === CATCH20_MECHANIC;
}

function isCheckout41(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === CHECKOUT_41_MECHANIC;
}

function isCheckoutBull81(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === CHECKOUT_BULL_81_MECHANIC;
}

function isScoring65(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === SCORING_65_MECHANIC;
}

function isScoringPressure(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === SCORING_PRESSURE_MECHANIC;
}

function isSingles(sessionOrDefinition) {
	return sessionOrDefinition?.exerciseKey === SINGLES_MECHANIC;
}

function exerciseVariantLabel(session) {
	if (isNineDarts(session)) {
		return session?.variant === '18' ? '18 lotek' : '9 lotek';
	}
	if (isScoringPressure(session)) {
		return session?.variant || null;
	}
	if (isSectorClock(session)) {
		return 'Sektory';
	}
	if (isDoublesClock(session)) {
		return 'Double';
	}
	if (session?.exerciseKey === CLOCK_MECHANIC) {
		return 'Szybki';
	}
	return null;
}

function isTimed(sessionOrDefinition) {
	return isSectorClock(sessionOrDefinition)
		|| isLooseThrows(sessionOrDefinition)
		|| isBob27(sessionOrDefinition)
		|| isBullCounter(sessionOrDefinition)
		|| isCatch20(sessionOrDefinition)
		|| isCheckout41(sessionOrDefinition)
		|| isCheckoutBull81(sessionOrDefinition)
		|| isScoring65(sessionOrDefinition)
		|| isScoringPressure(sessionOrDefinition)
		|| isSingles(sessionOrDefinition);
}

function startSession(definition, inputMode, variant) {
	const clientSessionId = createClientSessionId();
	if (canPlayScoringPressure(definition)) {
		return startScoringPressureSession(definition, clientSessionId, variant);
	}
	if (canPlaySingles(definition)) {
		return startSinglesSession(definition, clientSessionId);
	}
	if (canPlayCatch20(definition)) {
		return startCatch20Session(definition, clientSessionId, Date.now(), inputMode);
	}
	if (canPlayCheckout41(definition)) {
		return startCheckout41Session(definition, clientSessionId, Date.now(), inputMode);
	}
	if (canPlayCheckoutBull81(definition)) {
		return startCheckoutBull81Session(definition, clientSessionId);
	}
	if (canPlayScoring65(definition)) {
		return startScoring65Session(definition, clientSessionId, Date.now(), inputMode);
	}
	if (canPlayLooseThrows(definition)) {
		return startLooseThrowsSession(definition, clientSessionId);
	}
	if (canPlayNineDarts(definition)) {
		return startNineDartsSession(definition, clientSessionId, variant);
	}
	if (canPlayBob27Easy(definition)) {
		return startBob27EasySession(definition, clientSessionId);
	}
	if (canPlayBob27Hard(definition)) {
		return startBob27HardSession(definition, clientSessionId);
	}
	if (canPlayBullCounter(definition)) {
		return startBullCounterSession(definition, clientSessionId);
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
	if (isNineDarts(session)) {
		return nineDartsCompletion(session, completedAt);
	}
	if (isBob27Easy(session)) {
		return bob27EasyCompletion(session, completedAt);
	}
	if (isBob27Hard(session)) {
		return bob27HardCompletion(session, completedAt);
	}
	if (isBullCounter(session)) {
		return bullCounterCompletion(session, completedAt);
	}
	if (isCatch20(session)) {
		return catch20Completion(session, completedAt);
	}
	if (isCheckout41(session)) {
		return checkout41Completion(session, completedAt);
	}
	if (isCheckoutBull81(session)) {
		return checkoutBull81Completion(session, completedAt);
	}
	if (isScoring65(session)) {
		return scoring65Completion(session, completedAt);
	}
	if (isScoringPressure(session)) {
		return scoringPressureCompletion(session, completedAt);
	}
	if (isSingles(session)) {
		return singlesCompletion(session, completedAt);
	}
	if (isSectorClock(session)) {
		return sectorClockCompletion(session, completedAt);
	}
	return clockCompletion(session, completedAt);
}

const TrainingExerciseScreen = ({ navigation, route, planHost = null }) => {
	const definition = planHost?.definition ?? route?.params?.definition;
	const planMode = Boolean(planHost);
	const planPaused = Boolean(planHost?.paused);
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
	const pauseRemainRef = useRef(null);
	userIdRef.current = userId;
	accessTokenRef.current = accessToken;

	const playing = session?.status === 'playing' && !summary;
	const interactive = playing && !planPaused;
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

	const begin = (nextDefinition, nextUserId, inputMode, variant) => {
		const restored = planHost?.initialSession;
		const next = restored && restored.status === 'playing'
			? restored
			: startSession(
				nextDefinition,
				inputMode ?? planHost?.inputMode ?? route?.params?.inputMode,
				variant ?? nextDefinition?.variant ?? route?.params?.variant,
			);
		sessionRef.current = next;
		setPrompt(null);
		setSummary(null);
		summaryId.current = null;
		setSession(next);
		planHost?.onSessionChange?.(next);
		if (!planMode) {
			rememberRecentTraining(nextUserId, {
				id: nextDefinition.id,
				kind: 'exercise',
				name: nextDefinition.name,
			});
		}
	};

	const applySession = (next) => {
		sessionRef.current = next;
		setSession(next);
		planHost?.onSessionChange?.(next);
		if (next?.status === 'completed') {
			finish(next);
		}
	};

	const headingName = session?.name || definition?.name || 'Ćwiczenie';
	const headingVariant = exerciseVariantLabel(session);

	useLayoutEffect(() => {
		if (planMode) {
			return;
		}
		navigation.setOptions({
			title: headingVariant ? `${headingName}, ${headingVariant}` : headingName,
		});
	}, [navigation, headingName, headingVariant, planMode]);

	useEffect(() => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || !isTimed(current) || planPaused) {
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
			const expired = isLooseThrows(live)
				? expireLooseThrows(live)
				: isScoringPressure(live)
					? expireScoringPressure(live)
					: isSingles(live)
						? expireSingles(live)
						: isBob27Easy(live)
							? expireBob27Easy(live)
							: isBob27Hard(live)
								? expireBob27Hard(live)
								: isBullCounter(live)
									? expireBullCounter(live)
									: isCatch20(live)
										? expireCatch20(live)
										: isCheckout41(live)
											? expireCheckout41(live)
											: isCheckoutBull81(live)
												? expireCheckoutBull81(live)
												: isScoring65(live)
													? expireScoring65(live)
													: expireSectorClock(live);
			applySession(expired);
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
	}, [session?.clientSessionId, session?.status, session?.endsAt, planPaused]);

	useEffect(() => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || !isTimed(current) || !current.endsAt) {
			return;
		}
		if (planPaused) {
			if (pauseRemainRef.current == null) {
				pauseRemainRef.current = Math.max(0, current.endsAt - Date.now());
				stopTicking();
				const frozen = { ...current, endsAt: null, remainingMs: pauseRemainRef.current };
				sessionRef.current = frozen;
				setSession(frozen);
				planHost?.onSessionChange?.(frozen);
			}
			return;
		}
		if (pauseRemainRef.current != null) {
			const remainingMs = pauseRemainRef.current;
			pauseRemainRef.current = null;
			const resumed = {
				...current,
				remainingMs,
				endsAt: Date.now() + remainingMs,
			};
			sessionRef.current = resumed;
			setSession(resumed);
			planHost?.onSessionChange?.(resumed);
		}
	}, [planPaused, session?.clientSessionId]);

	useEffect(() => {
		if (started.current || !canPlay(definition)) {
			return;
		}
		started.current = true;
		begin(
			definition,
			userIdRef.current,
			planHost?.inputMode ?? route?.params?.inputMode,
			definition?.variant ?? route?.params?.variant,
		);
	}, [definition]);

	useEffect(() => {
		if (planMode) {
			return undefined;
		}
		const unsubscribe = navigation.addListener('beforeRemove', (event) => {
			if (leaving.current || !interactive) {
				return;
			}
			event.preventDefault();
			setPrompt('abort');
		});
		return unsubscribe;
	}, [navigation, interactive, planMode]);

	const leaveHome = () => {
		leaving.current = true;
		navigation.navigate('TrainingHome');
	};

	const finish = async (next) => {
		const record = completionFor(next, new Date().toISOString());
		if (planMode) {
			planHost?.onComplete?.(record);
			return;
		}
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

	const requestAbort = planMode ? undefined : () => setPrompt('abort');

	const submit = (hit) => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || prompt || planPaused) {
			return;
		}
		const record = isBob27Easy(current)
			? recordBob27EasyDart
			: isBob27Hard(current)
				? recordBob27HardDart
				: isSingles(current)
					? recordSinglesOutcome
					: isSectorClock(current)
						? recordSectorOutcome
						: recordOutcome;
		applySession(record(current, hit));
	};

	const undo = () => {
		const current = sessionRef.current;
		if (!current || prompt || planPaused) {
			return;
		}
		const revert = isCatch20(current)
			? undoCatch20
			: isCheckout41(current)
				? undoCheckout41
				: isCheckoutBull81(current)
					? undoCheckoutBull81
					: isScoring65(current)
						? undoScoring65
						: isScoringPressure(current)
							? undoScoringPressureDart
							: isSingles(current)
								? undoSinglesDart
								: isBob27Easy(current)
									? undoBob27EasyDart
									: isBob27Hard(current)
										? undoBob27HardDart
										: isBullCounter(current)
											? undoBullCounterDart
											: isSectorClock(current)
												? undoSectorDart
												: isNineDarts(current)
													? undoNineDart
													: undoDart;
		applySession(revert(current));
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
			begin(
				definition,
				userId,
				session?.inputMode ?? route?.params?.inputMode,
				session?.variant ?? route?.params?.variant,
			);
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
	const nine = isNineDarts(session);
	const bob27 = isBob27(session);
	const bullCounter = isBullCounter(session);
	const pressure = isScoringPressure(session);
	const aim = nine && playing ? currentAim(session) : null;
	const bobVisit = bob27 && playing
		? (isBob27Hard(session) ? currentBob27HardVisit(session) : currentBob27EasyVisit(session))
		: null;
	const singles = isSingles(session);
	const visit = loose || nine || bob27 || bullCounter || isCatch20(session) || isCheckout41(session) || isCheckoutBull81(session) || isScoring65(session) || pressure
		? null
		: isSectorClock(session)
			? currentSectorVisit(session)
			: singles
				? currentSinglesVisit(session)
				: currentVisit(session);
	const dartLabel = visit
		? `Lotka nr ${(session.darts.length % 3) + 1}`
		: bobVisit
			? `Lotka nr ${bobVisit.dartNumber}`
			: '';
	const instruction = singles
		? SINGLES_AIM_TEXT
		: isBob27Hard(session)
			? bob27HardAimText(bobVisit)
			: bob27
				? BOB27_EASY_AIM_TEXT
				: isSectorClock(session)
					? SECTOR_AIM_TEXT
					: isDoublesClock(session)
						? DOUBLES_AIM_TEXT
						: AIM_TEXT;
	const timed = isTimed(session);
	const remaining = timed ? visibleRemainingMs(session, now) : 0;
	const duration = timed ? session.durationMs : 0;
	const elapsed = Math.max(0, duration - remaining);
	const clockLabel = formatRemaining(remaining);
	const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;
	const clockUrgent = remaining <= TICK_MS;
	const pressureAim = pressure && playing ? currentScoringPressureAim(session) : null;
	const showClock = playing && (
		isSectorClock(session)
		|| bob27
		|| bullCounter
		|| isCatch20(session)
		|| isCheckout41(session)
		|| isCheckoutBull81(session)
		|| isScoring65(session)
		|| pressure
		|| singles
	);
	const catch20 = isCatch20(session) ? catch20View(session) : null;
	const checkout41 = isCheckout41(session) ? checkout41View(session) : null;
	const checkoutBull81 = isCheckoutBull81(session) ? checkoutBull81View(session) : null;
	const scoring65 = isScoring65(session) && interactive ? scoring65View(session) : null;
	const showLooseClock = playing && loose;
	const boardDisabled = Boolean(prompt) || planPaused;

	return (
		<View style={styles.screen}>
			{planMode ? null : (
				<View
					accessibilityRole="header"
					accessibilityLabel={headingVariant ? `${headingName}, wariant ${headingVariant}` : headingName}
					style={styles.exerciseHeading}
				>
					<Text style={styles.exerciseTitle}>{headingName}</Text>
					{headingVariant ? <Text style={styles.exerciseVariant}>{headingVariant}</Text> : null}
				</View>
			)}
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
						{requestAbort ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Przerwij"
								disabled={boardDisabled}
								onPress={requestAbort}
								style={styles.ghost}
							>
								<Text style={styles.ghostText}>Przerwij</Text>
							</Pressable>
						) : null}
					</View>
				) : null}
				{playing && aim ? (
					<NineDartsBoard
						aim={aim}
						dartNumber={(session.darts.length % 3) + 1}
						disabled={boardDisabled}
						undoDisabled={session.darts.length === 0}
						onDart={(dart) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordNineDart(current, dart));
						}}
						onUndo={undo}
						onAbort={requestAbort}
					/>
				) : null}
				{playing && catch20 && !catch20.finished ? (
					<Catch20Board
						view={catch20}
						inputMode={session.inputMode}
						disabled={boardDisabled}
						undoDisabled={session.actions.length === 0}
						onDart={(dart) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordCatch20Dart(current, dart));
						}}
						onSum={(points, checkout) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordCatch20Sum(current, points, checkout));
						}}
						onUndo={undo}
						onAbort={requestAbort}
					/>
				) : null}
				{playing && checkout41 ? (
					<Checkout41Board
						view={checkout41}
						inputMode={session.inputMode}
						disabled={boardDisabled}
						undoDisabled={session.actions.length === 0}
						onDart={(dart) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordCheckout41Dart(current, dart));
						}}
						onCheck={() => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordCheckout41Check(current));
						}}
						onFail={() => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordCheckout41Fail(current));
						}}
						onUndo={undo}
						onAbort={requestAbort}
					/>
				) : null}
				{playing && checkoutBull81 ? (
					<CheckoutBull81Board
						view={checkoutBull81}
						disabled={boardDisabled}
						undoDisabled={session.actions.length === 0}
						onDart={(dart) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordCheckoutBull81Dart(current, dart));
						}}
						onUndo={undo}
						onAbort={requestAbort}
					/>
				) : null}
				{scoring65 ? (
					<Scoring65Board
						view={scoring65}
						inputMode={session.inputMode}
						disabled={boardDisabled}
						undoDisabled={session.actions.length === 0}
						onDart={(dart) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordScoring65Dart(current, dart));
						}}
						onSum={(points) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(recordScoring65Sum(current, points));
						}}
						onUndo={undo}
						onAbort={requestAbort}
					/>
				) : null}
				{playing && pressureAim ? (
					<View>
						<View
							accessibilityRole="text"
							accessibilityLabel={`Wynik ${scoringPressureStreak(session.darts)}`}
							style={styles.liveScore}
						>
							<Text style={styles.liveScoreCaption}>Wynik</Text>
							<Text style={styles.liveScoreValue}>{scoringPressureStreak(session.darts)}</Text>
						</View>
						<ScoringPressureBoard
							variant={session.variant}
							aimNumber={pressureAim.number}
							dartNumber={pressureAim.dartNumber}
							disabled={boardDisabled}
							undoDisabled={session.darts.length === 0}
							onDart={(dart) => {
								const current = sessionRef.current;
								if (!current || current.status !== 'playing' || prompt) {
									return;
								}
								applySession(recordScoringPressureDart(current, dart));
							}}
							onUndo={undo}
							onAbort={requestAbort}
						/>
					</View>
				) : null}
				{playing && bullCounter ? (
					<View>
						<View
							accessibilityRole="text"
							accessibilityLabel={`Wynik ${bullCounterScore(session.darts)}`}
							style={styles.liveScore}
						>
							<Text style={styles.liveScoreCaption}>Wynik</Text>
							<Text style={styles.liveScoreValue}>{bullCounterScore(session.darts)}</Text>
						</View>
						<Text style={styles.instruction}>{BULL_COUNTER_AIM_TEXT}</Text>
						<View style={styles.bullOutcomeRow}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Inner"
								disabled={boardDisabled}
								onPress={() => {
									const current = sessionRef.current;
									if (!current || current.status !== 'playing' || prompt) {
										return;
									}
									applySession(recordBullCounterDart(current, 'inner'));
								}}
								style={[styles.bullInner, prompt && styles.disabled]}
							>
								<Text style={styles.bullInnerText}>Inner</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Outer"
								disabled={boardDisabled}
								onPress={() => {
									const current = sessionRef.current;
									if (!current || current.status !== 'playing' || prompt) {
										return;
									}
									applySession(recordBullCounterDart(current, 'outer'));
								}}
								style={[styles.bullOuter, prompt && styles.disabled]}
							>
								<Text style={styles.bullOuterText}>Outer</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Pudło"
								disabled={boardDisabled}
								onPress={() => {
									const current = sessionRef.current;
									if (!current || current.status !== 'playing' || prompt) {
										return;
									}
									applySession(recordBullCounterDart(current, 'miss'));
								}}
								style={[styles.miss, prompt && styles.disabled]}
							>
								<Text style={styles.missText}>Pudło</Text>
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
						{requestAbort ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Przerwij"
								disabled={boardDisabled}
								onPress={requestAbort}
								style={styles.ghost}
							>
								<Text style={styles.ghostText}>Przerwij</Text>
							</Pressable>
						) : null}
					</View>
				) : null}
				{playing && bobVisit ? (
					<View>
						{isBob27Hard(session) ? (
							<View
								accessibilityRole="text"
								accessibilityLabel={`Wynik ${bob27HardScore(session.darts)}`}
								style={styles.liveScore}
							>
								<Text style={styles.liveScoreCaption}>Wynik</Text>
								<Text style={styles.liveScoreValue}>{bob27HardScore(session.darts)}</Text>
							</View>
						) : null}
						<Text style={styles.instruction}>{instruction}</Text>
						<View style={styles.singleTarget}>
							<View
								accessibilityRole="text"
								accessibilityLabel={bobVisit.accessibilityLabel ?? `Dubl ${bobVisit.number}`}
								style={[styles.targetCell, styles.targetCellActive, styles.bobTarget]}
							>
								<Text style={[
									styles.targetText,
									styles.targetTextActive,
									bobVisit.label.length > 2 && styles.targetTextLongActive,
								]}>{bobVisit.label}</Text>
							</View>
						</View>
						<Text style={styles.dartLabel} accessibilityRole="text">{dartLabel}</Text>
						<View style={styles.outcomeRow}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Pudło"
								disabled={boardDisabled}
								onPress={() => submit(false)}
								style={[styles.miss, prompt && styles.disabled]}
							>
								<Text style={styles.missText}>Pudło</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Trafiona"
								disabled={boardDisabled}
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
						{requestAbort ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Przerwij"
								disabled={boardDisabled}
								onPress={requestAbort}
								style={styles.ghost}
							>
								<Text style={styles.ghostText}>Przerwij</Text>
							</Pressable>
						) : null}
					</View>
				) : null}
				{playing && visit ? (
					<View>
						<Text style={styles.instruction}>{instruction}</Text>
						<SectorTargetReel
							key={session.clientSessionId}
							targets={singles ? visit.targets : session.targets}
							windowStart={visit.windowStart}
							activeOffset={visit.activeOffset}
						/>
						<Text style={styles.dartLabel} accessibilityRole="text">{dartLabel}</Text>
						<View style={styles.outcomeRow}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Pudło"
								disabled={boardDisabled}
								onPress={() => submit(false)}
								style={[styles.miss, prompt && styles.disabled]}
							>
								<Text style={styles.missText}>Pudło</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Trafiona"
								disabled={boardDisabled}
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
						{requestAbort ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Przerwij"
								disabled={boardDisabled}
								onPress={requestAbort}
								style={styles.ghost}
							>
								<Text style={styles.ghostText}>Przerwij</Text>
							</Pressable>
						) : null}
					</View>
				) : null}
				{summary ? (
					<View>
						{isLooseThrows(summary) ? (
							<View>
								<Text style={styles.statLabel}>Czas</Text>
								<Text style={styles.statValue}>{formatRemaining((summary.stats.elapsedSeconds ?? 0) * 1000)}</Text>
							</View>
						) : isScoring65(summary) ? (
							<View>
								<Text style={styles.statLabel}>Wynik</Text>
								<Text style={styles.statValue}>{summary.score}</Text>
								<Text style={styles.statLabel}>Średnia</Text>
								<Text style={styles.statValue}>{formatAverage(summary.stats.average)}</Text>
								<Text style={styles.statLabel}>Podejścia</Text>
								<Text style={styles.statValue}>{summary.stats.approaches}</Text>
							</View>
						) : isCatch20(summary) ? (
							<View>
								<Text style={styles.statLabel}>Zamknięte checkouty</Text>
								<Text style={styles.statValue}>{summary.score}</Text>
								{(summary.stats.doubles ?? []).map((row) => (
									<View key={row.label}>
										<Text style={styles.statLabel}>{row.label}</Text>
										<Text style={styles.stageValue}>{row.hits} z {row.attempts}</Text>
									</View>
								))}
							</View>
						) : isCheckout41(summary) ? (
							<View>
								<Text style={styles.statLabel}>Wynik</Text>
								<Text style={styles.statValue}>{summary.score}</Text>
								{summary.stats.highest != null ? (
									<>
										<Text style={styles.statLabel}>Najwyższy checkout</Text>
										<Text style={styles.statValue}>{summary.stats.highest}</Text>
									</>
								) : null}
								{(summary.stats.doubles ?? []).map((row) => (
									<View key={row.label}>
										<Text style={styles.statLabel}>{row.label}</Text>
										<Text style={styles.stageValue}>{row.hits} z {row.attempts}</Text>
									</View>
								))}
							</View>
						) : isCheckoutBull81(summary) ? (
							<View>
								<Text style={styles.statLabel}>Wynik</Text>
								<Text style={styles.statValue}>{summary.score}</Text>
								{(summary.stats.aims ?? []).map((row) => (
									<View key={row.aim}>
										<Text style={styles.statLabel}>{row.aim}</Text>
										<Text style={styles.stageValue}>{row.hits} z {row.attempts}</Text>
									</View>
								))}
							</View>
						) : isScoringPressure(summary) ? (
							<View>
								<Text style={styles.statLabel}>Wynik</Text>
								<Text style={styles.statValue}>{summary.score}</Text>
								<Text style={styles.statLabel}>Trafienia</Text>
								<Text style={styles.statValue}>{summary.stats.hits} z {summary.stats.attempts}</Text>
								<Text style={styles.statLabel}>Procent</Text>
								<Text style={styles.statValue}>{summary.stats.percent}%</Text>
								{(summary.stats.aims ?? []).length > 1 ? summary.stats.aims.map((row) => (
									<View key={row.aim}>
										<Text style={styles.statLabel}>{row.aim}</Text>
										<Text style={styles.stageValue}>{row.hits} z {row.attempts} · {row.percent}%</Text>
									</View>
								)) : null}
							</View>
						) : isSingles(summary) ? (
							<View>
								<Text style={styles.statLabel}>Wynik</Text>
								<Text style={styles.statValue}>{summary.score}</Text>
								{(summary.stats.aims ?? []).map((row) => (
									<View key={row.aim}>
										<Text style={styles.statLabel}>{row.aim}</Text>
										<Text style={styles.stageValue}>{row.hits} z {row.attempts}</Text>
									</View>
								))}
							</View>
						) : isBob27(summary) || isBullCounter(summary) ? (
							<View>
								<Text style={styles.statLabel}>Wynik</Text>
								<Text style={styles.statValue}>{summary.score}</Text>
								<Text style={styles.statLabel}>Trafienia</Text>
								<Text style={styles.statValue}>{summary.stats.hits} z {summary.stats.attempts}</Text>
								<Text style={styles.statLabel}>Procent</Text>
								<Text style={styles.statValue}>{summary.stats.percent}%</Text>
							</View>
						) : isNineDarts(summary) ? (
							<View>
								<Text style={styles.statLabel}>Wynik</Text>
								<Text style={styles.statValue}>{summary.score}</Text>
								<Text style={styles.statLabel}>Wariant</Text>
								<Text style={styles.stageValue}>{summary.stats.variant === '18' ? '18 lotek' : '9 lotek'}</Text>
								{summary.stats.stages.map((stage) => (
									<View key={stage.label}>
										<Text style={styles.statLabel}>{stage.label}</Text>
										<Text style={styles.stageValue}>{stage.hits} z {stage.attempts} · {stage.percent}%</Text>
									</View>
								))}
								<Text style={styles.statLabel}>Łącznie</Text>
								<Text style={styles.statValue}>{summary.stats.hits} z {summary.stats.attempts}</Text>
								<Text style={styles.statLabel}>Procent</Text>
								<Text style={styles.statValue}>{summary.stats.percent}%</Text>
							</View>
						) : (
							<View>
								{summary.score != null ? (
									<View>
										<Text style={styles.statLabel}>Wynik</Text>
										<Text style={styles.statValue}>{summary.score}</Text>
									</View>
								) : null}
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
	exerciseHeading: {
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingTop: 12,
		paddingBottom: 8,
	},
	exerciseTitle: {
		color: colors.text,
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		textAlign: 'center',
	},
	exerciseVariant: {
		marginTop: 2,
		color: colors.textSecondary,
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		textAlign: 'center',
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
	singleTarget: {
		alignItems: 'center',
		marginBottom: 16,
	},
	liveScore: {
		alignItems: 'center',
		marginBottom: 16,
	},
	liveScoreCaption: {
		color: colors.textMuted,
		fontSize: 13,
		fontWeight: '700',
	},
	liveScoreValue: {
		marginTop: 2,
		color: colors.text,
		fontSize: 40,
		lineHeight: 46,
		fontWeight: '700',
		fontVariant: ['tabular-nums'],
	},
	bobTarget: {
		width: 148,
		flex: 0,
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
	bullOutcomeRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 20,
	},
	bullInner: {
		flex: 1,
		minHeight: 88,
		borderRadius: 12,
		backgroundColor: colors.danger,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	bullInnerText: {
		color: colors.text,
		fontSize: 20,
		fontWeight: '700',
	},
	bullOuter: {
		flex: 1,
		minHeight: 88,
		borderRadius: 12,
		backgroundColor: colors.success,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	bullOuterText: {
		color: colors.onSuccess,
		fontSize: 20,
		fontWeight: '700',
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
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.textMuted,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 12,
	},
	ghostText: {
		color: colors.textMuted,
		fontSize: 15,
		fontWeight: '700',
	},
	disabled: {
		opacity: 0.4,
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
	stageValue: {
		marginTop: 4,
		marginBottom: 16,
		color: colors.text,
		fontSize: 22,
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

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import useAuth from '../../hooks/useAuth';
import useTrainingKeepAwake from '../../hooks/useTrainingKeepAwake';
import { createClientSessionId } from '../../helpers/training/clientSessionId';
import {
	CLOCK_MECHANIC,
	DOUBLES_AIM_TEXT,
	DOUBLES_CLOCK_MECHANIC,
	canPlayClock,
	clockCompletion,
	currentVisit,
	currentTarget,
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
	LOOSE_THROWS_AIM_TEXT,
	libraryInstructionsFor,
} from '../../helpers/training/exerciseLibraryInstructions';
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
	POINT_LINE as SCORING_65_LINE,
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
import ShanghaiDoublesBoard from './ShanghaiDoublesBoard';
import {
	canPlayShanghaiDoubles,
	currentShanghaiDoublesTarget,
	recordShanghaiDoublesDart,
	shanghaiDoublesCompletion,
	startShanghaiDoublesSession,
	undoShanghaiDoublesDart,
	isShanghaiDoublesKey,
} from '../../helpers/training/shanghaiDoublesExercises';
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
import {
	playClick,
	playFailShort,
	playFinalBell,
	playSuccessShort,
	playTicking,
	stopTicking,
} from '../../helpers/gameSounds/playGameSound';
import { shouldPlayVisitClick } from '../../helpers/training/visitClick';
import SectorTargetReel from './SectorTargetReel';
import { targetIndexReelWindow } from '../../helpers/training/targetReelWindow';
import TrainingPlayChrome from './TrainingPlayChrome';
import TrainingPlayScore from './TrainingPlayScore';
import TrainingPlayTimer from './TrainingPlayTimer';
import TrainingPressable from './TrainingPressable';
import TrainingSessionResult from './TrainingSessionResult';
import TrainingHelpModal, { helpSectionsFromGuide } from './TrainingHelpModal';
import { rememberRecentTraining } from '../../helpers/training/recentTrainingStore';
import { aimsFromCompletion } from '../../helpers/training/planSession';
import { syncLabel } from '../../helpers/training/trainingSessionSync';
import TrainingAimRings from './TrainingAimRings';
import {
	enqueueTrainingCompletion,
	flushTrainingOutbox,
} from '../../helpers/training/trainingSessionStore';
import { applyCompletionToRecordsCache } from '../../helpers/training/recordsCache';
import { exerciseDisplayName } from '../../helpers/training/exerciseVariantFavorites';
import { colors } from '../../theme/colors';

const ABORT_TEXT = 'Przerwać ćwiczenie? Ta sesja przepadnie.';
const AIM_TEXT = 'Celuj kolejno po jednej lotce w te sektory';

function summaryPresentation(summary) {
	if (!summary) {
		return { hero: null, rows: [] };
	}
	if (isLooseThrows(summary)) {
		return {
			hero: { label: 'Czas', value: formatRemaining((summary.stats.elapsedSeconds ?? 0) * 1000) },
			rows: [],
		};
	}
	if (isScoring65(summary)) {
		return {
			hero: { label: 'Wynik', value: summary.score },
			rows: [
				{ label: 'Średnia', value: formatAverage(summary.stats.average) },
				{ label: 'Podejścia', value: summary.stats.approaches },
			],
		};
	}
	if (isCatch20(summary)) {
		return {
			hero: { label: 'Zamknięte checkouty', value: summary.score },
			rows: (summary.stats.aims ?? []).map((row) => ({
				label: row.aim,
				value: `${row.hits} z ${row.attempts}`,
			})),
		};
	}
	if (isCheckout41(summary)) {
		const rows = (summary.stats.aims ?? []).map((row) => ({
			label: row.aim,
			value: `${row.hits} z ${row.attempts}`,
		}));
		if (summary.stats.highest != null) {
			rows.unshift({ label: 'Najwyższy checkout', value: summary.stats.highest });
		}
		return { hero: { label: 'Wynik', value: summary.score }, rows };
	}
	if (isCheckoutBull81(summary)) {
		return {
			hero: { label: 'Wynik', value: summary.score },
			rows: (summary.stats.aims ?? []).map((row) => ({
				label: row.aim,
				value: `${row.hits} z ${row.attempts}`,
			})),
		};
	}
	if (isScoringPressure(summary)) {
		const rows = [
			{ label: 'Trafienia', value: `${summary.stats.hits} z ${summary.stats.attempts}` },
			{ label: 'Procent', value: `${summary.stats.percent}%` },
		];
		if ((summary.stats.aims ?? []).length > 1) {
			summary.stats.aims.forEach((row) => {
				rows.push({
					label: row.aim,
					value: `${row.hits} z ${row.attempts} · ${row.percent}%`,
				});
			});
		}
		return { hero: { label: 'Wynik', value: summary.score }, rows };
	}
	if (isSingles(summary)) {
		return {
			hero: { label: 'Wynik', value: summary.score },
			rows: (summary.stats.aims ?? []).map((row) => ({
				label: row.aim,
				value: `${row.hits} z ${row.attempts}`,
			})),
		};
	}
	if (isBob27(summary)) {
		return {
			hero: { label: 'Wynik', value: summary.score },
			rows: [
				{ label: 'Trafienia', value: `${summary.stats.hits} z ${summary.stats.attempts}` },
				{ label: 'Procent', value: `${summary.stats.percent}%` },
			],
		};
	}
	if (isBullCounter(summary)) {
		return {
			hero: { label: 'Wynik', value: summary.score },
			rows: [
				{ label: 'Bull', value: `${summary.stats.hits} z ${summary.stats.attempts}` },
				{ label: 'Procent', value: `${summary.stats.percent}%` },
			],
		};
	}
	if (isNineDarts(summary)) {
		return {
			hero: { label: 'Wynik', value: summary.score },
			rows: [
				{ label: 'Wariant', value: summary.stats.variant === '18' ? '18 lotek' : '9 lotek' },
				{ label: 'Łącznie', value: `${summary.stats.hits} z ${summary.stats.attempts}` },
				{ label: 'Procent', value: `${summary.stats.percent}%` },
			],
		};
	}
	if (isShanghaiDoubles(summary)) {
		return {
			hero: { label: 'Wynik', value: summary.score },
			rows: [
				{ label: 'Trafienia', value: `${summary.stats?.hits ?? 0} z ${summary.stats?.attempts ?? 0}` },
				{ label: 'Procent', value: `${summary.stats?.percent ?? 0}%` },
			],
		};
	}
	const rows = [
		{ label: 'Trafienia', value: `${summary.stats.hits} z ${summary.stats.attempts}` },
		{ label: 'Procent', value: `${summary.stats.percent}%` },
	];
	return {
		hero: summary.score != null ? { label: 'Wynik', value: summary.score } : null,
		rows,
	};
}

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
		|| canPlaySingles(definition)
		|| canPlayShanghaiDoubles(definition);
}

function isShanghaiDoubles(sessionOrDefinition) {
	return isShanghaiDoublesKey(sessionOrDefinition?.exerciseKey || sessionOrDefinition?.mechanic);
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
	if (isBob27Hard(session)) {
		return 'Hard';
	}
	if (isBob27Easy(session)) {
		return 'Easy';
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
	if (canPlayShanghaiDoubles(definition)) {
		return startShanghaiDoublesSession(definition, clientSessionId);
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
	if (isShanghaiDoubles(session)) {
		return shanghaiDoublesCompletion(session, completedAt);
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
	const { auth } = useAuth();
	const userId = auth?.userId;
	const accessToken = auth?.accessToken;
	const [session, setSession] = useState(null);
	const [now, setNow] = useState(() => Date.now());
	const sessionRef = useRef(null);
	const [prompt, setPrompt] = useState(null);
	const [summary, setSummary] = useState(null);
	const [localPaused, setLocalPaused] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const summaryId = useRef(null);
	const leaving = useRef(false);
	const userIdRef = useRef(userId);
	const accessTokenRef = useRef(accessToken);
	const pauseRemainRef = useRef(null);
	userIdRef.current = userId;
	accessTokenRef.current = accessToken;

	const playing = session?.status === 'playing' && !summary;
	const timed = Boolean(session && isTimed(session));
	const allowManualPause = planMode
		? Boolean(planHost?.allowManualPause)
		: timed;
	const helpFreezesTimer = helpOpen && allowManualPause && timed;
	const planPaused = Boolean(planHost?.paused) || localPaused || helpFreezesTimer;
	const interactive = playing && !planPaused;
	const started = useRef(false);

	useTrainingKeepAwake(playing && !planMode);

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
		setLocalPaused(false);
		setHelpOpen(false);
		setMenuOpen(false);
		summaryId.current = null;
		setSession(next);
		planHost?.onSessionChange?.(next);
		if (!planMode) {
			const exerciseKey = nextDefinition.exerciseKey || nextDefinition.id;
			const playVariant = variant ?? nextDefinition?.variant ?? route?.params?.variant ?? null;
			const recentVariant = (exerciseKey === 'nine_darts' || exerciseKey === 'scoring_under_pressure')
				? playVariant
				: null;
			rememberRecentTraining(nextUserId, {
				id: exerciseKey,
				exerciseKey,
				kind: 'exercise',
				name: exerciseDisplayName(exerciseKey, recentVariant, nextDefinition.name),
				variant: recentVariant,
			});
		}
	};

	const applySession = (next, { visitClosed, skipVisitClick = false } = {}) => {
		const prev = sessionRef.current;
		sessionRef.current = next;
		setSession(next);
		planHost?.onSessionChange?.(next);
		if (
			!skipVisitClick
			&& (visitClosed === true || (visitClosed !== false && shouldPlayVisitClick(prev, next)))
		) {
			playClick();
		}
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
		// Podczas play tytuł jest w scalonym chrome (z timerem) — nav bez powtórki.
		navigation.setOptions({
			title: playing ? '' : (headingVariant ? `${headingName}, ${headingVariant}` : headingName),
			headerRight: () => (
				playing ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Menu ćwiczenia"
						onPress={() => setMenuOpen(true)}
						hitSlop={12}
						style={styles.menuButton}
					>
						<Text style={styles.menuButtonText}>⋯</Text>
					</Pressable>
				) : null
			),
		});
	}, [navigation, headingName, headingVariant, planMode, playing]);

	const toggleLocalPause = () => {
		if (!allowManualPause || planMode) {
			return;
		}
		setLocalPaused((value) => !value);
	};

	const openHelp = () => {
		setMenuOpen(false);
		setHelpOpen(true);
	};

	const helpGuide = libraryInstructionsFor(session || definition, {
		dartVariant: session?.dartCount || definition?.dartCount,
		pressureVariant: session?.variant || definition?.variant || route?.params?.variant,
		clockVariant: undefined,
		bobsVariant: undefined,
	});
	const helpSections = helpSectionsFromGuide(helpGuide);

	useEffect(() => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || !isTimed(current) || planPaused) {
			return undefined;
		}
		const runEndsAt = current.endsAt;
		if (!runEndsAt) {
			return undefined;
		}
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
		if (!current || current.status !== 'playing' || !isTimed(current)) {
			return;
		}
		if (planPaused) {
			if (pauseRemainRef.current == null && current.endsAt) {
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
			await applyCompletionToRecordsCache(userIdRef.current, record);
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
	const openAbort = () => {
		setMenuOpen(false);
		requestAbort?.();
	};

	const submit = (hit, bullRing = 'outer') => {
		const current = sessionRef.current;
		if (!current || current.status !== 'playing' || prompt || planPaused) {
			return;
		}
		if (hit) {
			playSuccessShort();
		} else {
			playFailShort();
		}
		const noClick = { skipVisitClick: true };
		if (isBob27Easy(current)) {
			applySession(recordBob27EasyDart(current, hit), noClick);
			return;
		}
		if (isBob27Hard(current)) {
			applySession(recordBob27HardDart(current, hit), noClick);
			return;
		}
		if (isSingles(current)) {
			applySession(recordSinglesOutcome(current, hit), noClick);
			return;
		}
		if (isSectorClock(current)) {
			applySession(recordSectorOutcome(current, hit), noClick);
			return;
		}
		applySession(recordOutcome(current, hit, bullRing), noClick);
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
		return <View style={styles.fallback} />;
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
	const visit = loose || nine || bob27 || bullCounter || isCatch20(session) || isCheckout41(session) || isCheckoutBull81(session) || isScoring65(session) || pressure || isShanghaiDoubles(session)
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
	const resultView = summary ? summaryPresentation(summary) : null;
	const summaryAims = summary ? aimsFromCompletion(summary) : [];
	const pauseHandler = !playing || !timed
		? null
		: planMode
			? (allowManualPause && planHost?.onTogglePause ? planHost.onTogglePause : null)
			: toggleLocalPause;

	return (
		<>
		<TrainingPlayChrome
			title={headingName}
			subtitle={headingVariant || undefined}
			hideHeader={planMode || Boolean(summary)}
			timer={(showClock || showLooseClock) ? (
				<TrainingPlayTimer
					value={clockLabel}
					progress={progress}
					urgent={clockUrgent}
					inline
					paused={planPaused}
					onTogglePause={pauseHandler}
				/>
			) : null}
			abortVisible={prompt === 'abort'}
			abortText={ABORT_TEXT}
			onAbortCancel={() => setPrompt(null)}
			onAbortConfirm={confirmPrompt}
		>
				{showLooseClock ? (
					<View style={styles.looseClock}>
						<Text style={styles.instruction}>{LOOSE_THROWS_AIM_TEXT}</Text>
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
					/>
				) : null}
				{playing && isShanghaiDoubles(session) ? (
					<ShanghaiDoublesBoard
						target={currentShanghaiDoublesTarget(session)}
						targets={session.targets}
						dartIndex={session.darts.length}
						disabled={boardDisabled}
						undoDisabled={session.darts.length === 0}
						onDart={(ring) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							const { session: next, visitClosed } = recordShanghaiDoublesDart(current, ring);
							const binaryOutcome = currentShanghaiDoublesTarget(current)?.stageType === 'doubles';
							applySession(next, {
								visitClosed: binaryOutcome ? false : visitClosed,
								skipVisitClick: binaryOutcome,
							});
						}}
						onUndo={() => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							applySession(undoShanghaiDoublesDart(current));
						}}
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
							const before = catch20View(current);
							const next = recordCatch20Dart(current, dart);
							const after = catch20View(next);
							if (after.closed > before.closed) {
								playSuccessShort();
								applySession(next, { skipVisitClick: true });
								return;
							}
							applySession(next);
						}}
						onSum={(points, checkout) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							const before = catch20View(current);
							const next = recordCatch20Sum(current, points, checkout);
							const after = catch20View(next);
							if (after.closed > before.closed) {
								playSuccessShort();
								applySession(next, { skipVisitClick: true });
								return;
							}
							applySession(next);
						}}
						onUndo={undo}
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
							playSuccessShort();
							applySession(recordCheckout41Check(current), { skipVisitClick: true });
						}}
						onFail={() => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							playFailShort();
							applySession(recordCheckout41Fail(current), { skipVisitClick: true });
						}}
						onUndo={undo}
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
							const before = scoring65View(current);
							const next = recordScoring65Dart(current, dart);
							const after = scoring65View(next);
							const visitClosed = after.approaches > before.approaches;
							if (visitClosed) {
								if (after.running >= SCORING_65_LINE) {
									playSuccessShort();
								} else {
									playFailShort();
								}
								applySession(next, { skipVisitClick: true });
								return;
							}
							applySession(next);
						}}
						onSum={(points) => {
							const current = sessionRef.current;
							if (!current || current.status !== 'playing' || prompt) {
								return;
							}
							if (points >= SCORING_65_LINE) {
								playSuccessShort();
							} else {
								playFailShort();
							}
							applySession(recordScoring65Sum(current, points), { skipVisitClick: true });
						}}
						onUndo={undo}
					/>
				) : null}
				{playing && pressureAim ? (
					<View>
						<TrainingPlayScore value={scoringPressureStreak(session.darts)} />
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
						/>
					</View>
				) : null}
				{playing && bullCounter ? (
					<View>
						<TrainingPlayScore value={bullCounterScore(session.darts)} />
						<Text style={styles.instruction}>{BULL_COUNTER_AIM_TEXT}</Text>
						<View style={styles.bullOutcomeRow}>
							<TrainingPressable
								accessibilityRole="button"
								accessibilityLabel="Czerwony środek"
								disabled={boardDisabled}
								onPress={() => {
									const current = sessionRef.current;
									if (!current || current.status !== 'playing' || prompt) {
										return;
									}
									playSuccessShort();
									applySession(recordBullCounterDart(current, 'inner'), { skipVisitClick: true });
								}}
								style={[styles.bullInner, prompt && styles.disabled]}
							>
								<Text style={styles.bullInnerText}>Czerwony środek</Text>
							</TrainingPressable>
							<TrainingPressable
								accessibilityRole="button"
								accessibilityLabel="Zielony środek"
								disabled={boardDisabled}
								onPress={() => {
									const current = sessionRef.current;
									if (!current || current.status !== 'playing' || prompt) {
										return;
									}
									playSuccessShort();
									applySession(recordBullCounterDart(current, 'outer'), { skipVisitClick: true });
								}}
								style={[styles.bullOuter, prompt && styles.disabled]}
							>
								<Text style={styles.bullOuterText}>Zielony środek</Text>
							</TrainingPressable>
							<TrainingPressable
								accessibilityRole="button"
								accessibilityLabel="Pudło"
								disabled={boardDisabled}
								onPress={() => {
									const current = sessionRef.current;
									if (!current || current.status !== 'playing' || prompt) {
										return;
									}
									playFailShort();
									applySession(recordBullCounterDart(current, 'miss'), { skipVisitClick: true });
								}}
								style={[styles.miss, prompt && styles.disabled]}
							>
								<Text style={styles.missText}>Pudło</Text>
							</TrainingPressable>
						</View>
						<TrainingPressable
							accessibilityRole="button"
							accessibilityLabel="Cofnij"
							disabled={Boolean(prompt) || session.darts.length === 0}
							onPress={undo}
							style={[styles.secondary, (prompt || session.darts.length === 0) && styles.disabled]}
						>
							<Text style={styles.secondaryText}>Cofnij</Text>
						</TrainingPressable>
					</View>
				) : null}
				{playing && bobVisit ? (
					<View>
						{isBob27Hard(session) ? (
							<TrainingPlayScore value={bob27HardScore(session.darts)} />
						) : null}
						<Text style={styles.instruction}>{instruction}</Text>
						{(() => {
							const bobTargets = isBob27Hard(session)
								? [
									...Array.from({ length: 20 }, (_, i) => `D${i + 1}`),
									'Czerwony środek',
								]
								: Array.from({ length: 20 }, (_, i) => `D${i + 1}`);
							const targetIndex = Math.floor(session.darts.length / 3);
							const bobWindow = targetIndexReelWindow(targetIndex, bobTargets.length);
							return bobWindow ? (
								<SectorTargetReel
									key={session.clientSessionId}
									targets={bobTargets}
									windowStart={bobWindow.windowStart}
									activeOffset={bobWindow.activeOffset}
								/>
							) : null;
						})()}
						<Text style={styles.dartLabel} accessibilityRole="text">{dartLabel}</Text>
						<View style={styles.outcomeRow}>
							<TrainingPressable
								accessibilityRole="button"
								accessibilityLabel="Pudło"
								disabled={boardDisabled}
								onPress={() => submit(false)}
								style={[styles.miss, prompt && styles.disabled]}
							>
								<Text style={styles.missText}>Pudło</Text>
							</TrainingPressable>
							<TrainingPressable
								accessibilityRole="button"
								accessibilityLabel="Trafiona"
								disabled={boardDisabled}
								onPress={() => submit(true)}
								style={[styles.hit, prompt && styles.disabled]}
							>
								<Text style={styles.hitText}>Trafiona</Text>
							</TrainingPressable>
						</View>
						<TrainingPressable
							accessibilityRole="button"
							accessibilityLabel="Cofnij"
							disabled={Boolean(prompt) || session.darts.length === 0}
							onPress={undo}
							style={[styles.secondary, (prompt || session.darts.length === 0) && styles.disabled]}
						>
							<Text style={styles.secondaryText}>Cofnij</Text>
						</TrainingPressable>
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
							doubles={isDoublesClock(session)}
						/>
						<Text style={styles.dartLabel} accessibilityRole="text">{dartLabel}</Text>
						{isDoublesClock(session) && currentTarget(session)?.kind === 'bull' ? (
							<View style={styles.bullOutcomeRow}>
								<TrainingPressable
									accessibilityRole="button"
									accessibilityLabel="Czerwony środek"
									disabled={boardDisabled}
									onPress={() => submit(true, 'inner')}
									style={[styles.bullInner, prompt && styles.disabled]}
								>
									<Text style={styles.bullInnerText}>Czerwony środek</Text>
								</TrainingPressable>
								<TrainingPressable
									accessibilityRole="button"
									accessibilityLabel="Zielony środek"
									disabled={boardDisabled}
									onPress={() => submit(true, 'outer')}
									style={[styles.bullOuter, prompt && styles.disabled]}
								>
									<Text style={styles.bullOuterText}>Zielony środek</Text>
								</TrainingPressable>
								<TrainingPressable
									accessibilityRole="button"
									accessibilityLabel="Pudło"
									disabled={boardDisabled}
									onPress={() => submit(false)}
									style={[styles.miss, prompt && styles.disabled]}
								>
									<Text style={styles.missText}>Pudło</Text>
								</TrainingPressable>
							</View>
						) : (
							<View style={styles.outcomeRow}>
								<TrainingPressable
									accessibilityRole="button"
									accessibilityLabel="Pudło"
									disabled={boardDisabled}
									onPress={() => submit(false)}
									style={[styles.miss, prompt && styles.disabled]}
								>
									<Text style={styles.missText}>Pudło</Text>
								</TrainingPressable>
								<TrainingPressable
									accessibilityRole="button"
									accessibilityLabel="Trafiona"
									disabled={boardDisabled}
									onPress={() => submit(true)}
									style={[styles.hit, prompt && styles.disabled]}
								>
									<Text style={styles.hitText}>Trafiona</Text>
								</TrainingPressable>
							</View>
						)}
						<TrainingPressable
							accessibilityRole="button"
							accessibilityLabel="Cofnij"
							disabled={Boolean(prompt) || session.darts.length === 0}
							onPress={undo}
							style={[styles.secondary, (prompt || session.darts.length === 0) && styles.disabled]}
						>
							<Text style={styles.secondaryText}>Cofnij</Text>
						</TrainingPressable>
					</View>
				) : null}
				{summary && resultView ? (
					<TrainingSessionResult
						hero={resultView.hero}
						rows={resultView.rows}
						syncLabel={syncLabel(summary.sync, summary.syncReason)}
						primaryLabel="Powtórz ćwiczenie"
						onPrimary={repeat}
						secondaryLabel="Powrót do ekranu treningu"
						onSecondary={leaveHome}
					>
						{summaryAims.length > 0 ? <TrainingAimRings aims={summaryAims} /> : null}
					</TrainingSessionResult>
				) : null}
		</TrainingPlayChrome>
		{!planMode ? (
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
						<Pressable accessibilityRole="button" onPress={openHelp} style={styles.menuItem}>
							<Text style={styles.menuItemText}>Pomoc</Text>
						</Pressable>
						{playing && requestAbort ? (
							<Pressable
								accessibilityRole="button"
								onPress={openAbort}
								style={styles.menuItem}
							>
								<Text style={[styles.menuItemText, styles.menuItemDanger]}>Przerwij ćwiczenie</Text>
							</Pressable>
						) : null}
					</View>
				</Pressable>
			</Modal>
		) : null}
		{!planMode ? (
			<TrainingHelpModal
				visible={helpOpen}
				sections={helpSections}
				fallbackText={definition?.description || null}
				onClose={() => setHelpOpen(false)}
			/>
		) : null}
		</>
	);
};

const styles = StyleSheet.create({
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
	menuItemDanger: {
		color: colors.danger,
	},
	looseClock: {
		alignItems: 'center',
		width: '100%',
		gap: 20,
	},
	instruction: {
		textAlign: 'center',
		color: colors.text,
		fontSize: 20,
		lineHeight: 28,
		fontWeight: '700',
		letterSpacing: -0.2,
		marginBottom: 18,
	},
	singleTarget: {
		alignItems: 'center',
		marginBottom: 16,
	},
	bobTarget: {
		width: 148,
		flex: 0,
	},
	dartLabel: {
		textAlign: 'center',
		color: colors.textMuted,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		marginBottom: 16,
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
	targetTextLongActive: {
		fontSize: 32,
	},
	outcomeRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	bullOutcomeRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 16,
	},
	bullInner: {
		flex: 1,
		minHeight: 88,
		borderRadius: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.accentBorder,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	bullInnerText: {
		color: colors.text,
		fontSize: 13,
		fontWeight: '800',
		textAlign: 'center',
	},
	bullOuter: {
		flex: 1,
		minHeight: 88,
		borderRadius: 14,
		backgroundColor: colors.accentMuted,
		borderWidth: 1.5,
		borderColor: colors.accentBorder,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	bullOuterText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '800',
		textAlign: 'center',
	},
	hit: {
		flex: 1,
		minHeight: 88,
		borderRadius: 14,
		backgroundColor: colors.accent,
		borderWidth: 1.5,
		borderColor: colors.accent,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	hitText: {
		color: colors.onAccent,
		fontSize: 18,
		fontWeight: '800',
	},
	miss: {
		flex: 1,
		minHeight: 88,
		borderRadius: 14,
		backgroundColor: colors.bgElevated,
		borderWidth: 1.5,
		borderColor: colors.borderStrong,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	missText: {
		color: colors.text,
		fontSize: 18,
		fontWeight: '800',
	},
	disabled: {
		opacity: 0.4,
	},
	primary: {
		minHeight: 52,
		borderRadius: 12,
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
		borderRadius: 12,
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

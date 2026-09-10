import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import {
	CATCH40_APPLY,
	CATCH40_KIND_TIE_RESET,
	CATCH40_KIND_WIN,
	CATCH40_LEG_RESET,
	CATCH40_LEG_WIN,
	CATCH40_RESTORE,
	applyCatch40Visit,
	catch40CheckoutDartOptions,
	catch40Reducer,
	initialCatch40State,
	resolveCatch40AfterVisit,
} from '../../helpers/catch40';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';
import { evaluatePerDartVisitAfterDart } from '../../helpers/perDartVisitRules';
import { GAME_MODE } from '../../helpers/gameScoring';
import { saveCompletedTrainingGame } from '../../helpers/trainingHistory/saveCompletedTrainingGame';
import { useCatch40FfaScoring } from '../../hooks/useCatch40FfaScoring';
import { useFfaScoringScreenSession } from '../../hooks/useFfaScoringScreenSession';
import { useIndexedPlayerBoard } from '../../hooks/useIndexedPlayerBoard';
import { useGameSettings } from '../../hooks/useGameSettings';
import Settings from '../Core/Settings';
import Catch40Counter from './Catch40Counter';
import Counter from './Counter';
import GameFinishedModal from './GameFinishedModal';
import GameScoringModals from './GameScoringModals';
import { gameScoringScreenStyles as styles } from './GameScoringScreen.styles';
import { colors } from '../../theme/colors';

export default function Catch40GameScoringScreen({ route, navigation }) {
	const session = useFfaScoringScreenSession({
		route,
		navigation,
		keepAwakeId: 'catch40-scoring',
	});
	const {
		auth,
		insets,
		mode,
		players,
		N,
		matchFormat,
		legsToWin,
		syncEnabled,
		transport,
		reloadKey,
		lobbyScoringMode,
		isModalVisible,
		gameClosed,
		setGameClosed,
		currentPlayerIndex,
		setCurrentPlayerIndex,
		currentPlayerIndexRef,
		legOpenerIndexRef,
		dartLogRef,
		matchEndedRef,
		finishedModalProps,
		showFinished,
		makeOnFinishedQuickGameId,
		isSpectator,
		computeCanInput,
		handleSelectOpener,
		onAborted,
	} = session;
	const {
		scoringMode,
		setScoringMode,
		soundsEnabled,
		setSoundsEnabled,
		soundVolume,
		setSoundVolume,
		loaded: gameSettingsLoaded,
	} = useGameSettings();
	const isPerDart = true;
	const [selectedComponent, setSelectedComponent] = useState('counter');
	const [currentResult, setCurrentResult] = useState(0);
	const [resultEdited, setResultEdited] = useState(false);
	const [localVisitRemaining, setLocalVisitRemaining] = useState(null);
	const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);
	const [checkoutModalPlayer, setCheckoutModalPlayer] = useState(null);
	const [checkoutDartOptions, setCheckoutDartOptions] = useState([2, 3]);
	const pendingCheckoutRef = useRef(null);
	const visitStartRef = useRef(null);
	const visitTotalRef = useRef(0);
	const visitDartsRef = useRef([]);

	const [catch40States, catch40Dispatches] = useIndexedPlayerBoard(
		catch40Reducer,
		initialCatch40State,
		N,
	);
	const catch40StatesRef = useRef(catch40States);
	catch40StatesRef.current = catch40States;

	const {
		busy,
		canInputFromServer,
		submitVisit,
		submitUndo,
	} = useCatch40FfaScoring({
		enabled: syncEnabled && !!transport,
		transport,
		N,
		catch40Dispatches,
		setCurrentPlayerIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId: makeOnFinishedQuickGameId(() =>
			catch40StatesRef.current.reduce(
				(best, s, i, arr) =>
					(s?.legsWon ?? 0) > (arr[best]?.legsWon ?? 0) ? i : best,
				0,
			),
		),
		onAborted,
		reloadKey,
	});

	const nextActiveIndex = useCallback(
		(fromIndex, states) => {
			for (let step = 1; step <= N; step += 1) {
				const candidate = (fromIndex + step) % N;
				if (!states[candidate]?.finished) return candidate;
			}
			return fromIndex;
		},
		[N],
	);

	const resetBoardsLocal = useCallback(() => {
		for (let i = 0; i < N; i += 1) {
			catch40Dispatches[i]({ type: CATCH40_LEG_RESET });
		}
		setLocalVisitRemaining(null);
		visitStartRef.current = null;
		visitTotalRef.current = 0;
	}, [N, catch40Dispatches]);

	const finishMatchLocal = useCallback(
		(winnerIndex, winnerLegsWon) => {
			if (matchEndedRef.current) return;
			matchEndedRef.current = true;
			setGameClosed(true);
			const name = players[winnerIndex]?.name ?? 'Zwycięzca';
			if (mode === GAME_MODE.TRAINING) {
				const states = catch40StatesRef.current.map((s, i) => ({
					...s,
					legsWon:
						i === winnerIndex
							? (winnerLegsWon ?? (s?.legsWon ?? 0) + 1)
							: (s?.legsWon ?? 0),
				}));
				void saveCompletedTrainingGame({
					players,
					matchFormat,
					gameType: 'catch40',
					catch40States: states,
					accessToken: auth?.accessToken,
				});
				showFinished({ winnerName: name, kind: 'training' });
			} else {
				showFinished({ winnerName: name, kind: 'quick' });
			}
		},
		[mode, players, matchFormat, showFinished],
	);

	const closeLegLocal = useCallback(
		(winnerIndex) => {
			catch40Dispatches[winnerIndex]({ type: CATCH40_LEG_WIN });
			const nextLegs = (catch40StatesRef.current[winnerIndex]?.legsWon ?? 0) + 1;
			if (nextLegs >= legsToWin) {
				resetBoardsLocal();
				dartLogRef.current = [];
				finishMatchLocal(winnerIndex, nextLegs);
				return;
			}
			resetBoardsLocal();
			dartLogRef.current = [];
			const nextOpener = computeNextLegOpener(legOpenerIndexRef.current, N);
			legOpenerIndexRef.current = nextOpener;
			setCurrentPlayerIndex(nextOpener);
			Alert.alert(
				'Leg zakończony',
				`${players[winnerIndex]?.name ?? 'Gracz'} wygrywa lega.`,
				[{ text: 'OK' }],
			);
		},
		[N, catch40Dispatches, finishMatchLocal, legsToWin, players, resetBoardsLocal],
	);

	const applyLocalVisit = useCallback(
		(idx, payload) => {
			const states = catch40StatesRef.current;
			const before = states[idx];
			dartLogRef.current.push({
				playerIndex: idx,
				boardBefore: { ...before },
			});
			const next = applyCatch40Visit(before, payload);
			catch40Dispatches[idx]({ type: CATCH40_APPLY, ...next });
			const statesAfter = states.map((s, i) => (i === idx ? { ...s, ...next } : s));
			const outcome = resolveCatch40AfterVisit(statesAfter);
			if (outcome.kind === CATCH40_KIND_WIN) {
				closeLegLocal(outcome.winnerIndex);
				return;
			}
			if (outcome.kind === CATCH40_KIND_TIE_RESET) {
				resetBoardsLocal();
				setCurrentPlayerIndex(legOpenerIndexRef.current);
				Alert.alert('Remis', 'Ten sam wynik po 40 outach — runda od nowa.', [
					{ text: 'OK' },
				]);
				return;
			}
			setCurrentPlayerIndex((i) => nextActiveIndex(i, statesAfter));
		},
		[catch40Dispatches, closeLegLocal, nextActiveIndex, resetBoardsLocal],
	);

	const commitVisit = useCallback(
		(payload) => {
			const idx = currentPlayerIndexRef.current;
			if (syncEnabled && transport) {
				if (!transport.assertCanInput?.(idx)) return;
				const playerId = players[idx]?.playerId;
				if (playerId == null) {
					Alert.alert('Błąd', 'Brak playerId gracza.');
					return;
				}
				submitVisit({ playerId, ...payload });
				return;
			}
			applyLocalVisit(idx, payload);
		},
		[applyLocalVisit, players, submitVisit, syncEnabled, transport],
	);

	const canInput = computeCanInput({ busy, canInputFromServer })
		&& !catch40States[currentPlayerIndex]?.finished;

	const handleNumberBtn = (number) => {
		if (gameClosed || !canInput) return;
		setResultEdited(true);
		if (currentResult.toString().length < 3) {
			setCurrentResult((result) => parseInt(result.toString() + number, 10));
		}
	};

	const handleClearBtn = () => {
		setCurrentResult(0);
		setResultEdited(false);
	};

	const finishSumVisit = (score, dartsInVisit, bust, checkout) => {
		const remainingBefore = catch40StatesRef.current[currentPlayerIndexRef.current]?.remaining ?? 61;
		const remainingAfter = bust
			? remainingBefore
			: checkout
				? 0
				: remainingBefore - score;
		commitVisit({
			score: bust ? 0 : score,
			remainingBefore,
			remainingAfter,
			dartsInVisit,
			bust,
			checkout,
			darts: visitDartsRef.current.length ? [...visitDartsRef.current] : undefined,
		});
		visitDartsRef.current = [];
		setCurrentResult(0);
		setResultEdited(false);
		setLocalVisitRemaining(null);
		visitStartRef.current = null;
		visitTotalRef.current = 0;
	};

	const handleOkBtn = () => {
		if (!canInput) return;
		const score = Number(currentResult);
		if (
			!Number.isFinite(score) ||
			score > 180 ||
			score < 0 ||
			(score === 0 && !resultEdited)
		) {
			return;
		}
		const remaining = catch40StatesRef.current[currentPlayerIndexRef.current]?.remaining ?? 61;
		const left = remaining - score;
		if (score > remaining || left === 1) {
			finishSumVisit(0, 3, true, false);
			return;
		}
		if (left === 0) {
			const board = catch40StatesRef.current[currentPlayerIndexRef.current];
			setCheckoutDartOptions(
				catch40CheckoutDartOptions(board?.outNumber ?? 61, board?.dartsUsed ?? 0),
			);
			pendingCheckoutRef.current = { score };
			setCheckoutModalPlayer(players[currentPlayerIndexRef.current]);
			setIsCheckoutModalVisible(true);
			return;
		}
		finishSumVisit(score, 3, false, false);
	};

	const handleCheckoutDart = (dartNumber) => {
		const pending = pendingCheckoutRef.current;
		pendingCheckoutRef.current = null;
		setIsCheckoutModalVisible(false);
		setCheckoutModalPlayer(null);
		if (!pending) return;
		finishSumVisit(pending.score, dartNumber, false, true);
	};

	const handleDartSubmit = (points, _roundTotal, _isLastDart, dartIndex, dartLabel) => {
		if (!canInput) return 'ended';
		const idx = currentPlayerIndexRef.current;
		const board = catch40StatesRef.current[idx];
		const dartsCount = (Number(dartIndex) || 0) + 1;
		if (dartsCount === 1) {
			visitStartRef.current = board?.remaining ?? 61;
			visitTotalRef.current = 0;
		}
		visitTotalRef.current += points;
		visitStartRef._darts = dartsCount;
		const visitStart = visitStartRef.current ?? board?.remaining ?? 61;
		const visitTotal = visitTotalRef.current;
		visitDartsRef.current.push({
			label: dartLabel ?? null,
			points,
			remainingBefore: visitStart - (visitTotal - points),
			bust: false,
		});

		const { bust, checkout } = evaluatePerDartVisitAfterDart(
			visitStart,
			visitTotal,
			dartLabel,
		);
		if (bust) {
			const last = visitDartsRef.current[visitDartsRef.current.length - 1];
			if (last) last.bust = true;
			finishSumVisit(0, dartsCount, true, false);
			visitStartRef._darts = 0;
			return 'ended';
		}
		setLocalVisitRemaining(visitStart - visitTotal);
		if (checkout) {
			finishSumVisit(visitTotal, dartsCount, false, true);
			visitStartRef._darts = 0;
			return 'ended';
		}
		if (dartsCount >= 3) {
			finishSumVisit(visitTotal, 3, false, false);
			visitStartRef._darts = 0;
			return 'ended';
		}
		return 'continue';
	};

	const handleUndo = () => {
		if (gameClosed || isModalVisible || busy || isSpectator) return;
		if (isPerDart && visitStartRef._darts > 0 && visitStartRef._darts < 3) {
			visitStartRef.current = null;
			visitTotalRef.current = 0;
			visitStartRef._darts = 0;
			visitDartsRef.current = [];
			setLocalVisitRemaining(null);
			return;
		}
		if (syncEnabled && transport) {
			if (!transport.assertCanUndo?.()) return;
			submitUndo();
			return;
		}
		const log = dartLogRef.current;
		if (log.length === 0) return;
		const last = log.pop();
		setCurrentPlayerIndex(last.playerIndex);
		catch40Dispatches[last.playerIndex]({
			type: CATCH40_RESTORE,
			...last.boardBefore,
		});
	};

	const playerStates = catch40States.map((s) => ({
		score: s.finished ? 0 : s.remaining,
		legsWon: s.legsWon,
		dartsThrown: s.dartsUsed,
		matchAverage: null,
		currentLegAverage: null,
	}));

	const renderContent = () => {
		if (selectedComponent === 'settings') {
			return (
				<Settings
					scoringMode={scoringMode}
					setScoringMode={setScoringMode}
					soundsEnabled={soundsEnabled}
					setSoundsEnabled={setSoundsEnabled}
					soundVolume={soundVolume}
					setSoundVolume={setSoundVolume}
					loaded={gameSettingsLoaded}
					hideScoringMode
				/>
			);
		}
		return (
			<View style={{ flex: 1 }}>
				<Catch40Counter
					players={players}
					catch40States={catch40States}
					currentPlayerIndex={currentPlayerIndex}
					gameClosed={gameClosed}
					localVisitRemaining={localVisitRemaining}
					legsToWin={legsToWin}
				/>
				{isSpectator && (
					<View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
						<Text style={{ color: colors.textMuted, textAlign: 'center' }}>
							Tryb jednego urządzenia — wynik wpisuje host. Widzisz stan na żywo.
						</Text>
					</View>
				)}
				<Counter
					players={players}
					playerStates={playerStates}
					currentPlayerIndex={currentPlayerIndex}
					currentResult={currentResult}
					resultEdited={resultEdited}
					handleNumberBtn={handleNumberBtn}
					handleOkBtn={handleOkBtn}
					handleUndoBtn={handleUndo}
					handleClearBtn={handleClearBtn}
					handleDartSubmit={handleDartSubmit}
					handleUndoSingleDart={handleUndo}
					scoringMode={scoringMode}
					canInput={canInput}
					submitting={busy}
					gameClosed={gameClosed}
					localVisitRemaining={localVisitRemaining}
					matchFormat={matchFormat}
					oneDeviceSpectator={isSpectator}
					showPlayerScores={false}
				/>
			</View>
		);
	};

	return (
		<View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
			<GameScoringModals
				isOpenerModalVisible={isModalVisible}
				players={players}
				playerCount={N}
				onSelectOpener={handleSelectOpener}
				checkoutModalPlayer={checkoutModalPlayer}
				isCheckoutModalVisible={isCheckoutModalVisible}
				onCheckoutDart={handleCheckoutDart}
				checkoutDartOptions={checkoutDartOptions}
				checkoutPrompt={
					checkoutModalPlayer
						? `Którą lotką ${checkoutModalPlayer.name} skończył outa?`
						: null
				}
				scoringBusy={busy}
				scoringBusyLabel="Zapisywanie wizyty…"
			/>

			<GameFinishedModal {...finishedModalProps} />

			<View style={styles.navigationContainer}>
				<Pressable
					style={
						selectedComponent === 'counter'
							? [styles.navigationBtn, styles.selectedNavigationBtn]
							: [styles.navigationBtn]
					}
					onPress={() => setSelectedComponent('counter')}
				>
					<Text style={styles.navigationBtnText}>Wynik</Text>
				</Pressable>
				<Pressable
					style={
						selectedComponent === 'settings'
							? [styles.navigationBtn, styles.selectedNavigationBtn]
							: [styles.navigationBtn]
					}
					onPress={() => setSelectedComponent('settings')}
				>
					<Text style={styles.navigationBtnText}>Ustawienia</Text>
				</Pressable>
			</View>

			{syncEnabled ? (
				<Text style={{ color: colors.textDim, textAlign: 'center', fontSize: 12, paddingBottom: 4 }}>
					{lobbyScoringMode === 'each_own' ? 'online' : '1 urządzenie'}
					{gameClosed ? ' · koniec' : ''}
				</Text>
			) : null}

			{renderContent()}
		</View>
	);
}

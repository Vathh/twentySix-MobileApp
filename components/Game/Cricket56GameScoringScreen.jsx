import React, { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
	CRICKET56_APPLY,
	CRICKET56_KIND_TIE_RESET,
	CRICKET56_KIND_WIN,
	CRICKET56_LAST_ROUND_INDEX,
	CRICKET56_LEG_RESET,
	CRICKET56_LEG_WIN,
	CRICKET56_RESTORE,
	applyCricket56Visit,
	cricket56AllActiveHaveThrown,
	cricket56Reducer,
	initialCricket56State,
	resolveCricket56AfterCompletedVisit,
} from '../../helpers/cricket56';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';
import { GAME_MODE } from '../../helpers/gameScoring';
import { saveCompletedTrainingGame } from '../../helpers/trainingHistory/saveCompletedTrainingGame';
import { useCricket56FfaScoring } from '../../hooks/useCricket56FfaScoring';
import { useFfaScoringScreenSession } from '../../hooks/useFfaScoringScreenSession';
import { useIndexedPlayerBoard } from '../../hooks/useIndexedPlayerBoard';
import Cricket56Counter from './Cricket56Counter';
import FfaScoringShell from './FfaScoringShell';

export default function Cricket56GameScoringScreen({ route, navigation }) {
	const session = useFfaScoringScreenSession({
		route,
		navigation,
		keepAwakeId: 'cricket56-scoring',
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

	const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
	const thrownThisRoundRef = useRef({});
	const [cricket56States, cricket56Dispatches] = useIndexedPlayerBoard(
		cricket56Reducer,
		initialCricket56State,
		N,
	);
	const cricket56StatesRef = useRef(cricket56States);
	cricket56StatesRef.current = cricket56States;

	const { busy, canInputFromServer, submitVisit, submitUndo } = useCricket56FfaScoring({
		enabled: syncEnabled && !!transport,
		transport,
		N,
		cricket56Dispatches,
		setCurrentPlayerIndex,
		setCurrentRoundIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId: makeOnFinishedQuickGameId(() =>
			cricket56StatesRef.current.reduce(
				(best, s, i, arr) =>
					(s?.legsWon ?? 0) > (arr[best]?.legsWon ?? 0) ? i : best,
				0,
			),
		),
		onAborted,
		reloadKey,
	});

	const canInput = computeCanInput({ busy, canInputFromServer });

	const nextActiveIndex = useCallback(
		(fromIndex) => (fromIndex + 1) % N,
		[N],
	);

	const resetBoardsLocal = useCallback(() => {
		for (let i = 0; i < N; i += 1) {
			cricket56Dispatches[i]({ type: CRICKET56_LEG_RESET });
		}
		thrownThisRoundRef.current = {};
		setCurrentRoundIndex(0);
	}, [N, cricket56Dispatches]);

	const finishMatchLocal = useCallback(
		(winnerIndex, winnerLegsWon, eventLog = []) => {
			if (matchEndedRef.current) return;
			matchEndedRef.current = true;
			setGameClosed(true);
			const name = players[winnerIndex]?.name ?? 'Zwycięzca';
			if (mode === GAME_MODE.TRAINING) {
				const states = cricket56StatesRef.current.map((s, i) => ({
					...s,
					legsWon:
						i === winnerIndex
							? (winnerLegsWon ?? (s?.legsWon ?? 0) + 1)
							: (s?.legsWon ?? 0),
				}));
				const selfIdx = players.findIndex((p) => p?.isSelf);
				void saveCompletedTrainingGame({
					players,
					matchFormat,
					gameType: 'cricket56',
					cricket56States: states,
					accessToken: auth?.accessToken,
					eventLog,
					selfExtras: {
						score: states[selfIdx]?.score,
						board: { score: states[selfIdx]?.score ?? 0 },
						won: selfIdx === winnerIndex,
					},
				});
				showFinished({ winnerName: name, kind: 'training' });
			} else {
				showFinished({ winnerName: name, kind: 'quick' });
			}
		},
		[auth?.accessToken, matchEndedRef, matchFormat, mode, players, setGameClosed, showFinished],
	);

	const closeLegLocal = useCallback(
		(winnerIndex) => {
			cricket56Dispatches[winnerIndex]({ type: CRICKET56_LEG_WIN });
			const nextLegs = (cricket56StatesRef.current[winnerIndex]?.legsWon ?? 0) + 1;
			if (nextLegs >= legsToWin) {
				const eventLog = [...dartLogRef.current];
				resetBoardsLocal();
				dartLogRef.current = [];
				finishMatchLocal(winnerIndex, nextLegs, eventLog);
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
		[N, cricket56Dispatches, dartLogRef, finishMatchLocal, legOpenerIndexRef, legsToWin, players, resetBoardsLocal, setCurrentPlayerIndex],
	);

	const advanceAfterVisitLocal = useCallback(
		(statesAfter, playerIndex) => {
			const thrown = { ...thrownThisRoundRef.current, [playerIndex]: true };
			thrownThisRoundRef.current = thrown;
			const outcome = resolveCricket56AfterCompletedVisit(
				statesAfter,
				currentRoundIndex,
				thrown,
			);

			if (outcome.kind === CRICKET56_KIND_WIN) {
				closeLegLocal(outcome.winnerIndex);
				return;
			}
			if (outcome.kind === CRICKET56_KIND_TIE_RESET) {
				resetBoardsLocal();
				setCurrentPlayerIndex(legOpenerIndexRef.current);
				Alert.alert('Remis', 'Ten sam wynik po 7 rundach — runda od nowa.', [
					{ text: 'OK' },
				]);
				return;
			}

			if (
				cricket56AllActiveHaveThrown(statesAfter, thrown)
				&& currentRoundIndex < CRICKET56_LAST_ROUND_INDEX
			) {
				setCurrentRoundIndex((idx) => idx + 1);
				thrownThisRoundRef.current = {};
			}

			setCurrentPlayerIndex((idx) => nextActiveIndex(idx));
		},
		[closeLegLocal, currentRoundIndex, legOpenerIndexRef, nextActiveIndex, resetBoardsLocal, setCurrentPlayerIndex],
	);

	const handleVisit = (marksOrPoints) => {
		if (!canInput) return;
		const marks = Array.isArray(marksOrPoints)
			? marksOrPoints.map((m) => Number(m) || 0)
			: null;
		const parsed = marks
			? marks.reduce((sum, m) => sum + m, 0)
			: Number(marksOrPoints);
		if (!Number.isInteger(parsed)) return;
		if (syncEnabled && transport) {
			if (!transport.assertCanInput?.(currentPlayerIndex)) return;
			const playerId = players[currentPlayerIndex]?.playerId;
			if (playerId == null) {
				Alert.alert('Błąd', 'Brak playerId gracza.');
				return;
			}
			submitVisit(playerId, parsed, marks);
			return;
		}

		const idx = currentPlayerIndex;
		const states = cricket56StatesRef.current;
		dartLogRef.current.push({
			playerIndex: idx,
			playerId: players[idx]?.accountPlayerId ?? players[idx]?.playerId ?? idx,
			kind: 'visit',
			points: parsed,
			marks,
			currentRoundIndex,
			scoreBefore: states[idx].score,
			roundIndexBefore: currentRoundIndex,
			thrownBefore: { ...thrownThisRoundRef.current },
		});

		const scoreAfter = applyCricket56Visit(states[idx].score, parsed, currentRoundIndex);
		cricket56Dispatches[idx]({
			type: CRICKET56_APPLY,
			score: scoreAfter,
		});
		const statesAfter = states.map((s, i) =>
			i === idx ? { ...s, score: scoreAfter } : s,
		);
		advanceAfterVisitLocal(statesAfter, idx);
	};

	const handleUndo = () => {
		if (gameClosed || isModalVisible || busy || isSpectator) return;
		if (syncEnabled && transport) {
			if (!transport.assertCanUndo?.()) return;
			submitUndo();
			return;
		}
		const log = dartLogRef.current;
		if (log.length === 0) return;
		const last = log.pop();
		setCurrentPlayerIndex(last.playerIndex);
		setCurrentRoundIndex(last.roundIndexBefore);
		thrownThisRoundRef.current = last.thrownBefore ?? {};
		cricket56Dispatches[last.playerIndex]({
			type: CRICKET56_RESTORE,
			score: last.scoreBefore,
		});
	};

	return (
		<FfaScoringShell
			insets={insets}
			isModalVisible={isModalVisible}
			players={players}
			playerCount={N}
			onSelectOpener={handleSelectOpener}
			busy={busy}
			busyLabel="Zapisywanie wizyty…"
			finishedModalProps={finishedModalProps}
			title={`Cricket 60 · do ${legsToWin} ${legsToWin === 1 ? 'lega' : 'legów'}`}
			gameClosed={gameClosed}
			syncEnabled={syncEnabled}
			lobbyScoringMode={lobbyScoringMode}
			isSpectator={isSpectator}
		>
			<Cricket56Counter
				players={players}
				cricket56States={cricket56States}
				currentPlayerIndex={currentPlayerIndex}
				currentRoundIndex={currentRoundIndex}
				onVisit={handleVisit}
				onUndo={handleUndo}
				gameClosed={gameClosed || isSpectator || (syncEnabled && !canInput)}
			/>
		</FfaScoringShell>
	);
}

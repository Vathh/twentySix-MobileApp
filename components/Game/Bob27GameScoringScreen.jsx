import React, { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
	BOB27_APPLY,
	BOB27_KIND_BUST,
	BOB27_KIND_TIE_RESET,
	BOB27_KIND_WIN,
	BOB27_LEG_RESET,
	BOB27_LEG_WIN,
	BOB27_RESTORE,
	applyBob27Visit,
	bob27AllActiveHaveThrown,
	bob27LastTargetIndex,
	bob27Reducer,
	initialBob27State,
	normalizeBob27Mode,
	resolveBob27AfterCompletedVisit,
	shouldEliminateBob27,
} from '../../helpers/bob27';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';
import { includesBob27Bull } from '../../helpers/matchFormat/matchFormat';
import { GAME_MODE } from '../../helpers/gameScoring';
import { saveCompletedTrainingGame } from '../../helpers/trainingHistory/saveCompletedTrainingGame';
import { useBob27FfaScoring } from '../../hooks/useBob27FfaScoring';
import { useFfaScoringScreenSession } from '../../hooks/useFfaScoringScreenSession';
import { useIndexedPlayerBoard } from '../../hooks/useIndexedPlayerBoard';
import Bob27Counter from './Bob27Counter';
import FfaScoringShell from './FfaScoringShell';

export default function Bob27GameScoringScreen({ route, navigation }) {
	const session = useFfaScoringScreenSession({
		route,
		navigation,
		keepAwakeId: 'bob27-scoring',
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
	const bob27Mode = normalizeBob27Mode(matchFormat.bob27Mode);
	const includeBull = includesBob27Bull(matchFormat);
	const lastTargetIndex = bob27LastTargetIndex(includeBull);

	const [dartsInVisit, setDartsInVisit] = useState(0);
	const [hitsInVisit, setHitsInVisit] = useState(0);
	const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
	const thrownThisTargetRef = useRef({});
	const [bob27States, bob27Dispatches] = useIndexedPlayerBoard(
		bob27Reducer,
		initialBob27State,
		N,
	);
	const bob27StatesRef = useRef(bob27States);
	bob27StatesRef.current = bob27States;

	const { busy, canInputFromServer, submitVisit, submitUndo } = useBob27FfaScoring({
		enabled: syncEnabled && !!transport,
		transport,
		N,
		bob27Dispatches,
		setCurrentPlayerIndex,
		setDartsInVisit,
		setHitsInVisit,
		setCurrentTargetIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId: makeOnFinishedQuickGameId(() =>
			bob27StatesRef.current.reduce(
				(best, s, i, arr) =>
					(s?.legsWon ?? 0) > (arr[best]?.legsWon ?? 0) ? i : best,
				0,
			),
		),
		onAborted,
		reloadKey,
	});

	const canInput = computeCanInput({ busy, canInputFromServer })
		&& !bob27States[currentPlayerIndex]?.eliminated;

	const nextActiveIndex = useCallback(
		(fromIndex, states) => {
			for (let step = 1; step <= N; step += 1) {
				const candidate = (fromIndex + step) % N;
				if (!states[candidate]?.eliminated) return candidate;
			}
			return fromIndex;
		},
		[N],
	);

	const resetBoardsLocal = useCallback(() => {
		for (let i = 0; i < N; i += 1) {
			bob27Dispatches[i]({ type: BOB27_LEG_RESET });
		}
		thrownThisTargetRef.current = {};
		setCurrentTargetIndex(0);
		setDartsInVisit(0);
		setHitsInVisit(0);
	}, [N, bob27Dispatches]);

	const finishMatchLocal = useCallback(
		(winnerIndex, winnerLegsWon, lost = false) => {
			if (matchEndedRef.current) return;
			matchEndedRef.current = true;
			setGameClosed(true);
			const name = players[winnerIndex]?.name ?? 'Zwycięzca';
			if (mode === GAME_MODE.TRAINING) {
				const states = bob27StatesRef.current.map((s, i) => ({
					...s,
					legsWon:
						i === winnerIndex && !lost
							? (winnerLegsWon ?? (s?.legsWon ?? 0) + 1)
							: (s?.legsWon ?? 0),
				}));
				void saveCompletedTrainingGame({
					players,
					matchFormat,
					gameType: 'bob27',
					bob27States: states,
					accessToken: auth?.accessToken,
				});
				showFinished({ winnerName: name, kind: 'training', lost });
			} else {
				showFinished({ winnerName: name, kind: 'quick', lost });
			}
		},
		[auth?.accessToken, matchEndedRef, matchFormat, mode, players, setGameClosed, showFinished],
	);

	const closeLegLocal = useCallback(
		(winnerIndex) => {
			bob27Dispatches[winnerIndex]({ type: BOB27_LEG_WIN });
			const nextLegs = (bob27StatesRef.current[winnerIndex]?.legsWon ?? 0) + 1;
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
		[N, bob27Dispatches, dartLogRef, finishMatchLocal, legOpenerIndexRef, legsToWin, players, resetBoardsLocal, setCurrentPlayerIndex],
	);

	const advanceAfterVisitLocal = useCallback(
		(statesAfter, playerIndex) => {
			const thrown = { ...thrownThisTargetRef.current, [playerIndex]: true };
			thrownThisTargetRef.current = thrown;
			const outcome = resolveBob27AfterCompletedVisit(
				statesAfter,
				bob27Mode,
				currentTargetIndex,
				thrown,
				[],
				includeBull,
			);

			if (outcome.kind === BOB27_KIND_WIN) {
				closeLegLocal(outcome.winnerIndex);
				return;
			}
			if (outcome.kind === BOB27_KIND_BUST) {
				resetBoardsLocal();
				dartLogRef.current = [];
				finishMatchLocal(playerIndex, 0, true);
				return;
			}
			if (outcome.kind === BOB27_KIND_TIE_RESET) {
				resetBoardsLocal();
				setCurrentPlayerIndex(legOpenerIndexRef.current);
				Alert.alert('Remis', 'Ten sam wynik po ostatnim celu — runda od nowa.', [
					{ text: 'OK' },
				]);
				return;
			}

			if (
				bob27AllActiveHaveThrown(statesAfter, thrown)
				&& currentTargetIndex < lastTargetIndex
			) {
				setCurrentTargetIndex((idx) => idx + 1);
				thrownThisTargetRef.current = {};
			}

			setDartsInVisit(0);
			setHitsInVisit(0);
			setCurrentPlayerIndex((idx) => nextActiveIndex(idx, statesAfter));
		},
		[
			bob27Mode,
			closeLegLocal,
			currentTargetIndex,
			dartLogRef,
			finishMatchLocal,
			includeBull,
			lastTargetIndex,
			legOpenerIndexRef,
			nextActiveIndex,
			resetBoardsLocal,
			setCurrentPlayerIndex,
		],
	);

	const handleVisit = (hits) => {
		if (!canInput) return;
		const parsed = Number(hits);
		if (!Number.isInteger(parsed)) return;
		const n = Math.max(0, Math.min(3, parsed));
		if (syncEnabled && transport) {
			if (!transport.assertCanInput?.(currentPlayerIndex)) return;
			const playerId = players[currentPlayerIndex]?.playerId;
			if (playerId == null) {
				Alert.alert('Błąd', 'Brak playerId gracza.');
				return;
			}
			submitVisit(playerId, n);
			return;
		}

		const idx = currentPlayerIndex;
		const states = bob27StatesRef.current;
		dartLogRef.current.push({
			playerIndex: idx,
			hits: n,
			scoreBefore: states[idx].score,
			eliminatedBefore: states[idx].eliminated,
			dartsInVisitBefore: dartsInVisit,
			hitsInVisitBefore: hitsInVisit,
			targetIndexBefore: currentTargetIndex,
			thrownBefore: { ...thrownThisTargetRef.current },
		});

		const scoreAfter = applyBob27Visit(states[idx].score, n, currentTargetIndex, includeBull);
		const eliminated = shouldEliminateBob27(scoreAfter, bob27Mode);
		bob27Dispatches[idx]({
			type: BOB27_APPLY,
			score: scoreAfter,
			eliminated,
		});
		const statesAfter = states.map((s, i) =>
			i === idx ? { ...s, score: scoreAfter, eliminated } : s,
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
		setDartsInVisit(last.dartsInVisitBefore);
		setHitsInVisit(last.hitsInVisitBefore);
		setCurrentTargetIndex(last.targetIndexBefore);
		thrownThisTargetRef.current = last.thrownBefore ?? {};
		bob27Dispatches[last.playerIndex]({
			type: BOB27_RESTORE,
			score: last.scoreBefore,
			eliminated: last.eliminatedBefore,
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
			title={`Bob's 27 · ${bob27Mode} · ${includeBull ? 'z bullem' : 'bez bulla'} · do ${legsToWin} ${legsToWin === 1 ? 'lega' : 'legów'}`}
			gameClosed={gameClosed}
			syncEnabled={syncEnabled}
			lobbyScoringMode={lobbyScoringMode}
			isSpectator={isSpectator}
		>
			<Bob27Counter
				players={players}
				bob27States={bob27States}
				currentPlayerIndex={currentPlayerIndex}
				currentTargetIndex={currentTargetIndex}
				onVisit={handleVisit}
				onUndo={handleUndo}
				gameClosed={gameClosed || isSpectator || (syncEnabled && !canInput)}
				mode={bob27Mode}
				includeBull={includeBull}
			/>
		</FfaScoringShell>
	);
}

import React, { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import {
	ATC_APPLY,
	ATC_LEG_RESET,
	ATC_LEG_WIN,
	ATC_RESTORE,
	applyAtcVisit,
	atcReducer,
	clampAtcHits,
	initialAtcState,
} from '../../helpers/atc';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';
import { GAME_MODE } from '../../helpers/gameScoring';
import { saveCompletedTrainingGame } from '../../helpers/trainingHistory/saveCompletedTrainingGame';
import { useAtcFfaScoring } from '../../hooks/useAtcFfaScoring';
import { useFfaScoringScreenSession } from '../../hooks/useFfaScoringScreenSession';
import { useIndexedPlayerBoard } from '../../hooks/useIndexedPlayerBoard';
import AtcCounter from './AtcCounter';
import FfaScoringShell from './FfaScoringShell';

export default function AtcGameScoringScreen({ route, navigation }) {
	const session = useFfaScoringScreenSession({
		route,
		navigation,
		keepAwakeId: 'atc-scoring',
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

	const [atcStates, atcDispatches] = useIndexedPlayerBoard(
		atcReducer,
		initialAtcState,
		N,
	);
	const atcStatesRef = useRef(atcStates);
	atcStatesRef.current = atcStates;

	const { busy, canInputFromServer, submitVisit, submitUndo } = useAtcFfaScoring({
		enabled: syncEnabled && !!transport,
		transport,
		N,
		atcDispatches,
		setCurrentPlayerIndex,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId: makeOnFinishedQuickGameId(() =>
			atcStatesRef.current.reduce(
				(best, s, i, arr) =>
					(s?.legsWon ?? 0) > (arr[best]?.legsWon ?? 0) ? i : best,
				0,
			),
		),
		onAborted,
		reloadKey,
	});

	const canInput = computeCanInput({ busy, canInputFromServer });

	const nextIndex = useCallback(
		(fromIndex) => (fromIndex + 1) % N,
		[N],
	);

	const resetBoardsLocal = useCallback(() => {
		for (let i = 0; i < N; i += 1) {
			atcDispatches[i]({ type: ATC_LEG_RESET });
		}
	}, [N, atcDispatches]);

	const finishMatchLocal = useCallback(
		(winnerIndex, winnerLegsWon) => {
			if (matchEndedRef.current) return;
			matchEndedRef.current = true;
			setGameClosed(true);
			const name = players[winnerIndex]?.name ?? 'Zwycięzca';
			if (mode === GAME_MODE.TRAINING) {
				const states = atcStatesRef.current.map((s, i) => ({
					...s,
					legsWon:
						i === winnerIndex
							? (winnerLegsWon ?? (s?.legsWon ?? 0) + 1)
							: (s?.legsWon ?? 0),
				}));
				void saveCompletedTrainingGame({
					players,
					matchFormat,
					gameType: 'atc',
					atcStates: states,
					accessToken: auth?.accessToken,
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
			atcDispatches[winnerIndex]({ type: ATC_LEG_WIN });
			const nextLegs = (atcStatesRef.current[winnerIndex]?.legsWon ?? 0) + 1;
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
		[N, atcDispatches, dartLogRef, finishMatchLocal, legOpenerIndexRef, legsToWin, players, resetBoardsLocal, setCurrentPlayerIndex],
	);

	const handleVisit = (hits) => {
		if (!canInput) return;
		const parsed = Number(hits);
		if (!Number.isInteger(parsed)) return;
		const idx = currentPlayerIndex;
		const n = clampAtcHits(parsed, atcStatesRef.current[idx]?.targetIndex ?? 0);

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

		const states = atcStatesRef.current;
		dartLogRef.current.push({
			playerIndex: idx,
			hits: n,
			targetIndexBefore: states[idx].targetIndex,
			finishedBefore: states[idx].finished,
		});

		const applied = applyAtcVisit(states[idx].targetIndex, n);
		atcDispatches[idx]({
			type: ATC_APPLY,
			targetIndex: applied.targetIndex,
			finished: applied.finished,
		});
		if (applied.finished) {
			closeLegLocal(idx);
			return;
		}
		setCurrentPlayerIndex((i) => nextIndex(i));
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
		atcDispatches[last.playerIndex]({
			type: ATC_RESTORE,
			targetIndex: last.targetIndexBefore,
			finished: last.finishedBefore,
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
			title={`Around the Clock · do ${legsToWin} ${legsToWin === 1 ? 'lega' : 'legów'}`}
			gameClosed={gameClosed}
			syncEnabled={syncEnabled}
			lobbyScoringMode={lobbyScoringMode}
			isSpectator={isSpectator}
		>
			<AtcCounter
				players={players}
				atcStates={atcStates}
				currentPlayerIndex={currentPlayerIndex}
				onVisit={handleVisit}
				onUndo={handleUndo}
				gameClosed={gameClosed || isSpectator || (syncEnabled && !canInput)}
			/>
		</FfaScoringShell>
	);
}

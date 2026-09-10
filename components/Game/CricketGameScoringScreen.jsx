import React, { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
	CRICKET_APPLY,
	CRICKET_LEG_RESET,
	CRICKET_LEG_WIN,
	CRICKET_RESTORE,
	applyCricketDart,
	cricketReducer,
	findCricketLegWinnerIndex,
	initialCricketState,
} from '../../helpers/cricket';
import { computeNextLegOpener } from '../../helpers/computeNextLegOpener';
import { GAME_MODE } from '../../helpers/gameScoring';
import { saveCompletedTrainingGame } from '../../helpers/trainingHistory/saveCompletedTrainingGame';
import { useCricketFfaScoring } from '../../hooks/useCricketFfaScoring';
import { useFfaScoringScreenSession } from '../../hooks/useFfaScoringScreenSession';
import { useIndexedPlayerBoard } from '../../hooks/useIndexedPlayerBoard';
import CricketCounter from './CricketCounter';
import FfaScoringShell from './FfaScoringShell';

/**
 * Scoring cricket: trening lokalny albo quick FFA (one_device / each_own) przez API.
 */
export default function CricketGameScoringScreen({ route, navigation }) {
	const session = useFfaScoringScreenSession({
		route,
		navigation,
		keepAwakeId: 'cricket-scoring',
	});
	const {
		auth,
		insets,
		mode,
		players,
		N,
		matchFormat,
		legsToWin,
		isHost,
		syncEnabled,
		transport,
		reloadKey,
		lobbyId,
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

	const [dartsInVisit, setDartsInVisit] = useState(0);
	const [cricketStates, cricketDispatches] = useIndexedPlayerBoard(
		cricketReducer,
		initialCricketState,
		N,
	);
	const cricketStatesRef = useRef(cricketStates);
	cricketStatesRef.current = cricketStates;

	const {
		busy,
		canInputFromServer,
		submitHit,
		submitMiss,
		submitUndo,
	} = useCricketFfaScoring({
		enabled: syncEnabled && !!transport,
		transport,
		N,
		cricketDispatches,
		setCurrentPlayerIndex,
		setDartsInVisit,
		setGameClosed,
		legOpenerIndexRef,
		onFinishedQuickGameId: makeOnFinishedQuickGameId(() =>
			cricketStatesRef.current.reduce(
				(best, s, i, arr) =>
					(s?.legsWon ?? 0) > (arr[best]?.legsWon ?? 0) ? i : best,
				0,
			),
		),
		onAborted,
		reloadKey,
	});

	const canInput = computeCanInput({ busy, canInputFromServer });

	const finishMatchLocal = useCallback(
		(winnerIndex, winnerLegsWon) => {
			if (matchEndedRef.current) return;
			matchEndedRef.current = true;
			setGameClosed(true);
			const name = players[winnerIndex]?.name ?? 'Zwycięzca';
			if (mode === GAME_MODE.TRAINING) {
				const states = cricketStatesRef.current.map((s, i) => ({
					...s,
					legsWon:
						i === winnerIndex
							? (winnerLegsWon ?? (s?.legsWon ?? 0) + 1)
							: (s?.legsWon ?? 0),
				}));
				void saveCompletedTrainingGame({
					players,
					matchFormat,
					gameType: 'cricket',
					cricketStates: states,
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
			cricketDispatches[winnerIndex]({ type: CRICKET_LEG_WIN });
			const nextLegs = (cricketStatesRef.current[winnerIndex]?.legsWon ?? 0) + 1;
			if (nextLegs >= legsToWin) {
				for (let i = 0; i < N; i += 1) {
					cricketDispatches[i]({ type: CRICKET_LEG_RESET });
				}
				dartLogRef.current = [];
				setDartsInVisit(0);
				finishMatchLocal(winnerIndex, nextLegs);
				return;
			}

			for (let i = 0; i < N; i += 1) {
				cricketDispatches[i]({ type: CRICKET_LEG_RESET });
			}
			dartLogRef.current = [];
			setDartsInVisit(0);
			const nextOpener = computeNextLegOpener(legOpenerIndexRef.current, N);
			legOpenerIndexRef.current = nextOpener;
			setCurrentPlayerIndex(nextOpener);
			Alert.alert(
				'Leg zakończony',
				`${players[winnerIndex]?.name ?? 'Gracz'} wygrywa lega.`,
				[{ text: 'OK' }],
			);
		},
		[N, cricketDispatches, dartLogRef, finishMatchLocal, legOpenerIndexRef, legsToWin, players, setCurrentPlayerIndex],
	);

	const advanceAfterDartLocal = useCallback(
		(statesAfter) => {
			const winnerIdx = findCricketLegWinnerIndex(statesAfter);
			if (winnerIdx != null) {
				closeLegLocal(winnerIdx);
				return;
			}
			setDartsInVisit((prev) => {
				const next = prev + 1;
				if (next >= 3) {
					setCurrentPlayerIndex((idx) => (idx + 1) % N);
					return 0;
				}
				return next;
			});
		},
		[N, closeLegLocal, setCurrentPlayerIndex],
	);

	const handleCricketHit = (segment, multiplier) => {
		if (!canInput) return;
		if (syncEnabled && transport) {
			if (!transport.assertCanInput?.(currentPlayerIndex)) return;
			const playerId = players[currentPlayerIndex]?.playerId;
			if (playerId == null) {
				Alert.alert('Błąd', 'Brak playerId gracza.');
				return;
			}
			submitHit(playerId, segment, multiplier);
			return;
		}

		const idx = currentPlayerIndex;
		const states = cricketStatesRef.current;
		const hitsList = states.map((s) => ({ ...s.hits }));
		const { hits, pointsScored } = applyCricketDart(
			hitsList,
			idx,
			segment,
			multiplier,
		);
		const pointsBefore = states[idx].points;
		dartLogRef.current.push({
			playerIndex: idx,
			kind: 'hit',
			hitsBefore: { ...states[idx].hits },
			pointsBefore,
			dartsInVisitBefore: dartsInVisit,
		});
		cricketDispatches[idx]({
			type: CRICKET_APPLY,
			hits,
			points: pointsBefore + pointsScored,
		});
		const statesAfter = states.map((s, i) =>
			i === idx
				? { ...s, hits, points: pointsBefore + pointsScored }
				: s,
		);
		advanceAfterDartLocal(statesAfter);
	};

	const handleCricketMiss = () => {
		if (!canInput) return;
		if (syncEnabled && transport) {
			if (!transport.assertCanInput?.(currentPlayerIndex)) return;
			const playerId = players[currentPlayerIndex]?.playerId;
			if (playerId == null) {
				Alert.alert('Błąd', 'Brak playerId gracza.');
				return;
			}
			submitMiss(playerId);
			return;
		}

		dartLogRef.current.push({
			playerIndex: currentPlayerIndex,
			kind: 'miss',
			dartsInVisitBefore: dartsInVisit,
		});
		advanceAfterDartLocal(cricketStatesRef.current);
	};

	const handleCricketUndo = () => {
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
		if (last.kind === 'hit') {
			cricketDispatches[last.playerIndex]({
				type: CRICKET_RESTORE,
				hits: last.hitsBefore,
				points: last.pointsBefore,
			});
		}
	};

	return (
		<FfaScoringShell
			insets={insets}
			isModalVisible={isModalVisible}
			players={players}
			playerCount={N}
			onSelectOpener={handleSelectOpener}
			busy={busy}
			finishedModalProps={finishedModalProps}
			title={`Cricket · do ${legsToWin} ${legsToWin === 1 ? 'lega' : 'legów'}`}
			gameClosed={gameClosed}
			syncEnabled={syncEnabled}
			lobbyScoringMode={lobbyScoringMode}
			isSpectator={isSpectator}
		>
			<CricketCounter
				players={players}
				cricketStates={cricketStates}
				currentPlayerIndex={currentPlayerIndex}
				dartsInVisit={dartsInVisit}
				onCricketHit={handleCricketHit}
				onCricketMiss={handleCricketMiss}
				onCricketUndo={handleCricketUndo}
				gameClosed={gameClosed || isSpectator || (syncEnabled && !canInput)}
			/>
		</FfaScoringShell>
	);
}

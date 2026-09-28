import { useEffect, useRef } from 'react';
import {
	GAME_MODE,
	findWinnerIndex,
	mapAchievementsForQuick,
	sendQuickGameAchievements,
	shouldHandleLocalTrainingWin,
} from '../helpers/gameScoring';
import { saveCompletedTrainingGame } from '../helpers/trainingHistory/saveCompletedTrainingGame';
import { finishedKindForMode } from './useGameFinishedModal';

/**
 * Efekty końca meczu: achievementy quick FFA, zapis treningu, modal zwycięzcy.
 * Turniej (180 / 170+ / HF / QF) liczy backend z wizyt — bez POST-a na koniec meczu.
 */
export function useGameFinishedEffects({
	mode,
	gameClosed,
	setGameClosed,
	syncEnabled,
	players,
	playerStates,
	matchFormat,
	achievementsState,
	accessToken,
	ffaFinishedQuickGameId,
	finishedQuickGameIdRef,
	onFinished,
	foldTrainingDoubles = null,
	matchDoubleAccRef = null,
	isPerDart = false,
	visitLog = null,
	gameAborted = false,
}) {
	const quickResultSentRef = useRef(false);
	const tournamentResultSentRef = useRef(false);
	const trainingFinishedShownRef = useRef(false);

	useEffect(() => {
		if (!gameClosed || gameAborted || mode !== GAME_MODE.QUICK_FFA) return;
		if (quickResultSentRef.current) return;
		quickResultSentRef.current = true;

		const achievementsPayload = mapAchievementsForQuick(achievementsState);
		const gameId =
			ffaFinishedQuickGameId ?? finishedQuickGameIdRef?.current ?? null;
		if (gameId) {
			void sendQuickGameAchievements({
				accessToken,
				gameId,
				achievementsPayload,
			});
		}

		const winnerIdx = findWinnerIndex(playerStates, matchFormat);
		onFinished?.({
			winnerName: players[winnerIdx]?.name,
			kind: finishedKindForMode(mode),
		});
	}, [
		gameClosed,
		mode,
		ffaFinishedQuickGameId,
		achievementsState?.achievements,
		accessToken,
		players,
		playerStates,
		matchFormat,
		finishedQuickGameIdRef,
		onFinished,
		gameAborted,
	]);

	useEffect(() => {
		if (
			!shouldHandleLocalTrainingWin({
				mode,
				syncEnabled,
				playerStates,
				matchFormat,
			})
		) {
			return;
		}
		if (gameClosed || trainingFinishedShownRef.current) return;

		trainingFinishedShownRef.current = true;
		setGameClosed(true);
		const winnerIdx = findWinnerIndex(playerStates, matchFormat);
		void saveCompletedTrainingGame({
			players,
			playerStates,
			matchFormat,
			gameType: matchFormat?.gameType === 'cricket'
				? 'cricket'
				: matchFormat?.gameType === 'bob27'
					? 'bob27'
					: matchFormat?.gameType === 'atc'
						? 'atc'
						: matchFormat?.gameType === 'catch40'
							? 'catch40'
							: matchFormat?.gameType === 'cricket56'
								? 'cricket56'
								: 'x01',
			accessToken,
			isPerDart: !!isPerDart,
			visitLog,
			doubleStatsByIndex: (() => {
				foldTrainingDoubles?.();
				return matchDoubleAccRef?.current ?? null;
			})(),
		});
		onFinished?.({
			winnerName: players[winnerIdx]?.name,
			kind: 'training',
		});
	}, [
		mode,
		syncEnabled,
		gameClosed,
		matchFormat,
		playerStates,
		players,
		setGameClosed,
		onFinished,
		accessToken,
		isPerDart,
		foldTrainingDoubles,
		matchDoubleAccRef,
	]);

	useEffect(() => {
		if (!gameClosed || gameAborted || mode !== GAME_MODE.TOURNAMENT || !syncEnabled) return;
		if (tournamentResultSentRef.current) return;
		tournamentResultSentRef.current = true;

		const winnerIdx = findWinnerIndex(playerStates, matchFormat);
		onFinished?.({
			winnerName: players[winnerIdx]?.name,
			kind: 'tournament',
		});
	}, [
		gameAborted,
		gameClosed,
		mode,
		syncEnabled,
		matchFormat,
		players,
		playerStates,
		onFinished,
	]);
}

import { Alert } from 'react-native';
import {
	QUICK_GAME_UPDATE_API_URL,
	UPDATE_GAME_API_URL,
} from '../apiConfig';
import { GAME_MODE } from './resolveGameContext.js';

export function findWinnerIndex(playerStates, legsToWin) {
	const legsWonArr = playerStates.map((s) => s.legsWon ?? 0);
	const winnerIdx = legsWonArr.findIndex((l) => l >= legsToWin);
	return winnerIdx >= 0 ? winnerIdx : 0;
}

export function mapAchievementsForQuick(achievementsState) {
	return (achievementsState?.achievements || []).map((a) => ({
		playerId: a.playerId,
		value: a.value ?? null,
		type: a.type,
	}));
}

export function mapAchievementsForTournament(achievementsState) {
	return (achievementsState?.achievements || []).map((a) => ({
		playerId: a.playerId,
		tournamentId: a.tournamentId,
		value: a.value ?? null,
		type: a.type,
	}));
}

export async function sendTournamentAchievements({
	accessToken,
	activeGame,
	players,
	playerStates,
	N,
	achievements,
}) {
	if (!activeGame?.id || !achievements?.length || !accessToken) {
		return;
	}

	const winnerIdx = findWinnerIndex(playerStates, 2);
	const winner = players[winnerIdx] ?? players[0];

	const gameResultDTO = {
		game: {
			id: activeGame.id,
			type: activeGame.type,
			player1Id: players[0]?.playerId ?? players[0]?.id,
			player2Id: players[1]?.playerId ?? players[1]?.id,
			player1Score: playerStates[0]?.legsWon ?? 0,
			player2Score: playerStates[1]?.legsWon ?? 0,
			winnerId: winner?.playerId ?? winner?.id,
			tournamentId: activeGame.tournamentId,
			groupNumber: activeGame.type === 'playoff' ? 0 : activeGame.groupNumber,
		},
		achievements,
		legs: [],
	};

	try {
		const response = await fetch(UPDATE_GAME_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify(gameResultDTO),
		});
		if (!response.ok) {
			console.error('Blad podczas aktualizacji meczu', response.statusText);
		}
	} catch (error) {
		console.error('Blad podczas wysylania wyniku turnieju', error);
	}
}

export async function sendQuickGameAchievements({
	accessToken,
	gameId,
	achievementsPayload,
}) {
	if (!gameId || !accessToken) {
		return;
	}

	try {
		const response = await fetch(QUICK_GAME_UPDATE_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				gameId,
				achievements: achievementsPayload || [],
			}),
		});
		if (!response.ok) {
			console.error(
				'Blad podczas wysylania achievementow quick game',
				await response.text(),
			);
		}
	} catch (error) {
		console.error('Blad przy wysylaniu achievementow quick game', error);
	}
}

export function showGameFinishedAlert(winnerName, { title = 'MECZ ZAKOŃCZONY' } = {}) {
	Alert.alert(title, `${winnerName ?? 'Zwycięzca'} wygrywa mecz.`, [
		{ text: 'OK', style: 'default' },
	]);
}

export function showTrainingFinishedAlert(winnerName) {
	Alert.alert(
		'Trening',
		`Trening zakończony. ${winnerName ?? 'Zwycięzca'} wygrywa mecz.\n\nWynik nie został zapisany.`,
		[{ text: 'OK', style: 'default' }],
	);
}

export function tournamentLegsToWin() {
	return 2;
}

export function shouldHandleLocalTrainingWin({
	mode,
	syncEnabled,
	playerStates,
	legsToWin,
}) {
	if (mode !== GAME_MODE.TRAINING || syncEnabled) {
		return false;
	}
	return playerStates.some((s) => (s.legsWon ?? 0) >= legsToWin);
}

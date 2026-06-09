import { getQuickGameScoringBaseUrl } from '../helpers/apiConfig';
import { useGameScoring } from './useGameScoring';

/**
 * Synchronizacja szybkiego meczu przez API wizyt (quick-games/{id}/...).
 * Cienki wrapper nad useGameScoring — bez zmiany API dla quick game.
 */
export function useQuickGameScoring({
	enabled,
	quickGameId,
	accessToken,
	players,
	N,
	playerDispatches,
	playerStates,
	currentPlayerIndexRef,
	setCurrentPlayerIndex,
	setGameClosed,
	gameClosed,
	isPerDartMode,
	lobbyScoringMode,
	isHost,
	myPlayerIndexFromLobby,
}) {
	const baseUrl = quickGameId ? getQuickGameScoringBaseUrl(quickGameId) : null;

	return useGameScoring({
		enabled,
		baseUrl,
		channelKind: 'quick',
		gameId: quickGameId,
		accessToken,
		players,
		N,
		playerDispatches,
		playerStates,
		currentPlayerIndexRef,
		setCurrentPlayerIndex,
		setGameClosed,
		gameClosed,
		isPerDartMode,
		inputPolicy: {
			type: 'quick',
			lobbyScoringMode,
			isHost,
			myPlayerIndexFromLobby,
		},
	});
}

import { Alert } from 'react-native';
import { getGameScoringChannelName } from '../../apiConfig';
import {
	closeGameLeg,
	fetchGameScoringState,
	recordGameVisit,
	startGameLeg,
	undoGameVisit,
} from '../../gameScoringApi';
import { newClientVisitId } from '../newClientVisitId.js';

function unwrapTournamentPayload(data) {
	return data;
}

/**
 * Transport scoringu turniejowego (group / playoff, H2H).
 */
export function createTournamentTransport({
	baseUrl,
	accessToken,
	channelKind,
	gameId,
}) {
	return {
		format: 'h2h',
		fetchState: () => fetchGameScoringState(baseUrl, accessToken),
		startLeg: ({ tracked = false } = {}) =>
			startGameLeg(baseUrl, accessToken, tracked, tracked),
		recordVisit: (legId, payload) =>
			recordGameVisit(baseUrl, legId, accessToken, payload),
		undoVisit: (legId) => undoGameVisit(baseUrl, legId, accessToken),
		closeLeg: (legId, payload) =>
			closeGameLeg(baseUrl, legId, accessToken, payload),
		newClientVisitId,
		requiresLegId: true,
		getRealtimeConfig: () => {
			if (!channelKind || !gameId) {
				return null;
			}
			return {
				channelName: getGameScoringChannelName(channelKind, gameId),
				channelType: 'public',
				events: ['game.state', '.game.state'],
				scope: 'game-scoring',
				unwrapPayload: unwrapTournamentPayload,
			};
		},
		assertCanInput: () => true,
		assertCanUndo: () => true,
	};
}

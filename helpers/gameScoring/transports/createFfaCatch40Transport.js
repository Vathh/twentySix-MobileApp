import {
	fetchFfaScoringState,
	recordFfaCatch40Visit,
	undoFfaCatch40Visit,
} from '../../quickGameFfaApi';
import { newClientVisitId } from '../newClientVisitId.js';
import { createFfaInputGuards } from './ffaTransportGuards.js';
import { createFfaRealtimeConfig } from './ffaTransportShared.js';

export function createFfaCatch40Transport({
	lobbyId,
	accessToken,
	lobbyScoringMode,
	isHost,
	myPlayerIndexFromLobby,
	getCurrentPlayerIndex = null,
}) {
	const { assertCanInput, assertCanUndo } = createFfaInputGuards({
		lobbyScoringMode,
		isHost,
		myPlayerIndexFromLobby,
		getCurrentPlayerIndex,
	});

	return {
		format: 'ffa_catch40',
		fetchState: () => fetchFfaScoringState(lobbyId, accessToken),
		recordVisit: (payload) =>
			recordFfaCatch40Visit(lobbyId, accessToken, payload),
		undoVisit: () => undoFfaCatch40Visit(lobbyId, accessToken),
		newClientVisitId,
		getRealtimeConfig: () => createFfaRealtimeConfig({
			lobbyId,
			accessToken,
			scope: 'quick-game-ffa-catch40',
		}),
		assertCanInput,
		assertCanUndo,
	};
}

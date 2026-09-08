import {
	fetchFfaScoringState,
	recordFfaAtcVisit,
	undoFfaAtcVisit,
} from '../../quickGameFfaApi';
import { newClientVisitId } from '../newClientVisitId.js';
import { createFfaInputGuards } from './ffaTransportGuards.js';
import { createFfaRealtimeConfig } from './ffaTransportShared.js';

/**
 * Transport Around the Clock FFA (hits 0–3 / undo).
 */
export function createFfaAtcTransport({
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
		format: 'ffa_atc',
		fetchState: () => fetchFfaScoringState(lobbyId, accessToken),
		recordVisit: (payload) =>
			recordFfaAtcVisit(lobbyId, accessToken, payload),
		undoVisit: () => undoFfaAtcVisit(lobbyId, accessToken),
		newClientVisitId,
		getRealtimeConfig: () => createFfaRealtimeConfig({
			lobbyId,
			accessToken,
			scope: 'quick-game-ffa-atc',
		}),
		assertCanInput,
		assertCanUndo,
	};
}

import {
	fetchFfaScoringState,
	recordFfaCricketDart,
	undoFfaCricketDart,
} from '../../quickGameFfaApi';
import { newClientVisitId } from '../newClientVisitId.js';
import { createFfaInputGuards } from './ffaTransportGuards.js';
import { createFfaRealtimeConfig } from './ffaTransportShared.js';

/**
 * Transport cricket FFA (hit/miss/undo) — osobny od wizyt X01.
 */
export function createFfaCricketTransport({
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
		format: 'ffa_cricket',
		fetchState: () => fetchFfaScoringState(lobbyId, accessToken),
		recordDart: (payload) =>
			recordFfaCricketDart(lobbyId, accessToken, payload),
		undoDart: () => undoFfaCricketDart(lobbyId, accessToken),
		newClientDartId: newClientVisitId,
		getRealtimeConfig: () => createFfaRealtimeConfig({
			lobbyId,
			accessToken,
			scope: 'quick-game-ffa-cricket',
		}),
		assertCanInput,
		assertCanUndo,
	};
}

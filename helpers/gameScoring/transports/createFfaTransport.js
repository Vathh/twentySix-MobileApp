import {
	fetchFfaScoringState,
	recordFfaVisit,
	undoFfaVisit,
} from '../../quickGameFfaApi';
import { newClientVisitId } from '../newClientVisitId.js';
import { createFfaInputGuards } from './ffaTransportGuards.js';
import { createFfaRealtimeConfig } from './ffaTransportShared.js';

/**
 * Transport scoringu quick game FFA X01 (N=2..8).
 */
export function createFfaTransport({
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
		format: 'ffa',
		fetchState: () => fetchFfaScoringState(lobbyId, accessToken),
		recordVisit: (_legId, payload) =>
			recordFfaVisit(lobbyId, accessToken, payload),
		undoVisit: () => undoFfaVisit(lobbyId, accessToken),
		newClientVisitId,
		requiresLegId: false,
		getOutboxKey: () =>
			lobbyId != null ? `scoring-outbox:ffa:${lobbyId}` : null,
		getRealtimeConfig: () => createFfaRealtimeConfig({
			lobbyId,
			accessToken,
			scope: 'quick-game-ffa',
		}),
		assertCanInput,
		assertCanUndo,
	};
}

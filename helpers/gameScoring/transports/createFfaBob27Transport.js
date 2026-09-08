import {
	fetchFfaScoringState,
	recordFfaBob27Dart,
	undoFfaBob27Dart,
} from '../../quickGameFfaApi';
import { newClientVisitId } from '../newClientVisitId.js';
import { createFfaInputGuards } from './ffaTransportGuards.js';
import { createFfaRealtimeConfig } from './ffaTransportShared.js';

/**
 * Transport Bob's 27 FFA (hits 0–3 / undo).
 */
export function createFfaBob27Transport({
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
		format: 'ffa_bob27',
		fetchState: () => fetchFfaScoringState(lobbyId, accessToken),
		recordVisit: (payload) =>
			recordFfaBob27Dart(lobbyId, accessToken, payload),
		undoDart: () => undoFfaBob27Dart(lobbyId, accessToken),
		newClientDartId: newClientVisitId,
		getRealtimeConfig: () => createFfaRealtimeConfig({
			lobbyId,
			accessToken,
			scope: 'quick-game-ffa-bob27',
		}),
		assertCanInput,
		assertCanUndo,
	};
}

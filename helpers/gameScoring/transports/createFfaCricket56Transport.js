import {
	fetchFfaScoringState,
	recordFfaCricket56Visit,
	undoFfaCricket56Visit,
} from '../../quickGameFfaApi';
import { newClientVisitId } from '../newClientVisitId.js';
import { createFfaInputGuards } from './ffaTransportGuards.js';
import { createFfaRealtimeConfig } from './ffaTransportShared.js';

export function createFfaCricket56Transport({
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
		format: 'ffa_cricket56',
		fetchState: () => fetchFfaScoringState(lobbyId, accessToken),
		recordVisit: (payload) =>
			recordFfaCricket56Visit(lobbyId, accessToken, payload),
		undoVisit: () => undoFfaCricket56Visit(lobbyId, accessToken),
		newClientVisitId,
		getRealtimeConfig: () => createFfaRealtimeConfig({
			lobbyId,
			accessToken,
			scope: 'quick-game-ffa-cricket56',
		}),
		assertCanInput,
		assertCanUndo,
	};
}

import {
	fetchFfaScoringState,
	recordFfaAtcVisit,
	recordFfaBob27Dart,
	recordFfaCatch40Visit,
	recordFfaCricket56Visit,
	recordFfaCricketVisit,
	recordFfaVisit,
	undoFfaAtcVisit,
	undoFfaBob27Dart,
	undoFfaCatch40Visit,
	undoFfaCricket56Visit,
	undoFfaCricketVisit,
	undoFfaVisit,
} from '../../quickGameFfaApi';
import { newClientVisitId } from '../newClientVisitId.js';
import { createFfaInputGuards } from './ffaTransportGuards.js';
import { createFfaRealtimeConfig } from './ffaTransportShared.js';

const VARIANTS = {
	x01: {
		format: 'ffa',
		scope: 'quick-game-ffa',
		record: recordFfaVisit,
		undo: undoFfaVisit,
		write: 'visitWithLegId',
	},
	cricket: {
		format: 'ffa_cricket',
		scope: 'quick-game-ffa-cricket',
		record: recordFfaCricketVisit,
		undo: undoFfaCricketVisit,
		write: 'visit',
	},
	bob27: {
		format: 'ffa_bob27',
		scope: 'quick-game-ffa-bob27',
		record: recordFfaBob27Dart,
		undo: undoFfaBob27Dart,
		write: 'visitDart',
	},
	atc: {
		format: 'ffa_atc',
		scope: 'quick-game-ffa-atc',
		record: recordFfaAtcVisit,
		undo: undoFfaAtcVisit,
		write: 'visit',
	},
	catch40: {
		format: 'ffa_catch40',
		scope: 'quick-game-ffa-catch40',
		record: recordFfaCatch40Visit,
		undo: undoFfaCatch40Visit,
		write: 'visit',
	},
	cricket56: {
		format: 'ffa_cricket56',
		scope: 'quick-game-ffa-cricket56',
		record: recordFfaCricket56Visit,
		undo: undoFfaCricket56Visit,
		write: 'visit',
	},
};

/**
 * Jeden transport FFA — wariant per tryb gry (X01, cricket, Bob27, ATC, Catch40, Cricket56).
 */
export function createFfaTransport({
	kind = 'x01',
	lobbyId,
	accessToken,
	lobbyScoringMode,
	isHost,
	myPlayerIndexFromLobby,
	getCurrentPlayerIndex = null,
}) {
	const variant = VARIANTS[kind] ?? VARIANTS.x01;
	const { assertCanInput, assertCanUndo } = createFfaInputGuards({
		lobbyScoringMode,
		isHost,
		myPlayerIndexFromLobby,
		getCurrentPlayerIndex,
	});

	const base = {
		format: variant.format,
		kind,
		fetchState: () => fetchFfaScoringState(lobbyId, accessToken),
		getRealtimeConfig: () => createFfaRealtimeConfig({
			lobbyId,
			accessToken,
			scope: variant.scope,
		}),
		assertCanInput,
		assertCanUndo,
	};

	if (variant.write === 'visitWithLegId') {
		return {
			...base,
			recordVisit: (_legId, payload) =>
				variant.record(lobbyId, accessToken, payload),
			undoVisit: () => variant.undo(lobbyId, accessToken),
			newClientVisitId,
			requiresLegId: false,
			getOutboxKey: () =>
				lobbyId != null ? `scoring-outbox:ffa:${lobbyId}` : null,
		};
	}

	if (variant.write === 'dart') {
		return {
			...base,
			recordDart: (payload) =>
				variant.record(lobbyId, accessToken, payload),
			undoDart: () => variant.undo(lobbyId, accessToken),
			newClientDartId: newClientVisitId,
		};
	}

	if (variant.write === 'visitDart') {
		return {
			...base,
			recordVisit: (payload) =>
				variant.record(lobbyId, accessToken, payload),
			undoDart: () => variant.undo(lobbyId, accessToken),
			newClientDartId: newClientVisitId,
		};
	}

	return {
		...base,
		recordVisit: (payload) =>
			variant.record(lobbyId, accessToken, payload),
		undoVisit: () => variant.undo(lobbyId, accessToken),
		newClientVisitId,
	};
}

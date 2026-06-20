import { Alert } from 'react-native';
import {
	fetchFfaScoringState,
	recordFfaVisit,
	undoFfaVisit,
} from '../../quickGameFfaApi';
import { newClientVisitId } from '../newClientVisitId.js';

function unwrapFfaPayload(data) {
	const state = data?.state ?? data;
	return state?.session ? state : null;
}

/**
 * Transport scoringu quick game FFA (N=2..8).
 */
export function createFfaTransport({
	lobbyId,
	accessToken,
	lobbyScoringMode,
	isHost,
	myPlayerIndexFromLobby,
	getCurrentPlayerIndex = null,
}) {
	const assertHostForOneDevice = (actionLabel) => {
		if (lobbyScoringMode === 'one_device' && !isHost) {
			Alert.alert('Info', `W trybie „jedno urządzenie” ${actionLabel} tylko host.`);
			return false;
		}
		return true;
	};

	return {
		format: 'ffa',
		fetchState: () => fetchFfaScoringState(lobbyId, accessToken),
		recordVisit: (_legId, payload) =>
			recordFfaVisit(lobbyId, accessToken, payload),
		undoVisit: () => undoFfaVisit(lobbyId, accessToken),
		newClientVisitId,
		requiresLegId: false,
		getRealtimeConfig: () => ({
			channelName: `private-quick-game-lobby.${lobbyId}`,
			channelType: 'private',
			accessToken,
			events: ['ffa.state.updated', '.ffa.state.updated'],
			scope: 'quick-game-ffa',
			unwrapPayload: unwrapFfaPayload,
		}),
		assertCanInput: (playerIndex) => {
			if (!assertHostForOneDevice('punkty wpisuje')) {
				return false;
			}
			if (lobbyScoringMode === 'each_own' && myPlayerIndexFromLobby !== null) {
				if (playerIndex !== myPlayerIndexFromLobby) {
					Alert.alert(
						'Info',
						'Możesz wpisywać tylko własne rzuty.',
					);
					return false;
				}
				const turnIdx = getCurrentPlayerIndex?.();
				if (
					turnIdx !== null &&
					turnIdx !== undefined &&
					turnIdx !== myPlayerIndexFromLobby
				) {
					Alert.alert('Info', 'Czekaj na swoją kolejkę.');
					return false;
				}
			}
			return true;
		},
		assertCanUndo: () => assertHostForOneDevice('cofa'),
	};
}

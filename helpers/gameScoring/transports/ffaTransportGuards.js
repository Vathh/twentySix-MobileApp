import { Alert } from 'react-native';
import {
	ffaHostBlockedMessage,
	ffaInputBlockedMessage,
} from './ffaTransportShared.js';

/**
 * Guardy one_device / each_own współdzielone przez transporty FFA.
 */
export function createFfaInputGuards({
	lobbyScoringMode,
	isHost,
	myPlayerIndexFromLobby,
	getCurrentPlayerIndex = null,
}) {
	const assertHostForOneDevice = (actionLabel) => {
		const msg = ffaHostBlockedMessage(lobbyScoringMode, isHost, actionLabel);
		if (msg) {
			Alert.alert('Info', msg);
			return false;
		}
		return true;
	};

	return {
		assertCanInput: (playerIndex) => {
			const msg = ffaInputBlockedMessage({
				lobbyScoringMode,
				isHost,
				myPlayerIndexFromLobby,
				playerIndex,
				currentPlayerIndex: getCurrentPlayerIndex?.(),
			});
			if (msg) {
				Alert.alert('Info', msg);
				return false;
			}
			return true;
		},
		assertCanUndo: () => assertHostForOneDevice('cofa'),
	};
}
